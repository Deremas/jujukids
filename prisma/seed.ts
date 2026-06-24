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
  code: string;
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
  // ── Locations: Only one Shop ──
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

  // ── Roles for users ──
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

  // ── Category & Unit ──
  const category = await prisma.category.upsert({
    where: { id: "cat-electronics" },
    update: {},
    create: { id: "cat-electronics", name: "Electronics" },
  });

  const unit = await prisma.unit.upsert({
    where: { id: "unit-pcs" },
    update: {},
    create: { id: "unit-pcs", name: "Pieces", shortName: "Pcs" },
  });

  // ── Items ──
  const items: SeedItem[] = [
    {
      id: "item-1000mah-pb",
      name: "1000 mAh powerbank",
      code: "PB001",
      buyingPrice: 5090,
      sellingPrice: 7000,
      quantity: 5,
    },
    {
      id: "item-5000mah-pb",
      name: "5000 mAh powerbank",
      code: "PB002",
      buyingPrice: 3550,
      sellingPrice: 5500,
      quantity: 5,
    },
    {
      id: "item-cat-headset",
      name: "Cat headset",
      code: "HS001",
      buyingPrice: 3950,
      sellingPrice: 6500,
      quantity: 5,
    },
    {
      id: "item-lenovo-earphone",
      name: "Lenovo earphone",
      code: "EP001",
      buyingPrice: 3610,
      sellingPrice: 5100,
      quantity: 3,
    },
    {
      id: "item-hexagon-earphone",
      name: "Hexagon earphone",
      code: "EP002",
      buyingPrice: 3350,
      sellingPrice: 4850,
      quantity: 4,
    },
    {
      id: "item-evil-earphone",
      name: "Evil earphone",
      code: "EP003",
      buyingPrice: 6440,
      sellingPrice: 9000,
      quantity: 2,
    },
    {
      id: "item-car-charger-mod",
      name: "Car charger modulator",
      code: "CC001",
      buyingPrice: 3990,
      sellingPrice: 5500,
      quantity: 2,
    },
    {
      id: "item-sound-core-speaker",
      name: "Sound core speaker",
      code: "SP001",
      buyingPrice: 0,
      sellingPrice: 0,
      quantity: 0,
    },
    {
      id: "item-hp-speaker",
      name: "HP speaker",
      code: "SP002",
      buyingPrice: 3220,
      sellingPrice: 5700,
      quantity: 1,
    },
    {
      id: "item-xo-speaker",
      name: "XO speaker",
      code: "SP003",
      buyingPrice: 3930,
      sellingPrice: 6400,
      quantity: 2,
    },
    {
      id: "item-car-mouse",
      name: "Car mouse",
      code: "MS001",
      buyingPrice: 0,
      sellingPrice: 0,
      quantity: 0,
    },
    {
      id: "item-mic",
      name: "Mic",
      code: "MC001",
      buyingPrice: 0,
      sellingPrice: 0,
      quantity: 0,
    },
  ];

  for (const sampleItem of items) {
    const item = await prisma.item.upsert({
      where: { id: sampleItem.id },
      update: {},
      create: {
        id: sampleItem.id,
        name: sampleItem.name,
        code: sampleItem.code,
        categoryId: category.id,
        unitId: unit.id,
        defaultBuyingPrice: sampleItem.buyingPrice,
        defaultSellingPrice: sampleItem.sellingPrice,
      },
    });

    // Only create inventory batch if quantity > 0
    if (sampleItem.quantity > 0) {
      await prisma.inventoryBatch.upsert({
        where: { id: `${sampleItem.id}-batch-main` },
        update: {},
        create: {
          id: `${sampleItem.id}-batch-main`,
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

  // ── Cash Account Only ──
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

  // ── Settings ──
  const settings: SeedSetting[] = [
    { key: "companyName", value: "Juju Kids" },
    { key: "currency", value: "ETB" },
    { key: "taxRate", value: "0" },
    { key: "lowStockThreshold", value: "10" },
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
