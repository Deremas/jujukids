"use client";

import React, { useState, useMemo } from "react";
import { Truck, ArrowLeft, Save, Plus, Search, User, Package, Trash2, X, PlusCircle, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/lib/client/useAppData";
import { cn, formatNumberWithCommas, parseCommaNumber } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { SearchableSelect } from "@/components/searchable-select";
import { useSession } from "next-auth/react";

const NO_SUPPLIER_ID = "__NO_SUPPLIER__";

interface PurchaseLine {
  id: string;
  itemId: string;
  itemName: string;
  qty: number;
  unitCost: number;
  sellingPrice: number;
  unit: string;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;
  const { items = [], products = [], categories = [], units = [], suppliers, addSupplier, addItem, bankAccounts, addPurchase, locations, currentLocation } = useAppData();
  const [purchaseDate, setPurchaseDate] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState(NO_SUPPLIER_ID);
  const [selectedLocationId, setSelectedLocationId] = useState(currentLocation?.id || "");
  const [lines, setLines] = useState<PurchaseLine[]>([
    { id: "1", itemId: "", itemName: "", qty: 1, unitCost: 0, sellingPrice: 0, unit: "" }
  ]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CREDIT' | 'MIXED'>('CASH');
  const [selectedBankId, setSelectedBankId] = useState("");
  const [cashPaid, setCashPaid] = useState(0);
  const [bankPaid, setBankPaid] = useState(0);
  const [mounted, setMounted] = useState(false);
  
  // Available shops/stores for purchase - Admin can choose any, others might be restricted
  const purchasableLocations = user?.role === 'Super Admin' ? locations : locations.filter(b => user?.assignedLocations.includes(b.id));

  // Modals state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  
  // New Supplier state
  const [newSupplier, setNewSupplier] = useState({ name: "", contact: "", phone: "" });
  
  // New Item state
  const [newItem, setNewItem] = useState({ name: "", code: "", categoryId: "", price: 0, unitId: "" });
  const [saving, setSaving] = useState(false);

  const itemCatalog = useMemo(() => {
    if (products.length > 0) return products;
    const byId = new Map<string, any>();
    items.forEach((item: any) => {
      if (!byId.has(item.id)) byId.set(item.id, item);
    });
    return [...byId.values()];
  }, [items, products]);

  React.useEffect(() => {
    setMounted(true);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
  }, []);

  React.useEffect(() => {
    if (!currentLocation?.id) return;
    setSelectedLocationId((current) => current || currentLocation.id);
  }, [currentLocation?.id]);

  const totals = useMemo(() => {
    return lines.reduce((acc, line) => acc + (line.qty * line.unitCost), 0);
  }, [lines]);

  if (!mounted) return null;

  const addLine = () => {
    setLines([
      ...lines,
      { id: Math.random().toString(36).substr(2, 9), itemId: "", itemName: "", qty: 1, unitCost: 0, sellingPrice: 0, unit: "" }
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(line => line.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof PurchaseLine, value: any) => {
    setLines(lines.map(line => {
      if (line.id === id) {
        if (field === 'itemId') {
          const item = itemCatalog.find((entry: any) => entry.id === value);
          return { 
            ...line, 
            itemId: value, 
            itemName: item?.name || "", 
            unit: item?.unitShortName || item?.unit || "",
            sellingPrice: item?.price || 0 
          };
        }
        return { ...line, [field]: value };
      }
      return line;
    }));
  };

  const handleQuickAddSupplier = async () => {
    if (newSupplier.name) {
      try {
        const result = await addSupplier(newSupplier);
        setSelectedSupplierId(result.id);
        setShowSupplierModal(false);
        setNewSupplier({ name: "", contact: "", phone: "" });
      } catch (error) {
        alert(error instanceof Error ? error.message : "Supplier could not be added.");
      }
    }
  };

  const handleQuickAddItem = async () => {
    if (newItem.name && selectedLocationId && newItem.unitId) {
      const generatedCode = newItem.code || "ITEM-" + Math.random().toString(36).substr(2, 6).toUpperCase();
      const fullItem = { 
        ...newItem, 
        price: 0,
        stock: 0, 
        status: "Active", 
        code: generatedCode,
        locationId: selectedLocationId,
        categoryId: newItem.categoryId,
        unitId: newItem.unitId,
      };
      const result = await addItem(fullItem);
      if (result?.id) {
        const firstEmptyLine = lines.find((line) => !line.itemId)?.id || lines[0]?.id;
        if (firstEmptyLine) {
          const unit = units.find((entry: any) => entry.id === newItem.unitId);
          setLines((current) =>
            current.map((line) =>
              line.id === firstEmptyLine
                ? {
                    ...line,
                    itemId: result.id,
                    itemName: newItem.name,
                    unit: unit?.shortName || unit?.name || "",
                    sellingPrice: 0,
                  }
                : line,
            ),
          );
        }
      }
      setShowItemModal(false);
      setNewItem({ name: "", code: "", categoryId: "", price: 0, unitId: "" });
    }
  };


  const handleSave = async () => {
    if (lines.some(l => !l.itemId)) return alert("Please select items for all lines");

    let paidAmount = 0;
    let debtAmount = 0;

    if (paymentMethod === 'CASH' || paymentMethod === 'BANK') {
      paidAmount = totals;
    } else if (paymentMethod === 'CREDIT') {
      debtAmount = totals;
    } else if (paymentMethod === 'MIXED') {
      paidAmount = cashPaid + bankPaid;
      debtAmount = Math.max(0, totals - paidAmount);
    }

    const hasSupplier = selectedSupplierId && selectedSupplierId !== NO_SUPPLIER_ID;
    if (debtAmount > 0 && !hasSupplier) {
      return alert("Please select a supplier for credit or remaining debt purchases.");
    }

    const purchase = {
      supplierId: hasSupplier ? selectedSupplierId : "",
      locationId: selectedLocationId,
      purchaseDate: new Date(purchaseDate),
      totalAmount: totals,
      paidAmount,
      cashAmount: paymentMethod === 'CASH' ? totals : paymentMethod === 'MIXED' ? cashPaid : 0,
      bankAmount: paymentMethod === 'BANK' ? totals : paymentMethod === 'MIXED' ? bankPaid : 0,
      debtAmount,
      paymentMethod,
      bankAccountId: (paymentMethod === 'BANK' || (paymentMethod === 'MIXED' && bankPaid > 0)) ? selectedBankId : undefined,
      items: lines.map(line => ({
        id: line.id,
        itemId: line.itemId,
        qty: line.qty,
        unitCost: line.unitCost,
        sellingPrice: line.sellingPrice,
        total: line.qty * line.unitCost
      }))
    };

    setSaving(true);
    try {
      await addPurchase(purchase);
      router.push("/purchases");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save purchase.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative space-y-6 max-w-5xl mx-auto pb-32 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">New Purchase</h1>
            <p className="text-slate-500 mt-1 uppercase text-[10px] font-black tracking-widest">Stock Procurement Entry</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 max-w-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Supplier</label>
                  <button 
                    onClick={() => setShowSupplierModal(true)}
                    className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-0.5 rounded transition-colors"
                  >
                    + Quick Add
                  </button>
                </div>
                <SearchableSelect
                  value={selectedSupplierId}
                  onChange={setSelectedSupplierId}
                  placeholder="Select Supplier"
                  options={[
                    { value: NO_SUPPLIER_ID, label: "No Supplier", meta: "Paid purchase only" },
                    ...suppliers.map(s => ({ value: s.id, label: s.name, meta: s.phone })),
                  ]}
                />
              </div>
              <div className="flex-1 max-w-xs space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Receive At Shop/Store</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
                    <Package className="w-4 h-4" />
                  </div>
                  <select 
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 text-xs appearance-none font-bold"
                  >
                    {purchasableLocations.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex-1 max-w-xs space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Purchase Date</label>
                <input 
                  type="date" 
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 text-xs" 
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest underline decoration-indigo-500 underline-offset-8">Ordered Items</h3>
              <button 
                onClick={() => setShowItemModal(true)}
                className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-0.5 rounded transition-colors"
              >
                + Quick Create Item
              </button>
            </div>
            
            <div className="overflow-x-auto pb-3">
              <div className="min-w-max space-y-2 pr-3">
                {/* Header for Desktop */}
                <div className="hidden md:flex items-center gap-4 px-4 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest border-b border-slate-50 dark:border-zinc-800/50">
                  <div className="w-[190px] shrink-0">Item Selection</div>
                  <div className="w-[64px] shrink-0">Qty</div>
                  <div className="w-[92px] shrink-0">Unit Cost</div>
                  <div className="w-[92px] shrink-0">Selling Price</div>
                  <div className="w-[100px] shrink-0 text-center">Total</div>
                  <div className="w-10 shrink-0"></div>
                </div>

              {lines.map((line, index) => (
                <div key={line.id} className="group relative bg-slate-50/50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800 rounded-xl transition-all hover:border-slate-200 dark:hover:border-zinc-700">
                  <div className="flex items-center gap-4 p-3">
                    <div className="w-[190px] shrink-0 space-y-0.5">
                        <label className="md:hidden text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">Item</label>
                        <SearchableSelect
                          value={line.itemId}
                          onChange={(value) => updateLine(line.id, 'itemId', value)}
                          placeholder="Select Item"
                          options={itemCatalog.map((item: any) => ({
                            value: item.id,
                            label: item.name,
                            meta: `${item.unitShortName || item.unit || ""}${item.category && item.category !== "-" ? ` - ${item.category}` : ""}`,
                          }))}
                        />
                      </div>
                      
                      <div className="w-[64px] shrink-0 space-y-0.5">
                        <label className="md:hidden text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">Qty</label>
                        <input 
                          type="number" 
                          min="0"
                          value={line.qty === 0 ? "" : line.qty}
                          onChange={(e) => updateLine(line.id, 'qty', Math.max(0, parseFloat(e.target.value) || 0))}
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500" 
                        />
                      </div>
                      <div className="w-[92px] shrink-0 space-y-0.5">
                        <label className="md:hidden text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">Unit Cost</label>
                        <input 
                          type="text" 
                          value={formatNumberWithCommas(line.unitCost)}
                          onChange={(e) => updateLine(line.id, 'unitCost', parseCommaNumber(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono" 
                        />
                      </div>
                      <div className="w-[92px] shrink-0 space-y-0.5">
                        <label className="md:hidden text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">Selling Price</label>
                        <input 
                          type="text"
                          value={formatNumberWithCommas(line.sellingPrice)}
                          onChange={(e) => updateLine(line.id, 'sellingPrice', parseCommaNumber(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-indigo-600 dark:text-indigo-400" 
                        />
                      </div>
                      <div className="w-[100px] shrink-0 space-y-0.5 text-center">
                        <label className="md:hidden text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">Total</label>
                        <div className="py-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">
                          {(line.qty * line.unitCost).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="flex w-10 shrink-0 items-center justify-center">
                        {index > 0 ? (
                          <button 
                            onClick={() => removeLine(line.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all active:scale-90"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="w-8 h-8" />
                        )}
                      </div>
                    </div>
                  </div>
              ))}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button 
                onClick={addLine}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[11px] font-black shadow-lg shadow-indigo-900/30 hover:bg-indigo-500 transition-all active:scale-95 uppercase tracking-widest"
              >
                <PlusCircle className="w-4 h-4" />
                Add Item Line
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm sticky top-6">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-6 underline decoration-indigo-500 underline-offset-8">Purchase Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Item Count</span>
                <span className="text-slate-900 dark:text-white">{lines.length} Lines</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-50 dark:border-zinc-800/50 pb-4">
                <span>Grand Total</span>
                <span className="text-indigo-600 dark:text-indigo-400 text-lg font-black italic">ETB {totals.toLocaleString()}</span>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['CASH', 'BANK', 'CREDIT', 'MIXED'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method as any)}
                        className={cn(
                          "py-2 px-3 rounded-lg text-[10px] font-bold border transition-all",
                          paymentMethod === method 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-900/20" 
                            : "bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 hover:border-indigo-500"
                        )}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'BANK' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Select Bank Account</label>
                    <div className="relative">
                      <select 
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full px-3 pr-10 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold outline-none appearance-none"
                      >
                        <option value="" disabled>Select Account</option>
                        {bankAccounts.filter(ba => ba.accountType === "BANK").map(ba => (
                          <option key={ba.id} value={ba.id}>{ba.displayName} ({ba.bankName})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {paymentMethod === 'MIXED' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Cash Paid</label>
                        <input 
                          type="text" 
                          value={formatNumberWithCommas(cashPaid)}
                          onChange={(e) => setCashPaid(parseCommaNumber(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Bank Paid</label>
                        <input 
                          type="text" 
                          value={formatNumberWithCommas(bankPaid)}
                          onChange={(e) => setBankPaid(parseCommaNumber(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {bankPaid > 0 && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Withdraw From</label>
                        <div className="relative">
                          <select 
                            value={selectedBankId}
                            onChange={(e) => setSelectedBankId(e.target.value)}
                            className="w-full px-3 pr-10 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold outline-none appearance-none"
                          >
                            <option value="" disabled>Select Account</option>
                            {bankAccounts.filter(ba => ba.accountType === "BANK").map(ba => (
                              <option key={ba.id} value={ba.id}>{ba.displayName} ({ba.bankName})</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Remaining Debt:</span>
                        <span className="text-indigo-600 font-black">ETB {Math.max(0, totals - cashPaid - bankPaid).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 p-4 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-end gap-6">
          <button 
             onClick={() => router.back()}
             className="px-6 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors uppercase tracking-widest"
          >
            Close
          </button>
          <div className="flex items-center">
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
                  Save Purchase
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Supplier Modal */}
      <AnimatePresence>
        {showSupplierModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSupplierModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Quick Add Supplier</h3>
                <button onClick={() => setShowSupplierModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Supplier Name</label>
                  <input 
                    type="text" 
                    placeholder="Company or Individual Name" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Contact Person</label>
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={newSupplier.contact}
                    onChange={(e) => setNewSupplier({...newSupplier, contact: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="+251..." 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50/50 dark:bg-zinc-950/50 flex gap-3">
                <button 
                  onClick={() => setShowSupplierModal(false)}
                  className="flex-1 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={handleQuickAddSupplier}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 transition-all uppercase tracking-widest"
                >
                  Create & Select
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Item Modal */}
      <AnimatePresence>
        {showItemModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowItemModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Quick Create Item</h3>
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">New Inventory Asset</p>
                  </div>
                </div>
                <button onClick={() => setShowItemModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5 max-w-xs">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Item Name</label>
                  <input 
                    type="text" 
                    placeholder="Product display name" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-nowrap">SKU / Code (Auto if empty)</label>
                    <input 
                      type="text" 
                      placeholder="PHN-001" 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono uppercase"
                      value={newItem.code}
                      onChange={(e) => setNewItem({...newItem, code: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Category</label>
                    <div className="relative">
                      <select 
                        value={newItem.categoryId}
                        onChange={(e) => setNewItem({...newItem, categoryId: e.target.value})}
                        className="w-full px-4 pr-10 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none appearance-none font-bold"
                      >
                        <option value="">No Category</option>
                        {categories.map((category: any) => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 max-w-xs">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Base Unit</label>
                    <div className="relative">
                      <select 
                        className="w-full px-4 pr-10 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none appearance-none font-bold"
                        value={newItem.unitId}
                        onChange={(e) => setNewItem({...newItem, unitId: e.target.value})}
                      >
                        <option value="" disabled>Select Unit</option>
                        {units.map((unit: any) => (
                          <option key={unit.id} value={unit.id}>{(unit.shortName || unit.name).toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50/50 dark:bg-zinc-950/50 flex gap-3">
                <button 
                  onClick={() => setShowItemModal(false)}
                  className="flex-1 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold transition-colors"
                >
                  Discard
                </button>
                <button 
                  onClick={handleQuickAddItem}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 uppercase tracking-widest transition-all active:scale-95"
                >
                  Save to System
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
