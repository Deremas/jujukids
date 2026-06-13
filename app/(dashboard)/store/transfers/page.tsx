"use client";

import React, { useState } from "react";
import { ArrowRightLeft, Plus, Search, Package, ChevronRight, X, AlertCircle } from "lucide-react";
import { useAppData } from "@/lib/client/useAppData";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useSession } from "next-auth/react";

export default function TransfersPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const { locations, items, transfers, addTransfer, currentLocation, products } = useAppData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const canCreateTransfer = user?.role === "Super Admin" || user?.permissions?.includes("inventory.transfers.create");

  // New Transfer State
  const [fromLocationId, setFromLocationId] = useState(currentLocation?.id || "");
  const [toLocationId, setToLocationId] = useState("");
  const [note, setNote] = useState("");
  const [transferItems, setTransferItems] = useState<Array<{ itemId: string; quantity: number }>>([
    { itemId: "", quantity: 1 }
  ]);

  React.useEffect(() => {
    if (currentLocation) {
      setFromLocationId(currentLocation.id);
      setTransferItems([{ itemId: "", quantity: 1 }]);
    }
  }, [currentLocation]);

  const handleAddItemRow = () => {
    setTransferItems([...transferItems, { itemId: "", quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, itemId: string) => {
    const updated = [...transferItems];
    updated[index] = { ...updated[index], itemId, quantity: 1 };
    setTransferItems(updated);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...transferItems];
    updated[index] = { ...updated[index], quantity };
    setTransferItems(updated);
  };

  // We filter available items at origin location
  const availableItems = items.filter((i: any) => i.locationId === fromLocationId);

  // Validate all items
  const isFormValid = React.useMemo(() => {
    if (!fromLocationId || !toLocationId || fromLocationId === toLocationId) return false;
    if (transferItems.length === 0) return false;
    
    // Check every selected item
    for (const item of transferItems) {
      if (!item.itemId || item.quantity <= 0) return false;
      const refItem = items.find((i: any) => i.id === item.itemId && i.locationId === fromLocationId);
      if (!refItem || item.quantity > refItem.stock) return false;
    }
    return true;
  }, [fromLocationId, toLocationId, transferItems, items]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    addTransfer({
      id: "TR-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
      fromLocationId,
      toLocationId,
      items: transferItems.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity
      })),
      date: new Date(),
      note,
      status: 'COMPLETED'
    }).then(() => {
      setIsModalOpen(false);
      setTransferItems([{ itemId: "", quantity: 1 }]);
      setToLocationId("");
      setNote("");
    }).catch((error: unknown) => {
      alert(error instanceof Error ? error.message : "Transfer failed.");
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <ArrowRightLeft className="w-8 h-8 text-indigo-600" />
            Stock Transfers
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Movement between warehouses & shops</p>
        </div>
        {canCreateTransfer && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Create Transfer
          </button>
        )}
      </div>

      {/* Stats/Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center">
            <ArrowRightLeft className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Total Transfers</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{transfers.length}</p>
          </div>
        </div>
      </div>

      {/* Transfer List */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-50 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search transfers..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-950/50 border-b border-slate-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Date / ID</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest w-1/4 min-w-[200px]">Item</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">From</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">To</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-right">Qty</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-zinc-800/50">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <ArrowRightLeft className="w-12 h-12" />
                      <p className="text-xs font-black uppercase tracking-widest">No transfers recorded</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transfers.map((tr) => {
                  const product = products?.find(p => p.id === tr.itemId);
                  const item = items.find(i => i.id === tr.itemId) || product;
                  const from = locations.find(b => b.id === tr.fromLocationId);
                  const to = locations.find(b => b.id === tr.toLocationId);
                  const categoryName = item?.category || "General";
                  return (
                    <tr key={tr.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-slate-700 dark:text-zinc-200">{new Date(tr.date).toLocaleDateString()}</p>
                        <p className="text-[10px] font-mono text-slate-400">{tr.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{item?.name}</p>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{item?.code}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100/40 dark:border-indigo-900/30">
                          {categoryName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex px-2 py-1 bg-slate-100 dark:bg-zinc-800 rounded-md text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase">
                          {from?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-md text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">
                          {to?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs font-black text-slate-900 dark:text-white">{tr.quantity} {item?.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex px-2 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          {tr.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Transfer Modal */}
      <AnimatePresence>
        {isModalOpen && canCreateTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">New Stock Transfer</h2>
                    <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Move inventory between locations</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* From -> To */}
                  <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 relative">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-zinc-900 rounded-full border border-slate-200 dark:border-zinc-800 flex items-center justify-center z-10 shadow-sm">
                      <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Origin</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-black uppercase appearance-none"
                        value={fromLocationId}
                        onChange={(e) => {
                          setFromLocationId(e.target.value);
                          setTransferItems([{ itemId: "", quantity: 1 }]);
                        }}
                      >
                        {(user?.role === 'Super Admin' ? locations : locations.filter((b: any) => user?.assignedLocations.includes(b.id))).map((b: any) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Destination</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-black uppercase appearance-none"
                        value={toLocationId}
                        onChange={(e) => setToLocationId(e.target.value)}
                      >
                        <option value="" disabled>Select Location</option>
                        {locations.filter(b => b.id !== fromLocationId).map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Items to Transfer</label>
                      <button
                        type="button"
                        onClick={handleAddItemRow}
                        className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
                      >
                        + Add Item
                      </button>
                    </div>

                    {transferItems.map((item, index) => {
                      const refItem = items.find((i: any) => i.id === item.itemId && i.locationId === fromLocationId);
                      const maxStock = refItem?.stock || 0;
                      return (
                        <div key={index} className="grid grid-cols-[1fr_100px_40px] gap-2 items-end p-2 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-100 dark:border-zinc-800">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Item {index + 1}</span>
                            <select
                              required
                              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-black uppercase"
                              value={item.itemId}
                              onChange={(e) => handleItemChange(index, e.target.value)}
                            >
                              <option value="" disabled>Select Item</option>
                              {availableItems.map((i: any) => {
                                const isSelectedElsewhere = transferItems.some((other, oi) => other.itemId === i.id && oi !== index);
                                return (
                                  <option key={i.id} value={i.id} disabled={isSelectedElsewhere}>
                                    {i.name} ({i.stock} {i.unit})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Qty (Max: {maxStock})</span>
                            <input
                              type="number"
                              min="1"
                              max={maxStock}
                              required
                              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-bold outline-none font-mono"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                            />
                          </div>

                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(index)}
                              disabled={transferItems.length === 1}
                              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg disabled:opacity-30"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Note Field */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Note / Remark</label>
                    <textarea
                      placeholder="Add any internal transfer notes..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full min-h-[60px] p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                    />
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={!isFormValid}
                      className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-zinc-800 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98]"
                    >
                      Process Transfer
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
