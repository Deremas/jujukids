"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Search,
  ShoppingCart,
  Calendar,
  Truck,
  CreditCard,
  Landmark,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default function AddPurchase() {
  const [items, setItems] = useState([
    { id: 1, name: "", qty: 1, buyingPrice: 0, sellingPrice: 0, total: 0 },
  ]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [supplier, setSupplier] = useState("");

  const addItemSource = () => {
    setItems([
      ...items,
      {
        id: items.length + 1,
        name: "",
        qty: 1,
        buyingPrice: 0,
        sellingPrice: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: number, field: string, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const sanitizedValue =
            field === "qty" ||
            field === "buyingPrice" ||
            field === "sellingPrice"
              ? Math.max(0, parseFloat(value) || 0)
              : value;
          const newItem = { ...item, [field]: sanitizedValue };
          if (field === "qty" || field === "buyingPrice") {
            newItem.total =
              (field === "qty" ? sanitizedValue : item.qty) *
              (field === "buyingPrice" ? sanitizedValue : item.buyingPrice);
          }
          return newItem;
        }
        return item;
      }),
    );
  };

  const grandTotal = items.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 font-sans pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/purchases"
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
              Record Material Intake
            </h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
              Direct Procurement & Batch Entry
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-all">
            {/* Save Draft */}
          </button>
          <button className="flex items-center gap-2 px-2 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-500/30 hover:bg-indigo-500 transition-all active:scale-95">
            <Save className="w-4 h-4" />
            Post Purchase
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]">
                Procurement Items
              </h3>
              <button
                onClick={addItemSource}
                className="text-xs font-black text-indigo-600 flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" /> ADD LINE
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[850px]">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest bg-slate-50/50 dark:bg-zinc-950/20">
                    <th className="px-6 py-4">Product / Item Name</th>
                    <th className="px-6 py-4 w-24">QTY</th>
                    <th className="px-6 py-4">Buy Price</th>
                    <th className="px-6 py-4">Sell Price</th>
                    <th className="px-6 py-4 text-right">Line Total</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-zinc-800 font-sans">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          placeholder="Click to select item..."
                          className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-zinc-200 placeholder:text-slate-300"
                          value={item.name}
                          onChange={(e) =>
                            updateItem(item.id, "name", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-slate-50/50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800 rounded p-1 text-sm font-bold text-center outline-none focus:border-indigo-500"
                          value={item.qty === 0 ? "" : item.qty}
                          onChange={(e) =>
                            updateItem(item.id, "qty", e.target.value)
                          }
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-zinc-200"
                          value={item.buyingPrice === 0 ? "" : item.buyingPrice}
                          onChange={(e) =>
                            updateItem(item.id, "buyingPrice", e.target.value)
                          }
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-zinc-200"
                          value={
                            item.sellingPrice === 0 ? "" : item.sellingPrice
                          }
                          onChange={(e) =>
                            updateItem(item.id, "sellingPrice", e.target.value)
                          }
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                          {formatCurrency(item.total)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
              Payable Amount
            </p>
            <h2 className="text-5xl font-black mt-2 tracking-tighter italic">
              {formatCurrency(grandTotal)}
            </h2>
            <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
              <div className="flex justify-between text-sm font-bold opacity-80">
                <span>Subtotal</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Vendor / Supplier
              </label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Entry Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="date"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Settlement Origin
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "CASH", icon: CreditCard, label: "Cash" },
                  { id: "BANK", icon: Landmark, label: "Bank" },
                  { id: "CREDIT", icon: ShoppingCart, label: "Debt" },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all",
                      paymentMethod === method.id
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                        : "bg-transparent border-slate-100 dark:border-zinc-800 text-slate-400 hover:border-indigo-500",
                    )}
                  >
                    <method.icon className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                      {method.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === "BANK" && (
              <div className="space-y-4 animate-in zoom-in-95 duration-200">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                  Settle via Account
                </label>
                <select className="w-full p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500">
                  <option>CBE Business Main (100...)</option>
                  <option>BOA Savings (987...)</option>
                  <option>Dashen Merchant (445...)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
