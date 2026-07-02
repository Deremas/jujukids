"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CreditCard,
  Database,
  FileClock,
  FileText,
  Filter,
  Landmark,
  Layers,
  Package,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";

import { buildLedgerTransactions } from "@/lib/finance-ledger";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppData } from "@/lib/client/useAppData";
import { paginateRows, saleItemSummary, saleProfit } from "@/lib/sales-utils";

const categories = ["All", "Sales", "Inventory", "Procurement", "Finance", "Administrative"] as const;

type Category = typeof categories[number];

type ReportDefinition = {
  id: string;
  title: string;
  category: Exclude<Category, "All">;
  description: string;
  icon: React.ElementType;
  filters: string[];
  output: string;
  route?: string;
};

const reports: ReportDefinition[] = [
  { id: "sales-list", title: "Sales List", category: "Sales", description: "Completed, draft, and voided sales with payment and customer visibility.", icon: ShoppingCart, filters: ["Locations", "Date Range", "Customers", "Payment Method", "Status"], output: "Transaction list", route: "/sales" },
  { id: "sold-items", title: "Sold Items", category: "Sales", description: "Item-level sales breakdown by quantity, revenue, and location.", icon: ReceiptText, filters: ["Locations", "Date Range", "Items", "Categories", "Customers"], output: "Item sales table" },
  { id: "sales-profitability", title: "Sales Profitability", category: "Sales", description: "Sales value, cost of goods, and gross profit by product or location.", icon: TrendingUp, filters: ["Locations", "Date Range", "Items", "Categories"], output: "Profit summary" },
  { id: "customer-credit-aging", title: "Customer Credit & Aging", category: "Sales", description: "Receivables, outstanding balances, and aging buckets.", icon: UserRound, filters: ["Locations", "Customers", "Aging Bucket", "Date Range"], output: "Aging schedule", route: "/customers/credits" },
  { id: "product-ranking", title: "Product Ranking", category: "Sales", description: "Rank products by quantity sold, revenue, or gross profit.", icon: BarChart3, filters: ["Locations", "Date Range", "Items", "Categories", "Rank By"], output: "Ranked list" },
  { id: "payment-breakdown", title: "Payment Method Breakdown", category: "Sales", description: "Sales totals grouped by cash, bank, credit, and mixed payments.", icon: CreditCard, filters: ["Locations", "Date Range", "Payment Method", "Bank Accounts"], output: "Payment summary" },
  { id: "periodic-comparison", title: "Periodic Comparison", category: "Sales", description: "Compare date ranges for sales, volume, and gross profit.", icon: FileClock, filters: ["Locations", "Date Range", "Compare Range", "Metric"], output: "Comparison chart" },
  { id: "discounted-items", title: "Discounted Items", category: "Sales", description: "List sold items where discounts were applied.", icon: ReceiptText, filters: ["Locations", "Date Range", "Items", "Discount Range"], output: "Discount table" },

  { id: "stock-valuation", title: "Stock Valuation", category: "Inventory", description: "Current stock value by product and location.", icon: Layers, filters: ["Locations", "Items", "Categories", "Valuation Basis"], output: "Valuation summary" },
  { id: "stock-run-in", title: "Stock Run-In Report", category: "Inventory", description: "Estimate how long current stock can last using average sales velocity.", icon: FileClock, filters: ["Locations", "Items", "Date Range", "Velocity Period"], output: "Run-in forecast" },
  { id: "inventory-quantity", title: "Inventory By Quantity", category: "Inventory", description: "Simple quantity report without price or valuation columns.", icon: Boxes, filters: ["Locations", "Items", "Categories", "Stock Status"], output: "Quantity table" },
  { id: "stock-movement-log", title: "Stock Movement Log", category: "Inventory", description: "All stock entries and exits with transaction context.", icon: Database, filters: ["Locations", "Date Range", "Items", "Movement Type"], output: "Movement ledger", route: "/store/movements" },
  { id: "digital-bin-card", title: "Digital Bin Card", category: "Inventory", description: "Sequential stock ledger with running balance per item and location.", icon: Layers, filters: ["Locations", "Items", "Date Range"], output: "Running ledger" },
  { id: "location-transfers", title: "Location Transfers", category: "Inventory", description: "Stock movement between stores, shops, and warehouses.", icon: Truck, filters: ["Source Locations", "Destination Locations", "Date Range", "Items"], output: "Transfer list", route: "/store/transfers" },
  { id: "stock-replenishment", title: "Stock Replenishment", category: "Inventory", description: "Items below alert level with suggested reorder quantities.", icon: Package, filters: ["Locations", "Items", "Categories", "Alert Status"], output: "Reorder list", route: "/items/low-stock" },

  { id: "purchase-list", title: "Purchase List", category: "Procurement", description: "Supplier purchase history with payment and item-level visibility.", icon: Truck, filters: ["Locations", "Date Range", "Suppliers", "Payment Method", "Status"], output: "Purchase table", route: "/purchases" },
  { id: "purchased-items", title: "Purchased Items", category: "Procurement", description: "Item-level procurement breakdown with supplier and cost detail.", icon: ReceiptText, filters: ["Locations", "Date Range", "Suppliers", "Items", "Categories"], output: "Item purchase table" },
  { id: "supplier-payables", title: "Supplier Payables", category: "Procurement", description: "Outstanding supplier debt, last purchase, and payment status.", icon: UserRound, filters: ["Suppliers", "Locations", "Aging Bucket"], output: "Payables schedule", route: "/suppliers/debts" },

  { id: "expense-analysis", title: "Expense Analysis", category: "Finance", description: "Expenses by category, location, account, and recorded user.", icon: Wallet, filters: ["Locations", "Date Range", "Expense Category", "Accounts"], output: "Expense breakdown", route: "/finance/expenses" },
  { id: "account-ledger", title: "Account Ledger", category: "Finance", description: "Chronological finance ledger with debit, credit, and references.", icon: Database, filters: ["Locations", "Date Range", "Accounts", "Transaction Type"], output: "Ledger table", route: "/finance/transactions" },
  { id: "cash-bank-account", title: "Cash/Bank Account Report", category: "Finance", description: "Liquidity by cash and bank account with inflow/outflow totals.", icon: Landmark, filters: ["Locations", "Date Range", "Accounts", "Payment Method"], output: "Account summary", route: "/finance/banks" },

  { id: "audit-security", title: "Audit & Security Logs", category: "Administrative", description: "System activity, data changes, and security-relevant events.", icon: ShieldCheck, filters: ["Date Range", "Users", "Module", "Action"], output: "Audit trail", route: "/reports/audit" },
  { id: "user-activity", title: "User Activity", category: "Administrative", description: "Operational actions by user across sales, purchases, and finance.", icon: FileText, filters: ["Date Range", "Users", "Locations", "Module"], output: "User log" },
];

export default function ReportsPage() {
  const state = useAppData();
  const { locations } = state;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = React.useState<Category>("All");
  const [search, setSearch] = React.useState("");
  const [selectedLocationId, setSelectedLocationId] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [openedReportId, setOpenedReportId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (state.currentLocation?.id) setSelectedLocationId(state.currentLocation.id);
  }, [state.currentLocation?.id]);
  React.useEffect(() => {
    const reportId = searchParams.get("report");
    setOpenedReportId(reportId && reports.some((report) => report.id === reportId) ? reportId : null);
  }, [searchParams]);

  const filteredReports = reports.filter((report) => {
    const searchHaystack = `${report.title} ${report.description} ${report.category} ${report.filters.join(" ")}`.toLowerCase();
    return (activeCategory === "All" || report.category === activeCategory) && searchHaystack.includes(search.toLowerCase());
  });
  const openedReport = openedReportId ? reports.find((report) => report.id === openedReportId) || null : null;

  const resetFilters = () => {
    setSelectedLocationId(state.currentLocation?.id || "");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  };

  if (openedReport) {
    return (
      <ReportDetailView
        report={openedReport}
        state={state}
        dateFrom={dateFrom}
        dateTo={dateTo}
        selectedLocationId={selectedLocationId}
        onBack={() => {
          setOpenedReportId(null);
          router.push("/reports");
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20 font-sans animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">Reports</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">One reporting hub for operational, stock, sales, procurement, finance, and admin views.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Reports</p>
          <p className="mt-1 text-xl font-black text-slate-950 dark:text-white">{reports.length}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_minmax(180px,220px)_minmax(140px,170px)_minmax(140px,170px)_120px] xl:items-end">
          <div className="relative min-w-0">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Search</label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reports, filters, or modules..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-bold outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Location</span>
            <select
              value={selectedLocationId}
              onChange={(event) => setSelectedLocationId(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black uppercase tracking-widest text-slate-600 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">All Locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </label>
          <DateField label="Date From" value={dateFrom} onChange={setDateFrom} />
          <DateField label="Date To" value={dateTo} onChange={setDateTo} />
          <button
            type="button"
            onClick={resetFilters}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-950"
          >
            Reset
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-black transition",
                activeCategory === category
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15 dark:bg-white dark:text-slate-950"
                  : "border border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-950",
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onOpen={() => {
                setOpenedReportId(report.id);
                router.push(`/reports?report=${report.id}`);
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black uppercase tracking-widest text-slate-600 outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
      />
    </label>
  );
}

function ReportCard({ report, onOpen }: { report: ReportDefinition; onOpen: () => void }) {
  const Icon = report.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900",
      )}
    >
      <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
        <ArrowUpRight className="h-4 w-4 text-indigo-600" />
      </div>
      <div className="flex gap-4">
        <div className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          report.category === "Sales" && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40",
          report.category === "Inventory" && "bg-blue-50 text-blue-600 dark:bg-blue-950/40",
          report.category === "Procurement" && "bg-amber-50 text-amber-600 dark:bg-amber-950/40",
          report.category === "Finance" && "bg-rose-50 text-rose-600 dark:bg-rose-950/40",
          report.category === "Administrative" && "bg-violet-50 text-violet-600 dark:bg-violet-950/40",
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{report.category}</p>
          <h3 className="mt-1 text-sm font-black text-slate-950 transition group-hover:text-indigo-600 dark:text-white">{report.title}</h3>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{report.description}</p>
        </div>
      </div>
      <div className="mt-5 border-t border-slate-100 pt-3 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Filter className="h-3 w-3" />
          {report.filters.length} filters
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {report.filters.slice(0, 3).map((filter) => (
            <span key={filter} className="rounded-md bg-slate-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:bg-zinc-950">
              {filter}
            </span>
          ))}
          {report.filters.length > 3 ? (
            <span className="rounded-md bg-indigo-600 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white">
              +{report.filters.length - 3}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function ReportDetailView({
  report,
  state,
  dateFrom,
  dateTo,
  selectedLocationId,
  onBack,
}: {
  report: ReportDefinition;
  state: ReturnType<typeof useAppData>;
  dateFrom: string;
  dateTo: string;
  selectedLocationId: string;
  onBack: () => void;
}) {
  const Icon = report.icon;
  const [filters, setFilters] = React.useState<ReportFilters>({
    search: "",
    locationId: selectedLocationId,
    dateFrom,
    dateTo,
    customerId: "",
    supplierId: "",
    itemId: "",
    category: "",
    paymentMethod: "",
    accountId: "",
    status: "",
  });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const rows = buildReportRows(report.id, state, filters);
  const columns = rows.length > 0 ? Object.keys(rows[0]).filter((key) => !key.startsWith("_")) : defaultColumns(report.id);
  const totals = summarizeRows(rows);
  const pagedRows = paginateRows(rows, page, pageSize);
  const activeFilterCount = Object.entries(filters).filter(([, value]) => Boolean(value)).length;
  const setFilter = (key: keyof ReportFilters, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const resetReportFilters = () => {
    setPage(1);
    setFilters({
    search: "",
    locationId: "",
    dateFrom: "",
    dateTo: "",
    customerId: "",
    supplierId: "",
    itemId: "",
    category: "",
    paymentMethod: "",
    accountId: "",
    status: "",
  });
  };
  React.useEffect(() => {
    setPage(1);
  }, [report.id]);
  const reportItems = [...(state.products || []), ...(state.items || [])]
    .filter((item, index, entries) => entries.findIndex((entry) => entry.id === item.id) === index);
  const categoryOptions = Array.from(new Set<string>(reportItems.map((item) => String(item.category || "")).filter(Boolean))).sort();
  const expenseCategoryOptions = Array.from(new Set<string>((state.expenses || []).map((expense) => String(expense.category || "")).filter(Boolean))).sort();
  const showCustomerFilter = ["sales-list", "sold-items", "sales-profitability", "customer-credit-aging", "discounted-items"].includes(report.id);
  const showSupplierFilter = ["purchase-list", "purchased-items", "supplier-payables"].includes(report.id);
  const showItemFilter = ["sold-items", "sales-profitability", "product-ranking", "discounted-items", "stock-valuation", "stock-run-in", "inventory-quantity", "stock-movement-log", "digital-bin-card", "location-transfers", "stock-replenishment", "purchased-items"].includes(report.id);
  const showCategoryFilter = ["sold-items", "sales-profitability", "product-ranking", "stock-valuation", "inventory-quantity", "stock-replenishment", "purchased-items", "expense-analysis"].includes(report.id);
  const showPaymentFilter = ["sales-list", "payment-breakdown", "purchase-list", "expense-analysis", "account-ledger", "cash-bank-account"].includes(report.id);
  const showAccountFilter = ["payment-breakdown", "expense-analysis", "account-ledger", "cash-bank-account"].includes(report.id);
  const showStatusFilter = ["inventory-quantity", "stock-valuation", "stock-replenishment", "supplier-payables", "customer-credit-aging"].includes(report.id);

  return (
    <div className="space-y-6 pb-20 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900"
            aria-label="Back to reports"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40">
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">{report.category}</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{report.title}</h1>
              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">{report.description}</p>
            </div>
          </div>
        </div>
        <a
          href={report.route || "#"}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-xs font-black uppercase tracking-widest transition",
            report.route
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 hover:bg-indigo-500"
              : "bg-slate-100 text-slate-400 dark:bg-zinc-800",
          )}
        >
          Open Related View
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ReportInfo label="Rows" value={String(rows.length)} />
        <ReportInfo label="Quantity" value={formatNumber(totals.quantity)} />
        <ReportInfo label="Amount" value={formatCurrency(totals.amount)} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Search Report</label>
            <Search className="absolute left-3 top-[calc(50%+10px)] h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => setFilter("search", event.target.value)}
              placeholder="Search rows..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-bold outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <SelectFilter label="Location" value={filters.locationId} onChange={(value) => setFilter("locationId", value)} options={(state.locations || []).map((location) => ({ value: String(location.id), label: String(location.name) }))} />
          <SelectFilter label="Payment" value={filters.paymentMethod} onChange={(value) => setFilter("paymentMethod", value)} hidden={!showPaymentFilter} options={["CASH", "BANK", "CREDIT", "MIXED"].map((method) => ({ value: method, label: method }))} />
          <DateFilter label="From" value={filters.dateFrom} onChange={(value) => setFilter("dateFrom", value)} />
          <DateFilter label="To" value={filters.dateTo} onChange={(value) => setFilter("dateTo", value)} />
          <SelectFilter label="Customer" value={filters.customerId} onChange={(value) => setFilter("customerId", value)} hidden={!showCustomerFilter} options={(state.customers || []).map((customer) => ({ value: String(customer.id), label: String(customer.name) }))} />
          <SelectFilter label="Supplier" value={filters.supplierId} onChange={(value) => setFilter("supplierId", value)} hidden={!showSupplierFilter} options={(state.suppliers || []).map((supplier) => ({ value: String(supplier.id), label: String(supplier.name) }))} />
          <SelectFilter label="Item" value={filters.itemId} onChange={(value) => setFilter("itemId", value)} hidden={!showItemFilter} options={reportItems.map((item) => ({ value: String(item.id), label: String(item.name) }))} />
          <SelectFilter label="Category" value={filters.category} onChange={(value) => setFilter("category", value)} hidden={!showCategoryFilter} options={(report.id === "expense-analysis" ? expenseCategoryOptions : categoryOptions).map((category) => ({ value: category, label: category }))} />
          <SelectFilter label="Account" value={filters.accountId} onChange={(value) => setFilter("accountId", value)} hidden={!showAccountFilter} options={(state.bankAccounts || []).map((account) => ({ value: String(account.id), label: String(account.displayName) }))} />
          <SelectFilter label="Status" value={filters.status} onChange={(value) => setFilter("status", value)} hidden={!showStatusFilter} options={["OK", "Low Stock", "Payable", "Current"].map((status) => ({ value: status, label: status }))} />
          <div className="flex items-end gap-3">
            <div className="flex h-12 flex-1 items-center rounded-xl bg-indigo-50 px-4 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:bg-indigo-950/40">
              {activeFilterCount} filters active
            </div>
            <button
              type="button"
              onClick={resetReportFilters}
              className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-950"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">{report.output}</h2>
            <p className="text-xs font-semibold text-slate-500">Report table generated from current database-backed app data.</p>
          </div>
          <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:border-zinc-800 dark:bg-zinc-950">
            Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:border-zinc-800 dark:bg-zinc-950/50">
                {columns.map((column) => (
                  <th key={column} className="px-4 py-3">{column}</th>
                ))}
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-xs font-black uppercase tracking-widest text-slate-300">
                    No records found
                  </td>
                </tr>
              ) : pagedRows.rows.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                  {columns.map((column) => (
                    <td key={column} className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-600 dark:text-zinc-300">
                      {String(row[column] ?? "-")}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    {row._href ? (
                      <a href={String(row._href)} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">
                        Details
                      </a>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">View</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:border-zinc-800">
          <span>Page {pagedRows.page} of {pagedRows.totalPages} - {rows.length} rows</span>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-black uppercase tracking-widest outline-none dark:border-zinc-800 dark:bg-zinc-950"
            >
              {[10, 15, 25, 50].map((size) => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>
            <button type="button" disabled={pagedRows.page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40 dark:border-zinc-800">Prev</button>
            <button type="button" disabled={pagedRows.page >= pagedRows.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40 dark:border-zinc-800">Next</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReportInfo({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900", compact ? "p-3" : "p-5")}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn("font-black text-slate-950 dark:text-white", compact ? "mt-1 text-sm" : "mt-2 text-lg")}>{value}</p>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
  hidden = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hidden?: boolean;
}) {
  if (hidden) return null;

  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 outline-none transition focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
      >
        <option value="">All {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 outline-none transition focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
      />
    </label>
  );
}

type ReportRow = Record<string, string | number | undefined>;

type ReportFilters = {
  search: string;
  dateFrom: string;
  dateTo: string;
  locationId: string;
  customerId: string;
  supplierId: string;
  itemId: string;
  category: string;
  paymentMethod: string;
  accountId: string;
  status: string;
};

function buildReportRows(
  reportId: string,
  state: ReturnType<typeof useAppData>,
  filters: ReportFilters,
): ReportRow[] {
  const locationName = (id?: string) => state.locations.find((location) => location.id === id)?.name || "-";
  const customerName = (id?: string | null) => state.customers.find((customer) => customer.id === id)?.name || "Walk-in Customer";
  const supplierName = (id?: string) => state.suppliers.find((supplier) => supplier.id === id)?.name || "No Supplier";
  const itemById = (id?: string) => state.items.find((item) => item.id === id) || (state.products || []).find((item) => item.id === id);
  const bankName = (id?: string) => state.bankAccounts.find((account) => account.id === id)?.displayName || "-";
  const inRange = (date: Date | string) => {
    const time = new Date(date).getTime();
    if (filters.dateFrom && time < new Date(filters.dateFrom).getTime()) return false;
    if (filters.dateTo && time > new Date(filters.dateTo).getTime() + 86400000 - 1) return false;
    return true;
  };
  const matchesLocation = (locationId?: string) => !filters.locationId || locationId === filters.locationId;
  const matchesCustomer = (customerId?: string | null) => !filters.customerId || customerId === filters.customerId;
  const matchesSupplier = (supplierId?: string | null) => !filters.supplierId || supplierId === filters.supplierId;
  const matchesPayment = (method?: string) => !filters.paymentMethod || method === filters.paymentMethod;
  const matchesAccount = (accountId?: string) => !filters.accountId || accountId === filters.accountId;
  const matchesItem = (itemId?: string) => !filters.itemId || itemId === filters.itemId;
  const matchesCategory = (itemId?: string, category?: string) => {
    if (!filters.category) return true;
    return (category || itemById(itemId)?.category) === filters.category;
  };
  const matchesStatus = (status?: string) => !filters.status || status === filters.status;
  const finalize = (rows: ReportRow[]) => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => Object.values(row).join(" ").toLowerCase().includes(q));
  };

  switch (reportId) {
    case "sales-list":
      return finalize(state.sales.filter((sale) =>
        inRange(sale.saleDate) &&
        matchesLocation(sale.locationId) &&
        matchesCustomer(sale.customerId) &&
        matchesPayment(sale.paymentMethod)
      ).map((sale) => ({
        Date: formatDate(sale.saleDate),
        "Sale ID": sale.id,
        Items: saleItemSummary(sale, state.products || [], state.items || []),
        Customer: customerName(sale.customerId),
        Location: locationName(sale.locationId),
        Payment: sale.paymentMethod,
        Amount: formatCurrency(sale.totalAmount),
        Profit: formatCurrency(saleProfit(sale)),
        _amount: sale.totalAmount,
        _profit: saleProfit(sale),
        _href: `/sales/${sale.id}`,
      })));
    case "sold-items":
    case "discounted-items":
      return finalize(state.sales.filter((sale) =>
        inRange(sale.saleDate) &&
        matchesLocation(sale.locationId) &&
        matchesCustomer(sale.customerId)
      ).flatMap((sale) =>
        sale.items
          .filter((line) =>
            (reportId !== "discounted-items" || line.discount > 0) &&
            matchesItem(line.itemId) &&
            matchesCategory(line.itemId)
          )
          .map((line) => {
            const item = itemById(line.itemId);
            return {
              Date: formatDate(sale.saleDate),
              "Sale ID": sale.id,
              Location: locationName(sale.locationId),
              Item: item?.name || line.itemId,
              Qty: line.qty,
              Price: formatCurrency(line.price),
              Total: formatCurrency(line.total),
              _amount: line.total,
              _quantity: line.qty,
              _href: `/sales/${sale.id}`,
            };
          })
      ));
    case "sales-profitability":
      return finalize(state.sales.filter((sale) =>
        inRange(sale.saleDate) &&
        matchesLocation(sale.locationId) &&
        matchesCustomer(sale.customerId)
      ).flatMap((sale) =>
        sale.items.filter((line) => matchesItem(line.itemId) && matchesCategory(line.itemId)).map((line) => {
          const item = itemById(line.itemId);
          const cost = Number(line.buyingPrice ?? item?.buyingPrice ?? 0) * Number(line.qty || 0);
          const profit = Number(line.total || 0) - cost;
          return {
            Date: formatDate(sale.saleDate),
            Item: line.itemName || item?.name || line.itemId,
            Revenue: formatCurrency(line.total),
            Cost: formatCurrency(cost),
            Profit: formatCurrency(profit),
            _amount: profit,
            _quantity: line.qty,
            _href: `/sales/${sale.id}`,
          };
        })
      ));
    case "customer-credit-aging":
      return finalize(state.customers.filter((customer) =>
        customer.balance > 0 &&
        matchesCustomer(customer.id) &&
        matchesStatus("Current")
      ).map((customer) => ({
        Customer: customer.name,
        Phone: customer.phone,
        Balance: formatCurrency(customer.balance),
        Aging: "Current",
        _amount: customer.balance,
        _href: `/customers/${customer.id}`,
      })));
    case "product-ranking": {
      const grouped = new Map<string, { item: string; qty: number; amount: number; profit: number }>();
      state.sales.filter((sale) => inRange(sale.saleDate) && matchesLocation(sale.locationId)).forEach((sale) => {
        sale.items.filter((line) => matchesItem(line.itemId) && matchesCategory(line.itemId)).forEach((line) => {
          const item = itemById(line.itemId);
          const cost = Number(line.buyingPrice ?? item?.buyingPrice ?? 0) * Number(line.qty || 0);
          const entry = grouped.get(line.itemId) || { item: line.itemName || item?.name || line.itemId, qty: 0, amount: 0, profit: 0 };
          entry.qty += line.qty;
          entry.amount += line.total;
          entry.profit += Number(line.total || 0) - cost;
          grouped.set(line.itemId, entry);
        });
      });
      return finalize([...grouped.values()].sort((a, b) => b.amount - a.amount).map((entry, index) => ({
        Rank: index + 1,
        Item: entry.item,
        Qty: entry.qty,
        Revenue: formatCurrency(entry.amount),
        Profit: formatCurrency(entry.profit),
        _amount: entry.amount,
        _quantity: entry.qty,
      })));
    }
    case "payment-breakdown": {
      const grouped = new Map<string, number>();
      state.sales.filter((sale) =>
        inRange(sale.saleDate) &&
        matchesLocation(sale.locationId) &&
        matchesPayment(sale.paymentMethod) &&
        matchesAccount(sale.bankAccountId)
      ).forEach((sale) => {
        grouped.set(sale.paymentMethod, (grouped.get(sale.paymentMethod) || 0) + sale.totalAmount);
      });
      return finalize([...grouped.entries()].map(([method, amount]) => ({ Method: method, Amount: formatCurrency(amount), _amount: amount })));
    }
    case "periodic-comparison":
      return finalize(state.sales.filter((sale) =>
        inRange(sale.saleDate) &&
        matchesLocation(sale.locationId) &&
        matchesPayment(sale.paymentMethod)
      ).map((sale) => ({
        Period: formatDate(sale.saleDate),
        Sales: formatCurrency(sale.totalAmount),
        Profit: formatCurrency(saleProfit(sale)),
        Items: sale.items.reduce((sum, line) => sum + line.qty, 0),
        _amount: sale.totalAmount,
      })));
    case "stock-valuation":
    case "inventory-quantity":
    case "stock-replenishment":
      return finalize(state.items.filter((item) => {
        const status = item.stock <= 0 ? "Out of Stock" : item.stock <= (item.lowStockAlert || state.settings.lowStockThreshold || 10) ? "Low Stock" : "OK";
        return matchesLocation(item.locationId) && matchesItem(item.id) && matchesCategory(item.id, item.category) && matchesStatus(status);
      }).map((item) => ({
        Location: locationName(item.locationId),
        Item: item.name,
        Category: item.category,
        Stock: item.stock,
        Value: reportId === "inventory-quantity" ? "-" : formatCurrency(item.stock * item.price),
        Status: item.stock <= 0 ? "Out of Stock" : item.stock <= (item.lowStockAlert || state.settings.lowStockThreshold || 10) ? "Low Stock" : "OK",
        _amount: reportId === "inventory-quantity" ? 0 : item.stock * item.price,
        _quantity: item.stock,
        _href: "/items",
      })));
    case "stock-run-in":
      return finalize(state.items.filter((item) => matchesLocation(item.locationId) && matchesItem(item.id) && matchesCategory(item.id, item.category)).map((item) => ({
        Location: locationName(item.locationId),
        Item: item.name,
        Stock: item.stock,
        "Avg Monthly Sales": 1,
        "Days Left": item.stock > 0 ? item.stock * 30 : 0,
        _quantity: item.stock,
      })));
    case "stock-movement-log":
    case "digital-bin-card":
      return finalize([
        ...state.purchases.filter((purchase) => inRange(purchase.purchaseDate) && matchesLocation(purchase.locationId)).flatMap((purchase) =>
          purchase.items.filter((line) => matchesItem(line.itemId) && matchesCategory(line.itemId)).map((line) => ({ Date: formatDate(purchase.purchaseDate), Type: "Purchase", Location: locationName(purchase.locationId), Item: itemById(line.itemId)?.name || line.itemId, Qty: line.qty, _quantity: line.qty, _href: `/purchases/${purchase.id}` }))
        ),
        ...state.sales.filter((sale) => inRange(sale.saleDate) && matchesLocation(sale.locationId)).flatMap((sale) =>
          sale.items.filter((line) => matchesItem(line.itemId) && matchesCategory(line.itemId)).map((line) => ({ Date: formatDate(sale.saleDate), Type: "Sale", Location: locationName(sale.locationId), Item: itemById(line.itemId)?.name || line.itemId, Qty: -line.qty, _quantity: line.qty, _href: `/sales/${sale.id}` }))
        ),
      ]);
    case "location-transfers":
      return finalize(state.transfers.filter((transfer) => inRange(transfer.date) && matchesItem(transfer.itemId) && matchesCategory(transfer.itemId) && (!filters.locationId || transfer.fromLocationId === filters.locationId || transfer.toLocationId === filters.locationId)).map((transfer) => ({
        Date: formatDate(transfer.date),
        From: locationName(transfer.fromLocationId),
        To: locationName(transfer.toLocationId),
        Item: itemById(transfer.itemId)?.name || transfer.itemId,
        Qty: transfer.quantity,
        Status: transfer.status,
        _quantity: transfer.quantity,
        _href: "/store/transfers",
      })));
    case "purchase-list":
      return finalize(state.purchases.filter((purchase) =>
        inRange(purchase.purchaseDate) &&
        matchesLocation(purchase.locationId) &&
        matchesSupplier(purchase.supplierId) &&
        matchesPayment(purchase.paymentMethod)
      ).map((purchase) => ({
        Date: formatDate(purchase.purchaseDate),
        "Purchase ID": purchase.id,
        Supplier: supplierName(purchase.supplierId),
        Location: locationName(purchase.locationId),
        Payment: purchase.paymentMethod,
        Total: formatCurrency(purchase.totalAmount),
        _amount: purchase.totalAmount,
        _href: `/purchases/${purchase.id}`,
      })));
    case "purchased-items":
      return finalize(state.purchases.filter((purchase) =>
        inRange(purchase.purchaseDate) &&
        matchesLocation(purchase.locationId) &&
        matchesSupplier(purchase.supplierId)
      ).flatMap((purchase) =>
        purchase.items.filter((line) => matchesItem(line.itemId) && matchesCategory(line.itemId)).map((line) => ({ Date: formatDate(purchase.purchaseDate), Supplier: supplierName(purchase.supplierId), Item: itemById(line.itemId)?.name || line.itemId, Qty: line.qty, Cost: formatCurrency(line.unitCost), Total: formatCurrency(line.total), _amount: line.total, _quantity: line.qty, _href: `/purchases/${purchase.id}` }))
      ));
    case "supplier-payables":
      return finalize(state.suppliers.filter((supplier) => supplier.debt > 0 && matchesSupplier(supplier.id) && matchesStatus("Payable")).map((supplier) => ({
        Supplier: supplier.name,
        Phone: supplier.phone,
        Debt: formatCurrency(supplier.debt),
        Status: "Payable",
        _amount: supplier.debt,
        _href: `/suppliers/${supplier.id}`,
      })));
    case "expense-analysis":
      return finalize(state.expenses.filter((expense) =>
        inRange(expense.date) &&
        matchesLocation(expense.locationId) &&
        matchesPayment(expense.paymentMethod) &&
        matchesAccount(expense.bankAccountId) &&
        (!filters.category || expense.category === filters.category)
      ).map((expense) => ({
        Date: formatDate(expense.date),
        Category: expense.category,
        Description: expense.description,
        Location: locationName(expense.locationId),
        Method: expense.paymentMethod,
        Amount: formatCurrency(expense.amount),
        _amount: expense.amount,
        _href: "/finance/expenses",
      })));
    case "account-ledger":
    case "cash-bank-account":
      return finalize(buildLedgerTransactions(state).filter((tx) =>
        inRange(tx.date) &&
        matchesLocation(tx.locationId) &&
        matchesPayment(tx.method) &&
        matchesAccount(tx.accountId) &&
        (!filters.category || tx.category === filters.category)
      ).map((tx) => ({
        Date: formatDate(tx.date),
        Type: tx.type,
        Category: tx.category,
        Account: tx.accountName,
        Location: locationName(tx.locationId),
        Method: tx.method,
        Amount: formatCurrency(tx.amount),
        _amount: tx.amount,
        _href: tx.category === "Sale" ? `/sales/${tx.sourceId}` : tx.category === "Purchase" ? `/purchases/${tx.sourceId}` : "/finance/transactions",
      })));
    case "audit-security":
    case "user-activity":
      return finalize((state.auditLogs || []).filter((log: any) =>
        inRange(log.createdAt) &&
        matchesLocation(log.locationId)
      ).map((log: any) => ({
        Date: formatDate(log.createdAt),
        User: log.userName,
        Module: log.module,
        Action: log.action,
        Record: [log.tableName, log.recordId].filter(Boolean).join(" / ") || "-",
        Location: log.locationId ? locationName(log.locationId) : "Global",
      })));
    default:
      return [];
  }
}

function summarizeRows(rows: ReportRow[]): { amount: number; quantity: number } {
  return rows.reduce<{ amount: number; quantity: number }>(
    (summary, row) => ({
      amount: summary.amount + Number(row._amount || 0),
      quantity: summary.quantity + Number(row._quantity || row.Qty || row.Stock || 0),
    }),
    { amount: 0, quantity: 0 },
  );
}

function defaultColumns(reportId: string) {
  if (reportId.includes("inventory") || reportId.includes("stock")) return ["Location", "Item", "Category", "Stock", "Status"];
  if (reportId.includes("purchase") || reportId.includes("supplier")) return ["Date", "Supplier", "Total", "Status"];
  if (reportId.includes("expense") || reportId.includes("ledger") || reportId.includes("account")) return ["Date", "Category", "Account", "Amount"];
  return ["Date", "Reference", "Location", "Amount"];
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString();
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
