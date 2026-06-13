"use client";

import React from "react";
import { Shield, ArrowLeft, Search, Filter, History } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AuditLogsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <Shield className="w-8 h-8 text-indigo-600" />
              Audit & Security Logs
            </h1>
            <p className="text-slate-500 mt-1">Immutable record of system changes and user activities.</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search logs..." className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none" />
          </div>
        </div>
        <div className="p-12 text-center text-slate-400">
          <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
          <p className="text-sm font-medium">No activity recorded for this period.</p>
        </div>
      </div>
    </div>
  );
}
