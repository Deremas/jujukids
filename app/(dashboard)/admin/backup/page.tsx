"use client";

import React from "react";
import { Database, Download, Upload, Clock, ShieldCheck } from "lucide-react";

export default function BackupRestorePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <Database className="w-8 h-8 text-indigo-600" />
          Backup & Restore
        </h1>
        <p className="text-slate-500 mt-1">Manage database snapshots and disaster recovery options.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 rounded-2xl shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Manual Backup</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Create an immediate snapshot of your entire database including inventory, sales, and accounts. 
            This file can be downloaded and stored locally for extra security.
          </p>
          <button className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm tracking-widest hover:bg-indigo-500 shadow-lg shadow-indigo-900/10 active:scale-95 transition-all">
            <Download className="w-4 h-4" /> Create Snapshot (.sql)
          </button>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 rounded-2xl shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Restore Database</h3>
          <p className="text-xs text-slate-500 leading-relaxed text-rose-600 font-medium">
            Warning: Restoring from a backup will overwrite all current system data. This action is irreversible.
          </p>
          <button className="w-full flex items-center justify-center gap-2 py-4 bg-white dark:bg-zinc-950 border-2 border-dashed border-rose-200 dark:border-rose-900/40 text-rose-600 rounded-xl font-bold text-sm tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all">
            <Upload className="w-4 h-4" /> Upload & Restore
          </button>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6">
        <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" /> Recent Actions
        </h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-zinc-400 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-500 w-4 h-4" />
              <span>Automatic Snapshot Success</span>
            </div>
            <span className="text-slate-400">2 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
