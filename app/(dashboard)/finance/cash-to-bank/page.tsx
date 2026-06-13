"use client";

import React from "react";
import {
  ArrowRightLeft,
  Banknote,
  Calendar,
  Landmark,
  Save,
} from "lucide-react";
import { SearchableSelect } from "@/components/searchable-select";
import { useToast } from "@/components/toast-provider";
import { formatCurrency, formatNumberWithCommas, parseCommaNumber } from "@/lib/utils";
import { calculateLocationCashBalance, useAppData } from "@/lib/client/useAppData";

export default function CashToBankPage() {
  const state = useAppData();
  const toast = useToast();
  const bankAccounts = state.bankAccounts.filter((account) => account.accountType === "BANK");
  const activeLocationId = state.currentLocation?.id || state.locations[0]?.id || "";
  const [locationId, setLocationId] = React.useState(activeLocationId);
  const [bankAccountId, setBankAccountId] = React.useState(bankAccounts[0]?.id || "");
  const [amount, setAmount] = React.useState(0);
  const [referenceNo, setReferenceNo] = React.useState("");

  const availableCash = calculateLocationCashBalance(state, locationId);
  const selectedBank = bankAccounts.find((account) => account.id === bankAccountId);
  const recentTransfers = state.cashTransfers
    .filter((transfer) => transfer.locationId === locationId)
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const handleSubmit = () => {
    const result = state.addCashTransfer({
      id: `CB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      locationId,
      bankAccountId,
      amount,
      referenceNo: referenceNo.trim() || `DEP-${Date.now()}`,
      date: new Date(),
    });

    if (!result.success) {
      toast.error({ title: "Deposit blocked", description: result.error });
      return;
    }

    toast.success({
      title: "Cash deposited",
      description: `${formatCurrency(amount)} moved to ${selectedBank?.displayName || "bank account"}.`,
    });
    setAmount(0);
    setReferenceNo("");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20 font-sans animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25">
            <ArrowRightLeft className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">Cash To Bank</h1>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Location cash drawer deposit
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-500/30 transition hover:bg-indigo-500 active:scale-95"
        >
          <Save className="h-4 w-4" />
          Save Deposit
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Source Location</label>
              <SearchableSelect
                value={locationId}
                onChange={setLocationId}
                placeholder="Select location"
                options={state.locations.map((location) => ({
                  value: location.id,
                  label: location.name,
                  meta: location.type,
                }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Destination Bank</label>
              <SearchableSelect
                value={bankAccountId}
                onChange={setBankAccountId}
                placeholder="Select bank account"
                options={bankAccounts.map((account) => ({
                  value: account.id,
                  label: account.displayName,
                  meta: account.bankName,
                }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Deposit Amount</label>
              <div className="relative">
                <Banknote className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formatNumberWithCommas(amount)}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => setAmount(parseCommaNumber(event.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-xl font-black outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Slip / Reference</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(event) => setReferenceNo(event.target.value)}
                placeholder="DEP-102938"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Location Cash</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{formatCurrency(availableCash)}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <InfoTile label="After Deposit" value={formatCurrency(Math.max(0, availableCash - amount))} />
              <InfoTile label="Bank Increase" value={formatCurrency(amount)} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-slate-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-600">Recent Deposits</h2>
            </div>
            <div className="space-y-2">
              {recentTransfers.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-xs font-bold text-slate-400">No deposits recorded for this location.</p>
              ) : recentTransfers.map((transfer) => {
                const bank = bankAccounts.find((account) => account.id === transfer.bankAccountId);
                return (
                  <div key={transfer.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(transfer.amount)}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{transfer.referenceNo}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>{bank?.displayName || "Bank account"}</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(transfer.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-950">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
