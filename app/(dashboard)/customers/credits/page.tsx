"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/toast-provider";
import { 
  CreditCard, 
  ArrowUpRight, 
  History, 
  Clock, 
  X,
  ShieldAlert,
  AlertCircle
} from "lucide-react";
import { cn, formatCurrency, formatNumberWithCommas, parseCommaNumber } from "@/lib/utils";
import { useAppData } from "@/lib/client/useAppData";
import { SearchableSelect } from "@/components/searchable-select";

export default function CustomerCredits() {
  const { 
    customers, 
    sales, 
    customerPayments, 
    bankAccounts, 
    settleCredit, 
    currentLocation 
  } = useAppData();
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "PENDING">("ALL");
  const toast = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const [formData, setFormData] = useState({
    customerId: "",
    amount: 0,
    method: "CASH" as "CASH" | "BANK",
    bankAccountId: "",
    note: "",
    date: new Date().toISOString().split('T')[0],
  });

  const totalOutstanding = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  }, [customers]);

  const collectedThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return customerPayments
      .filter(p => new Date(p.date).getTime() >= startOfMonth.getTime())
      .reduce((sum, p) => sum + p.amount, 0);
  }, [customerPayments]);

  const overdueBalance = useMemo(() => {
    // 30 days ago threshold
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const creditSales = sales.filter(s => s.creditAmount > 0);
    let overdue = 0;

    customers.forEach(cust => {
      const custSales = creditSales.filter(s => s.customerId === cust.id);
      const custPayments = customerPayments.filter(p => p.customerId === cust.id);
      
      let remainingPaymentPool = custPayments.reduce((sum, p) => sum + p.amount, 0);
      const sortedSales = [...custSales].sort(
        (a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime()
      );
      
      sortedSales.forEach(sale => {
        const credit = sale.creditAmount || 0;
        let allocatedPayment = 0;
        if (credit > 0 && remainingPaymentPool > 0) {
          allocatedPayment = Math.min(credit, remainingPaymentPool);
          remainingPaymentPool -= allocatedPayment;
        }
        const outstanding = credit - allocatedPayment;
        
        if (outstanding > 0 && new Date(sale.saleDate).getTime() < thirtyDaysAgo.getTime()) {
          overdue += outstanding;
        }
      });
    });

    return overdue;
  }, [customers, sales, customerPayments]);

  // FIFO Dynamic Credit Outstanding Allocation across all customers
  const creditHistory = useMemo(() => {
    const creditSales = sales.filter(s => s.creditAmount > 0);
    const list: any[] = [];
    
    customers.forEach(cust => {
      const custSales = creditSales.filter(s => s.customerId === cust.id);
      const custPayments = customerPayments.filter(p => p.customerId === cust.id);
      
      let remainingPaymentPool = custPayments.reduce((sum, p) => sum + p.amount, 0);
      const sortedSales = [...custSales].sort(
        (a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime()
      );
      
      sortedSales.forEach(sale => {
        const credit = sale.creditAmount || 0;
        let allocatedPayment = 0;
        if (credit > 0 && remainingPaymentPool > 0) {
          allocatedPayment = Math.min(credit, remainingPaymentPool);
          remainingPaymentPool -= allocatedPayment;
        }
        const outstanding = credit - allocatedPayment;
        
        list.push({
          id: sale.id,
          customerId: cust.id,
          customerName: cust.name,
          originalCredit: credit,
          outstanding,
          date: new Date(sale.saleDate).toISOString().split('T')[0],
          status: outstanding === 0 ? "SETTLED" : (outstanding < credit ? "PARTIAL" : "PENDING"),
        });
      });
    });
    
    // Sort newest first
    const sortedList = list.sort((a, b) => b.id.localeCompare(a.id));
    
    if (filterType === "PENDING") {
      return sortedList.filter(item => item.outstanding > 0);
    }
    return sortedList;
  }, [customers, sales, customerPayments, filterType]);

  const activeCustomers = useMemo(() => {
    return customers.filter(c => c.balance > 0);
  }, [customers]);

  const searchableCustomers = useMemo(() => {
    return activeCustomers.map(c => ({
      value: c.id,
      label: c.name,
      meta: `Outstanding: ${formatCurrency(c.balance)}`,
    }));
  }, [activeCustomers]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === formData.customerId);
  }, [customers, formData.customerId]);

  const handleOpenRecordPayment = () => {
    setError(null);
    setFormData({
      customerId: "",
      amount: 0,
      method: "CASH",
      bankAccountId: bankAccounts[0]?.id || "",
      note: "",
      date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSettleTransaction = (customerId: string, outstandingAmount: number) => {
    setError(null);
    const cust = customers.find(c => c.id === customerId);
    const cap = cust ? cust.balance : outstandingAmount;
    setFormData({
      customerId,
      amount: Math.min(cap, outstandingAmount),
      method: "CASH",
      bankAccountId: bankAccounts[0]?.id || "",
      note: `Customer credit settlement`,
      date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || formData.amount <= 0) return;

    setIsSaving(true);
    setError(null);
    try {
      const res = await settleCredit({
        customerId: formData.customerId,
        amount: formData.amount,
        method: formData.method,
        bankAccountId: formData.method === "BANK" ? formData.bankAccountId : undefined,
        locationId: currentLocation?.id,
        date: new Date(formData.date),
        note: formData.note || "Settle Customer Credit",
      });
      toast.success(res.message || "Customer credit settled successfully.");
      setIsModalOpen(false);
      setFormData(prev => ({ ...prev, amount: 0 }));
    } catch (err: any) {
      setError(err?.message || "Failed to record customer credit payment.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-indigo-600" />
            Customer Credits
          </h1>
          <p className="text-slate-500 mt-1">Track outstanding balances and credit aging.</p>
        </div>
        <button 
          onClick={handleOpenRecordPayment}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all active:scale-95"
        >
          Record Credit Payment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CreditSummaryCard 
          title="Total Outstanding" 
          value={formatCurrency(totalOutstanding)} 
          subtitle={`From ${customers.filter(c => c.balance > 0).length} customers`} 
          color="rose" 
          icon={CreditCard} 
        />
        <CreditSummaryCard 
          title="Collected This Month" 
          value={formatCurrency(collectedThisMonth)} 
          subtitle="Updated dynamically" 
          color="green" 
          icon={ArrowUpRight} 
        />
        <CreditSummaryCard 
          title="Overdue Balance (30+ Days)" 
          value={formatCurrency(overdueBalance)} 
          subtitle="FIFO Aging Allocation" 
          color="amber" 
          icon={Clock} 
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            Credit Activity Log
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
              onClick={() => setFilterType("PENDING")}
              className={cn(
                "px-3 py-1.5 border rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all",
                filterType === "PENDING" 
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
                <th className="px-6 py-4">Transaction Details</th>
                <th className="px-6 py-4">Original Credit</th>
                <th className="px-6 py-4">Outstanding Balance</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {creditHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-slate-400 dark:text-zinc-500">
                    No credit activities matching the criteria.
                  </td>
                </tr>
              ) : (
                creditHistory.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-all duration-150">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">{txn.customerName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">TRX-{txn.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">
                        {formatCurrency(txn.originalCredit)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className={cn(
                        "text-sm font-bold",
                        txn.outstanding > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"
                      )}>
                        {formatCurrency(txn.outstanding)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">{txn.date}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded border",
                        txn.status === 'SETTLED' 
                          ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30" 
                          : txn.status === 'PARTIAL'
                          ? "text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30"
                          : "text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30"
                      )}>
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {txn.outstanding > 0 ? (
                        <button 
                          onClick={() => handleSettleTransaction(txn.customerId, txn.outstanding)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                        >
                          Settle
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

      {/* Modal */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden animate-in scale-in duration-300 z-[1010] max-h-[calc(100vh-48px)] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Record Customer Payment</h3>
                <p className="text-xs text-slate-400">Settle outstanding balances dynamically.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {error}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</label>
                <SearchableSelect
                  placeholder="Choose customer to pay..."
                  value={formData.customerId}
                  onChange={(val) => {
                    const cust = customers.find(c => c.id === val);
                    setFormData(prev => ({
                      ...prev,
                      customerId: val,
                      amount: cust ? cust.balance : 0
                    }));
                  }}
                  options={searchableCustomers}
                />
                {selectedCustomer && (
                  <p className="text-[10px] text-indigo-500 font-bold">
                    Current Outstanding Credit: {formatCurrency(selectedCustomer.balance)}
                  </p>
                )}
              </div>

              {selectedCustomer && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount Collected from Customer</label>
                    <input
                      type="text"
                      required
                      value={formatNumberWithCommas(formData.amount)}
                      onChange={(e) => {
                        const parsed = parseCommaNumber(e.target.value);
                        setFormData(prev => ({ 
                          ...prev, 
                          amount: parsed 
                        }));
                      }}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-zinc-100"
                    />
                    <p className="text-[9px] text-slate-400 font-bold">
                      Enter an amount up to {formatCurrency(selectedCustomer.balance)}.
                    </p>
                    {formData.amount > selectedCustomer.balance && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1">
                        Amount cannot exceed {formatCurrency(selectedCustomer.balance)}.
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
              )}

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
                  This action will record a customer payment, deduct the amount chronologically from outstanding sales credits (FIFO allocation), and update bank account balances atomically.
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formData.customerId || formData.amount <= 0 || (selectedCustomer && formData.amount > selectedCustomer.balance)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  {isSaving ? "Settling..." : "Settle Customer Credit"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function CreditSummaryCard({ title, value, subtitle, color, icon: Icon }: any) {
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
