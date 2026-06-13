"use client";

import React from "react";
import { Tag, Plus, MoreVertical, Archive } from "lucide-react";

const CATEGORIES = [
  { name: "Electronics", count: 156, color: "bg-blue-500" },
  { name: "Laptops", count: 42, color: "bg-indigo-500" },
  { name: "Phones", count: 89, color: "bg-emerald-500" },
  { name: "Accessories", count: 210, color: "bg-amber-500" },
];

export default function CategoriesPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Categories</h1>
          <p className="text-slate-500 mt-1">Organize your products into logical groups.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {CATEGORIES.map((cat) => (
          <div key={cat.name} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group relative">
            <button className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
            <div className={`w-10 h-10 ${cat.color} rounded-xl mb-4 flex items-center justify-center text-white shadow-lg`}>
              <Tag className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{cat.name}</h4>
            <p className="text-xs text-slate-500 mt-1">{cat.count} products categorized</p>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-widest uppercase">
              <span>View Products</span>
              <Archive className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
