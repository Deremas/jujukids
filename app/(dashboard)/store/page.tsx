"use client";

import React from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Database, Edit, Package, Search, ShieldCheck, SlidersHorizontal, Warehouse, X } from "lucide-react";
import { useAppData } from "@/lib/client/useAppData";
import { cn, formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";

export default function StoreStockPage() {
  return <StockView locationType="STORE" title="Store Stock" description="Stock held in store locations." />;
}

export function StockView({
  locationType,
  title,
  description,
}: {
  locationType: "STORE" | "SHOP";
  title: string;
  description: string;
}) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const { items = [], locations = [], currentLocation, adjustStock, updateItemPrice } = useAppData();
  const [search, setSearch] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [adjustingItem, setAdjustingItem] = React.useState<any>(null);
  const [adjustQuantity, setAdjustQuantity] = React.useState("");
  const [adjustReason, setAdjustReason] = React.useState("");
  const [adjustError, setAdjustError] = React.useState("");
  const [priceEditingItem, setPriceEditingItem] = React.useState<any>(null);
  const [priceValue, setPriceValue] = React.useState("");
  const [priceError, setPriceError] = React.useState("");
  const canAdjustStock = user?.role === "Super Admin";
  const canEditPrice = user?.role === "Super Admin" || user?.permissions?.includes("inventory.items.update");

  const scopedLocations = locations.filter((location: any) => location.type === locationType);

  React.useEffect(() => {
    if (currentLocation?.type === locationType) {
      setLocationId(currentLocation.id);
      return;
    }
    setLocationId("");
  }, [currentLocation, locationType]);

  const categories = React.useMemo<string[]>(
    () => Array.from(new Set<string>(items.map((item: any) => String(item.category || "")).filter(Boolean))).sort(),
    [items],
  );

  const filteredStock = items.filter((item: any) => {
    const location = locations.find((entry: any) => entry.id === item.locationId);
    const q = search.trim().toLowerCase();
    const stockStatus = getStockStatus(item);
    return (
      location?.type === locationType &&
      (!locationId || item.locationId === locationId) &&
      (!category || item.category === category) &&
      (!status || stockStatus === status) &&
      (!q || `${item.name} ${item.code} ${item.category} ${location?.name || ""}`.toLowerCase().includes(q))
    );
  });

  const totalValue = filteredStock.reduce((sum: number, item: any) => sum + Number(item.stock || 0) * Number(item.price || 0), 0);
  const totalQty = filteredStock.reduce((sum: number, item: any) => sum + Number(item.stock || 0), 0);

  const openAdjustment = (item: any) => {
    setAdjustingItem(item);
    setAdjustQuantity(String(item.stock || 0));
    setAdjustReason("");
    setAdjustError("");
  };

  const submitAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adjustingItem) return;
    setAdjustError("");
    try {
      await adjustStock({
        itemId: adjustingItem.id,
        locationId: adjustingItem.locationId,
        quantity: Number(adjustQuantity),
        reason: adjustReason,
      });
      setAdjustingItem(null);
    } catch (error) {
      setAdjustError(error instanceof Error ? error.message : "Stock adjustment failed.");
    }
  };

  const openPriceEditor = (item: any) => {
    setPriceEditingItem(item);
    setPriceValue(String(Number(item.sellingPrice || item.price || 0)));
    setPriceError("");
  };

  const submitPriceUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!priceEditingItem) return;
    setPriceError("");
    try {
      await updateItemPrice({
        itemId: priceEditingItem.id,
        locationId: priceEditingItem.locationId,
        sellingPrice: Number(priceValue),
      });
      setPriceEditingItem(null);
    } catch (error) {
      setPriceError(error instanceof Error ? error.message : "Selling price update failed.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-1 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard title="Stock Value" value={formatCurrency(totalValue)} sub="Filtered value" icon={Database} />
        <StatCard title="Stock Quantity" value={totalQty.toLocaleString()} sub="Available units" icon={Package} />
        <StatCard title="Locations" value={scopedLocations.length.toString()} sub={locationType === "STORE" ? "Stores" : "Shops"} icon={Warehouse} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-3 border-b border-slate-100 p-4 dark:border-zinc-800 xl:grid-cols-[minmax(260px,1fr)_180px_180px_160px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by item, SKU, category or location..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <Select value={locationId} onChange={setLocationId} label="All Locations" options={scopedLocations.map((location: any) => ({ value: location.id, label: location.name }))} />
          <Select value={category} onChange={setCategory} label="All Categories" options={categories.map((entry) => ({ value: entry, label: entry }))} />
          <Select value={status} onChange={setStatus} label="All Status" options={["In Stock", "Low Stock", "Out of Stock"].map((entry) => ({ value: entry, label: entry }))} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-slate-300">
                <th className="px-6 py-4 text-left">Item / SKU</th>
                <th className="px-6 py-4 text-left">Location</th>
                <th className="px-6 py-4 text-left">Category</th>
                <th className="px-6 py-4 text-right">Buying Price</th>
                <th className="px-6 py-4 text-right">Unit Selling</th>
                <th className="px-6 py-4 text-center">Current Qty</th>
                <th className="px-6 py-4 text-right">Total Value</th>
                <th className="px-6 py-4 text-center">Status</th>
                {canAdjustStock && <th className="px-6 py-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {filteredStock.map((item: any) => {
                const location = locations.find((entry: any) => entry.id === item.locationId);
                const stockStatus = getStockStatus(item);
                return (
                  <tr key={`${item.id}-${item.locationId}`} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-400 dark:bg-zinc-800">
                          <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</h4>
                          <p className="font-mono text-[10px] uppercase text-slate-400">{item.code || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{location?.name || "-"}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{item.category}</td>
                    <td className="px-6 py-4 text-right text-xs font-bold text-slate-900 dark:text-zinc-100">{formatCurrency(Number(item.buyingPrice || 0))}</td>
                    <td className="px-6 py-4 text-right text-xs font-bold text-slate-900 dark:text-zinc-100">
                      <div className="flex items-center justify-end gap-2">
                        <span>{formatCurrency(Number(item.sellingPrice || item.price || 0))}</span>
                        {canEditPrice && (
                          <button
                            type="button"
                            onClick={() => openPriceEditor(item)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-800"
                            title="Edit selling price"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-black text-indigo-600 dark:text-indigo-400">{item.stock}</td>
                    <td className="px-6 py-4 text-right text-xs font-bold text-slate-900 dark:text-zinc-100">{formatCurrency(Number(item.stock || 0) * Number(item.price || 0))}</td>
                    <td className="px-6 py-4 text-center">
                      <div className={cn(
                        "flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest",
                        stockStatus === "Out of Stock" ? "text-rose-600" : stockStatus === "Low Stock" ? "text-amber-600" : "text-emerald-600",
                      )}>
                        <ShieldCheck className="h-3 w-3" />
                        {stockStatus}
                      </div>
                    </td>
                    {canAdjustStock && (
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openAdjustment(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-800"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          Adjust
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={canAdjustStock ? 9 : 8} className="px-6 py-14 text-center text-xs font-black uppercase tracking-widest text-slate-300">
                    No stock records found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {adjustingItem && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <form onSubmit={submitAdjustment} className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Stock Adjustment</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">{adjustingItem.name} at {locations.find((location: any) => location.id === adjustingItem.locationId)?.name}</p>
              </div>
              <button type="button" onClick={() => setAdjustingItem(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-950">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Qty</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{adjustingItem.stock}</p>
              </div>
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Correct Qty</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={adjustQuantity}
                  onChange={(event) => setAdjustQuantity(event.target.value)}
                  className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
                  required
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Reason</span>
              <textarea
                value={adjustReason}
                onChange={(event) => setAdjustReason(event.target.value)}
                placeholder="Example: Physical count correction after receiving entry mistake"
                className="min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
                required
                minLength={5}
              />
            </label>

            {adjustError && <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 dark:bg-rose-950/30">{adjustError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setAdjustingItem(null)} className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-500 dark:border-zinc-800">
                Cancel
              </button>
              <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20">
                Save Adjustment
              </button>
            </div>
          </form>
          </div>
        </ModalPortal>
      )}

      {priceEditingItem && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <form onSubmit={submitPriceUpdate} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">Edit Selling Price</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {priceEditingItem.name} at {locations.find((location: any) => location.id === priceEditingItem.locationId)?.name}
                  </p>
                </div>
                <button type="button" onClick={() => setPriceEditingItem(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">New Selling Price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceValue}
                  onChange={(event) => setPriceValue(event.target.value)}
                  className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
                  required
                />
              </label>
              <p className="mt-2 text-[11px] font-semibold text-slate-500">
                This updates the item default price and open stock batches for this location, so new sales use the new price.
              </p>

              {priceError && <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 dark:bg-rose-950/30">{priceError}</p>}

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setPriceEditingItem(null)} className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-500 dark:border-zinc-800">
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20">
                  Save Price
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}

function getStockStatus(item: any) {
  if (Number(item.stock || 0) <= 0) return "Out of Stock";
  if (Number(item.stock || 0) <= Number(item.lowStockAlert || 10)) return "Low Stock";
  return "In Stock";
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="relative block">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-9 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function StatCard({ title, value, sub, icon: Icon }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">{title}</p>
        <Icon className="h-5 w-5 text-indigo-500" />
      </div>
      <h4 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</h4>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-tight text-slate-500">{sub}</p>
    </div>
  );
}
