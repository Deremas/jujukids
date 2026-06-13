"use client";

import React from "react";
import { AlertTriangle, ChevronDown, Package, Search } from "lucide-react";
import { useAppData } from "@/lib/client/useAppData";
import { cn } from "@/lib/utils";

export default function LowStockPage() {
  const { items = [], locations = [], currentLocation } = useAppData();
  const [search, setSearch] = React.useState("");
  const [locationType, setLocationType] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [alertLevel, setAlertLevel] = React.useState("");

  React.useEffect(() => {
    if (!currentLocation) return;
    setLocationId(currentLocation.id);
    setLocationType(currentLocation.type || "");
  }, [currentLocation]);

  const categories = React.useMemo<string[]>(
    () => Array.from(new Set<string>(items.map((item: any) => String(item.category || "")).filter(Boolean))).sort(),
    [items],
  );

  const visibleLocations = locations.filter((location: any) => !locationType || location.type === locationType);

  React.useEffect(() => {
    if (locationId && !visibleLocations.some((location: any) => location.id === locationId)) {
      setLocationId("");
    }
  }, [locationId, visibleLocations]);

  const lowStockItems = items.filter((item: any) => {
    const location = locations.find((entry: any) => entry.id === item.locationId);
    const level = getAlertLevel(item);
    const q = search.trim().toLowerCase();
    return (
      level !== "Healthy" &&
      (!locationType || location?.type === locationType) &&
      (!locationId || item.locationId === locationId) &&
      (!category || item.category === category) &&
      (!alertLevel || level === alertLevel) &&
      (!q || `${item.name} ${item.code} ${item.category} ${location?.name || ""}`.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          Low Stock Alerts
        </h1>
        <p className="mt-1 text-slate-500">Items below their configured minimum threshold, scoped from the active topbar location.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-3 border-b border-slate-100 p-4 dark:border-zinc-800 xl:grid-cols-[minmax(260px,1fr)_150px_180px_180px_160px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search item, SKU, category or location..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <Select value={locationType} onChange={setLocationType} label="All Types" options={[{ value: "STORE", label: "Stores" }, { value: "SHOP", label: "Shops" }]} />
          <Select value={locationId} onChange={setLocationId} label="All Locations" options={visibleLocations.map((location: any) => ({ value: location.id, label: location.name }))} />
          <Select value={category} onChange={setCategory} label="All Categories" options={categories.map((entry) => ({ value: entry, label: entry }))} />
          <Select value={alertLevel} onChange={setAlertLevel} label="All Alerts" options={["Out of Stock", "Critical", "Below Minimum"].map((entry) => ({ value: entry, label: entry }))} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-slate-300">
                <th className="px-6 py-4 text-left">Item</th>
                <th className="px-6 py-4 text-left">Location</th>
                <th className="px-6 py-4 text-left">Category</th>
                <th className="px-6 py-4 text-center">Current Stock</th>
                <th className="px-6 py-4 text-center">Threshold</th>
                <th className="px-6 py-4 text-center">Alert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {lowStockItems.map((item: any) => {
                const location = locations.find((entry: any) => entry.id === item.locationId);
                const level = getAlertLevel(item);
                return (
                  <tr key={`${item.id}-${item.locationId}`} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                          <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</span>
                          <p className="font-mono text-[10px] uppercase text-slate-400">{item.code || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{location?.name || "-"}</td>
                    <td className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">{item.category}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "rounded-lg p-1.5 text-xs font-black",
                        Number(item.stock || 0) <= 0 ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30" : "bg-amber-100 text-amber-600 dark:bg-amber-900/30",
                      )}>
                        {item.stock} LEFT
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-500">{item.lowStockAlert || 10}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest",
                        level === "Out of Stock" && "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
                        level === "Critical" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
                        level === "Below Minimum" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                      )}>
                        {level}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {lowStockItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-xs font-black uppercase tracking-widest text-slate-300">
                    No low stock alerts found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getAlertLevel(item: any) {
  const stock = Number(item.stock || 0);
  const threshold = Number(item.lowStockAlert || 10);
  if (stock <= 0) return "Out of Stock";
  if (stock <= Math.max(1, Math.floor(threshold / 2))) return "Critical";
  if (stock <= threshold) return "Below Minimum";
  return "Healthy";
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
