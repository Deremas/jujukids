"use client";

import React, { useState } from "react";
import {
  Truck,
  Plus,
  Search,
  Package,
  User,
  Warehouse,
  Eye,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppData } from "@/lib/client/useAppData";
import { motion, AnimatePresence } from "motion/react";
import { paginateRows } from "@/lib/sales-utils";

export default function PurchasesPage() {
  const { purchases, suppliers, currentLocation, locations, deletePurchase } =
    useAppData();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [viewPurchase, setViewPurchase] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredPurchases = purchases.filter((p) => {
    const supplier = suppliers.find((s) => s.id === p.supplierId);
    const matchesSearch =
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      supplier?.name.toLowerCase().includes(search.toLowerCase());
    if (currentLocation)
      return matchesSearch && p.locationId === currentLocation.id;
    return matchesSearch;
  });
  const pagedPurchases = paginateRows<any>(filteredPurchases, page, pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 md:p-6 pb-20 font-bold">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Truck className="w-8 h-8 text-indigo-600" />
            Purchases
          </h1>
          <p className="text-slate-500 mt-1 uppercase text-[10px] font-black tracking-widest opacity-70">
            {currentLocation
              ? `${currentLocation.name} Inventory Procurement`
              : "Global Supply Chain Management"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/purchases/create"
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 active:scale-95 transition-all text-center uppercase tracking-widest cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Purchase
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID or supplier..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all font-bold"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-zinc-950/50 border-b border-slate-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                  Entry Detail
                </th>
                {!currentLocation && (
                  <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Location
                  </th>
                )}
                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                  Supplier
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-center">
                  Volume
                </th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                  Investment
                </th>
                <th className="px-6 py-4 text-center text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest opacity-50"
                  >
                    No procurement records found
                  </td>
                </tr>
              ) : (
                pagedPurchases.rows.map((p) => {
                  const supplier = suppliers.find((s) => s.id === p.supplierId);
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                            {p.id}
                          </span>
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            {new Date(p.purchaseDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      {!currentLocation && (
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase">
                            {locations.find((b) => b.id === p.locationId)?.name}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 font-black text-[10px]">
                            {supplier?.name?.charAt(0)}
                          </div>
                          <span className="text-xs font-black text-slate-700 dark:text-zinc-200 uppercase tracking-tight">
                            {supplier?.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-black text-slate-600 dark:text-zinc-400">
                        {p.items.length} Lines
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-black text-slate-900 dark:text-zinc-100">
                        {formatCurrency(p.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider">
                          RECEIVED
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/purchases/${p.id}`}
                            title="View details"
                            className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors text-slate-400 hover:text-indigo-600 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteId(p.id)}
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
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:border-zinc-800">
          <span>Page {pagedPurchases.page} of {pagedPurchases.totalPages} - {filteredPurchases.length} purchases</span>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-black uppercase tracking-widest outline-none dark:border-zinc-800 dark:bg-zinc-950"
            >
              {[10, 15, 25, 50].map((size) => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>
            <button type="button" disabled={pagedPurchases.page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40 dark:border-zinc-800">Prev</button>
            <button type="button" disabled={pagedPurchases.page >= pagedPurchases.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40 dark:border-zinc-800">Next</button>
          </div>
        </div>
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {viewPurchase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setViewPurchase(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden z-10"
            >
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Purchase Details
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">
                    {viewPurchase.id}
                  </p>
                </div>
                <button
                  onClick={() => setViewPurchase(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow
                    label="Supplier"
                    value={
                      suppliers.find((s) => s.id === viewPurchase.supplierId)
                        ?.name ?? "-"
                    }
                  />
                  <InfoRow
                    label="Date"
                    value={new Date(
                      viewPurchase.purchaseDate,
                    ).toLocaleDateString()}
                  />
                  <InfoRow label="Payment" value={viewPurchase.paymentMethod} />
                  <InfoRow
                    label="Location"
                    value={
                      locations.find((l) => l.id === viewPurchase.locationId)
                        ?.name ?? "-"
                    }
                  />
                  <InfoRow
                    label="Total"
                    value={formatCurrency(viewPurchase.totalAmount)}
                    highlight
                  />
                  <InfoRow
                    label="Debt"
                    value={formatCurrency(viewPurchase.debtAmount)}
                  />
                </div>
                <div className="border-t border-slate-100 dark:border-zinc-800 pt-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Items ({viewPurchase.items.length})
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {viewPurchase.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs bg-slate-50 dark:bg-zinc-800 rounded-lg px-3 py-2"
                      >
                        <span className="font-bold text-slate-700 dark:text-zinc-300">
                          {item.itemId}
                        </span>
                        <span className="font-mono text-slate-500">
                          ×{item.qty} @ {formatCurrency(item.unitCost)}
                        </span>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setDeleteId(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xl z-10 w-full max-w-sm space-y-4 border border-slate-200 dark:border-zinc-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">
                    Delete Purchase
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deletePurchase(deleteId);
                    setDeleteId(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold cursor-pointer hover:bg-rose-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-black mt-0.5",
          highlight
            ? "text-indigo-600 dark:text-indigo-400"
            : "text-slate-900 dark:text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}
