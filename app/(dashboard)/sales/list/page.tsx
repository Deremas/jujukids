"use client";

import React, { useState } from "react";
import { 
  BarChart3, 
  Search, 
  Filter, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Package,
  ArrowUpRight,
  User,
  ExternalLink
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const SOLD_ITEMS = [
  { id: "1", name: "Apple iPhone 15 Pro", qty: 2, price: 54000, total: 108000, date: "2024-05-18 10:45", location: "Bole Shop", customer: "Ahmed Mohammed" },
  { id: "2", name: "Sony Headphones WH-1000XM5", qty: 1, price: 18500, total: 18500, date: "2024-05-18 11:20", location: "Main Store", customer: "Walk-in" },
  { id: "3", name: "Dell XPS 15", qty: 1, price: 95000, total: 95000, date: "2024-05-17 09:12", location: "Megenagna Store", customer: "Mubarek Tech" },
  { id: "4", name: "Logitech MX Master 3S", qty: 5, price: 4200, total: 21000, date: "2024-05-17 14:55", location: "Bole Shop", customer: "OfficeX" },
];

export default function SoldItems() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Sold Items History</h1>
          <p className="text-slate-500 text-sm">Granular view of all inventory exits and sales transactions.</p>
        </div>
        <div className="flex gap-2">
           <button className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-200 transition-all">
             Export CSV
           </button>
           <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
             Print Batch
           </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
           <div className="relative flex-1 max-w-lg font-sans">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by product name, customer or voucher..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
           </div>
           <div className="flex gap-2">
              <select className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500 p-2 outline-none">
                 <option>All Shops/Stores</option>
                 <option>Main Store</option>
                 <option>Bole Shop</option>
              </select>
              <button className="p-2 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-950 text-slate-400 hover:text-slate-900 transition-colors">
                 <Filter className="w-4 h-4" />
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-zinc-950/30 text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-200 dark:border-zinc-800">
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Quantity</th>
                <th className="px-6 py-4">Unit Price</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Shop/Store</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {SOLD_ITEMS.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/20 transition-colors font-sans">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400">
                          <Package className="w-4 h-4" />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[200px]">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono tracking-tighter">SKU-PRD-{item.id.padStart(4, "0")}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-zinc-400 text-xs">
                       <User className="w-3 h-3 text-slate-300" />
                       {item.customer}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">{item.qty}</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(item.total)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">{item.location}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-medium text-slate-400 whitespace-nowrap">{item.date}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-300 hover:text-indigo-600 transition-all">
                       <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-zinc-950/30 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Total Page Value: </span>
              <span className="text-xs font-black text-indigo-600">{formatCurrency(242500)}</span>
           </div>
           <div className="flex items-center gap-2">
              <button className="p-1 border border-slate-200 dark:border-zinc-800 rounded disabled:opacity-30" disabled><ChevronLeft className="w-4 h-4" /></button>
              <button className="p-1 border border-slate-200 dark:border-zinc-800 rounded hover:border-slate-400 transition-colors"><ChevronRight className="w-4 h-4" /></button>
           </div>
        </div>
      </div>
    </div>
  );
}
