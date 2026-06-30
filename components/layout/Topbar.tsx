"use client";

import React, { useState, useRef, useEffect } from "react";
import { Menu, Bell, User, ChevronDown, Moon, Sun, Settings, LogOut } from "lucide-react";
import { useAppData } from "@/lib/client/useAppData";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { signOut, useSession } from "next-auth/react";

export function Topbar({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const { currentLocation, locations, setCurrentLocation, bankAccounts } = useAppData();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const pageTitle = getPageTitle(pathname, bankAccounts);

  const availableLocations = user?.role === 'Super Admin' 
    ? locations 
    : locations.filter(b => user?.assignedLocations.includes(b.id));

  useEffect(() => {
    setMounted(true);
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setIsLocationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 w-full shrink-0 bg-white/95 dark:bg-zinc-900/95 border-b border-slate-200 dark:border-zinc-800 px-4 md:px-6 grid grid-cols-[1fr_auto_1fr] items-center z-40 shadow-sm dark:shadow-black/20 relative gap-3 backdrop-blur">
      <div className="min-w-0 flex items-center gap-2 md:gap-4">
        {/* Mobile Toggle visible on all screens < lg */}
        <button 
          onClick={toggleSidebar}
          className="p-2 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="hidden lg:flex items-center gap-3">
          {/* Logo placeholder */}
        </div>
 
        <div className="min-w-0">
          <h1 className="truncate text-base md:text-lg font-black text-slate-900 dark:text-white tracking-tight">
            {pageTitle}
          </h1>
        </div>
      </div>
 
      {/* Location Selector */}
      <div className="relative justify-self-center" ref={locationRef}>
          <button 
            disabled={availableLocations.length <= 1}
            onClick={() => setIsLocationOpen(!isLocationOpen)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 border border-slate-200 dark:border-zinc-700 rounded-xl transition-all select-none shadow-sm dark:shadow-none",
              availableLocations.length > 1 ? "hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer" : "cursor-default opacity-90"
            )}
          >
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[9px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Active Location</span>
              <span className="text-xs font-black truncate max-w-[110px] sm:max-w-[160px] md:max-w-[220px]">
                {currentLocation?.name || "Select Location"}
              </span>
            </div>
            {availableLocations.length > 1 && (
              <ChevronDown className={cn("w-3.5 h-3.5 text-slate-500 transition-transform", isLocationOpen ? "rotate-180" : "")} />
            )}
          </button>
 
          <AnimatePresence>
            {isLocationOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl shadow-slate-200/70 dark:shadow-black/40 rounded-2xl overflow-hidden py-2 z-50"
              >
                <div className="px-4 py-2 border-b border-slate-100 dark:border-zinc-800">
                  <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 dark:text-zinc-400 uppercase tracking-widest">Switch Location</p>
                </div>
                {availableLocations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => {
                      setCurrentLocation(location);
                      setIsLocationOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                      currentLocation?.id === location.id 
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300" 
                        : "text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-tight">{location.name}</span>
                      <span className="text-[9px] font-bold opacity-60 uppercase">{location.type}</span>
                    </div>
                    {currentLocation?.id === location.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
      </div>
 
      <div className="flex items-center justify-end gap-2 md:gap-3">
        {/* Theme Toggle */}
        <button 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-full text-slate-600 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
        >
          {!mounted ? (
            <div className="w-5 h-5" />
          ) : theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
        
        <button className="p-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-full text-slate-600 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full" />
        </button>
 
        <div className="h-8 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5 md:mx-1" />
 
      <div className="relative" ref={profileRef}>
          <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 md:gap-3 md:pl-2 py-1 cursor-pointer group select-none"
          >
            <div className="text-right hidden lg:block">
              <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200 leading-none">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold font-mono">{user?.role}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center border border-slate-200 dark:border-zinc-700 group-hover:border-slate-300 dark:group-hover:border-zinc-500 transition-all overflow-hidden">
              <User className="text-slate-500 dark:text-zinc-400 w-4 h-4" />
            </div>
            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", isProfileOpen ? "rotate-180" : "")} />
          </div>
 
          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl rounded-xl overflow-hidden py-1 z-50"
              >
                <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 lg:hidden">
                  <p className="text-sm font-semibold text-slate-900 dark:text-zinc-200">{user?.firstName} {user?.lastName}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 uppercase font-mono">{user?.role}</p>
                </div>
                
                <button 
                  onClick={() => {
                    setIsProfileOpen(false);
                    router.push("/profile");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button 
                  onClick={() => {
                    setIsProfileOpen(false);
                    router.push("/admin/settings");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />
                <button 
                  onClick={() => {
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function getPageTitle(pathname: string, bankAccounts: Array<{ id: string; displayName?: string }> = []) {
  const titles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/items": "Item List",
    "/items/create": "Add Item",
    "/items/low-stock": "Low Stock",
    "/items/categories": "Categories",
    "/store": "Store Stock",
    "/store/locations": "Shop Stock",
    "/store/transfers": "Stock Transfers",
    "/store/movements": "Stock Movements",
    "/purchases": "Purchases",
    "/purchases/create": "New Purchase",
    "/sales": "Sales",
    "/sales/create": "New Sale",
    "/sales/pos": "Point of Sale",
    "/customers": "Customers",
    "/suppliers": "Suppliers",
    "/finance": "Finance",
    "/finance/cash-to-bank": "Cash to Bank",
    "/finance/expenses": "Expenses",
    "/reports": "Reports",
    "/admin/locations": "Shops & Stores",
    "/admin/users": "Users",
  };

  if (titles[pathname]) {
    return titles[pathname];
  }

  const bankDetailMatch = pathname.match(/^\/finance\/banks\/([^/]+)$/);
  if (bankDetailMatch) {
    return bankAccounts.find((account) => account.id === bankDetailMatch[1])?.displayName || "Bank Account";
  }

  const segment = pathname.split("/").filter(Boolean).at(-1);
  if (!segment) {
    return "Dashboard";
  }

  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
