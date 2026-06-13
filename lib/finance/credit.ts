import { prisma } from "@/lib/prisma";

export interface CaptureCreditPayload {
  saleId: string;
  customerId: string;
  amount: number;
  locationId: string;
  createdById: string;
}

export interface SettleCreditPayload {
  customerId: string;
  amount: number;
  paymentMethod: "CASH" | "BANK";
  bankAccountId?: string | null;
  locationId: string;
  createdById: string;
  date?: Date;
  note?: string;
}

/**
 * Validates and logs a credit capture for a sale.
 * Must be executed within a prisma transaction.
 */
export async function captureCredit(
  tx: any,
  payload: CaptureCreditPayload
): Promise<void> {
  const { saleId, customerId, amount, locationId, createdById } = payload;

  if (amount <= 0) {
    return;
  }

  if (isNaN(amount) || !isFinite(amount)) {
    throw new Error("Invalid credit amount captured.");
  }

  // 1. Verify customer exists and is active
  const customer = await tx.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) {
    throw new Error(`Customer with ID ${customerId} not found.`);
  }
  if (!customer.isActive) {
    throw new Error(`Customer ${customer.name} is inactive.`);
  }

  // 2. Create Audit Log for credit capture
  await tx.auditLog.create({
    data: {
      userId: createdById,
      locationId,
      action: "CREATE",
      module: "Finance/Credit",
      tableName: "Sale",
      recordId: saleId,
      newData: {
        customerId,
        creditAmount: amount,
        message: `Captured outstanding credit of ${amount} for customer ${customer.name} on sale ${saleId}`,
      },
    },
  });
}

/**
 * Calculates a customer's total outstanding credit balance globally.
 */
export async function getCustomerOutstandingCredit(
  tx: any,
  customerId: string
): Promise<number> {
  const sales = await tx.sale.findMany({
    where: { customerId },
    select: { creditAmount: true },
  });
  const payments = await tx.customerPayment.findMany({
    where: { customerId },
    select: { amount: true },
  });

  const totalCredit = sales.reduce((sum: number, s: any) => sum + (s.creditAmount || 0), 0);
  const totalPaid = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  return Math.max(0, totalCredit - totalPaid);
}

/**
 * Validates, records a credit settlement payment, updates bank accounts, and logs audits.
 * Must be executed within a prisma transaction.
 */
export async function settleCredit(
  tx: any,
  payload: SettleCreditPayload
): Promise<any> {
  const {
    customerId,
    amount,
    paymentMethod,
    bankAccountId,
    locationId,
    createdById,
    date,
    note,
  } = payload;

  if (amount <= 0) {
    throw new Error("Settlement amount must be greater than zero.");
  }

  if (isNaN(amount) || !isFinite(amount)) {
    throw new Error("Invalid settlement amount.");
  }

  // 1. Verify customer exists and is active
  const customer = await tx.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) {
    throw new Error(`Customer with ID ${customerId} not found.`);
  }
  if (!customer.isActive) {
    throw new Error(`Customer ${customer.name} is inactive.`);
  }

  // 2. Calculate outstanding credit balance on the server to prevent race conditions / double-settlement
  const outstanding = await getCustomerOutstandingCredit(tx, customerId);

  if (outstanding <= 0) {
    throw new Error(`Customer ${customer.name} has no outstanding credit balance to settle.`);
  }

  // Allow minor floating point discrepancies (up to 0.01)
  if (amount > outstanding + 0.01) {
    throw new Error(
      `Settlement amount cannot exceed the current outstanding credit of ETB ${outstanding.toLocaleString()}.`
    );
  }

  // 3. Create the payment record
  const finalAmount = Math.min(amount, outstanding);
  const payment = await tx.customerPayment.create({
    data: {
      customerId,
      locationId,
      amount: finalAmount,
      paymentMethod,
      bankAccountId: bankAccountId || null,
      paymentDate: date || new Date(),
      createdById,
      note: note || "Credit settlement payment",
    },
  });

  // 4. Update bank account balance if payment method is BANK
  if (paymentMethod === "BANK") {
    if (!bankAccountId) {
      throw new Error("Bank account ID is required for BANK payment method.");
    }
    const bankAccount = await tx.bankAccount.findUnique({
      where: { id: bankAccountId },
    });
    if (!bankAccount || !bankAccount.isActive) {
      throw new Error("Valid active bank account is required for BANK settlement.");
    }

    await tx.bankAccount.update({
      where: { id: bankAccountId },
      data: {
        currentBalance: { increment: finalAmount },
      },
    });

    // Create a BankTransaction record
    await tx.bankTransaction.create({
      data: {
        bankAccountId,
        locationId,
        type: "SALE_PAYMENT",
        amount: finalAmount,
        referenceNo: payment.id,
        description: note || `Credit settlement payment from ${customer.name}`,
        transactionDate: date || new Date(),
        createdById,
      },
    });
  }

  // 5. Create Audit Log
  await tx.auditLog.create({
    data: {
      userId: createdById,
      locationId,
      action: "CREATE",
      module: "Finance/Credit",
      tableName: "CustomerPayment",
      recordId: payment.id,
      newData: {
        customerId,
        amount: finalAmount,
        paymentMethod,
        bankAccountId,
        outstandingBefore: outstanding,
        outstandingAfter: outstanding - finalAmount,
      },
    },
  });

  return payment;
}
