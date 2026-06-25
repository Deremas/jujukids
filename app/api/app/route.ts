import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ensureDefaultPermissionsAndRoles } from "@/lib/permissions";
import { formatPermissionLabel } from "@/lib/permission-catalog";
import { captureCredit, settleCredit, getCustomerOutstandingCredit } from "@/lib/finance/credit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CASH_ACCOUNT_TYPE = "CASH";
const UNCATEGORIZED_CATEGORY_NAME = "Uncategorized";

function isUncategorizedCategory(category?: { name?: string | null } | null) {
  return (category?.name || "").trim().toLowerCase() === UNCATEGORIZED_CATEGORY_NAME.toLowerCase();
}

function categoryDisplayName(category?: { name?: string | null } | null) {
  return isUncategorizedCategory(category) ? "-" : category?.name || "-";
}

function categoryDisplayId(categoryId: string, category?: { name?: string | null } | null) {
  return isUncategorizedCategory(category) ? "" : categoryId;
}

function toAppUser(user: {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string | null;
  role: string;
  roleId: string | null;
  locationId: string;
  assignedLocationIds?: string | null;
  isActive: boolean;
  roleRecord?: { name: string } | null;
}, locations: { id: string }[]) {
  const roleName = user.role === "ADMIN" ? "Super Admin" : user.roleRecord?.name || user.role;
  
  let assignedLocations: string[] = [];
  if (roleName === "Super Admin") {
    assignedLocations = locations.map((location) => location.id);
  } else if (user.assignedLocationIds) {
    assignedLocations = user.assignedLocationIds.split(",").map(s => s.trim()).filter(Boolean);
  }
  
  if (assignedLocations.length === 0 && user.locationId) {
    assignedLocations = [user.locationId];
  }

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    role: roleName,
    roleId: user.roleId || "",
    assignedLocations,
    username: user.username,
    phone: user.phone || "",
    isActive: user.isActive,
  };
}

async function getActorId(currentUser?: any) {
  const user = currentUser?.id ? await prisma.user.findUnique({ where: { id: currentUser.id } }) : null;
  if (!user || !user.isActive) throw new Error("You must be signed in.");
  return user.id;
}

function asDate(value: unknown) {
  return value ? new Date(String(value)) : new Date();
}

function generateReference(prefix: string) {
  return `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function hasPermission(currentUser: any, key: string) {
  return currentUser?.role === "Super Admin" || currentUser?.permissions?.includes(key);
}

const ACTION_PERMISSIONS: Record<string, string> = {
  addCustomer: "customers.create",
  updateCustomer: "customers.update",
  addSupplier: "suppliers.create",
  updateSupplier: "suppliers.update",
  addCategory: "inventory.items.create",
  addUnit: "inventory.items.create",
  addItem: "inventory.items.create",
  updateItemPrice: "inventory.items.update",
  addLocation: "admin.locations.create",
  updateSettings: "admin.settings.update",
  addUser: "admin.users.create",
  updateUser: "admin.users.update",
  updateUserStatus: "admin.users.update",
  deleteUser: "admin.users.delete",
  addRole: "admin.roles.manage",
  updateRole: "admin.roles.manage",
  deleteRole: "admin.roles.manage",
  addBankAccount: "finance.banks.create",
  updateBankAccount: "finance.banks.update",
  deleteBankAccount: "finance.banks.delete",
  addExpense: "finance.expenses.create",
  addCashTransfer: "finance.cash_to_bank.create",
  addPurchase: "purchases.create",
  addSale: "sales.create",
  addCustomerPayment: "customers.payments.create",
  settleCredit: "customers.payments.create",
  addSupplierPayment: "suppliers.payments.create",
  addTransfer: "inventory.transfers.create",
  adjustStock: "inventory.stock.adjust",
  addStockEntry: "inventory.stock.adjust",
  deleteSale: "sales.delete",
  deletePurchase: "purchases.delete",
  deleteItem: "inventory.items.delete",
  deleteSupplier: "suppliers.delete",
  deleteCustomer: "customers.delete",
};

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  await ensureDefaultPermissionsAndRoles();

  const locationScope = currentUser.role === "Super Admin"
    ? undefined
    : { in: currentUser.assignedLocations?.length ? currentUser.assignedLocations : [currentUser.locationId].filter(Boolean) };

  const [
    locations,
    products,
    users,
    roles,
    permissions,
    settings,
    categories,
    units,
    batches,
    customers,
    suppliers,
    sales,
    purchases,
    expenses,
    customerPayments,
    supplierPayments,
    bankAccounts,
    bankTransactions,
    transfers,
    inventoryMovements,
  ] = await Promise.all([
    prisma.location.findMany({
      where: { isActive: true, ...(locationScope ? { id: locationScope } : {}) },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: { isActive: true },
      include: { category: true, unit: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ include: { location: true, roleRecord: true }, orderBy: { createdAt: "asc" } }),
    prisma.role.findMany({ where: { isActive: true }, include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }, orderBy: { name: "asc" } }),
    prisma.permission.findMany({ include: { _count: { select: { roles: true, users: true } } }, orderBy: [{ module: "asc" }, { label: "asc" }] }),
    prisma.setting.findMany(),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ orderBy: { name: "asc" } }),
    prisma.inventoryBatch.findMany({
      where: locationScope ? { locationId: locationScope } : {},
      include: { item: { include: { category: true, unit: true } }, location: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.sale.findMany({
      where: locationScope ? { locationId: locationScope } : {},
      include: { items: true, customer: true, location: true },
      orderBy: { saleDate: "desc" },
    }),
    prisma.purchase.findMany({
      where: locationScope ? { locationId: locationScope } : {},
      include: { items: true, supplier: true, location: true },
      orderBy: { purchaseDate: "desc" },
    }),
    prisma.expense.findMany({
      where: locationScope ? { locationId: locationScope } : {},
      include: { location: true },
      orderBy: { expenseDate: "desc" },
    }),
    prisma.customerPayment.findMany({
      where: locationScope ? { locationId: locationScope } : {},
      include: { customer: true, location: true },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.supplierPayment.findMany({
      where: locationScope ? { locationId: locationScope } : {},
      include: { supplier: true, location: true },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.bankAccount.findMany({ where: { isActive: true }, orderBy: [{ accountType: "asc" }, { displayName: "asc" }] }),
    prisma.bankTransaction.findMany({
      where: locationScope ? { locationId: locationScope } : {},
      include: { bankAccount: true, location: true },
      orderBy: { transactionDate: "desc" },
    }),
    prisma.transfer.findMany({
      where: locationScope
        ? { OR: [{ sourceLocationId: locationScope }, { destinationLocationId: locationScope }] }
        : {},
      include: { items: true },
      orderBy: { transferDate: "desc" },
    }),
    prisma.inventoryMovement.findMany({
      where: locationScope ? { locationId: locationScope } : {},
      include: { item: { include: { category: true, unit: true } }, location: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const saleBankAccountBySaleId = new Map<string, { id: string; displayName: string; bankName: string | null }>();
  bankTransactions.forEach((entry) => {
    if (entry.type !== "SALE_PAYMENT" || !entry.referenceNo) return;
    saleBankAccountBySaleId.set(entry.referenceNo, {
      id: entry.bankAccount.id,
      displayName: entry.bankAccount.displayName,
      bankName: entry.bankAccount.bankName || null,
    });
  });

  const salesWithBankAccounts = sales.map((sale) => {
    const bankAccount = saleBankAccountBySaleId.get(sale.id) || null;
    return {
      ...sale,
      bankAccount,
      bankAccountId: bankAccount?.id || null,
    };
  });

  const settingValue = Object.fromEntries(settings.map((entry) => [entry.key, entry.value]));
  const stockByItemLocation = new Map<string, any>();
  batches.forEach((batch) => {
    const key = `${batch.itemId}:${batch.locationId}`;
    const existing = stockByItemLocation.get(key);
    if (existing) {
      existing.stock += batch.remainingQuantity;
      existing.price = batch.sellingPrice || existing.price;
      existing.buyingPrice = batch.buyingPrice || existing.buyingPrice;
      existing.sellingPrice = batch.sellingPrice || existing.sellingPrice;
      return;
    }
    stockByItemLocation.set(key, {
      id: batch.itemId,
      name: batch.item.name,
      categoryId: categoryDisplayId(batch.item.categoryId, batch.item.category),
      category: categoryDisplayName(batch.item.category),
      price: batch.sellingPrice || batch.item.defaultSellingPrice,
      buyingPrice: batch.buyingPrice || batch.item.defaultBuyingPrice,
      sellingPrice: batch.sellingPrice || batch.item.defaultSellingPrice,
      stock: batch.remainingQuantity,
      unitId: batch.item.unitId,
      unitName: batch.item.unit.name,
      unitShortName: batch.item.unit.shortName,
      unit: batch.item.unit.shortName,
      code: batch.item.code || "",
      status: batch.item.isActive ? "Active" : "Inactive",
      locationId: batch.locationId,
      lowStockAlert: batch.item.lowStockAlert,
    });
  });

  // ─── Global Balance and Running Balance Calculations ────────────────
  const [
    globalCustomerSales,
    globalCustomerPayments,
    globalSupplierPurchases,
    globalSupplierPayments,
  ] = await Promise.all([
    prisma.sale.groupBy({
      by: ['customerId'],
      where: { customerId: { not: null } },
      _sum: { creditAmount: true },
    }),
    prisma.customerPayment.groupBy({
      by: ['customerId'],
      _sum: { amount: true },
    }),
    prisma.purchase.groupBy({
      by: ['supplierId'],
      _sum: { debtAmount: true },
    }),
    prisma.supplierPayment.groupBy({
      by: ['supplierId'],
      _sum: { amount: true },
    }),
  ]);

  const customerBalances = new Map<string, number>();
  globalCustomerSales.forEach((g) => {
    if (g.customerId) {
      customerBalances.set(g.customerId, g._sum.creditAmount || 0);
    }
  });
  globalCustomerPayments.forEach((g) => {
    customerBalances.set(g.customerId, (customerBalances.get(g.customerId) || 0) - (g._sum.amount || 0));
  });

  const supplierDebts = new Map<string, number>();
  globalSupplierPurchases.forEach((g) => {
    supplierDebts.set(g.supplierId, g._sum.debtAmount || 0);
  });
  globalSupplierPayments.forEach((g) => {
    supplierDebts.set(g.supplierId, (supplierDebts.get(g.supplierId) || 0) - (g._sum.amount || 0));
  });

  // Chronological running balance maps for ledger/payment outputs
  const [allGlobalSales, allGlobalCustomerPayments, allGlobalPurchases, allGlobalSupplierPayments] = await Promise.all([
    prisma.sale.findMany({
      where: { creditAmount: { gt: 0 } },
      select: { customerId: true, creditAmount: true, saleDate: true, createdAt: true },
    }),
    prisma.customerPayment.findMany({
      select: { id: true, customerId: true, amount: true, paymentDate: true, createdAt: true },
    }),
    prisma.purchase.findMany({
      where: { debtAmount: { gt: 0 } },
      select: { supplierId: true, debtAmount: true, purchaseDate: true, createdAt: true },
    }),
    prisma.supplierPayment.findMany({
      select: { id: true, supplierId: true, amount: true, paymentDate: true, createdAt: true },
    }),
  ]);

  const salesByCustomer = new Map<string, typeof allGlobalSales>();
  allGlobalSales.forEach(s => {
    if (!salesByCustomer.has(s.customerId)) salesByCustomer.set(s.customerId, []);
    salesByCustomer.get(s.customerId)!.push(s);
  });
  
  const paymentsByCustomer = new Map<string, typeof allGlobalCustomerPayments>();
  allGlobalCustomerPayments.forEach(p => {
    if (!paymentsByCustomer.has(p.customerId)) paymentsByCustomer.set(p.customerId, []);
    paymentsByCustomer.get(p.customerId)!.push(p);
  });

  const runningBalances = new Map<string, number>();
  customers.forEach(customer => {
    const custSales = salesByCustomer.get(customer.id) || [];
    const custPayments = paymentsByCustomer.get(customer.id) || [];
    
    const events: Array<{ type: 'CREDIT' | 'PAYMENT'; date: Date; amount: number; id?: string }> = [
      ...custSales.map(s => ({ type: 'CREDIT' as const, date: new Date(s.saleDate || s.createdAt), amount: s.creditAmount })),
      ...custPayments.map(p => ({ type: 'PAYMENT' as const, date: new Date(p.paymentDate || p.createdAt), amount: p.amount, id: p.id }))
    ];
    
    events.sort((a, b) => {
      const timeDiff = a.date.getTime() - b.date.getTime();
      if (timeDiff !== 0) return timeDiff;
      if (a.type === 'CREDIT' && b.type === 'PAYMENT') return -1;
      if (a.type === 'PAYMENT' && b.type === 'CREDIT') return 1;
      return 0;
    });
    
    let bal = 0;
    events.forEach(e => {
      if (e.type === 'CREDIT') {
        bal += e.amount;
      } else {
        bal -= e.amount;
        if (e.id) {
          runningBalances.set(e.id, bal);
        }
      }
    });
  });

  const purchasesBySupplier = new Map<string, typeof allGlobalPurchases>();
  allGlobalPurchases.forEach(p => {
    if (!purchasesBySupplier.has(p.supplierId)) purchasesBySupplier.set(p.supplierId, []);
    purchasesBySupplier.get(p.supplierId)!.push(p);
  });

  const paymentsBySupplier = new Map<string, typeof allGlobalSupplierPayments>();
  allGlobalSupplierPayments.forEach(p => {
    if (!paymentsBySupplier.has(p.supplierId)) paymentsBySupplier.set(p.supplierId, []);
    paymentsBySupplier.get(p.supplierId)!.push(p);
  });

  const supplierRunningBalances = new Map<string, number>();
  suppliers.forEach(supplier => {
    const suppPurchases = purchasesBySupplier.get(supplier.id) || [];
    const suppPayments = paymentsBySupplier.get(supplier.id) || [];
    
    const events: Array<{ type: 'DEBT' | 'PAYMENT'; date: Date; amount: number; id?: string }> = [
      ...suppPurchases.map(p => ({ type: 'DEBT' as const, date: new Date(p.purchaseDate || p.createdAt), amount: p.debtAmount })),
      ...suppPayments.map(p => ({ type: 'PAYMENT' as const, date: new Date(p.paymentDate || p.createdAt), amount: p.amount, id: p.id }))
    ];
    
    events.sort((a, b) => {
      const timeDiff = a.date.getTime() - b.date.getTime();
      if (timeDiff !== 0) return timeDiff;
      if (a.type === 'DEBT' && b.type === 'PAYMENT') return -1;
      if (a.type === 'PAYMENT' && b.type === 'DEBT') return 1;
      return 0;
    });
    
    let bal = 0;
    events.forEach(e => {
      if (e.type === 'DEBT') {
        bal += e.amount;
      } else {
        bal -= e.amount;
        if (e.id) {
          supplierRunningBalances.set(e.id, bal);
        }
      }
    });
  });

  const availableLocationIds = currentUser.assignedLocations || locations.map((location) => location.id);
  const currentLocation =
    locations.find((location) => location.id === currentUser.locationId && availableLocationIds.includes(location.id)) ||
    locations.find((location) => availableLocationIds.includes(location.id)) ||
    locations[0] ||
    null;

  const allPermissionIds = permissions.map((permission) => permission.id);
  const canViewUsers = hasPermission(currentUser, "admin.users.view");
  const canViewRoles = hasPermission(currentUser, "admin.roles.view");
  const canViewPermissions = hasPermission(currentUser, "admin.permissions.view") || canViewRoles;
  const canViewSettings = hasPermission(currentUser, "admin.settings.view");

  return NextResponse.json({
    currentLocation,
    locations: locations.map((location) => ({ id: location.id, name: location.name, type: location.type })),
    categories: categories
      .filter((category) => !isUncategorizedCategory(category))
      .map((category) => ({ id: category.id, name: category.name })),
    units: units.map((unit) => ({ id: unit.id, name: unit.name, shortName: unit.shortName })),
    products: products.map((item) => ({
      id: item.id,
      name: item.name,
      categoryId: categoryDisplayId(item.categoryId, item.category),
      category: categoryDisplayName(item.category),
      unitId: item.unitId,
      unitName: item.unit.name,
      unitShortName: item.unit.shortName,
      unit: item.unit.shortName,
      code: item.code || "",
      barcode: item.barcode || "",
      price: item.defaultSellingPrice,
      buyingPrice: item.defaultBuyingPrice,
      lowStockAlert: item.lowStockAlert,
      status: item.isActive ? "Active" : "Inactive",
    })),
    items: [...stockByItemLocation.values()],
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone || "-",
      email: "",
      balance: Math.max(0, customerBalances.get(customer.id) || 0),
    })),
    suppliers: suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      contact: "",
      phone: supplier.phone || "-",
      debt: Math.max(0, supplierDebts.get(supplier.id) || 0),
    })),
    bankAccounts: bankAccounts.map((account) => ({
      id: account.id,
      displayName: account.displayName,
      bankName: account.bankName || "Internal",
      accountNumber: account.accountNumber || "",
      currentBalance: account.currentBalance,
      accountType: account.accountType,
    })),
    sales: salesWithBankAccounts.map((sale) => ({
      id: sale.id,
      customerId: sale.customerId,
      locationId: sale.locationId,
      saleDate: sale.saleDate,
      subTotal: sale.subTotal,
      discount: sale.discount,
      totalAmount: sale.totalAmount,
      cashAmount: sale.cashAmount,
      bankAmount: sale.bankAmount,
      creditAmount: sale.creditAmount,
      paymentMethod: sale.cashAmount > 0 && sale.bankAmount > 0 ? "MIXED" : sale.bankAmount > 0 ? "BANK" : sale.creditAmount > 0 ? "CREDIT" : "CASH",
      bankAccountId: sale.bankAccountId,
      bankAccount: sale.bankAccount,
      items: sale.items.map((line) => ({
        id: line.id,
        itemId: line.itemId,
        qty: line.quantity,
        price: line.sellingPrice,
        discount: line.discount,
        total: line.totalAmount,
      })),
    })),
    purchases: purchases.map((purchase) => {
      const bankTx = bankTransactions.find((tx) => tx.referenceNo === purchase.id && tx.type === "SUPPLIER_PAYMENT");
      const cashAmount = bankTx ? Math.max(0, purchase.paidAmount - bankTx.amount) : purchase.paidAmount;
      const bankAmount = bankTx?.amount || 0;
      return {
        id: purchase.id,
        supplierId: purchase.supplierId,
        locationId: purchase.locationId,
        purchaseDate: purchase.purchaseDate,
        totalAmount: purchase.totalAmount,
        paidAmount: purchase.paidAmount,
        cashAmount,
        bankAmount,
        debtAmount: purchase.debtAmount,
        paymentMethod: cashAmount > 0 && bankAmount > 0 ? "MIXED" : bankAmount > 0 ? "BANK" : purchase.debtAmount === purchase.totalAmount ? "CREDIT" : "CASH",
        bankAccountId: bankTx?.bankAccountId,
        items: purchase.items.map((line) => ({
          id: line.id,
          itemId: line.itemId,
          qty: line.quantity,
          unitCost: line.buyingPrice,
          sellingPrice: line.sellingPrice,
          total: line.totalAmount,
        })),
      };
    }),
    expenses: expenses.map((expense) => ({
      id: expense.id,
      category: expense.category || "Expense",
      amount: expense.amount,
      date: expense.expenseDate,
      description: expense.name,
      paymentMethod: expense.paymentMethod,
      bankAccountId: expense.bankAccountId || undefined,
      locationId: expense.locationId,
    })),
    customerPayments: customerPayments.map((payment) => {
      const creator = users.find(u => u.id === payment.createdById);
      return {
        id: payment.id,
        customerId: payment.customerId,
        amount: payment.amount,
        date: payment.paymentDate,
        method: payment.paymentMethod,
        bankAccountId: payment.bankAccountId || undefined,
        note: payment.note || undefined,
        createdBy: creator ? `${creator.firstName} ${creator.lastName || ""}`.trim() : "System",
        remainingBalance: runningBalances.get(payment.id) ?? 0,
      };
    }),
    supplierPayments: supplierPayments.map((payment) => {
      const creator = users.find(u => u.id === payment.createdById);
      return {
        id: payment.id,
        supplierId: payment.supplierId,
        amount: payment.amount,
        date: payment.paymentDate,
        method: payment.paymentMethod,
        bankAccountId: payment.bankAccountId || undefined,
        note: payment.note || undefined,
        createdBy: creator ? `${creator.firstName} ${creator.lastName || ""}`.trim() : "System",
        remainingBalance: supplierRunningBalances.get(payment.id) ?? 0,
      };
    }),
    cashTransfers: bankTransactions.filter((tx) => tx.type === "CASH_TO_BANK").map((tx) => ({
      id: tx.id,
      locationId: tx.locationId,
      bankAccountId: tx.bankAccountId,
      amount: tx.amount,
      referenceNo: tx.referenceNo || tx.id,
      date: tx.transactionDate,
      note: tx.description || "",
    })),
    transfers: transfers.flatMap((transfer) => transfer.items.map((line) => ({
      id: transfer.id,
      fromLocationId: transfer.sourceLocationId,
      toLocationId: transfer.destinationLocationId,
      itemId: line.itemId,
      quantity: line.quantity,
      date: transfer.transferDate,
      status: transfer.status,
    }))),
    inventoryMovements: inventoryMovements.map((movement) => ({
      id: movement.id,
      itemId: movement.itemId,
      locationId: movement.locationId,
      itemName: movement.item.name,
      itemCode: movement.item.code || "",
      categoryId: categoryDisplayId(movement.item.categoryId, movement.item.category),
      category: categoryDisplayName(movement.item.category),
      unitId: movement.item.unitId,
      unitName: movement.item.unit.name,
      unitShortName: movement.item.unit.shortName,
      unit: movement.item.unit.shortName,
      locationName: movement.location.name,
      locationType: movement.location.type,
      type: movement.type,
      quantity: movement.quantity,
      beforeQuantity: movement.beforeQuantity,
      afterQuantity: movement.afterQuantity,
      referenceType: movement.referenceType || "",
      referenceId: movement.referenceId || "",
      note: movement.note || "",
      createdAt: movement.createdAt,
    })),
    users: canViewUsers ? users.map((user) => toAppUser(user, locations)) : [],
    roles: canViewRoles ? roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description || "",
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissionIds: role.name === "Super Admin" ? allPermissionIds : role.permissions.map((entry) => entry.permissionId),
      permissions: (role.name === "Super Admin" ? permissions : role.permissions.map((entry) => entry.permission)).map((permission) => ({
        ...permission,
        name: formatPermissionLabel(permission),
      })),
    })) : [],
    permissions: canViewPermissions ? permissions.map((permission) => ({
      id: permission.id,
      key: permission.key,
      name: formatPermissionLabel(permission),
      label: permission.label,
      module: permission.module,
      usageCount: permission._count.roles + permission._count.users,
    })) : [],
    settings: canViewSettings ? {
      companyName: settingValue.companyName || "",
      companyEmail: settingValue.companyEmail || "",
      companyPhone: settingValue.companyPhone || "",
      companyAddress: settingValue.companyAddress || "",
      currency: settingValue.currency || "",
      taxRate: Number(settingValue.taxRate || 0),
      lowStockThreshold: Number(settingValue.lowStockThreshold || 0),
      enableNotifications: settingValue.enableNotifications === "true",
      enableEmailAlerts: settingValue.enableEmailAlerts === "true",
    } : {},
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    await ensureDefaultPermissionsAndRoles();

    const { action, payload } = await request.json();
    const actorId = await getActorId(currentUser);
    const requiredPermission = ACTION_PERMISSIONS[action];
    if (requiredPermission && !hasPermission(currentUser, requiredPermission)) {
      return NextResponse.json({ ok: false, error: "You do not have permission to perform this action." }, { status: 403 });
    }

  if (action === "addCustomer") {
    const customer = await prisma.customer.create({
      data: {
        name: payload.name,
        phone: payload.phone === "-" ? null : payload.phone,
        address: payload.email || null,
      },
    });
    return NextResponse.json({ ok: true, id: customer.id });
  }

  if (action === "updateCustomer") {
    await prisma.customer.update({
      where: { id: payload.id },
      data: {
        name: payload.name,
        phone: payload.phone === "-" ? null : payload.phone || null,
        address: payload.email || null,
        note: payload.note || null,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "addSupplier") {
    const supplier = await prisma.supplier.create({
      data: { name: payload.name, phone: payload.phone === "-" ? null : payload.phone, note: payload.contact || null },
    });
    return NextResponse.json({ ok: true, id: supplier.id });
  }

  if (action === "updateSupplier") {
    await prisma.supplier.update({
      where: { id: payload.id },
      data: {
        name: payload.name,
        phone: payload.phone === "-" ? null : payload.phone || null,
        note: payload.contact || payload.note || null,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "addItem") {
    const categoryName = String(payload.category || "").trim();
    const unitName = String(payload.unit || "").trim();
    const category =
      payload.categoryId
        ? await prisma.category.findUnique({ where: { id: payload.categoryId } })
        : categoryName
          ? await prisma.category.findFirst({ where: { name: categoryName } })
          : null;
    const resolvedCategory = category || await prisma.category.upsert({
      where: { id: categoryName ? `cat-${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "cat-uncategorized" },
      update: { name: categoryName || UNCATEGORIZED_CATEGORY_NAME },
      create: {
        id: categoryName ? `cat-${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "cat-uncategorized",
        name: categoryName || UNCATEGORIZED_CATEGORY_NAME,
      },
    });
    const unit =
      payload.unitId
        ? await prisma.unit.findUnique({ where: { id: payload.unitId } })
        : unitName
          ? await prisma.unit.findFirst({ where: { name: unitName } })
          : null;
    if (!unit && !unitName) {
      return NextResponse.json({ ok: false, error: "Unit is required." }, { status: 400 });
    }
    const resolvedUnit = unit || await prisma.unit.create({
      data: {
        name: unitName,
        shortName: unitName,
      },
    });
    const item = await prisma.item.create({
      data: {
        name: payload.name,
        code: payload.code || null,
        categoryId: resolvedCategory.id,
        unitId: resolvedUnit.id,
        defaultBuyingPrice: Number(payload.buyingPrice || payload.price || 0),
        defaultSellingPrice: Number(payload.price || payload.sellingPrice || 0),
        lowStockAlert: Number(payload.lowStockAlert || 10),
      },
    });
    if (Number(payload.stock || 0) > 0 && payload.locationId) {
      await prisma.inventoryBatch.create({
        data: {
          itemId: item.id,
          locationId: payload.locationId,
          quantityIn: Number(payload.stock),
          remainingQuantity: Number(payload.stock),
          buyingPrice: Number(payload.buyingPrice || payload.price || 0),
          sellingPrice: Number(payload.price || payload.sellingPrice || 0),
          batchCode: "OPENING",
        },
      });
    }
    return NextResponse.json({ ok: true, id: item.id });
  }

  if (action === "addCategory") {
    const name = String(payload.name || "").trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "Category name is required." }, { status: 400 });
    }
    const existing = await prisma.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ ok: true, id: existing.id });
    }
    const category = await prisma.category.create({ data: { name } });
    return NextResponse.json({ ok: true, id: category.id });
  }

  if (action === "addUnit") {
    const name = String(payload.name || "").trim();
    const shortName = String(payload.shortName || payload.name || "").trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "Unit name is required." }, { status: 400 });
    }
    const existing = await prisma.unit.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ ok: true, id: existing.id });
    }
    const unit = await prisma.unit.create({
      data: {
        name,
        shortName: shortName.slice(0, 12) || name.slice(0, 3).toUpperCase(),
      },
    });
    return NextResponse.json({ ok: true, id: unit.id });
  }

  if (action === "addLocation") {
    const location = await prisma.location.create({
      data: { name: payload.name, type: payload.type || "SHOP", location: payload.location || null },
    });
    return NextResponse.json({ ok: true, id: location.id });
  }

  if (action === "updateSettings") {
    await Promise.all(Object.entries(payload).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      }),
    ));
    return NextResponse.json({ ok: true });
  }

  if (action === "addUser") {
    if (!payload.password || String(payload.password).length < 4) {
      return NextResponse.json({ ok: false, error: "Password is required and must be at least 4 characters long." }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(String(payload.password), 10);
    const locationId = payload.assignedLocations?.[0] || (await prisma.location.findFirstOrThrow()).id;
    const assignedLocationIds = Array.isArray(payload.assignedLocations) ? payload.assignedLocations.filter(Boolean).join(",") : locationId;
    const role = payload.roleId
      ? await prisma.role.findUnique({ where: { id: payload.roleId } })
      : await prisma.role.findUnique({ where: { name: payload.role === "Super Admin" ? "Super Admin" : payload.role || "Sales" } });
    const user = await prisma.user.create({
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        username: payload.username,
        phone: payload.phone || null,
        passwordHash,
        role: role?.name === "Super Admin" ? "ADMIN" : role?.name || payload.role || "SALES",
        location: { connect: { id: locationId } },
        ...(role?.id ? { roleRecord: { connect: { id: role.id } } } : {})
      },
    });
    return NextResponse.json({ ok: true, id: user.id });
  }

  if (action === "updateUser") {
    const nextPassword = String(payload.password || "").trim();
    const data: {
      firstName: string;
      lastName: string | null;
      username: string;
      phone: string | null;
      role: string;
      roleId?: string | null;
      locationId?: string;
      passwordHash?: string;
    } = {
      firstName: payload.firstName,
      lastName: payload.lastName || null,
      username: payload.username,
      phone: payload.phone || null,
      role: payload.role === "Super Admin" ? "ADMIN" : payload.role || "SALES",
    };
    const role = payload.roleId
      ? await prisma.role.findUnique({ where: { id: payload.roleId } })
      : await prisma.role.findUnique({ where: { name: payload.role === "Super Admin" ? "Super Admin" : payload.role || "Sales" } });
    if (role) {
      data.role = role.name === "Super Admin" ? "ADMIN" : role.name;
      (data as any).roleRecord = { connect: { id: role.id } };
    } else {
      (data as any).roleRecord = { disconnect: true };
    }
    
    if (Array.isArray(payload.assignedLocations)) {
      if (payload.assignedLocations[0]) {
        (data as any).location = { connect: { id: payload.assignedLocations[0] } };
      }
    } else if (payload.assignedLocations?.[0]) {
      (data as any).location = { connect: { id: payload.assignedLocations[0] } };
    }
    
    if (nextPassword) {
      if (nextPassword.length < 4) {
        return NextResponse.json({ ok: false, error: "New password must be at least 4 characters long." }, { status: 400 });
      }
      data.passwordHash = await bcrypt.hash(nextPassword, 10);
    }
    await prisma.user.update({
      where: { id: payload.id },
      data: data as any,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "addRole" || action === "updateRole") {
    const name = String(payload.name || "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "Role name is required." }, { status: 400 });

    const permissionIds = Array.isArray(payload.permissionIds) ? payload.permissionIds.filter(Boolean) : [];
    const data = {
      name,
      description: payload.description || null,
    };

    const existingRole = action === "updateRole" ? await prisma.role.findUnique({ where: { id: payload.id } }) : null;
    if (existingRole?.name === "Super Admin") {
      const role = await prisma.role.update({
        where: { id: existingRole.id },
        data: { description: payload.description || existingRole.description },
      });
      return NextResponse.json({ ok: true, id: role.id });
    }

    const role = action === "addRole"
      ? await prisma.role.create({ data })
      : await prisma.role.update({ where: { id: payload.id }, data });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId: string) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ ok: true, id: role.id });
  }

  if (action === "deleteRole") {
    const role = await prisma.role.findUnique({ where: { id: payload.id }, include: { _count: { select: { users: true } } } });
    if (!role) return NextResponse.json({ ok: false, error: "Role was not found." }, { status: 404 });
    if (role.isSystem || role.name === "Super Admin") return NextResponse.json({ ok: false, error: "System roles cannot be deleted." }, { status: 400 });
    if (role._count.users > 0) return NextResponse.json({ ok: false, error: "Only unused roles can be deleted." }, { status: 400 });
    await prisma.role.update({ where: { id: role.id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  }

  if (action === "changePassword") {
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive) {
      return NextResponse.json({ ok: false, error: "User account was not found." }, { status: 404 });
    }
    if (!(await bcrypt.compare(String(payload.currentPassword || ""), user.passwordHash))) {
      return NextResponse.json({ ok: false, error: "Current password does not match." }, { status: 400 });
    }
    if (String(payload.newPassword || "").length < 4) {
      return NextResponse.json({ ok: false, error: "New password must be at least 4 characters long." }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(String(payload.newPassword), 10) },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "addBankAccount") {
    const account = await prisma.bankAccount.create({
      data: {
        displayName: payload.displayName,
        bankName: payload.bankName || null,
        accountNumber: payload.accountNumber || null,
        currentBalance: Number(payload.currentBalance || 0),
        accountType: payload.accountType || "BANK",
      },
    });
    return NextResponse.json({ ok: true, id: account.id });
  }

  if (action === "updateBankAccount") {
    await prisma.bankAccount.update({
      where: { id: payload.id },
      data: {
        displayName: payload.displayName,
        bankName: payload.bankName || null,
        accountNumber: payload.accountNumber || null,
        currentBalance: Number(payload.currentBalance || 0),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "deleteBankAccount") {
    const used = await prisma.bankTransaction.count({ where: { bankAccountId: payload.id } });
    const account = await prisma.bankAccount.findUnique({ where: { id: payload.id } });
    if (!account || account.accountType === CASH_ACCOUNT_TYPE || used > 0) {
      return NextResponse.json({ ok: false, error: "Only unused bank accounts can be deleted." }, { status: 400 });
    }
    await prisma.bankAccount.update({ where: { id: payload.id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  }

  if (action === "addExpense") {
    await prisma.$transaction(async (tx) => {
      await tx.expense.create({
        data: {
          locationId: payload.locationId,
          name: payload.description || payload.category,
          category: payload.category,
          amount: Number(payload.amount),
          paymentMethod: payload.paymentMethod,
          bankAccountId: payload.bankAccountId || null,
          expenseDate: asDate(payload.date),
          createdById: actorId,
        },
      });
      if (payload.paymentMethod === "BANK" && payload.bankAccountId) {
        await tx.bankAccount.update({ where: { id: payload.bankAccountId }, data: { currentBalance: { decrement: Number(payload.amount) } } });
        await tx.bankTransaction.create({
          data: {
            bankAccountId: payload.bankAccountId,
            locationId: payload.locationId,
            type: "WITHDRAW",
            amount: Number(payload.amount),
            description: payload.description || payload.category,
            createdById: actorId,
          },
        });
      }
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "addCashTransfer") {
    const amount = Number(payload.amount);
    await prisma.$transaction(async (tx) => {
      const cash = await tx.bankAccount.findFirstOrThrow({ where: { accountType: CASH_ACCOUNT_TYPE, isActive: true } });
      await tx.bankAccount.update({ where: { id: cash.id }, data: { currentBalance: { decrement: amount } } });
      await tx.bankAccount.update({ where: { id: payload.bankAccountId }, data: { currentBalance: { increment: amount } } });
      await tx.bankTransaction.create({
        data: {
          bankAccountId: payload.bankAccountId,
          locationId: payload.locationId,
          type: "CASH_TO_BANK",
          amount,
          referenceNo: payload.referenceNo,
          description: payload.note || "Cash drawer deposit",
          transactionDate: asDate(payload.date),
          createdById: actorId,
        },
      });
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "addPurchase") {
    const result = await prisma.$transaction(async (tx) => {
      const purchaseRef = generateReference("P");
      const purchase = await tx.purchase.create({
        data: {
          supplierId: payload.supplierId,
          locationId: payload.locationId,
          invoiceNo: purchaseRef,
          purchaseDate: asDate(payload.purchaseDate),
          totalAmount: Number(payload.totalAmount),
          paidAmount: Number(payload.paidAmount || 0),
          debtAmount: Number(payload.debtAmount || 0),
          paymentStatus: payload.debtAmount > 0 ? "PARTIAL" : "PAID",
          createdById: actorId,
        },
      });

      for (const line of payload.items || []) {
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            itemId: line.itemId,
            quantity: Number(line.qty),
            buyingPrice: Number(line.unitCost),
            sellingPrice: Number(line.sellingPrice),
            totalAmount: Number(line.total),
          },
        });
        const before = await tx.inventoryBatch.aggregate({
          where: { itemId: line.itemId, locationId: payload.locationId },
          _sum: { remainingQuantity: true },
        });
        await tx.inventoryBatch.create({
          data: {
            itemId: line.itemId,
            locationId: payload.locationId,
            purchaseItemId: undefined,
            quantityIn: Number(line.qty),
            remainingQuantity: Number(line.qty),
            buyingPrice: Number(line.unitCost),
            sellingPrice: Number(line.sellingPrice),
            batchCode: purchase.id,
          },
        });
        await tx.inventoryMovement.create({
          data: {
            itemId: line.itemId,
            locationId: payload.locationId,
            type: "PURCHASE",
            quantity: Number(line.qty),
            beforeQuantity: before._sum.remainingQuantity || 0,
            afterQuantity: (before._sum.remainingQuantity || 0) + Number(line.qty),
            referenceType: "PURCHASE",
            referenceId: purchase.id,
            createdById: actorId,
          },
        });
      }

      if (Number(payload.bankAmount || 0) > 0 && payload.bankAccountId) {
        await tx.bankAccount.update({ where: { id: payload.bankAccountId }, data: { currentBalance: { decrement: Number(payload.bankAmount) } } });
        await tx.bankTransaction.create({
          data: {
            bankAccountId: payload.bankAccountId,
            locationId: payload.locationId,
            type: "SUPPLIER_PAYMENT",
            amount: Number(payload.bankAmount),
            referenceNo: purchase.id,
            description: `Purchase ${purchase.invoiceNo || purchase.id}`,
            transactionDate: purchase.purchaseDate,
            createdById: actorId,
          },
        });
      }
      return purchase;
    });
    return NextResponse.json({ ok: true, id: result.id, invoiceNo: result.invoiceNo });
  }

  if (action === "addSale") {
    const result = await prisma.$transaction(async (tx) => {
      const saleRef = generateReference("S");
      for (const line of payload.items) {
        const available = await tx.inventoryBatch.aggregate({
          where: { itemId: line.itemId, locationId: payload.locationId, remainingQuantity: { gt: 0 } },
          _sum: { remainingQuantity: true },
        });
        if ((available._sum.remainingQuantity || 0) < Number(line.qty)) {
          throw new Error("Not enough stock for selected item.");
        }
      }

      if (Number(payload.bankAmount || 0) > 0 && !payload.bankAccountId) {
        throw new Error("Please select a bank account for bank payments.");
      }

      const sale = await tx.sale.create({
        data: {
          locationId: payload.locationId,
          customerId: payload.customerId || null,
          voucherCode: saleRef,
          saleDate: asDate(payload.saleDate),
          subTotal: Number(payload.subTotal),
          discount: Number(payload.discount || 0),
          totalAmount: Number(payload.totalAmount),
          cashAmount: Number(payload.cashAmount || 0),
          bankAmount: Number(payload.bankAmount || 0),
          creditAmount: Number(payload.creditAmount || 0),
          paymentStatus: payload.creditAmount > 0 ? "PARTIAL" : "PAID",
          createdById: actorId,
        },
      });

      if (Number(payload.creditAmount || 0) > 0 && payload.customerId) {
        await captureCredit(tx, {
          saleId: sale.id,
          customerId: payload.customerId,
          amount: Number(payload.creditAmount),
          locationId: payload.locationId,
          createdById: actorId,
        });
      }

      for (const line of payload.items) {
        let remaining = Number(line.qty);
        const batches = await tx.inventoryBatch.findMany({
          where: { itemId: line.itemId, locationId: payload.locationId, remainingQuantity: { gt: 0 } },
          orderBy: { createdAt: "asc" },
        });
        for (const batch of batches) {
          if (remaining <= 0) break;
          const qty = Math.min(remaining, batch.remainingQuantity);
          const before = batch.remainingQuantity;
          await tx.inventoryBatch.update({ where: { id: batch.id }, data: { remainingQuantity: { decrement: qty } } });
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              itemId: line.itemId,
              inventoryBatchId: batch.id,
              quantity: qty,
              sellingPrice: Number(line.price),
              discount: Number(line.discount || 0),
              totalAmount: Number(line.price) * qty - Number(line.discount || 0),
            },
          });
          await tx.inventoryMovement.create({
            data: {
              itemId: line.itemId,
              locationId: payload.locationId,
              type: "SALE",
              quantity: -qty,
              beforeQuantity: before,
              afterQuantity: before - qty,
              referenceType: "SALE",
              referenceId: sale.id,
              createdById: actorId,
            },
          });
          remaining -= qty;
        }
      }

      if (Number(payload.bankAmount || 0) > 0 && payload.bankAccountId) {
        await tx.bankAccount.update({ where: { id: payload.bankAccountId }, data: { currentBalance: { increment: Number(payload.bankAmount) } } });
        await tx.bankTransaction.create({
          data: {
            bankAccountId: payload.bankAccountId,
            locationId: payload.locationId,
            type: "SALE_PAYMENT",
            amount: Number(payload.bankAmount),
            referenceNo: sale.id,
            description: `Sale ${sale.voucherCode}`,
            transactionDate: sale.saleDate,
            createdById: actorId,
          },
        });
      }
      return sale;
    });
    return NextResponse.json({ ok: true, id: result.id, voucherCode: result.voucherCode });
  }

  if (action === "addCustomerPayment" || action === "settleCredit") {
    const { payment, remainingBalance } = await prisma.$transaction(async (tx) => {
      const p = await settleCredit(tx, {
        customerId: payload.customerId,
        amount: Number(payload.amount),
        paymentMethod: payload.method || payload.paymentMethod,
        bankAccountId: payload.bankAccountId,
        locationId: payload.locationId || (await tx.location.findFirst()).id,
        createdById: actorId,
        date: payload.date ? asDate(payload.date) : new Date(),
        note: payload.note || payload.description,
      });
      const bal = await getCustomerOutstandingCredit(tx, payload.customerId);
      return { payment: p, remainingBalance: bal };
    });
    return NextResponse.json({
      ok: true,
      id: payment.id,
      remainingBalance,
      message: `Customer payment of ETB ${payload.amount.toLocaleString()} recorded successfully. Remaining credit balance: ETB ${remainingBalance.toLocaleString()}.`,
    });
  }

  if (action === "addSupplierPayment") {
    const amount = Number(payload.amount);
    if (!payload.supplierId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid supplier or amount." }, { status: 400 });
    }
    const result = await prisma.$transaction(async (tx) => {
      const locationId = payload.locationId || (await tx.location.findFirstOrThrow()).id;
      const payment = await tx.supplierPayment.create({
        data: {
          supplierId: payload.supplierId,
          locationId,
          amount,
          paymentMethod: payload.method || "CASH",
          bankAccountId: payload.bankAccountId || null,
          paymentDate: asDate(payload.date),
          createdById: actorId,
        },
      });
      if (payload.method === "BANK" && payload.bankAccountId) {
        const bankAccount = await tx.bankAccount.findUniqueOrThrow({ where: { id: payload.bankAccountId } });
        if (bankAccount.currentBalance < amount) {
          throw new Error(`Insufficient bank balance. Available: ${bankAccount.currentBalance}, Required: ${amount}`);
        }
        await tx.bankAccount.update({ where: { id: payload.bankAccountId }, data: { currentBalance: { decrement: amount } } });
      }
      return payment;
    });
    return NextResponse.json({ ok: true, id: result.id });
  }

  if (action === "addTransfer") {
    if (!hasPermission(currentUser, "inventory.transfers.create")) {
      return NextResponse.json({ ok: false, error: "You do not have permission to create stock transfers." }, { status: 403 });
    }

    const allowedLocationIds = currentUser.role === "Super Admin"
      ? (await prisma.location.findMany({ where: { isActive: true }, select: { id: true } })).map((location) => location.id)
      : currentUser.assignedLocations || [currentUser.locationId].filter(Boolean);

    if (!allowedLocationIds.includes(payload.fromLocationId)) {
      return NextResponse.json({ ok: false, error: "You cannot transfer stock from this location." }, { status: 403 });
    }
    if (!allowedLocationIds.includes(payload.toLocationId)) {
      return NextResponse.json({ ok: false, error: "You cannot transfer stock to this location." }, { status: 403 });
    }
    if (payload.fromLocationId === payload.toLocationId) {
      return NextResponse.json({ ok: false, error: "Source and destination locations must be different." }, { status: 400 });
    }

    // Support both single item payload and array of items payload
    const transferItemsInput: Array<{ itemId: string; quantity: number }> = payload.items 
      ? payload.items.map((i: any) => ({ itemId: String(i.itemId), quantity: Number(i.quantity) }))
      : [{ itemId: String(payload.itemId), quantity: Number(payload.quantity) }];

    // Validate items input
    if (transferItemsInput.length === 0) {
      return NextResponse.json({ ok: false, error: "At least one item must be selected for transfer." }, { status: 400 });
    }

    for (const item of transferItemsInput) {
      if (!item.itemId || !Number.isFinite(item.quantity) || item.quantity <= 0) {
        return NextResponse.json({ ok: false, error: "All items must have valid selections and positive quantities." }, { status: 400 });
      }
    }

    const transfer = await prisma.$transaction(async (tx) => {
      // 1. Verify stock availability for all items first
      for (const item of transferItemsInput) {
        const available = await tx.inventoryBatch.aggregate({
          where: { itemId: item.itemId, locationId: payload.fromLocationId, remainingQuantity: { gt: 0 } },
          _sum: { remainingQuantity: true },
        });
        if ((available._sum.remainingQuantity || 0) < item.quantity) {
          throw new Error(`Not enough stock to transfer for item: ${item.itemId}`);
        }
      }

      // 2. Create the main transfer record
      const record = await tx.transfer.create({
        data: {
          sourceLocationId: payload.fromLocationId,
          destinationLocationId: payload.toLocationId,
          status: payload.status || "COMPLETED",
          transferDate: asDate(payload.date),
          createdById: actorId,
        },
      });

      // 3. Process each item
      for (const item of transferItemsInput) {
        // Create transfer item
        await tx.transferItem.create({
          data: { transferId: record.id, itemId: item.itemId, quantity: item.quantity },
        });

        // Get available batches at source
        const batches = await tx.inventoryBatch.findMany({
          where: { itemId: item.itemId, locationId: payload.fromLocationId, remainingQuantity: { gt: 0 } },
          orderBy: { createdAt: "asc" },
        });

        // Get aggregate stock levels before transfer for movement log
        const sourceBeforeTotalAgg = await tx.inventoryBatch.aggregate({
          where: { itemId: item.itemId, locationId: payload.fromLocationId, remainingQuantity: { gt: 0 } },
          _sum: { remainingQuantity: true },
        });
        const sourceBeforeTotal = sourceBeforeTotalAgg._sum.remainingQuantity || 0;

        const destinationBeforeAgg = await tx.inventoryBatch.aggregate({
          where: { itemId: item.itemId, locationId: payload.toLocationId },
          _sum: { remainingQuantity: true },
        });
        const destinationBeforeTotal = destinationBeforeAgg._sum.remainingQuantity || 0;

        let remaining = item.quantity;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const qty = Math.min(remaining, batch.remainingQuantity);
          await tx.inventoryBatch.update({ where: { id: batch.id }, data: { remainingQuantity: { decrement: qty } } });
          await tx.inventoryBatch.create({
            data: {
              itemId: item.itemId,
              locationId: payload.toLocationId,
              quantityIn: qty,
              remainingQuantity: qty,
              buyingPrice: batch.buyingPrice,
              sellingPrice: batch.sellingPrice,
              batchCode: record.id,
            },
          });
          remaining -= qty;
        }
        if (remaining > 0) throw new Error(`Not enough stock to transfer for item: ${item.itemId}`);

        // Write inventory movement logs
        await tx.inventoryMovement.create({
          data: {
            itemId: item.itemId,
            locationId: payload.fromLocationId,
            type: "TRANSFER_OUT",
            quantity: -item.quantity,
            beforeQuantity: sourceBeforeTotal,
            afterQuantity: sourceBeforeTotal - item.quantity,
            referenceType: "TRANSFER",
            referenceId: record.id,
            note: payload.note || null,
            createdById: actorId,
          },
        });
        await tx.inventoryMovement.create({
          data: {
            itemId: item.itemId,
            locationId: payload.toLocationId,
            type: "TRANSFER_IN",
            quantity: item.quantity,
            beforeQuantity: destinationBeforeTotal,
            afterQuantity: destinationBeforeTotal + item.quantity,
            referenceType: "TRANSFER",
            referenceId: record.id,
            note: payload.note || null,
            createdById: actorId,
          },
        });
      }

      return record;
    });
    return NextResponse.json({ ok: true, id: transfer.id });
  }

  if (action === "adjustStock") {
    if (currentUser.role !== "Super Admin") {
      return NextResponse.json({ ok: false, error: "Only Super Admin can adjust stock." }, { status: 403 });
    }

    const quantity = Number(payload.quantity);
    const reason = String(payload.reason || "").trim();
    if (!payload.itemId || !payload.locationId || !Number.isFinite(quantity) || quantity < 0) {
      return NextResponse.json({ ok: false, error: "A valid item, location, and non-negative quantity are required." }, { status: 400 });
    }
    if (reason.length < 5) {
      return NextResponse.json({ ok: false, error: "Adjustment reason is required and must be descriptive." }, { status: 400 });
    }

    const adjustment = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUniqueOrThrow({ where: { id: payload.itemId } });
      await tx.location.findUniqueOrThrow({ where: { id: payload.locationId } });

      const current = await tx.inventoryBatch.aggregate({
        where: { itemId: payload.itemId, locationId: payload.locationId },
        _sum: { remainingQuantity: true },
      });
      const beforeQuantity = current._sum.remainingQuantity || 0;
      const delta = quantity - beforeQuantity;

      if (delta > 0) {
        const latestBatch = await tx.inventoryBatch.findFirst({
          where: { itemId: payload.itemId, locationId: payload.locationId },
          orderBy: { createdAt: "desc" },
        });
        await tx.inventoryBatch.create({
          data: {
            itemId: payload.itemId,
            locationId: payload.locationId,
            quantityIn: delta,
            remainingQuantity: delta,
            buyingPrice: latestBatch?.buyingPrice ?? item.defaultBuyingPrice,
            sellingPrice: latestBatch?.sellingPrice ?? item.defaultSellingPrice,
            batchCode: `ADJ-${Date.now()}`,
          },
        });
      } else if (delta < 0) {
        let remainingDecrease = Math.abs(delta);
        const batchesToReduce = await tx.inventoryBatch.findMany({
          where: { itemId: payload.itemId, locationId: payload.locationId, remainingQuantity: { gt: 0 } },
          orderBy: { createdAt: "asc" },
        });

        for (const batch of batchesToReduce) {
          if (remainingDecrease <= 0) break;
          const decrease = Math.min(remainingDecrease, batch.remainingQuantity);
          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: { remainingQuantity: { decrement: decrease } },
          });
          remainingDecrease -= decrease;
        }
      }

      const movement = await tx.inventoryMovement.create({
        data: {
          itemId: payload.itemId,
          locationId: payload.locationId,
          type: "ADJUSTMENT",
          quantity: delta,
          beforeQuantity,
          afterQuantity: quantity,
          referenceType: "STOCK_ADJUSTMENT",
          referenceId: payload.referenceNo || null,
          note: reason,
          createdById: actorId,
        },
      });
      return movement;
    });

    return NextResponse.json({ ok: true, id: adjustment.id });
  }

  if (action === "addStockEntry") {
    const quantity = Number(payload.quantity);
    const buyingPrice = Number(payload.buyingPrice || 0);
    const sellingPrice = Number(payload.sellingPrice || 0);
    const note = String(payload.note || "Opening stock entry").trim();

    if (!payload.itemId || !payload.locationId || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ ok: false, error: "A valid item, location, and positive quantity are required." }, { status: 400 });
    }
    if (!Number.isFinite(buyingPrice) || buyingPrice < 0 || !Number.isFinite(sellingPrice) || sellingPrice < 0) {
      return NextResponse.json({ ok: false, error: "Buying and selling prices must be non-negative numbers." }, { status: 400 });
    }

    const stockEntry = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUniqueOrThrow({ where: { id: payload.itemId } });
      await tx.location.findUniqueOrThrow({ where: { id: payload.locationId } });

      const before = await tx.inventoryBatch.aggregate({
        where: { itemId: payload.itemId, locationId: payload.locationId },
        _sum: { remainingQuantity: true },
      });
      const beforeQuantity = before._sum.remainingQuantity || 0;

      const batch = await tx.inventoryBatch.create({
        data: {
          itemId: payload.itemId,
          locationId: payload.locationId,
          quantityIn: quantity,
          remainingQuantity: quantity,
          buyingPrice,
          sellingPrice,
          batchCode: payload.batchCode || `OPEN-${Date.now()}`,
        },
      });

      await tx.item.update({
        where: { id: item.id },
        data: {
          defaultBuyingPrice: buyingPrice,
          defaultSellingPrice: sellingPrice,
        },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          itemId: payload.itemId,
          locationId: payload.locationId,
          inventoryBatchId: batch.id,
          type: "OPENING_STOCK",
          quantity,
          beforeQuantity,
          afterQuantity: beforeQuantity + quantity,
          referenceType: "OPENING_STOCK",
          referenceId: batch.id,
          note,
          createdById: actorId,
        },
      });

      return { batchId: batch.id, movementId: movement.id };
    });

    return NextResponse.json({ ok: true, ...stockEntry });
  }

  if (action === "updateItemPrice") {
    const price = Number(payload.sellingPrice);
    if (!payload.itemId || !Number.isFinite(price) || price < 0) {
      return NextResponse.json({ ok: false, error: "A valid item and non-negative selling price are required." }, { status: 400 });
    }

    const updatedOpenBatches = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUniqueOrThrow({ where: { id: payload.itemId } });
      const batchWhere = {
        itemId: payload.itemId,
        ...(payload.locationId ? { locationId: payload.locationId } : {}),
        remainingQuantity: { gt: 0 },
      };

      await tx.item.update({
        where: { id: payload.itemId },
        data: { defaultSellingPrice: price },
      });

      const updatedBatches = await tx.inventoryBatch.updateMany({
        where: batchWhere,
        data: { sellingPrice: price },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          locationId: payload.locationId || null,
          action: "UPDATE",
          module: "Inventory",
          tableName: "Item",
          recordId: item.id,
          oldData: { defaultSellingPrice: item.defaultSellingPrice },
          newData: {
            defaultSellingPrice: price,
            updatedOpenBatches: updatedBatches.count,
            locationId: payload.locationId || null,
          },
        },
      });

      return updatedBatches.count;
    });

    return NextResponse.json({ ok: true, updatedOpenBatches });
  }

  if (action === "deleteCustomer") {
    await prisma.customer.update({ where: { id: payload.id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  }

  if (action === "deleteSupplier") {
    await prisma.supplier.update({ where: { id: payload.id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  }

  if (action === "deleteSale") {
    if (!payload.id) {
      return NextResponse.json({ ok: false, error: "Sale id is required." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: payload.id },
        include: {
          items: true,
          customerPayments: true,
        },
      });

      if (!sale) {
        throw new Error("Sale not found.");
      }

      const salePayments = await tx.bankTransaction.findMany({
        where: { referenceNo: sale.id, type: "SALE_PAYMENT" },
      });

      for (const payment of salePayments) {
        await tx.bankAccount.update({
          where: { id: payment.bankAccountId },
          data: { currentBalance: { decrement: payment.amount } },
        });
      }

      for (const line of sale.items) {
        await tx.inventoryBatch.update({
          where: { id: line.inventoryBatchId },
          data: { remainingQuantity: { increment: line.quantity } },
        });
      }

      await tx.inventoryMovement.deleteMany({
        where: {
          referenceType: "SALE",
          referenceId: sale.id,
        },
      });

      await tx.bankTransaction.deleteMany({
        where: { referenceNo: sale.id, type: "SALE_PAYMENT" },
      });

      await tx.customerPayment.updateMany({
        where: { saleId: sale.id },
        data: { saleId: null },
      });

      await tx.saleItem.deleteMany({ where: { saleId: sale.id } });
      await tx.sale.delete({ where: { id: sale.id } });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          locationId: sale.locationId,
          action: "DELETE",
          module: "Sales",
          tableName: "Sale",
          recordId: sale.id,
          oldData: {
            saleId: sale.id,
            voucherCode: sale.voucherCode,
            totalAmount: sale.totalAmount,
            restoredItems: sale.items.map((line) => ({
              itemId: line.itemId,
              inventoryBatchId: line.inventoryBatchId,
              quantity: line.quantity,
            })),
            removedBankTransactions: salePayments.map((payment) => ({
              id: payment.id,
              bankAccountId: payment.bankAccountId,
              amount: payment.amount,
            })),
          },
        },
      });

      return {
        restoredQuantity: sale.items.reduce((sum, line) => sum + line.quantity, 0),
        restoredLines: sale.items.length,
        removedBankTransactions: salePayments.length,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "deletePurchase") {
    return NextResponse.json({ ok: false, error: "Deleting production records is blocked. Use void/archive workflows instead." }, { status: 400 });
  }

  if (action === "deleteItem") {
    if (!payload.id) {
      return NextResponse.json({ ok: false, error: "Item id is required." }, { status: 400 });
    }

    const item = await prisma.item.findUnique({ where: { id: payload.id } });
    if (!item) {
      return NextResponse.json({ ok: false, error: "Item not found." }, { status: 404 });
    }

    const [batches, movements, purchaseItems, saleItems, transferItems] = await Promise.all([
      prisma.inventoryBatch.count({ where: { itemId: payload.id } }),
      prisma.inventoryMovement.count({ where: { itemId: payload.id } }),
      prisma.purchaseItem.count({ where: { itemId: payload.id } }),
      prisma.saleItem.count({ where: { itemId: payload.id } }),
      prisma.transferItem.count({ where: { itemId: payload.id } }),
    ]);
    const usageCount = batches + movements + purchaseItems + saleItems + transferItems;

    if (usageCount > 0) {
      return NextResponse.json(
        { ok: false, error: "This item has stock or transaction history, so it cannot be deleted. Only unused zero-stock items can be deleted." },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "DELETE",
          module: "Inventory",
          tableName: "Item",
          recordId: item.id,
          oldData: {
            id: item.id,
            name: item.name,
            code: item.code,
            categoryId: item.categoryId,
            unitId: item.unitId,
            defaultSellingPrice: item.defaultSellingPrice,
          },
        },
      });
      await tx.item.delete({ where: { id: item.id } });
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "updateUserStatus") {
    const userToUpdate = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!userToUpdate) return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
    if (payload.isActive === false) {
      if (userToUpdate.username === "admin") {
        return NextResponse.json({ ok: false, error: "The main administrator account cannot be deactivated." }, { status: 400 });
      }
      if (userToUpdate.id === actorId) {
        return NextResponse.json({ ok: false, error: "You cannot deactivate your own account." }, { status: 400 });
      }
      if (userToUpdate.role === "ADMIN") {
        const activeAdminsCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
        if (activeAdminsCount <= 1) {
          return NextResponse.json({ ok: false, error: "Cannot deactivate the last active administrator." }, { status: 400 });
        }
      }
    }
    await prisma.user.update({ where: { id: payload.id }, data: { isActive: payload.isActive } });
    return NextResponse.json({ ok: true });
  }

  if (action === "deleteUser") {
    const userToDelete = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!userToDelete) return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
    if (userToDelete.username === "admin") {
      return NextResponse.json({ ok: false, error: "The main administrator account cannot be deleted." }, { status: 400 });
    }
    if (userToDelete.id === actorId) {
      return NextResponse.json({ ok: false, error: "You cannot delete your own account." }, { status: 400 });
    }
    if (userToDelete.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) return NextResponse.json({ ok: false, error: "Cannot delete the last administrator." }, { status: 400 });
    }
    try {
      await prisma.$transaction(async (tx) => {
        await tx.auditLog.deleteMany({ where: { userId: payload.id } });
        await tx.userPermission.deleteMany({ where: { userId: payload.id } });
        await tx.user.delete({ where: { id: payload.id } });
      });
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ ok: false, error: "Cannot delete user. They have associated records (sales, purchases, etc.). Please deactivate them instead." }, { status: 400 });
    }
  }

    return NextResponse.json({ ok: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("App API error:", error);
    const msg = error instanceof Error ? error.message : "";
    const isDbUnreachable = msg.includes("Can't reach database server") || (error as any).code === "P1001" || (error as any).code === "P1003";
    const errorMsg = isDbUnreachable 
      ? "Database server is waking up or temporarily unreachable. Please wait 10 seconds and try saving again." 
      : (error instanceof Error ? error.message : "Application API request failed.");
    return NextResponse.json(
      { ok: false, error: errorMsg },
      { status: isDbUnreachable ? 503 : 500 },
    );
  }
}
