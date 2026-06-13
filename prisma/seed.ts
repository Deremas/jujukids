import "dotenv/config";
import { Prisma, PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PERMISSION_CATALOG } from "../lib/permission-catalog";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

const SUPER_ADMIN_ROLE = "Super Admin";
const LEGACY_ADMIN_ROLES = ["Administrator", "ADMIN"] as const;
const SALES_ROLE = "Sales";
const MANAGER_ROLE = "Manager";
const SALES_PERMISSION_KEYS = [
  "dashboard.view",
  "inventory.items.view",
  "inventory.stock.view",
  "inventory.movements.view",
  "sales.view",
  "sales.create",
  "sales.pos",
  "customers.view",
  "customers.create",
  "customers.update",
  "customers.payments.create",
];

type DefaultRoleTemplate = {
  name: string;
  description: string;
  isSystem: boolean;
  keys: string[];
};

type SeedItem = {
  id: string;
  name: string;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
};

type SeedBankAccount = Prisma.BankAccountUncheckedCreateInput;

type SeedSetting = {
  key: string;
  value: string;
};

type SeedUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  roleName: typeof SUPER_ADMIN_ROLE | typeof SALES_ROLE;
};

async function normalizeLegacyAdminRoles() {
  const superAdmin = await prisma.role.findUnique({
    where: { name: SUPER_ADMIN_ROLE },
  });

  for (const roleName of LEGACY_ADMIN_ROLES) {
    const legacyAdminRole = await prisma.role.findUnique({
      where: { name: roleName },
      include: { _count: { select: { users: true } } },
    });

    if (!legacyAdminRole) continue;

    if (superAdmin) {
      await prisma.user.updateMany({
        where: { roleId: legacyAdminRole.id },
        data: { roleId: superAdmin.id, role: "ADMIN" },
      });
      await prisma.rolePermission.deleteMany({
        where: { roleId: legacyAdminRole.id },
      });

      if (legacyAdminRole._count.users === 0) {
        await prisma.role.delete({ where: { id: legacyAdminRole.id } });
      } else {
        await prisma.role.update({
          where: { id: legacyAdminRole.id },
          data: {
            isActive: false,
            isSystem: false,
            description: "Legacy admin role replaced by Super Admin.",
          },
        });
      }
      continue;
    }

    await prisma.role.update({
      where: { id: legacyAdminRole.id },
      data: {
        name: SUPER_ADMIN_ROLE,
        description: "System role with full access to every permission.",
        isSystem: true,
        isActive: true,
      },
    });
    break;
  }
}

async function syncPermissionsAndRoles() {
  await prisma.permission.createMany({
    data: PERMISSION_CATALOG.map((permission) => ({
      key: permission.key,
      label: permission.label,
      module: permission.module,
    })),
    skipDuplicates: true,
  });
  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.updateMany({
      where: { key: permission.key },
      data: { label: permission.label, module: permission.module },
    });
  }

  const catalogKeys = PERMISSION_CATALOG.map((permission) => permission.key);
  const obsoletePermissions = await prisma.permission.findMany({
    where: { key: { notIn: catalogKeys } },
    select: { id: true },
  });
  const obsoletePermissionIds = obsoletePermissions.map(
    (permission) => permission.id,
  );
  if (obsoletePermissionIds.length > 0) {
    await prisma.rolePermission.deleteMany({
      where: { permissionId: { in: obsoletePermissionIds } },
    });
    await prisma.userPermission.deleteMany({
      where: { permissionId: { in: obsoletePermissionIds } },
    });
    await prisma.permission.deleteMany({
      where: { id: { in: obsoletePermissionIds } },
    });
  }

  const allPermissions = await prisma.permission.findMany();

  await normalizeLegacyAdminRoles();

  const superAdmin = await prisma.role.upsert({
    where: { name: SUPER_ADMIN_ROLE },
    update: {
      description: "System role with full access to every permission.",
      isSystem: true,
      isActive: true,
    },
    create: {
      name: SUPER_ADMIN_ROLE,
      description: "System role with full access to every permission.",
      isSystem: true,
      isActive: true,
    },
  });

  await prisma.rolePermission.createMany({
    data: allPermissions.map((permission) => ({
      roleId: superAdmin.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });

  const defaultRoles: DefaultRoleTemplate[] = [
    {
      name: SALES_ROLE,
      description: "Sales desk access for customers, sales, and stock viewing.",
      isSystem: true,
      keys: SALES_PERMISSION_KEYS,
    },
    {
      name: MANAGER_ROLE,
      description:
        "Operational manager access across store, purchases, sales, finance, and reports.",
      isSystem: false,
      keys: PERMISSION_CATALOG.filter(
        (permission) => !permission.key.startsWith("admin."),
      ).map((permission) => permission.key),
    },
  ];

  for (const roleTemplate of defaultRoles) {
    const role = await prisma.role.upsert({
      where: { name: roleTemplate.name },
      update: {
        description: roleTemplate.description,
        isSystem: roleTemplate.isSystem,
        isActive: true,
      },
      create: {
        name: roleTemplate.name,
        description: roleTemplate.description,
        isSystem: roleTemplate.isSystem,
        isActive: true,
      },
    });

    const existingAssignments = await prisma.rolePermission.count({
      where: { roleId: role.id },
    });

    if (existingAssignments > 0) continue;

    const permissions = allPermissions.filter((permission) =>
      roleTemplate.keys.includes(permission.key),
    );

    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.user.updateMany({
    where: { role: "ADMIN", roleId: null },
    data: { roleId: superAdmin.id },
  });

  const salesRole = await prisma.role.findUnique({
    where: { name: SALES_ROLE },
  });
  if (salesRole) {
    await prisma.user.updateMany({
      where: { role: { not: "ADMIN" }, roleId: null },
      data: { roleId: salesRole.id },
    });
  }
}

async function seedSampleData() {
  // â”€â”€ Locations: Only one Shop â”€â”€
  const mainLocation = await prisma.location.upsert({
    where: { id: "loc-shop-main" },
    update: {
      name: "Main Shop",
      type: "SHOP",
      location: "Addis Ababa",
      isActive: true,
    },
    create: {
      id: "loc-shop-main",
      name: "Main Shop",
      type: "SHOP",
      location: "Addis Ababa",
    },
  });

  // â”€â”€ Roles for users â”€â”€
  const [superAdminRole, salesRole] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { name: SUPER_ADMIN_ROLE } }),
    prisma.role.findUniqueOrThrow({ where: { name: SALES_ROLE } }),
  ]);

  const seededPasswordHash = await bcrypt.hash("1234", 10);
  const seedUsers: SeedUser[] = [
    {
      id: "seed-user-admin",
      firstName: "Admin",
      lastName: "User",
      username: "admin",
      phone: "",
      roleName: SUPER_ADMIN_ROLE,
    },
    {
      id: "seed-user-sales",
      firstName: "Sales",
      lastName: "User",
      username: "sales",
      phone: "",
      roleName: SALES_ROLE,
    },
  ];

  for (const seedUser of seedUsers) {
    const role =
      seedUser.roleName === SUPER_ADMIN_ROLE ? superAdminRole : salesRole;

    await prisma.user.upsert({
      where: { username: seedUser.username },
      update: {
        firstName: seedUser.firstName,
        lastName: seedUser.lastName,
        phone: seedUser.phone,
        passwordHash: seededPasswordHash,
        role: role.name === SUPER_ADMIN_ROLE ? "ADMIN" : role.name,
        roleId: role.id,
        locationId: mainLocation.id,
        isActive: true,
      },
      create: {
        id: seedUser.id,
        firstName: seedUser.firstName,
        lastName: seedUser.lastName,
        username: seedUser.username,
        phone: seedUser.phone,
        passwordHash: seededPasswordHash,
        role: role.name === SUPER_ADMIN_ROLE ? "ADMIN" : role.name,
        roleId: role.id,
        locationId: mainLocation.id,
        isActive: true,
      },
    });
  }

  const unitOptions = [
    { id: "unit-pcs", name: "Pcs", shortName: "Pcs" },
    { id: "unit-box", name: "Box", shortName: "Box" },
    { id: "unit-kg", name: "Kg", shortName: "Kg" },
    { id: "unit-ltr", name: "Ltr", shortName: "Ltr" },
    { id: "unit-mtr", name: "Mtr", shortName: "Mtr" },
    { id: "unit-set", name: "Set", shortName: "Set" },
  ] as const;

  for (const unitOption of unitOptions) {
    await prisma.unit.upsert({
      where: { id: unitOption.id },
      update: {
        name: unitOption.name,
        shortName: unitOption.shortName,
      },
      create: {
        id: unitOption.id,
        name: unitOption.name,
        shortName: unitOption.shortName,
      },
    });
  }

  const category = await prisma.category.upsert({
    where: { id: "cat-blank" },
    update: { name: "" },
    create: { id: "cat-blank", name: "" },
  });

  const pcsUnit = await prisma.unit.findUniqueOrThrow({
    where: { id: "unit-pcs" },
  });

  const items: SeedItem[] = [
    { id: "item-01", name: "Abacus", buyingPrice: 550, sellingPrice: 1000, quantity: 3 },
    { id: "item-02", name: "Jumpsuit (3pc)", buyingPrice: 1600, sellingPrice: 2000, quantity: 2 },
    { id: "item-03", name: "Baby nail trimmer", buyingPrice: 700, sellingPrice: 1000, quantity: 5 },
    { id: "item-04", name: "ሲልከን መመገቢያ", buyingPrice: 2200, sellingPrice: 2700, quantity: 1 },
    { id: "item-05", name: "ጡጦ ጫፍ", buyingPrice: 250, sellingPrice: 500, quantity: 2 },
    { id: "item-06", name: "ጫማ", buyingPrice: 400, sellingPrice: 600, quantity: 3 },
    { id: "item-07", name: "Only baby ጡጦ", buyingPrice: 400, sellingPrice: 600, quantity: 6 },
    { id: "item-08", name: "Only baby bowl", buyingPrice: 800, sellingPrice: 1000, quantity: 3 },
    { id: "item-09", name: "Breast pad", buyingPrice: 900, sellingPrice: 1500, quantity: 1 },
    { id: "item-10", name: "ሲልከን ጡጦ", buyingPrice: 1000, sellingPrice: 1500, quantity: 2 },
    { id: "item-11", name: "Electric breast pump", buyingPrice: 3250, sellingPrice: 3800, quantity: 10 },
    { id: "item-12", name: "Thomas ሚገጣጠም መጫወቻ", buyingPrice: 3200, sellingPrice: 3800, quantity: 2 },
    { id: "item-13", name: "Bath tub", buyingPrice: 3300, sellingPrice: 4300, quantity: 2 },
    { id: "item-14", name: "Mama’s bag", buyingPrice: 1800, sellingPrice: 2500, quantity: 2 },
    { id: "item-15", name: "ቲሸርት", buyingPrice: 240, sellingPrice: 267, quantity: 26 },
    { id: "item-16", name: "ዳይፐር ቀሚስ", buyingPrice: 900, sellingPrice: 1200, quantity: 2 },
    { id: "item-17", name: "የክርስትና ልብስ(quality)", buyingPrice: 1600, sellingPrice: 2200, quantity: 10 },
    { id: "item-18", name: "የክርስትና ልብስ(normal)", buyingPrice: 1550, sellingPrice: 2200, quantity: 5 },
    { id: "item-19", name: "አጥር መጫወቻ", buyingPrice: 2000, sellingPrice: 2900, quantity: 1 },
    { id: "item-20", name: "ማቀፊያ ፎጣ", buyingPrice: 600, sellingPrice: 1000, quantity: 2 },
    { id: "item-21", name: "Happy bed bell", buyingPrice: 2800, sellingPrice: 3400, quantity: 1 },
    { id: "item-22", name: "የሻወር ኮፊያ", buyingPrice: 150, sellingPrice: 400, quantity: 2 },
    { id: "item-23", name: "Chicco ማስተኛ", buyingPrice: 3200, sellingPrice: 4000, quantity: 2 },
    { id: "item-24", name: "Tong ልብስ ሴት", buyingPrice: 1800, sellingPrice: 2400, quantity: 2 },
    { id: "item-25", name: "ስዋድል ማቀፊያ", buyingPrice: 1500, sellingPrice: 2000, quantity: 4 },
    { id: "item-26", name: "ሲልከን ጡጦ ሴት", buyingPrice: 4300, sellingPrice: 5000, quantity: 2 },
    { id: "item-27", name: "Baby care kit", buyingPrice: 800, sellingPrice: 1400, quantity: 1 },
    { id: "item-28", name: "ባለቁልፍ ማቀፊያ", buyingPrice: 1600, sellingPrice: 2000, quantity: 1 },
    { id: "item-29", name: "Scooter", buyingPrice: 10000, sellingPrice: 11500, quantity: 1 },
    { id: "item-30", name: "ማጥኛ table", buyingPrice: 1400, sellingPrice: 1800, quantity: 1 },
    { id: "item-31", name: "Cactus", buyingPrice: 650, sellingPrice: 1000, quantity: 1 },
    { id: "item-32", name: "ማስተኛ", buyingPrice: 1600, sellingPrice: 2200, quantity: 9 },
    { id: "item-33", name: "bowling", buyingPrice: 900, sellingPrice: 1500, quantity: 2 },
    { id: "item-34", name: "ዳይፐር ቲሸርት", buyingPrice: 315, sellingPrice: 450, quantity: 20 },
    { id: "item-35", name: "ስካርፍ ኮፍያ", buyingPrice: 350, sellingPrice: 600, quantity: 15 },
    { id: "item-36", name: "መመገቢያ ሰሃን", buyingPrice: 450, sellingPrice: 1000, quantity: 6 },
    { id: "item-37", name: "የጡጦ set", buyingPrice: 2300, sellingPrice: 3200, quantity: 1 },
    { id: "item-38", name: "grinder", buyingPrice: 5500, sellingPrice: 6800, quantity: 4 },
    { id: "item-39", name: "3pc ኮፍያ", buyingPrice: 250, sellingPrice: 400, quantity: 2 },
    { id: "item-40", name: "ነጭ ካልሲ", buyingPrice: 27, sellingPrice: 50, quantity: 1 },
    { id: "item-41", name: "ካልሲ(6)", buyingPrice: 27, sellingPrice: 50, quantity: 1 },
    { id: "item-42", name: "የእንጀራ እናት", buyingPrice: 300, sellingPrice: 500, quantity: 1 },
    { id: "item-43", name: "ደንገል", buyingPrice: 850, sellingPrice: 1200, quantity: 6 },
    { id: "item-44", name: "የፊት ማቀፊያ", buyingPrice: 750, sellingPrice: 1000, quantity: 2 },
    { id: "item-45", name: "ምንጣፍ", buyingPrice: 3500, sellingPrice: 4000, quantity: 4 },
    { id: "item-46", name: "ዉሻ አሻንጉሊት", buyingPrice: 450, sellingPrice: 800, quantity: 3 },
    { id: "item-47", name: "መጠራረጊያ ፎጣ", buyingPrice: 300, sellingPrice: 500, quantity: 3 },
    { id: "item-48", name: "8pc ልብስ(ዉድ)", buyingPrice: 3200, sellingPrice: 400, quantity: 1 },
    { id: "item-49", name: "7pc ጡጦ set", buyingPrice: 1600, sellingPrice: 2500, quantity: 1 },
    { id: "item-50", name: "Infantino ማዘያ", buyingPrice: 2750, sellingPrice: 3200, quantity: 1 },
  ];

  for (const [index, sampleItem] of items.entries()) {
    const itemId = `item-${String(index + 1).padStart(2, "0")}`;
    const item = await prisma.item.upsert({
      where: { id: itemId },
      update: {},
      create: {
        id: itemId,
        name: sampleItem.name,
        categoryId: category.id,
        unitId: pcsUnit.id,
        defaultBuyingPrice: sampleItem.buyingPrice,
        defaultSellingPrice: sampleItem.sellingPrice,
        lowStockAlert: 7,
      },
    });

    if (sampleItem.quantity > 0) {
      await prisma.inventoryBatch.upsert({
        where: { id: `${itemId}-batch-main` },
        update: {},
        create: {
          id: `${itemId}-batch-main`,
          itemId: item.id,
          locationId: mainLocation.id,
          quantityIn: sampleItem.quantity,
          remainingQuantity: sampleItem.quantity,
          buyingPrice: sampleItem.buyingPrice,
          sellingPrice: sampleItem.sellingPrice,
          batchCode: "OPENING",
        },
      });
    }
  }

  // â”€â”€ Cash Account Only â”€â”€
  const cashAccount: SeedBankAccount = {
    id: "cash-main",
    accountType: "CASH",
    displayName: "Main Cash Account",
    bankName: "Internal",
    accountNumber: "CASH-001",
    currentBalance: 0,
  };

  await prisma.bankAccount.upsert({
    where: { id: cashAccount.id },
    update: cashAccount,
    create: cashAccount,
  });

  // â”€â”€ Settings â”€â”€
  const settings: SeedSetting[] = [
    { key: "companyName", value: "Juju Kids Ltd" },
    { key: "currency", value: "ETB" },
    { key: "taxRate", value: "0" },
    { key: "lowStockThreshold", value: "7" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
}

async function main() {
  await syncPermissionsAndRoles();
  await seedSampleData();
  console.log("Seed completed by seed-system.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


