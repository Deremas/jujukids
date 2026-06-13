"use client";

import React, { useState } from "react";
import { Wallet, Plus, Search, X, Calendar, Tag, FileText, Banknote } from "lucide-react";
import { formatCurrency, formatNumberWithCommas, parseCommaNumber, cn } from "@/lib/utils";
import { useAppData } from "@/lib/client/useAppData";
import { motion, AnimatePresence } from "motion/react";
import { useSession } from "next-auth/react";

const CATEGORIES = [
  "Rent", "Utilities", "Salaries", "Supplies", "Marketing", "Travel", "Maintenance", "Tax", "Others"
];

export default function ExpensesPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const { expenses, addExpense, bankAccounts, currentLocation, locations } = useAppData();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState(currentLocation?.id || "");
  
  const [formData, setFormData] = useState({
    category: "",
    amount: 0,
    description: "",
    paymentMethod: 'CASH' as 'CASH' | 'BANK',
    bankAccountId: ""
  });

  // Re-sync location if currentLocation changes
  React.useEffect(() => {
    if (currentLocation) setSelectedLocationId(currentLocation.id);
  }, [currentLocation]);

  const handleSave = async () => {
    if (!formData.category || formData.amount <= 0 || !selectedLocationId) return;
    try {
      await addExpense({
        ...formData,
        locationId: selectedLocationId,
        date: new Date()
      });
      setShowModal(false);
      setFormData({ category: "", amount: 0, description: "", paymentMethod: 'CASH', bankAccountId: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to record expense.");
    }
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.category.toLowerCase().includes(search.toLowerCase()) || 
      e.description.toLowerCase().includes(search.toLowerCase());
    
    if (currentLocation) {
      return matchesSearch && e.locationId === currentLocation.id;
    }
    return matchesSearch;
  });

  const availableLocations = user?.role === 'Super Admin' ? locations : locations.filter(b => user?.assignedLocations.includes(b.id));

  return (
    <>
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Wallet className="w-8 h-8 text-rose-500" />
            Expenses
          </h1>
          <p className="text-slate-500 mt-1 uppercase text-[10px] font-black tracking-widest opacity-70">
            {currentLocation ? `${currentLocation.name} Operational Cost Management` : "Global Expense Management"}
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black shadow-lg shadow-rose-900/20 hover:bg-rose-500 active:scale-95 transition-all text-center uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" /> Record Expense
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 text-xs transition-all"
            />
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Wallet className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-sm font-medium">No expense records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-zinc-950/50 border-b border-slate-100 dark:border-zinc-800">
                  <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Date</th>
                  {!currentLocation && <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Location</th>}
                  <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Description</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Payment</th>
                  <th className="px-6 py-4 text-right text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors py-4">
                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-500">
                      {new Date(exp.date).toLocaleDateString()}
                    </td>
                    {!currentLocation && (
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase">
                          {locations.find(b => b.id === exp.locationId)?.name}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-700 dark:text-zinc-300">
                      {exp.description || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-400">{exp.paymentMethod}</span>
                        {exp.bankAccountId && (
                          <span className="text-[9px] font-bold text-indigo-500">
                            {bankAccounts.find(b => b.id === exp.bankAccountId)?.displayName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-rose-600 dark:text-rose-400">
                      {formatCurrency(exp.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Record New Expense</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto min-h-0">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest px-1">Charge To Shop/Store</label>
                  <select 
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs font-black outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    {availableLocations.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Category</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-bold"
                    >
                      <option value="" disabled>Select Category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Amount (ETB)</label>
                    <input 
                      type="text" 
                      placeholder="0" 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono font-bold text-rose-600"
                      value={formatNumberWithCommas(formData.amount)}
                      onChange={(e) => setFormData({...formData, amount: parseCommaNumber(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Description</label>
                  <textarea 
                    placeholder="What was this for?" 
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['CASH', 'BANK'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setFormData({...formData, paymentMethod: method as any})}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-2",
                          formData.paymentMethod === method 
                            ? "bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-900/20" 
                            : "bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600"
                        )}
                      >
                        {method === 'CASH' ? <Banknote className="w-3 h-3" /> : <Wallet className="w-3 h-3" />}
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.paymentMethod === 'BANK' && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Withdraw From</label>
                    <select 
                      value={formData.bankAccountId}
                      onChange={(e) => setFormData({...formData, bankAccountId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold"
                    >
                      <option value="" disabled>Select Account</option>
                      {bankAccounts.filter(ba => ba.accountType === "BANK").map(ba => (
                        <option key={ba.id} value={ba.id}>{ba.displayName} ({ba.bankName})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-50/50 dark:bg-zinc-950/50 flex gap-3 shrink-0 border-t border-slate-100 dark:border-zinc-800">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-900/20 hover:bg-rose-500 transition-all uppercase tracking-widest"
                >
                  Confirm Expense
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
