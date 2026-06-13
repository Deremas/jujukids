"use client";

import React from "react";
import Link from "next/link";
import { Truck, Search, Package } from "lucide-react";

import { useAppData } from "@/lib/client/useAppData";
import { formatCurrency } from "@/lib/utils";

export default function PurchaseItemsPage() {
  const { purchases, items, locations, suppliers, currentLocation } =
    useAppData();
  const [search, setSearch] = React.useState("");
  const [locationId, setLocationId] = React.useState("");

  React.useEffect(() => {
    if (currentLocation?.id) setLocationId(currentLocation.id);
  }, [currentLocation?.id]);

  const itemName = (id: string) =>
    items.find((item: any) => item.id === id)?.name || id;
  const itemCode = (id: string) =>
    items.find((item: any) => item.id === id)?.code || "";
  const itemUnit = (id: string) =>
    items.find((item: any) => item.id === id)?.unit || "-";
  const supplierName = (id?: string | null) =>
    suppliers.find((s: any) => s.id === id)?.name || "No Supplier";
  const locationName = (id: string) =>
    locations.find((location: any) => location.id === id)?.name || "-";

  const rows = purchases
    .filter(
      (purchase: any) => !locationId || purchase.locationId === locationId,
    )
    .flatMap((purchase: any) =>
      purchase.items.map((line: any) => ({
        purchase,
        line,
        item: itemName(line.itemId),
        code: itemCode(line.itemId),
        unit: itemUnit(line.itemId),
        supplier: supplierName(purchase.supplierId),
        location: locationName(purchase.locationId),
      })),
    )
    .filter((row: any) => {
      const haystack =
        `${row.purchase.id} ${row.item} ${row.code} ${row.supplier} ${row.location}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });

  // Summary stats
  const totalItems = rows.length;
  const totalQty = rows.reduce(
    (sum: number, r: any) => sum + Number(r.line.qty || 0),
    0,
  );
  const totalInvestment = rows.reduce(
    (sum: number, r: any) =>
      sum + Number(r.line.total || r.line.qty * r.line.unitCost || 0),
    0,
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            <Truck className="h-8 w-8 text-amber-600" />
            Purchased Items
          </h1>
          <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-500">
            Item-level procurement history by location
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search purchased items..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-bold outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 sm:w-72"
            />
          </div>
          <select
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-widest text-slate-600 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <option value="">All Locations</option>
            {locations.map((location: any) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Total Line Items
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {totalItems.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Total Quantity
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {totalQty.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Total Investment
          </p>
          <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
            {formatCurrency(totalInvestment)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:border-zinc-800 dark:bg-zinc-950/50">
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Purchase ID</th>
                <th className="px-5 py-4">Item</th>
                <th className="px-5 py-4">Supplier</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4 text-right">Qty</th>
                <th className="px-5 py-4 text-right">Unit Cost</th>
                <th className="px-5 py-4 text-right">Selling Price</th>
                <th className="px-5 py-4 text-right">Total</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-14 text-center text-xs font-black uppercase tracking-widest text-slate-300"
                  >
                    No purchased items found
                  </td>
                </tr>
              ) : (
                rows.map((row: any) => (
                  <tr
                    key={`${row.purchase.id}-${row.line.id}`}
                    className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-5 py-4 text-sm font-semibold text-slate-500">
                      {new Date(row.purchase.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-sm font-black text-slate-950 dark:text-white">
                      {row.purchase.id}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-900/20 shrink-0">
                          <Package className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-950 dark:text-white truncate">
                            {row.item}
                          </p>
                          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                            {row.code || row.line.itemId} · {row.unit}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-500">
                      {row.supplier}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase">
                        {row.location}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-black">
                      {row.line.qty}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-black font-mono">
                      {formatCurrency(row.line.unitCost)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(row.line.sellingPrice || 0)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-black text-amber-600 dark:text-amber-400">
                      {formatCurrency(
                        row.line.total || row.line.qty * row.line.unitCost,
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/purchases/${row.purchase.id}`}
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
