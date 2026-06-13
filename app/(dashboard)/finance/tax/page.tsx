"use client";

import React from "react";
import { FileText, Download, Calendar, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function TaxReportsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <FileText className="w-8 h-8 text-emerald-600" />
          Tax Reports & Filing
        </h1>
        <p className="text-slate-500 mt-1">Generate VAT, TOT, and income tax summaries for compliance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TaxCard title="VAT Summary (15%)" description="Calculate net VAT payable after input tax deduction." icon={FileText} />
        <TaxCard title="TOT Summary (2%)" description="Sales-based tax report for non-VAT registered entities." icon={FileText} />
        <TaxCard title="Income Tax Estimator" description="Estimate quarterly or annual profit-based tax." icon={FileText} />
        <TaxCard title="Tax Liability Ledger" description="Sequential log of all tax-impactful transactions." icon={FileText} />
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-4 rounded-xl flex items-center gap-4">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">
          <Calendar className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Tax Deadline: March 30</h4>
          <p className="text-xs text-amber-600/80">Next tax filing is due in 12 days. Ensure all items are reconciled.</p>
        </div>
        <button className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-amber-900/10 active:scale-95 transition-all">
          Prepare Now
        </button>
      </div>
    </div>
  );
}

function TaxCard({ title, description, icon: Icon }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden">
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <Download className="w-4 h-4 text-indigo-600" />
      </div>
      <div className="flex items-center gap-4 mb-3">
        <Icon className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{title}</h4>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">{description}</p>
    </div>
  );
}
