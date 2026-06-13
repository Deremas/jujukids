"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, User, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { signIn, useSession } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    const nextPath =
      new URLSearchParams(window.location.search).get("next") || "/dashboard";
    router.replace(nextPath.startsWith("/login") ? "/dashboard" : nextPath);
  }, [router, session, status]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
      });

      if (!result?.ok) {
        throw new Error(
          result?.error === "CredentialsSignin"
            ? "Invalid credentials. Please try again."
            : "Sign in failed. Please try again.",
        );
      }

      const nextPath =
        new URLSearchParams(window.location.search).get("next") || "/dashboard";
      router.push(nextPath.startsWith("/login") ? "/dashboard" : nextPath);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Invalid credentials. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30">
      <div className="w-full max-w-[440px] space-y-8">
        {/* Brand/Logo Area */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-500/30 mb-2"
          >
            <Package className="w-10 h-10 text-white" />
          </motion.div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
              Juju Kids
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-70">
              Retail Management System
            </p>
          </motion.div>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16" />

          <div className="space-y-6 relative">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest ml-1">
                  Username or Phone number
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter Username or Phone Number"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4.5 h-4.5" />
                    ) : (
                      <Eye className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl">
                  <p className="text-[10px] font-bold text-red-600 dark:text-red-400 text-center">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/25 transition-all group"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>

        {/* Footer/Trust Indicators */}
        <div className="flex flex-col items-center gap-2 opacity-60">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] text-center">
            &copy; Juju Kids
          </p>
        </div>
      </div>
    </div>
  );
}
