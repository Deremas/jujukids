"use client";

import React, { useState, useMemo } from "react";
import {
  ShoppingCart,
  ArrowLeft,
  Save,
  Plus,
  Search,
  User,
  Trash2,
  X,
  PlusCircle,
  Package,
  ChevronDown,
  BadgePercent,
  Tags,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/lib/client/useAppData";
import { useToast } from "@/components/toast-provider";
import { cn, formatNumberWithCommas, parseCommaNumber } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { SearchableSelect } from "@/components/searchable-select";

interface SaleLine {
  id: string;
  itemId: string;
  itemName: string;
  qty: number;
  price: number;
  discount: number;
  discountType: "fixed" | "per_qty";
  unit: string;
}

export default function NewSalePage() {
  const router = useRouter();
  const toast = useToast();
  const {
    items,
    categories = [],
    units = [],
    customers,
    addCustomer,
    addItem,
    bankAccounts,
    addSale,
    currentLocation,
    locations,
    settings,
  } = useAppData();
  const [saleDate, setSaleDate] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [lines, setLines] = useState<SaleLine[]>([
    {
      id: "1",
      itemId: "",
      itemName: "",
      qty: 1,
      price: 0,
      discount: 0,
      discountType: "fixed",
      unit: "",
    },
  ]);
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "BANK" | "CREDIT" | "MIXED"
  >("CASH");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [cashPaid, setCashPaid] = useState(0);
  const [bankPaid, setBankPaid] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Filter items available at current location
  const locationItems = useMemo(() => {
    if (!selectedLocationId) return [];
    return items.filter((i) => i.locationId === selectedLocationId);
  }, [items, selectedLocationId]);

  // Modals state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);

  // New Customer state
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });

  // New Item state
  const [newItem, setNewItem] = useState({
    name: "",
    code: "",
    categoryId: "",
    price: 0,
    unitId: "",
  });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setMounted(true);
    setSaleDate(new Date().toISOString().split("T")[0]);
  }, []);

  React.useEffect(() => {
    if (!currentLocation?.id) return;
    setSelectedLocationId((current) => current || currentLocation.id);
  }, [currentLocation?.id]);

  React.useEffect(() => {
    setLines((current) =>
      current.map((line) => ({
        ...line,
        itemId: "",
        itemName: "",
        qty: 1,
        price: 0,
        discount: 0,
        unit: "",
      })),
    );
  }, [selectedLocationId]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce(
      (acc, line) => acc + line.qty * line.price,
      0,
    );
    const totalDiscount = lines.reduce((acc, line) => {
      const discountAmount =
        line.discountType === "per_qty"
          ? line.discount * line.qty
          : line.discount;
      return acc + discountAmount;
    }, 0);
    const netBeforeTax = Math.max(0, subtotal - totalDiscount);
    const taxRate = Math.max(0, Number(settings.taxRate) || 0);
    const taxAmount = netBeforeTax * (taxRate / 100);
    return {
      subtotal,
      discount: totalDiscount,
      taxRate,
      taxAmount,
      total: netBeforeTax + taxAmount,
    };
  }, [lines, settings.taxRate]);

  if (!mounted) return null;

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: Math.random().toString(36).substr(2, 9),
        itemId: "",
        itemName: "",
        qty: 1,
        price: 0,
        discount: 0,
        discountType: "fixed",
        unit: "",
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter((line) => line.id !== id));
    }
  };

  const getAvailableStock = (itemId: string) => {
    return locationItems.find((item) => item.id === itemId)?.stock ?? 0;
  };

  const updateLine = (id: string, field: keyof SaleLine, value: any) => {
    setLines(
      lines.map((line) => {
        if (line.id === id) {
          if (field === "itemId") {
            const item = locationItems.find((i) => i.id === value);
            const availableStock = item?.stock ?? 0;
            return {
              ...line,
              itemId: value,
              itemName: item?.name || "",
              unit: item?.unitShortName || item?.unit || "",
              qty:
                availableStock > 0
                  ? Math.min(Math.max(1, line.qty), availableStock)
                  : 0,
              price: item?.price || 0,
            };
          }
          if (field === "qty") {
            const availableStock = getAvailableStock(line.itemId);
            const nextQty = Math.max(0, Number(value) || 0);
            return { ...line, qty: Math.min(nextQty, availableStock) };
          }
          return { ...line, [field]: value };
        }
        return line;
      }),
    );
  };

  const handleQuickAddCustomer = async () => {
    if (newCustomer.name) {
      try {
        const result = await addCustomer(newCustomer);
        setSelectedCustomerId(result.id);
        setShowCustomerModal(false);
        setNewCustomer({ name: "", phone: "", email: "" });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Customer could not be added.");
      }
    }
  };

  const handleQuickAddItem = async () => {
    if (newItem.name && selectedLocationId && newItem.categoryId && newItem.unitId) {
      const generatedCode =
        newItem.code ||
        "ITEM-" + Math.random().toString(36).substr(2, 6).toUpperCase();
      const fullItem = {
        ...newItem,
        stock: 0,
        status: "Active",
        code: generatedCode,
        locationId: selectedLocationId,
        categoryId: newItem.categoryId,
        unitId: newItem.unitId,
      };
      try {
        await addItem(fullItem);
        setShowItemModal(false);
        setNewItem({ name: "", code: "", categoryId: "", price: 0, unitId: "" });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Item could not be added.");
      }
    }
  };

  const handleSave = async () => {
    if (!selectedCustomerId) {
      toast.error("Please select a customer");
      return;
    }
    if (!selectedLocationId) {
      toast.error("Please select a sale location");
      return;
    }
    if (lines.some((l) => !l.itemId)) {
      toast.error("Please select items for all lines");
      return;
    }
    if (paymentMethod === "BANK" && !selectedBankId) {
      toast.error("Please select a bank account for bank sales.");
      return;
    }
    if (paymentMethod === "MIXED" && bankPaid > 0 && !selectedBankId) {
      toast.error("Please select a bank account for the bank portion.");
      return;
    }
    const invalidQtyLine = lines.find((line) => line.qty <= 0);
    if (invalidQtyLine) {
      toast.error(
        "Quantity must be greater than zero for every selected item.",
      );
      return;
    }
    const overStockLine = lines.find(
      (line) => line.qty > getAvailableStock(line.itemId),
    );
    if (overStockLine) {
      toast.error({
        title: "Not enough stock",
        description: `${overStockLine.itemName} only has ${getAvailableStock(overStockLine.itemId)} ${overStockLine.unit} available.`,
      });
      return;
    }

    let cashAmount = 0;
    let bankAmount = 0;
    let creditAmount = 0;

    if (paymentMethod === "CASH") {
      cashAmount = totals.total;
    } else if (paymentMethod === "BANK") {
      bankAmount = totals.total;
    } else if (paymentMethod === "CREDIT") {
      creditAmount = totals.total;
    } else if (paymentMethod === "MIXED") {
      cashAmount = cashPaid;
      bankAmount = bankPaid;
      creditAmount = Math.max(0, totals.total - cashAmount - bankAmount);
    }

    const sale = {
      customerId: selectedCustomerId,
      locationId: selectedLocationId,
      saleDate: new Date(saleDate),
      subTotal: totals.subtotal,
      discount: totals.discount,
      totalAmount: totals.total,
      cashAmount,
      bankAmount,
      creditAmount,
      paymentMethod,
      bankAccountId:
        paymentMethod === "BANK" ||
        (paymentMethod === "MIXED" && bankAmount > 0)
          ? selectedBankId
          : undefined,
      items: lines.map((line) => ({
        id: line.id,
        itemId: line.itemId,
        qty: line.qty,
        price: line.price,
        discount: line.discount,
        total:
          line.qty * line.price -
          (line.discountType === "per_qty"
            ? line.discount * line.qty
            : line.discount),
      })),
    };

    setSaving(true);
    try {
      await addSale(sale);
      toast.success("Sale saved successfully");
      router.push("/sales");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Sale could not be saved.",
      );
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              New Sale
            </h1>
            <p className="text-slate-500 mt-1 uppercase text-[10px] font-black tracking-widest">
              Manual Transaction Entry
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Sale Location
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(event) =>
                    setSelectedLocationId(event.target.value)
                  }
                  disabled={(locations || []).length <= 1}
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-bold disabled:opacity-70"
                >
                  <option value="" disabled>
                    Select Location
                  </option>
                  {(locations || []).map((location: any) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Customer Name
                  </label>
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 px-2 py-0.5 rounded transition-colors"
                  >
                    + Quick Add
                  </button>
                </div>
                <SearchableSelect
                  value={selectedCustomerId}
                  onChange={setSelectedCustomerId}
                  placeholder="Select Customer"
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.name,
                    meta: c.phone,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Sale Date
                </label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest underline decoration-indigo-500 underline-offset-8">
                Added Items
              </h3>
              <button
                onClick={() => setShowItemModal(true)}
                className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 px-2 py-0.5 rounded transition-colors"
              >
                + Quick Create Item
              </button>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="min-w-max space-y-2">
                {/* Header for Desktop */}
                <div className="hidden md:flex items-center gap-3 px-4 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 dark:text-zinc-400 uppercase tracking-widest border-b border-slate-100 dark:border-zinc-800/50">
                  <div className="w-[190px] shrink-0">Item Selection</div>
                  <div className="w-[64px] shrink-0">Qty</div>
                  <div className="w-[80px] shrink-0">Price</div>
                  <div className="w-[160px] shrink-0">Discount</div>
                  <div className="w-[90px] shrink-0 text-center">Subtotal</div>
                  <div className="w-9 shrink-0"></div>
                </div>

                {lines.map((line, index) => (
                  <div
                    key={line.id}
                    className="group relative bg-slate-50/50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800 rounded-xl transition-all hover:border-slate-200 dark:hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-[190px] shrink-0 space-y-0.5">
                        <label className="md:hidden text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                          Item
                        </label>
                        <SearchableSelect
                          value={line.itemId}
                          onChange={(value) =>
                            updateLine(line.id, "itemId", value)
                          }
                          placeholder="Select Item"
                          options={locationItems
                            .filter((item) => item.stock > 0)
                            .map((item) => ({
                              value: item.id,
                              label: item.name,
                              meta: `${item.stock} ${item.unit} available`,
                            }))}
                        />
                      </div>

                      <div className="w-[64px] shrink-0 space-y-0.5">
                        <label className="md:hidden text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={getAvailableStock(line.itemId)}
                          value={line.qty === 0 ? "" : line.qty}
                          onChange={(e) =>
                            updateLine(
                              line.id,
                              "qty",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          className="w-full px-2 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                        {line.itemId ? (
                          <p className="text-[9px] font-black uppercase tracking-tight text-slate-400">
                            Max {Math.max(0, getAvailableStock(line.itemId))}
                          </p>
                        ) : null}
                      </div>
                      <div className="w-[80px] shrink-0 space-y-0.5">
                        <label className="md:hidden text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                          Price
                        </label>
                        <input
                          type="text"
                          value={formatNumberWithCommas(line.price)}
                          onChange={(e) =>
                            updateLine(
                              line.id,
                              "price",
                              parseCommaNumber(e.target.value),
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          className="w-full px-2.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div className="w-[160px] shrink-0 space-y-0.5">
                        <label className="md:hidden text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                          Discount
                        </label>
                        <div className="grid grid-cols-[1fr_80px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden group">
                          <input
                            type="text"
                            value={formatNumberWithCommas(line.discount)}
                            onChange={(e) =>
                              updateLine(
                                line.id,
                                "discount",
                                parseCommaNumber(e.target.value),
                              )
                            }
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="w-full min-w-0 px-2 py-2.5 bg-transparent text-sm font-semibold text-slate-900 dark:text-zinc-100 outline-none focus:ring-0 font-mono border-r border-slate-100 dark:border-zinc-800"
                          />
                          <div className="relative">
                            {line.discountType === "fixed" ? (
                              <Tags className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-600 dark:text-amber-400 pointer-events-none" />
                            ) : (
                              <BadgePercent className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 pointer-events-none" />
                            )}
                            <select
                              value={line.discountType}
                              onChange={(e) =>
                                updateLine(
                                  line.id,
                                  "discountType",
                                  e.target.value as SaleLine["discountType"],
                                )
                              }
                              className="h-full w-full pl-6 pr-2 bg-slate-50 dark:bg-zinc-950 text-[10px] font-black uppercase tracking-tight text-slate-700 dark:text-zinc-200 outline-none appearance-none cursor-pointer"
                              aria-label="Discount type"
                            >
                              <option value="fixed">Fixed</option>
                              <option value="per_qty">Per Qty</option>
                            </select>
                            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      <div className="w-[90px] shrink-0 space-y-0.5 text-center">
                        <label className="md:hidden text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                          Subtotal
                        </label>
                        <div className="py-2.5 text-sm font-black text-slate-900 dark:text-zinc-100 font-mono">
                          {(
                            line.qty * line.price -
                            (line.discountType === "per_qty"
                              ? line.discount * line.qty
                              : line.discount)
                          ).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center justify-center w-9 shrink-0">
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
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-6 underline decoration-indigo-500 underline-offset-8">
              Summary & Payment
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Gross Subtotal</span>
                <span className="text-slate-900 dark:text-white">
                  ETB {totals.subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Total Discount</span>
                <span className="text-rose-600">
                  - ETB {totals.discount.toLocaleString()}
                </span>
              </div>
              {totals.taxRate > 0 ? (
                <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>VAT ({totals.taxRate}%)</span>
                  <span className="text-slate-900 dark:text-white">
                    ETB {totals.taxAmount.toLocaleString()}
                  </span>
                </div>
              ) : null}
              <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center mb-6">
                <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                  Net Total
                </span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter italic">
                  ETB {totals.total.toLocaleString()}
                </span>
              </div>

              <div className="space-y-4 border-t border-slate-50 dark:border-zinc-800/50 pt-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["CASH", "BANK", "CREDIT", "MIXED"].map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method as any)}
                        className={cn(
                          "py-2 px-3 rounded-lg text-[10px] font-bold border transition-all",
                          paymentMethod === method
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-900/20"
                            : "bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 hover:border-indigo-500",
                        )}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === "BANK" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      Select Bank Account
                    </label>
                    <div className="relative">
                      <select
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full px-3 pr-10 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold outline-none appearance-none"
                      >
                        <option value="" disabled>
                          Select Account
                        </option>
                        {bankAccounts
                          .filter((ba) => ba.accountType === "BANK")
                          .map((ba) => (
                            <option key={ba.id} value={ba.id}>
                              {ba.displayName} ({ba.bankName})
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {paymentMethod === "MIXED" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                          Cash Portion
                        </label>
                        <input
                          type="text"
                          value={formatNumberWithCommas(cashPaid)}
                          onChange={(e) =>
                            setCashPaid(parseCommaNumber(e.target.value))
                          }
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                          Bank Portion
                        </label>
                        <input
                          type="text"
                          value={formatNumberWithCommas(bankPaid)}
                          onChange={(e) =>
                            setBankPaid(parseCommaNumber(e.target.value))
                          }
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {bankPaid > 0 && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                          Select Bank Account
                        </label>
                        <div className="relative">
                          <select
                            value={selectedBankId}
                            onChange={(e) => setSelectedBankId(e.target.value)}
                            className="w-full px-3 pr-10 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold outline-none appearance-none"
                          >
                            <option value="" disabled>
                              Select Account
                            </option>
                            {bankAccounts
                              .filter((ba) => ba.accountType === "BANK")
                              .map((ba) => (
                                <option key={ba.id} value={ba.id}>
                                  {ba.displayName} ({ba.bankName})
                                </option>
                              ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">
                          Remaining to Credit:
                        </span>
                        <span className="text-indigo-600 font-black">
                          ETB{" "}
                          {Math.max(
                            0,
                            totals.total - cashPaid - bankPaid,
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 p-4 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-end gap-6">
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors uppercase tracking-widest"
          >
            Close
          </button>
          <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-3 bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black shadow-xl shadow-indigo-900/30 hover:bg-indigo-500 active:scale-95 transition-all uppercase tracking-widest"
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Sale
                </>
              )}
          </button>
        </div>
      </div>

      {/* Customer Modal */}
      <AnimatePresence>
        {showCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCustomerModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">
                  Quick Add Customer
                </h3>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+251..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50/50 dark:bg-zinc-950/50 flex gap-3">
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={handleQuickAddCustomer}
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
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">
                      Quick Create Item
                    </h3>
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      New Inventory Asset
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowItemModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5 max-w-xs">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Item Name
                  </label>
                  <input
                    type="text"
                    placeholder="Product display name"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        value={newItem.categoryId}
                        onChange={(e) =>
                          setNewItem({ ...newItem, categoryId: e.target.value })
                        }
                        className="w-full px-4 pr-10 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none appearance-none font-bold"
                      >
                        <option value="" disabled>
                          Select Category
                        </option>
                        {categories.map((category: any) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      Base Unit
                    </label>
                    <div className="relative">
                      <select
                        className="w-full px-4 pr-10 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none appearance-none font-bold"
                        value={newItem.unitId}
                        onChange={(e) =>
                          setNewItem({ ...newItem, unitId: e.target.value })
                        }
                      >
                        <option value="" disabled>
                          Select Unit
                        </option>
                        {units.map((unit: any) => (
                          <option key={unit.id} value={unit.id}>
                            {(unit.shortName || unit.name).toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      Selling Price (ETB)
                    </label>
                    <input
                      type="text"
                      placeholder="0"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none font-mono text-indigo-600 font-bold"
                      value={formatNumberWithCommas(newItem.price)}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          price: parseCommaNumber(e.target.value),
                        })
                      }
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50/50 dark:bg-zinc-950/50 flex gap-3">
                <button
                  onClick={() => setShowItemModal(false)}
                  className="flex-1 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickAddItem}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 uppercase tracking-widest transition-all active:scale-95"
                >
                  Create Item
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
