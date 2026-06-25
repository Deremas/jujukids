"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Package,
  Users,
  ShoppingCart,
  AlertTriangle,
  ArrowUpRight,
  History,
  Bell,
  BarChart3,
  PackagePlus,
  UserPlus,
  Receipt,
  Truck,
  ArrowRightLeft,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppData } from "@/lib/client/useAppData";
import { useSession } from "next-auth/react";

export default function Dashboard() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const { currentLocation, sales, items, customers, suppliers, purchases } =
    useAppData();
  const permissionKeys = new Set<string>(user?.permissions || []);
  const can = (permission: string) =>
    user?.role === "Super Admin" || permissionKeys.has(permission);

  // Filter data by current location if specified
  const locationSales = can("sales.view")
    ? currentLocation
      ? sales.filter((s) => s.locationId === currentLocation.id)
      : sales
    : [];
  const locationItems =
    can("inventory.stock.view") || can("inventory.items.view")
      ? currentLocation
        ? items.filter((i) => i.locationId === currentLocation.id)
        : items
      : [];
  const locationPurchases = can("purchases.view")
    ? currentLocation
      ? purchases.filter((p) => p.locationId === currentLocation.id)
      : purchases
    : [];

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySales = locationSales.filter((s) => new Date(s.saleDate) >= today);
  const totalTodaySales = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);

  const inventoryValue = locationItems.reduce(
    (acc, i) => acc + i.price * i.stock,
    0,
  );
  const totalProducts = locationItems.length;
  const lowStockItems = locationItems.filter(
    (i) => i.stock <= (i.lowStockAlert || 10),
  ).length;

  const totalCustomers = can("customers.view") ? customers.length : 0;
  const totalSuppliers = can("suppliers.view") ? suppliers.length : 0;
  const totalCustomerCredit = can("customers.view")
    ? customers.reduce((acc, c) => acc + c.balance, 0)
    : 0;

  const recentTransactions = [
    ...locationSales.map((s) => ({
      id: s.id,
      date: s.saleDate,
      totalAmount: s.totalAmount,
      paymentMethod: s.paymentMethod,
      type: "SALE" as const,
    })),
    ...locationPurchases.map((p) => ({
      id: p.id,
      date: p.purchaseDate,
      totalAmount: p.totalAmount,
      paymentMethod: p.paymentMethod,
      type: "PURCHASE" as const,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const quickActions = [
    {
      href: "/sales/create",
      icon: Receipt,
      label: "New Sale",
      color: "indigo",
      permission: "sales.create",
    },
    {
      href: "/items/create",
      icon: PackagePlus,
      label: "Add Item",
      color: "emerald",
      permission: "inventory.items.create",
    },
    {
      href: "/purchases/create",
      icon: Truck,
      label: "Purchase",
      color: "amber",
      permission: "purchases.create",
    },
    {
      href: "/store/transfers",
      icon: ArrowRightLeft,
      label: "Transfer",
      color: "blue",
      permission: "inventory.transfers.create",
    },
    {
      href: "/sales",
      icon: History,
      label: "History",
      color: "rose",
      permission: "sales.view",
    },
    {
      href: "/customers",
      icon: UserPlus,
      label: "Customer",
      color: "indigo",
      permission: "customers.view",
    },
    {
      href: "/suppliers",
      icon: Users,
      label: "Supplier",
      color: "emerald",
      permission: "suppliers.view",
    },
    {
      href: "/reports",
      icon: BarChart3,
      label: "Reports",
      color: "slate",
      permission: "reports.view",
    },
  ].filter((action) => can(action.permission));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {quickActions.map((action) => (
          <QuickAction key={action.href} {...action} />
        ))}
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {can("sales.view") && (
          <SmallStatCard
            title="TODAY'S SALES"
            value={formatCurrency(totalTodaySales)}
            change={`${todaySales.length} txns`}
            subtitle="AVG SALE"
            icon={ShoppingCart}
            action="VIEW SALES"
            avg={
              todaySales.length
                ? formatCurrency(totalTodaySales / todaySales.length)
                : "0"
            }
          />
        )}
        {can("reports.view") && can("sales.view") && (
          <SmallStatCard
            title="TODAY'S PROFIT (EST)"
            value={formatCurrency(totalTodaySales * 0.25)}
            change="25% margin"
            subtitle="ESTIMATED MARGIN"
            icon={TrendingUp}
            action="VIEW ANALYSIS"
            trend="up"
            avg="25%"
          />
        )}
        {(can("inventory.stock.view") || can("inventory.items.view")) && (
          <SmallStatCard
            title="ACTIVE INVENTORY"
            value={totalProducts.toString()}
            change={`${locationItems.length} items`}
            subtitle="IN STOCK"
            icon={Package}
            action="VIEW PRODUCTS"
            avg={locationItems.reduce((acc, i) => acc + i.stock, 0).toString()}
          />
        )}
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {can("inventory.stock.view") && (
          <DashboardCard
            title="INVENTORY VALUE"
            value={formatCurrency(inventoryValue)}
            icon={TrendingUp}
            color="amber"
            action="VIEW STOCK"
          />
        )}
        {can("inventory.stock.view") && (
          <DashboardCard
            title="ESTIMATED SALES VALUE"
            value={formatCurrency(inventoryValue * 1.3)}
            color="indigo"
          />
        )}
        {can("inventory.stock.view") && (
          <DashboardCard
            title="LOW STOCK ALERTS"
            value={lowStockItems.toString()}
            subtitle="ITEMS BELOW THRESHOLD"
            icon={AlertTriangle}
            color={lowStockItems > 0 ? "amber" : "indigo"}
            action="REPLENISH"
          />
        )}
        <div className="hidden lg:block" />
      </div>

      {/* Third Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {can("customers.view") && (
          <DashboardCard
            title="CUSTOMERS"
            value={totalCustomers.toString()}
            subtitle={`CREDIT: ${formatCurrency(totalCustomerCredit)}`}
            icon={Users}
            color="indigo"
            action="VIEW CRM"
          />
        )}
        {can("suppliers.view") && (
          <DashboardCard
            title="SUPPLIERS"
            value={totalSuppliers.toString()}
            icon={Package}
            color="indigo"
            action="VIEW SUPPLIERS"
          />
        )}
        {can("customers.view") && (
          <DashboardCard
            title="CREDIT EXPOSURE"
            value={formatCurrency(totalCustomerCredit)}
            subtitle="UNCOLLECTED BALANCES"
            icon={TrendingUp}
            color="amber"
            action="VIEW CREDITS"
            trend="up"
          />
        )}
        {(can("sales.view") || can("purchases.view")) && (
          <DashboardCard
            title="SYSTEM LOGS"
            value={recentTransactions.length.toString()}
            subtitle="RECENT ACTIVITIES"
            icon={Bell}
            color="indigo"
            action="REVIEW LOGS"
          />
        )}
      </div>

      {/* Bottom Grid: Transactions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(can("sales.view") || can("purchases.view")) && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-50 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                  <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    Recent Transactions
                  </h4>
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Latest activities for this shop/store
                  </p>
                </div>
              </div>
              <Link
                href="/sales"
                className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest cursor-pointer flex items-center gap-2 hover:gap-3 transition-all"
              >
                Full History <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-zinc-800/50">
              {recentTransactions.length === 0 ? (
                <div className="min-h-[250px] flex items-center justify-center p-8">
                  <div className="text-center opacity-30">
                    <History className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-black uppercase tracking-widest">
                      No activities found
                    </p>
                  </div>
                </div>
              ) : (
                recentTransactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px]",
                          tx.type === "SALE"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-900/20",
                        )}
                      >
                        {tx.type[0]}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                          {tx.id}
                        </p>
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                          {new Date(tx.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900 dark:text-white">
                        {formatCurrency(tx.totalAmount)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                        {tx.paymentMethod}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {can("inventory.stock.view") && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-50 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    Stock Alerts
                  </h4>
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Low inventory warnings
                  </p>
                </div>
              </div>
              <Link
                href="/items"
                className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest cursor-pointer flex items-center gap-2 hover:gap-3 transition-all"
              >
                Manage Stock <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-zinc-800/50">
              {locationItems.filter((i) => i.stock <= (i.lowStockAlert || 10))
                .length === 0 ? (
                <div className="min-h-[250px] flex items-center justify-center p-8">
                  <div className="text-center opacity-30">
                    <Package className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-black uppercase tracking-widest">
                      Inventory Levels Optimal
                    </p>
                  </div>
                </div>
              ) : (
                locationItems
                  .filter((i) => i.stock <= (i.lowStockAlert || 10))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/20 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center font-black text-xs text-slate-400">
                          {item.stock}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {item.name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                            {item.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          Low Stock
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SmallStatCard({
  title,
  value,
  change,
  subtitle,
  icon: Icon,
  action,
  trend,
  avg,
}: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
          {title}
        </p>
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl group-hover:scale-110 transition-transform">
          <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>
      <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-4 tracking-tighter">
        {value}
      </h2>

      <div className="grid grid-cols-2 mt-6 gap-4 border-t border-slate-50 dark:border-zinc-800 pt-6">
        <div>
          <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
            {change.split(" ")[1] || "TXNS"}
          </p>
          <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
            {change.split(" ")[0]}
          </p>
        </div>
        <div className="border-l border-slate-50 dark:border-zinc-800 pl-4">
          <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
            {subtitle}
          </p>
          <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
            {avg}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <Link
          href="#"
          className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-2 group/btn tracking-widest"
        >
          {action}{" "}
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
        </Link>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  action,
  trend,
}: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              color === "amber" ? "bg-amber-500" : "bg-indigo-500",
            )}
          />
          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
            {title}
          </p>
        </div>
        {Icon && (
          <Icon
            className={cn(
              "w-4 h-4",
              color === "amber" ? "text-amber-500" : "text-indigo-500",
            )}
          />
        )}
      </div>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-3 tracking-tighter uppercase">
        {value}
      </h3>

      {subtitle && (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest opacity-60">
            {subtitle}
          </p>
          {trend === "up" && (
            <ArrowUpRight className="w-3 h-3 text-indigo-500" />
          )}
        </div>
      )}

      {action && (
        <div className="mt-6 border-t border-slate-50 dark:border-zinc-800 pt-4">
          <Link
            href="#"
            className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-2 group tracking-widest"
          >
            {action}{" "}
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, color }: any) {
  const colors: any = {
    indigo:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border-rose-100 dark:border-rose-900/30",
    slate:
      "bg-slate-50 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border-slate-100 dark:border-zinc-700",
  };

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 group hover:shadow-lg active:scale-95 bg-white dark:bg-zinc-900",
        "border-slate-200 dark:border-zinc-800",
      )}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all duration-300",
          colors[color] || colors.indigo,
          "group-hover:scale-110 group-hover:rotate-3",
        )}
      >
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {label}
      </span>
    </Link>
  );
}
