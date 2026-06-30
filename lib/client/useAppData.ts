"use client";

import React from "react";

type AppData = Record<string, any>;

const initialAppData: AppData = {
  currentLocation: null,
  locations: [],
  categories: [],
  units: [],
  products: [],
  items: [],
  suppliers: [],
  customers: [],
  bankAccounts: [],
  sales: [],
  purchases: [],
  customerPayments: [],
  supplierPayments: [],
  expenses: [],
  cashTransfers: [],
  transfers: [],
  inventoryMovements: [],
  auditLogs: [],
  users: [],
  roles: [],
  permissions: [],
  settings: {},
};

type AppDataContextValue = AppData & {
  loading: boolean;
  filterLocationIds: string[];
  setFilterLocationIds: (ids: string[]) => void;
  setCurrentLocation: (location: any) => void;
  refresh: () => Promise<AppData | undefined>;
  addCustomer: (payload: any) => Promise<any>;
  updateCustomer: (payload: any) => Promise<any>;
  addSupplier: (payload: any) => Promise<any>;
  updateSupplier: (payload: any) => Promise<any>;
  addLocation: (payload: any) => Promise<any>;
  updateSettings: (payload: any) => Promise<any>;
  addCategory: (payload: any) => Promise<any>;
  addUnit: (payload: any) => Promise<any>;
  addSale: (payload: any) => Promise<any>;
  addExpense: (payload: any) => Promise<any>;
  addCashTransfer: (payload: any) => Promise<{ success: boolean; error?: string }>;
  addPurchase: (payload: any) => Promise<any>;
  addItem: (payload: any) => Promise<any>;
  updateUser: (payload: any) => Promise<any>;
  updateUserStatus: (id: string, isActive: boolean) => Promise<any>;
  changePassword: (payload: any) => Promise<any>;
  addUser: (payload: any) => Promise<any>;
  addRole: (payload: any) => Promise<any>;
  updateRole: (payload: any) => Promise<any>;
  deleteRole: (id: string) => Promise<any>;
  updateBankAccount: (payload: any) => Promise<any>;
  addBankAccount: (payload: any) => Promise<any>;
  deleteBankAccount: (id: string) => Promise<any>;
  addCustomerPayment: (payload: any) => Promise<any>;
  settleCredit: (payload: any) => Promise<any>;
  addSupplierPayment: (payload: any) => Promise<any>;
  addTransfer: (payload: any) => Promise<any>;
  adjustStock: (payload: any) => Promise<any>;
  addStockEntry: (payload: any) => Promise<any>;
  updateItemPrice: (payload: any) => Promise<any>;
  deleteSale: (id: string) => Promise<any>;
  deletePurchase: (id: string) => Promise<any>;
  deleteItem: (id: string) => Promise<{ success: boolean }>;
  deleteSupplier: (id: string) => Promise<{ success: boolean }>;
  deleteCustomer: (id: string) => Promise<{ success: boolean }>;
  deleteUser: (id: string) => Promise<{ success: boolean }>;
  updateItemStock: (id: string, locationId: string, quantity: number) => Promise<any>;
};

const AppDataContext = React.createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AppData>(initialAppData);
  const [loading, setLoading] = React.useState(true);
  const [filterLocationIds, setFilterLocationIds] = React.useState<string[]>([]);

  const loadData = React.useCallback(async () => {
    try {
      const response = await fetch("/api/app", { cache: "no-store" });
      if (response.status === 401) {
        if (typeof window !== "undefined") window.location.href = "/login";
        return undefined;
      }
      if (!response.ok) throw new Error("Failed to load application data.");

      const data = await response.json();
      let nextState: AppData = data;
      setState((current) => {
        const currentLocationStillAllowed =
          current.currentLocation &&
          data.locations?.some((location: any) => location.id === current.currentLocation.id);

        nextState = {
          ...initialAppData,
          ...data,
          currentLocation: currentLocationStillAllowed ? current.currentLocation : data.currentLocation,
        };
        return nextState;
      });
      return nextState;
    } catch (error) {
      console.error("Failed to load app data:", error);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const runAction = React.useCallback(async (action: string, payload: any) => {
    const response = await fetch("/api/app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    if (response.status === 401) {
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Session expired.");
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false) {
      throw new Error(body.error || `Action failed: ${action}`);
    }
    await loadData();
    return body;
  }, [loadData]);

  const value = React.useMemo<AppDataContextValue>(() => ({
    ...state,
    loading,
    filterLocationIds,
    setFilterLocationIds,
    setCurrentLocation: (currentLocation: any) => setState((current) => ({ ...current, currentLocation })),
    refresh: loadData,
    addCustomer: (payload: any) => runAction("addCustomer", payload),
    updateCustomer: (payload: any) => runAction("updateCustomer", payload),
    addSupplier: (payload: any) => runAction("addSupplier", payload),
    updateSupplier: (payload: any) => runAction("updateSupplier", payload),
    addLocation: (payload: any) => runAction("addLocation", payload),
    updateSettings: (payload: any) => runAction("updateSettings", payload),
    addCategory: (payload: any) => runAction("addCategory", payload),
    addUnit: (payload: any) => runAction("addUnit", payload),
    addSale: (payload: any) => runAction("addSale", payload),
    addExpense: (payload: any) => runAction("addExpense", payload),
    addCashTransfer: async (payload: any) => {
      try {
        await runAction("addCashTransfer", payload);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Cash transfer failed." };
      }
    },
    addPurchase: (payload: any) => runAction("addPurchase", payload),
    addItem: (payload: any) => runAction("addItem", payload),
    updateUser: (payload: any) => runAction("updateUser", payload),
    updateUserStatus: (id: string, isActive: boolean) => runAction("updateUserStatus", { id, isActive }),
    changePassword: (payload: any) => runAction("changePassword", payload),
    addUser: (payload: any) => runAction("addUser", payload),
    addRole: (payload: any) => runAction("addRole", payload),
    updateRole: (payload: any) => runAction("updateRole", payload),
    deleteRole: (id: string) => runAction("deleteRole", { id }),
    updateBankAccount: (payload: any) => runAction("updateBankAccount", payload),
    addBankAccount: (payload: any) => runAction("addBankAccount", payload),
    deleteBankAccount: (id: string) => runAction("deleteBankAccount", { id }),
    addCustomerPayment: (payload: any) => runAction("addCustomerPayment", payload),
    settleCredit: (payload: any) => runAction("settleCredit", payload),
    addSupplierPayment: (payload: any) => runAction("addSupplierPayment", payload),
    addTransfer: (payload: any) => runAction("addTransfer", payload),
    adjustStock: (payload: any) => runAction("adjustStock", payload),
    addStockEntry: (payload: any) => runAction("addStockEntry", payload),
    updateItemPrice: (payload: any) => runAction("updateItemPrice", payload),
    deleteSale: (id: string) => runAction("deleteSale", { id }),
    deletePurchase: (id: string) => runAction("deletePurchase", { id }),
    deleteItem: async (id: string) => {
      await runAction("deleteItem", { id });
      return { success: true };
    },
    deleteSupplier: async (id: string) => {
      await runAction("deleteSupplier", { id });
      return { success: true };
    },
    deleteCustomer: async (id: string) => {
      await runAction("deleteCustomer", { id });
      return { success: true };
    },
    deleteUser: async (id: string) => {
      await runAction("deleteUser", { id });
      return { success: true };
    },
    updateItemStock: (id: string, locationId: string, quantity: number) => runAction("updateItemStock", { id, locationId, quantity }),
  }), [loadData, runAction, state]);

  return React.createElement(AppDataContext.Provider, { value }, children);
}

export function useAppData(): any {
  const context = React.useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider.");
  }
  return context;
}

export function calculateLocationCashBalance(state: {
  sales: any[];
  purchases: any[];
  expenses: any[];
  customerPayments: any[];
  supplierPayments: any[];
  cashTransfers?: any[];
}, locationId: string) {
  const cashSales = (state.sales || [])
    .filter((sale) => sale.locationId === locationId)
    .reduce((sum, sale) => sum + Number(sale.cashAmount || 0), 0);
  const cashPurchases = (state.purchases || [])
    .filter((purchase) => purchase.locationId === locationId && (purchase.paymentMethod === "CASH" || purchase.paymentMethod === "MIXED"))
    .reduce((sum, purchase) => sum + Number(purchase.cashAmount ?? (purchase.paymentMethod === "CASH" ? purchase.paidAmount : 0)), 0);
  const cashExpenses = (state.expenses || [])
    .filter((expense) => expense.locationId === locationId && expense.paymentMethod === "CASH")
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const deposits = (state.cashTransfers || [])
    .filter((transfer) => transfer.locationId === locationId)
    .reduce((sum, transfer) => sum + Number(transfer.amount || 0), 0);

  return cashSales - cashPurchases - cashExpenses - deposits;
}
