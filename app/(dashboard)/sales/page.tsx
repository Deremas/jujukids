"use client";

import React, { useState } from "react";
import { 
  ShoppingCart, Plus, Search, ArrowUpRight, Calendar,
  User, CreditCard, Store, Eye, Trash2, X, Package
} from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppData } from "@/lib/client/useAppData";
import { motion, AnimatePresence } from "motion/react";

export default function SalesListPage() {
  const { sales, currentLocation, locations, customers, deleteSale } = useAppData();
  const [search, setSearch] = useState("");
  const [viewSale, setViewSale] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredSales = sales
    .map((sale, index) => ({ sale, index }))
    .filter(({ sale }) => {
      const customer = customers.find(c => c.id === sale.customerId);
      const matchesSearch = sale.id.toLowerCase().includes(search.toLowerCase()) ||
        customer?.name.toLowerCase().includes(search.toLowerCase());
      if (currentLocation) return matchesSearch && sale.locationId === currentLocation.id;
      return matchesSearch;
    })
    .sort((a, b) => {
      const dateDiff = new Date(b.sale.saleDate).getTime() - new Date(a.sale.saleDate).getTime();
      return dateDiff || b.index - a.index;
    })
    .map(({ sale }) => sale);

  const stats = {
    total: filteredSales.reduce((acc, s) => acc + s.totalAmount, 0),
    completed: filteredSales.length,
    outstanding: filteredSales.reduce((acc, s) => acc + s.creditAmount, 0),
    count: filteredSales.length
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 md:p-6 pb-20 font-bold">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">
            <ShoppingCart className="w-8 h-8 text-indigo-600" />
            Sales List
          </h1>
          <p className="text-slate-500 mt-1 uppercase text-[10px] font-black tracking-widest opacity-70">
            {currentLocation ? `${currentLocation.name} Sales Fulfillment` : "Global Revenue Transaction Management"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/sales/create"
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 active:scale-95 transition-all text-center uppercase tracking-widest cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Sale
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatCurrency(stats.total)} icon={ShoppingCart} />
        <StatCard title="Tx Volume" value={stats.completed} icon={ArrowUpRight} color="emerald" />
        <StatCard title="Consumer Debt" value={formatCurrency(stats.outstanding)} icon={CreditCard} color="amber" />
        <StatCard title="Active Locations" value={locations.length} icon={Store} color="rose" />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by ID or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all font-bold"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-zinc-950/50 border-b border-slate-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Tx ID</th>
                {!currentLocation && <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Shop/Store</th>}
                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Consumer</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Timeline</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Protocol</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Bank Account</th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Magnitude</th>
                <th className="px-6 py-4 text-center text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-center text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest opacity-50">
                    No transactions captured
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const customer = customers.find(c => c.id === sale.customerId);
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-6 py-4 text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">{sale.id}</td>
                      {!currentLocation && (
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase">
                            {locations.find(b => b.id === sale.locationId)?.name}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                          <span className="text-xs font-black text-slate-700 dark:text-zinc-200 uppercase">{customer?.name ?? "Walk-in"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-bold">{new Date(sale.saleDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {sale.bankAccount?.displayName ? (
                          <span className="inline-flex items-center rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300">
                            {sale.bankAccount.displayName}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-black text-slate-900 dark:text-zinc-100">{formatCurrency(sale.totalAmount)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-700/20 dark:text-emerald-400">
                          COMPLETED
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/sales/${sale.id}`}
                            title="View details"
                            className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors text-slate-400 hover:text-indigo-600 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteId(sale.id)}
                            title="Delete"
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {viewSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewSale(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden z-10">
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Sale Details</h3>
                  <p className="text-[10px] font-mono text-slate-400">{viewSale.id}</p>
                </div>
                <button onClick={() => setViewSale(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Customer" value={customers.find(c => c.id === viewSale.customerId)?.name ?? "Walk-in"} />
                  <InfoRow label="Date" value={new Date(viewSale.saleDate).toLocaleDateString()} />
                  <InfoRow label="Payment" value={viewSale.paymentMethod} />
                  <InfoRow
                    label="Bank Account"
                    value={
                      viewSale.bankAccount?.displayName
                        ? `${viewSale.bankAccount.displayName}${viewSale.bankAccount.bankName ? ` (${viewSale.bankAccount.bankName})` : ""}`
                        : viewSale.bankAccountId || "-"
                    }
                  />
                  <InfoRow label="Location" value={locations.find(l => l.id === viewSale.locationId)?.name ?? "-"} />
                  <InfoRow label="Total" value={formatCurrency(viewSale.totalAmount)} highlight />
                  <InfoRow label="Credit" value={formatCurrency(viewSale.creditAmount)} />
                </div>
                <div className="border-t border-slate-100 dark:border-zinc-800 pt-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Items ({viewSale.items.length})</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {viewSale.items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-zinc-800 rounded-lg px-3 py-2">
                        <span className="font-bold text-slate-700 dark:text-zinc-300">{item.itemId}</span>
                        <span className="font-mono text-slate-500">×{item.qty} → {formatCurrency(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xl z-10 w-full max-w-sm space-y-4 border border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl"><Trash2 className="w-5 h-5 text-rose-600" /></div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">Delete Sale</h3>
                  <p className="text-[11px] text-slate-500">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={() => { deleteSale(deleteId); setDeleteId(null); }} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold cursor-pointer hover:bg-rose-700 transition-colors">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={cn("text-sm font-black mt-0.5", highlight ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-white")}>{value}</p>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = "indigo" }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{title}</p>
        <div className={cn(
          "p-2 rounded-xl",
          color === "indigo" && "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
          color === "emerald" && "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
          color === "amber" && "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
          color === "rose" && "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
        )}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h4>
    </div>
  );
}
