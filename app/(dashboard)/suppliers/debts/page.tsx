"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Truck, 
  ArrowDownRight, 
  History, 
  Clock, 
  X,
  Landmark,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { cn, formatCurrency, formatNumberWithCommas, parseCommaNumber } from "@/lib/utils";
import { useAppData } from "@/lib/client/useAppData";
import { SearchableSelect } from "@/components/searchable-select";

export default function SupplierDebts() {
  const { 
    suppliers, 
    purchases, 
    supplierPayments, 
    bankAccounts, 
    addSupplierPayment, 
    currentLocation 
  } = useAppData();

  // Modal state
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "OUTSTANDING">("ALL");

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    supplierId: "",
    amount: 0,
    method: "CASH" as "CASH" | "BANK",
    bankAccountId: "",
    note: "",
    date: new Date().toISOString().split('T')[0],
  });

  // ─── Summary Computations ───────────────────────────────────────────

  const totalPayable = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.debt || 0), 0);
  }, [suppliers]);

  const paidThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return supplierPayments
      .filter(p => new Date(p.date).getTime() >= startOfMonth.getTime())
      .reduce((sum, p) => sum + p.amount, 0);
  }, [supplierPayments]);

  const overdueBalance = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const debtPurchases = purchases.filter(p => p.debtAmount > 0);
    let overdue = 0;

    suppliers.forEach(supplier => {
      const suppPurchases = debtPurchases.filter(p => p.supplierId === supplier.id);
      const suppPayments = supplierPayments.filter(p => p.supplierId === supplier.id);

      let remainingPaymentPool = suppPayments.reduce((sum, p) => sum + p.amount, 0);
      const sortedPurchases = [...suppPurchases].sort(
        (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
      );

      sortedPurchases.forEach(purchase => {
        const debt = purchase.debtAmount || 0;
        let allocatedPayment = 0;
        if (debt > 0 && remainingPaymentPool > 0) {
          allocatedPayment = Math.min(debt, remainingPaymentPool);
          remainingPaymentPool -= allocatedPayment;
        }
        const outstanding = debt - allocatedPayment;

        if (outstanding > 0 && new Date(purchase.purchaseDate).getTime() < thirtyDaysAgo.getTime()) {
          overdue += outstanding;
        }
      });
    });

    return overdue;
  }, [suppliers, purchases, supplierPayments]);

  // ─── FIFO Debt Allocation per Purchase ──────────────────────────────

  const debtHistory = useMemo(() => {
    const debtPurchases = purchases.filter(p => p.debtAmount > 0);
    const list: any[] = [];

    suppliers.forEach(supplier => {
      const suppPurchases = debtPurchases.filter(p => p.supplierId === supplier.id);
      const suppPayments = supplierPayments.filter(p => p.supplierId === supplier.id);

      let remainingPaymentPool = suppPayments.reduce((sum, p) => sum + p.amount, 0);
      const sortedPurchases = [...suppPurchases].sort(
        (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
      );

      sortedPurchases.forEach(purchase => {
        const debt = purchase.debtAmount || 0;
        let allocatedPayment = 0;
        if (debt > 0 && remainingPaymentPool > 0) {
          allocatedPayment = Math.min(debt, remainingPaymentPool);
          remainingPaymentPool -= allocatedPayment;
        }
        const outstanding = debt - allocatedPayment;

        list.push({
          id: purchase.id,
          supplierId: supplier.id,
          supplierName: supplier.name,
          originalDebt: debt,
          outstanding,
          date: new Date(purchase.purchaseDate).toISOString().split('T')[0],
          status: outstanding === 0 ? "SETTLED" : (outstanding < debt ? "PARTIAL" : "UNPAID"),
        });
      });
    });

    const sortedList = list.sort((a, b) => b.id.localeCompare(a.id));

    if (filterType === "OUTSTANDING") {
      return sortedList.filter(item => item.outstanding > 0);
    }
    return sortedList;
  }, [suppliers, purchases, supplierPayments, filterType]);

  // ─── Searchable Supplier Options ────────────────────────────────────

  const activeSuppliers = useMemo(() => {
    return suppliers.filter(s => s.debt > 0);
  }, [suppliers]);

  const searchableSuppliers = useMemo(() => {
    return activeSuppliers.map(s => ({
      value: s.id,
      label: s.name,
      meta: `Outstanding: ${formatCurrency(s.debt)}`,
    }));
  }, [activeSuppliers]);

  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === formData.supplierId);
  }, [suppliers, formData.supplierId]);

  const maxPayable = selectedSupplier?.debt || 0;

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleOpenRecordPayment = () => {
    setError(null);
    setSuccessMsg(null);
    setFormData({
      supplierId: "",
      amount: 0,
      method: "CASH",
      bankAccountId: bankAccounts[0]?.id || "",
      note: "",
      date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSettleTransaction = (supplierId: string, outstandingAmount: number) => {
    setError(null);
    setSuccessMsg(null);
    // Use the supplier's total debt as the cap, not just this row's outstanding
    const supplier = suppliers.find(s => s.id === supplierId);
    const cap = supplier ? supplier.debt : outstandingAmount;
    setFormData({
      supplierId,
      amount: Math.min(cap, outstandingAmount),
      method: "CASH",
      bankAccountId: bankAccounts[0]?.id || "",
      note: "Debt settlement payment",
      date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || formData.amount <= 0) return;

    // Final guard: clamp to current supplier debt
    const currentDebt = suppliers.find(s => s.id === formData.supplierId)?.debt || 0;
    const finalAmount = Math.min(formData.amount, currentDebt);
    if (finalAmount <= 0) {
      setError("This supplier has no outstanding debt.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await addSupplierPayment({
        supplierId: formData.supplierId,
        amount: finalAmount,
        method: formData.method,
        bankAccountId: formData.method === "BANK" ? formData.bankAccountId : undefined,
        locationId: currentLocation?.id,
        date: new Date(formData.date),
      });
      const supplierName = suppliers.find(s => s.id === formData.supplierId)?.name || "Supplier";
      setSuccessMsg(`✅ Payment of ${formatCurrency(finalAmount)} to ${supplierName} recorded successfully!`);
      // Reset form but keep modal open to show success
      setFormData(prev => ({ ...prev, amount: 0 }));
      // Auto-close after short delay
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Failed to record supplier payment.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Landmark className="w-8 h-8 text-indigo-600" />
            Supplier Debts
          </h1>
          <p className="text-slate-500 mt-1">Manage accounts payable and payment schedules.</p>
        </div>
        <button 
          onClick={handleOpenRecordPayment}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all active:scale-95"
        >
          <Landmark className="w-4 h-4" />
          Record Debt Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DebtSummaryCard 
          title="Total Accounts Payable" 
          value={formatCurrency(totalPayable)} 
          subtitle={`To ${suppliers.filter(s => s.debt > 0).length} active suppliers`} 
          color="rose" 
          icon={Truck} 
        />
        <DebtSummaryCard 
          title="Paid This Month" 
          value={formatCurrency(paidThisMonth)} 
          subtitle="Updated dynamically" 
          color="green" 
          icon={ArrowDownRight} 
        />
        <DebtSummaryCard 
          title="Overdue Balance (30+ Days)" 
          value={formatCurrency(overdueBalance)} 
          subtitle="FIFO Aging Allocation" 
          color="amber" 
          icon={Clock} 
        />
      </div>

      {/* Debt Activity Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            Debts &amp; Payment Activity
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setFilterType("ALL")}
              className={cn(
                "px-3 py-1.5 border rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all",
                filterType === "ALL" 
                  ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/30 text-indigo-600" 
                  : "bg-slate-50 dark:bg-zinc-950 border-slate-100 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600"
              )}
            >
              ALL HISTORIC
            </button>
            <button 
              onClick={() => setFilterType("OUTSTANDING")}
              className={cn(
                "px-3 py-1.5 border rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all",
                filterType === "OUTSTANDING" 
                  ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/30 text-indigo-600" 
                  : "bg-slate-50 dark:bg-zinc-950 border-slate-100 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600"
              )}
            >
              OUTSTANDING
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-zinc-950/30 text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-100 dark:border-zinc-800">
                <th className="px-6 py-4">Supplier / Purchase</th>
                <th className="px-6 py-4">Original Debt</th>
                <th className="px-6 py-4">Outstanding Balance</th>
                <th className="px-6 py-4">Purchase Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {debtHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-slate-400 dark:text-zinc-500">
                    No debt activities matching the criteria.
                  </td>
                </tr>
              ) : (
                debtHistory.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-all duration-150">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">{entry.supplierName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">PO-{entry.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">
                        {formatCurrency(entry.originalDebt)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className={cn(
                        "text-sm font-bold",
                        entry.outstanding > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"
                      )}>
                        {formatCurrency(entry.outstanding)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">{entry.date}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded border",
                        entry.status === 'SETTLED' 
                          ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30" 
                          : entry.status === 'PARTIAL'
                          ? "text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30"
                          : "text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30"
                      )}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {entry.outstanding > 0 ? (
                        <button 
                          onClick={() => handleSettleTransaction(entry.supplierId, entry.outstanding)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                        >
                          Pay
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">Fully Settled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {mounted && isModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden animate-in scale-in duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Record Supplier Payment</h3>
                <p className="text-xs text-slate-400">Settle outstanding payables atomically.</p>
              </div>
              <button 
                onClick={() => { setIsModalOpen(false); setSuccessMsg(null); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Success Banner */}
            {successMsg && (
              <div className="mx-6 mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top duration-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {successMsg}
                </div>
              </div>
            )}

            {!successMsg && (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {error}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supplier</label>
                  <SearchableSelect
                    placeholder="Choose supplier to pay..."
                    value={formData.supplierId}
                    onChange={(val) => {
                      const supp = suppliers.find(s => s.id === val);
                      setFormData(prev => ({
                        ...prev,
                        supplierId: val,
                        amount: supp ? supp.debt : 0
                      }));
                    }}
                    options={searchableSuppliers}
                  />
                  {selectedSupplier && (
                    <p className="text-[10px] text-indigo-500 font-bold">
                      Max Payable: {formatCurrency(maxPayable)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Amount</label>
                    <input
                      type="text"
                      required
                      value={formatNumberWithCommas(formData.amount)}
                      onChange={(e) => {
                        const parsed = parseCommaNumber(e.target.value);
                        const clamped = maxPayable > 0 ? Math.min(maxPayable, parsed) : parsed;
                        setFormData(prev => ({ ...prev, amount: clamped }));
                      }}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-zinc-100"
                    />
                    {formData.amount > 0 && maxPayable > 0 && formData.amount > maxPayable && (
                      <p className="text-[10px] text-rose-500 font-bold">
                        Amount capped to max payable: {formatCurrency(maxPayable)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Date</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Method</label>
                    <select
                      value={formData.method}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        method: e.target.value as "CASH" | "BANK",
                        bankAccountId: e.target.value === "BANK" ? (bankAccounts[0]?.id || "") : ""
                      })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-zinc-100"
                    >
                      <option value="CASH">Cash Drawer</option>
                      <option value="BANK">Bank Account</option>
                    </select>
                  </div>

                  {formData.method === "BANK" && (
                     <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bank Account</label>
                      <select
                        required
                        value={formData.bankAccountId}
                        onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-zinc-100"
                      >
                        {bankAccounts.map((account: any) => (
                          <option key={account.id} value={account.id}>
                            {account.displayName} ({formatCurrency(account.currentBalance)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Note</label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Memo details..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-zinc-100"
                  />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-2xl flex items-start gap-3 mt-4">
                  <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-500 leading-relaxed">
                    This action will record a supplier payment, deduct the amount chronologically from outstanding purchase debts (FIFO allocation), and update bank account balances atomically within a single transaction.
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setSuccessMsg(null); }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !formData.supplierId || formData.amount <= 0}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
                  >
                    {isSaving ? "Processing..." : "Submit Payment"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function DebtSummaryCard({ title, value, subtitle, color, icon: Icon }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
      <div className={cn(
        "absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500",
        color === 'rose' ? "text-rose-600" : color === 'green' ? "text-green-600" : "text-amber-600"
      )}>
        <Icon className="w-32 h-32" />
      </div>
      <div className="relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:-translate-y-1",
          color === 'rose' ? "bg-rose-500/10 text-rose-600" : color === 'green' ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"
        )}>
          <Icon className="w-6 h-6" />
        </div>
        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{title}</p>
        <h3 className={cn(
          "text-3xl font-bold mt-1",
          color === 'rose' ? "text-rose-600 dark:text-rose-500" : color === 'green' ? "text-green-600 dark:text-green-500" : "text-slate-900 dark:text-white"
        )}>
          {value}
        </h3>
        <p className="text-[10px] text-slate-400 mt-2 font-medium">{subtitle}</p>
      </div>
    </div>
  );
}
