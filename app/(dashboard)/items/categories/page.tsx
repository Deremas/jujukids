"use client";

import React from "react";
import { Archive, Box, Plus, Tag, Tags } from "lucide-react";

import { useAppData } from "@/lib/client/useAppData";

type CategoryCard = {
  id: string;
  name: string;
  count: number;
  color: string;
};

const CARD_COLORS = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

export default function CategoriesPage() {
  const { categories = [], products = [] } = useAppData();
  const visibleCategories = React.useMemo(
    () => categories.filter((category: any) => String(category?.name || "").trim()),
    [categories],
  );

  const categoryCards = React.useMemo<CategoryCard[]>(() => {
    return visibleCategories
      .map((category: any, index: number) => ({
        id: category.id,
        name: category.name,
        count: products.filter((product: any) => product.categoryId === category.id).length,
        color: CARD_COLORS[index % CARD_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [visibleCategories, products]);

  const uncategorizedCount = React.useMemo(() => {
    const categoryIds = new Set(visibleCategories.map((category: any) => category.id));
    return products.filter((product: any) => !categoryIds.has(product.categoryId)).length;
  }, [visibleCategories, products]);

  const totalCounted = categoryCards.reduce((sum, category) => sum + category.count, 0);
  const hasCategories = categoryCards.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Categories</h1>
          <p className="mt-1 text-slate-500">
            Live category summary from your current inventory.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-900/20 transition-all hover:bg-indigo-500 active:scale-95">
          <Plus className="h-4 w-4" /> New Category
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={Tags} label="Categories" value={String(categoryCards.length)} />
        <SummaryCard icon={Tag} label="Categorized Items" value={String(totalCounted)} />
        <SummaryCard icon={Box} label="Uncategorized Items" value={String(uncategorizedCount)} tone={uncategorizedCount > 0 ? "warning" : "success"} />
      </div>

      {!hasCategories ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <Archive className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">No categories yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            Create categories when you are ready. For now, all items will appear as uncategorized.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {categoryCards.map((category) => (
            <div
              key={category.id}
              className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${category.color} text-white shadow-lg`}>
                <Tag className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-black text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white">
                {category.name}
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                {category.count} item{category.count === 1 ? "" : "s"} categorized
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:border-zinc-800 dark:text-slate-300">
                <span>View Products</span>
                <Archive className="h-3.5 w-3.5" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "warning" | "success";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <Icon
        className={`h-5 w-5 ${
          tone === "warning"
            ? "text-amber-500"
            : tone === "success"
              ? "text-emerald-500"
              : "text-indigo-600"
        }`}
      />
      <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
