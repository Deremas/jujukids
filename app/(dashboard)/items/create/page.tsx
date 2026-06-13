"use client";

import React, { useState } from "react";
import { Package, ArrowLeft, Save, Plus, Barcode, Layers, Tag, X, PlusCircle, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/lib/client/useAppData";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export default function CreateItemPage() {
  const router = useRouter();
  const { addItem, currentLocation } = useAppData();
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "",
    stock: 0,
    unit: "",
    status: "Active"
  });
  const [categories, setCategories] = useState(["Electronics", "Accessories", "Computers", "Office Supplies", "Furniture"]);
  const [units, setUnits] = useState(["Pcs", "Box", "Kg", "Ltr", "Mtr", "Set"]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newUnitName, setNewUnitName] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSave = async () => {
    if (!formData.name) return;
    setSaving(true);
    setSaveError("");
    try {
      const generatedCode = formData.code || "ITEM-" + Math.random().toString(36).substr(2, 6).toUpperCase();
      await addItem({
        ...formData,
        code: generatedCode,
        price: 0,
        locationId: currentLocation?.id,
      });
      router.push("/items");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to create item.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAddCategory = () => {
    if (newCategoryName && !categories.includes(newCategoryName)) {
      setCategories([...categories, newCategoryName]);
      setFormData({ ...formData, category: newCategoryName });
      setShowCategoryModal(false);
      setNewCategoryName("");
    }
  };

  const handleQuickAddUnit = () => {
    if (newUnitName && !units.includes(newUnitName)) {
      setUnits([...units, newUnitName]);
      setFormData({ ...formData, unit: newUnitName });
      setShowUnitModal(false);
      setNewUnitName("");
    }
  };


  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-32 animate-in slide-in-from-bottom-4 duration-500 font-bold">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-6 p-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase px-1">Create New Item</h1>
            <p className="text-slate-500 mt-1 uppercase text-[10px] font-black tracking-widest opacity-70 px-1">Inventory Asset Registration</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
          <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-8 border-b border-slate-50 dark:border-zinc-800/50 pb-4">General Information</h3>
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest px-1">Item Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Laptop Charger 65W" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all font-black placeholder:opacity-30" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest px-1 text-nowrap">Asset Code (Auto-generates)</label>
                <div className="relative">
                  <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="PHN-001" 
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-mono uppercase font-black placeholder:opacity-30" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Category</label>
                  <button 
                    onClick={() => setShowCategoryModal(true)}
                    className="text-[9px] font-black text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-0.5 rounded-lg transition-colors uppercase tracking-widest"
                  >
                    + NEW
                  </button>
                </div>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm appearance-none cursor-pointer font-black tracking-tight"
                  >
                    <option value="" disabled>Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-2 max-w-xs">
              <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Base Metric</label>
                <button 
                  onClick={() => setShowUnitModal(true)}
                  className="text-[9px] font-black text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-0.5 rounded-lg transition-colors uppercase tracking-widest"
                >
                  + NEW
                </button>
              </div>
              <div className="relative">
                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <select 
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm appearance-none cursor-pointer font-black tracking-tight"
                >
                  <option value="" disabled>Select Unit</option>
                  {units.map(u => (
                    <option key={u} value={u}>{u.toUpperCase()}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 p-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-end gap-6">
          {saveError && <p className="text-rose-500 font-bold text-xs">{saveError}</p>}
          <button 
             onClick={() => router.back()}
             className="px-6 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-10 py-3 bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black shadow-xl shadow-indigo-900/30 hover:bg-indigo-500 active:scale-95 transition-all uppercase tracking-widest"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Item
              </>
            )}
          </button>
        </div>
      </div>

      {/* Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCategoryModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Quick Add Category</h3>
                <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Category Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Hardware" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50/50 dark:bg-zinc-950/50 flex gap-3">
                <button 
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={handleQuickAddCategory}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 transition-all uppercase tracking-widest"
                >
                  Create & Select
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unit Modal */}
      <AnimatePresence>
        {showUnitModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUnitModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Quick Add Unit</h3>
                <button onClick={() => setShowUnitModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Unit Label</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Dozen" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50/50 dark:bg-zinc-950/50 flex gap-3">
                <button 
                  onClick={() => setShowUnitModal(false)}
                  className="flex-1 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={handleQuickAddUnit}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 transition-all uppercase tracking-widest"
                >
                  Create & Select
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
