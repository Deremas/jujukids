"use client";

import React from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Landmark, Wallet } from "lucide-react";

import { buildLedgerTransactions } from "@/lib/finance-ledger";
import { cn, formatCurrency } from "@/lib/utils";
import { calculateLocationCashBalance, useAppData } from "@/lib/client/useAppData";

export default function FinancePage() {
  const state = useAppData();
  const ledger = buildLedgerTransactions(state);
  const cashAccount = state.bankAccounts.find((account) => account.accountType === "CASH");
  const bankAccounts = state.bankAccounts.filter((account) => account.accountType === "BANK");

  const accountBalance = (accountId: string, fallbackBalance: number) => {
    return ledger.reduce((balance, tx) => {
      if (tx.accountId !== accountId) return balance;
      if (tx.type === "INCOME") return balance + tx.amount;
      if (tx.type === "EXPENSE") return balance - tx.amount;
      if (tx.method === "BANK_IN") return balance + tx.amount;
      if (tx.method === "CASH_OUT") return balance - tx.amount;
      return balance;
    }, fallbackBalance);
  };

  const cashLocations = state.locations.map((location) => ({
    ...location,
    balance: calculateLocationCashBalance(state, location.id),
  }));
  const locationCashTotal = cashLocations.reduce((sum, location) => sum + location.balance, 0);
  const cashBalance = cashAccount ? accountBalance(cashAccount.id, cashAccount.currentBalance) : locationCashTotal;
  const bankTotal = bankAccounts.reduce((sum, account) => sum + accountBalance(account.id, account.currentBalance), 0);
  const inflow = ledger.filter((tx) => tx.type === "INCOME" || tx.method === "BANK_IN").reduce((sum, tx) => sum + tx.amount, 0);
  const outflow = ledger.filter((tx) => tx.type === "EXPENSE" || tx.method === "CASH_OUT").reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6 pb-20 font-sans animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            <Landmark className="h-8 w-8 text-indigo-600" />
            Finance Center
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Cash drawers, bank balances, deposits, and synced financial transactions.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/finance/cash-to-bank"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-900/20 transition hover:bg-indigo-500"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Cash to Bank
          </Link>
          <Link
            href="/finance/banks"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900"
          >
            Accounts
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Cash Balance" value={formatCurrency(cashBalance)} tone="cash" />
        <SummaryCard label="Bank Balance" value={formatCurrency(bankTotal)} tone="bank" />
        <SummaryCard label="Inflow" value={formatCurrency(inflow)} tone="in" />
        <SummaryCard label="Outflow" value={formatCurrency(outflow)} tone="out" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-zinc-800">
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Cash Balance Center</h2>
              <p className="text-xs font-semibold text-slate-500">One global cash account, tracked per location.</p>
            </div>
            <Wallet className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {cashLocations.map((location) => (
              <div key={location.id} className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">{location.name}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{location.type} cash drawer</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-lg font-black", location.balance >= 0 ? "text-slate-950 dark:text-white" : "text-rose-600")}>
                    {formatCurrency(location.balance)}
                  </p>
                  <Link href="/finance/cash-to-bank" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">
                    Deposit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-zinc-800">
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Recent Transactions</h2>
              <p className="text-xs font-semibold text-slate-500">Sales, purchases, expenses, and cash deposits.</p>
            </div>
            <Link href="/finance/transactions" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {ledger.length === 0 ? (
              <p className="p-6 text-sm font-bold text-slate-400">No finance transactions yet.</p>
            ) : ledger.slice(0, 8).map((tx) => (
              <Link
                key={tx.id}
                href={tx.category === "Sale" ? `/sales/${tx.sourceId}` : tx.category === "Purchase" ? `/purchases/${tx.sourceId}` : "/finance/transactions"}
                className="flex items-center justify-between gap-4 p-5 transition hover:bg-slate-50 dark:hover:bg-zinc-800/35"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950 dark:text-white">{tx.category}</p>
                  <p className="mt-1 truncate text-[10px] font-black uppercase tracking-widest text-slate-400">{tx.description}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-black", tx.type === "EXPENSE" || tx.method === "CASH_OUT" ? "text-rose-600" : "text-emerald-600")}>
                    {tx.type === "EXPENSE" || tx.method === "CASH_OUT" ? "-" : "+"}{formatCurrency(tx.amount)}
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-slate-400">{new Date(tx.date).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: "cash" | "bank" | "in" | "out" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <span className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          tone === "cash" && "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40",
          tone === "bank" && "bg-blue-50 text-blue-600 dark:bg-blue-950/40",
          tone === "in" && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40",
          tone === "out" && "bg-rose-50 text-rose-600 dark:bg-rose-950/40",
        )}>
          {tone === "out" ? <ArrowDownLeft className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
        </span>
      </div>
      <p className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
