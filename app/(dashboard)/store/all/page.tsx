"use client";

import React, { useState } from "react";
import { 
  Building2, 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Package,
  MapPin,
  RefreshCw,
  MoreVertical
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const LOCATION_STOCK = [
  { id: "1", item: "Apple iPhone 15 Pro", category: "Electronics", total: 45, breakdown: { "Main Store": 12, "Bole Shop": 25, "Megenagna": 8 }, price: 54000 },
  { id: "2", item: "Samsung Galaxy S24", category: "Electronics", total: 8, breakdown: { "Main Store": 2, "Bole Shop": 5, "Megenagna": 1 }, price: 48000 },
  { id: "3", item: "Sony WH-1000XM5", category: "Accessories", total: 10, breakdown: { "Main Store": 4, "Bole Shop": 6, "Megenagna": 0 }, price: 18500 },
];

export default function AllLocationStock() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Shop/Store Inventory Matrix</h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1 opacity-70">Aggregated stock by location</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
           <RefreshCw className="w-4 h-4" />
           Refresh Matrix
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden font-sans">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 font-sans">
           <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 font-bold" />
              <input 
                type="text" 
                placeholder="Lookup product by name or SKU..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-medium font-sans placeholder:text-slate-300"
              />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-zinc-950/30 text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] border-b border-slate-200 dark:border-zinc-800">
                <th className="px-6 py-5">Global Product Catalog</th>
                <th className="px-6 py-5 text-center">Main Store</th>
                <th className="px-6 py-5 text-center">Bole Shop</th>
                <th className="px-6 py-5 text-center">Megenagna</th>
                <th className="px-6 py-5 text-right">Total Aggregate</th>
                <th className="px-6 py-5 text-right">Valuation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
              {LOCATION_STOCK.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/20 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10 transition-colors">
                          <Package className="w-5 h-5 transition-transform group-hover:scale-110" />
                       </div>
                       <div>
                          <p className="text-sm font-black text-slate-800 dark:text-zinc-200 truncate max-w-[180px]">{item.item}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">{item.category}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center font-mono text-xs font-bold text-slate-500 dark:text-zinc-400">
                    {item.breakdown["Main Store"]}
                  </td>
                  <td className="px-6 py-5 text-center font-mono text-xs font-bold text-slate-500 dark:text-zinc-400">
                    {item.breakdown["Bole Shop"]}
                  </td>
                  <td className="px-6 py-5 text-center font-mono text-xs font-bold text-slate-500 dark:text-zinc-400">
                    {item.breakdown["Megenagna"]}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 rounded-full font-black text-sm tracking-tighter">
                       {item.total} Units
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">{formatCurrency(item.total * item.price)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
