"use client";

import React from "react";
import { AlertTriangle, ChevronDown, Edit, Package, Plus, Search, Trash } from "lucide-react";
import Link from "next/link";
import { useAppData } from "@/lib/client/useAppData";
import { cn, formatCurrency } from "@/lib/utils";

export default function ItemList() {
  const { products = [], items = [], currentLocation, deleteItem } = useAppData();
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [itemToDelete, setItemToDelete] = React.useState<string | null>(null);

  const catalog = React.useMemo(() => {
    if (products.length > 0) return products;
    const byId = new Map<string, any>();
    items.forEach((item: any) => {
      if (!byId.has(item.id)) byId.set(item.id, item);
    });
    return [...byId.values()];
  }, [items, products]);

  const categories = React.useMemo<string[]>(
    () => Array.from(new Set<string>(catalog.map((item: any) => String(item.category || "")).filter(Boolean))).sort(),
    [catalog],
  );

  const filteredItems = catalog.filter((item: any) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || `${item.name} ${item.code} ${item.category}`.toLowerCase().includes(q);
    const matchesCategory = !category || item.category === category;
    return matchesSearch && matchesCategory;
  });

  const stockFor = (itemId: string, locationId?: string) =>
    items
      .filter((row: any) => row.id === itemId && (!locationId || row.locationId === locationId))
      .reduce((sum: number, row: any) => sum + Number(row.stock || 0), 0);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteItem(itemToDelete);
      setItemToDelete(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not delete item.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Item List</h1>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Product catalog with {currentLocation?.name || "active location"} stock context
          </p>
        </div>
        <Link href="/items/create" className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95">
          <Plus className="h-5 w-5" />
          Create New Item
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code or category..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="relative">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 pr-9 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">All Categories</option>
              {categories.map((entry) => (
                <option key={entry} value={entry}>{entry}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500 dark:border-zinc-800 dark:bg-zinc-950/30">
                <th className="px-6 py-5">Product Details</th>
                <th className="px-6 py-5">Item Code</th>
                <th className="px-6 py-5">Category</th>
                <th className="px-6 py-5">Active Stock</th>
                <th className="px-6 py-5">Total Stock</th>
                <th className="px-6 py-5">Selling Price</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold dark:divide-zinc-800">
              {filteredItems.map((item: any) => {
                const activeStock = stockFor(item.id, currentLocation?.id);
                const totalStock = stockFor(item.id);
                return (
                  <tr key={item.id} className="transition-all hover:bg-slate-50 dark:hover:bg-zinc-800/20">
                    <td className="max-w-xs px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400 dark:bg-indigo-900/20">
                          <Package className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black uppercase tracking-tight text-slate-900 dark:text-zinc-200">{item.name}</p>
                          <p className="text-[10px] font-bold uppercase tracking-tight text-slate-400">{item.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-mono text-xs uppercase tracking-tighter text-slate-500">{item.code || "-"}</td>
                    <td className="px-6 py-5">
                      <span className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:border-zinc-700 dark:bg-zinc-800">{item.category}</span>
                    </td>
                    <td className="px-6 py-5 text-sm font-black">
                      <span className={cn(activeStock <= Number(item.lowStockAlert || 10) ? "text-rose-600" : "text-slate-900 dark:text-white")}>{activeStock}</span>
                    </td>
                    <td className="px-6 py-5 text-sm font-black text-slate-900 dark:text-white">{totalStock}</td>
                    <td className="px-6 py-5 font-mono text-sm font-black text-slate-900 dark:text-zinc-100">{formatCurrency(item.price || 0)}</td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-zinc-800">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => setItemToDelete(item.id)} className="rounded-xl p-2 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20">
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-xs font-black uppercase tracking-widest text-slate-300">
                    No items found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {itemToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" />
              <div>
                <h3 className="text-lg font-black text-slate-950 dark:text-white">Confirm Deletion</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Only unused items can be deleted. Production records remain protected.</p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setItemToDelete(null)} className="flex-1 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold dark:bg-zinc-800">Cancel</button>
              <button onClick={handleDelete} className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white">Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
