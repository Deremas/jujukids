"use client";

import { buildLedgerTransactions } from "@/lib/finance-ledger";
import { useAppData } from "@/lib/client/useAppData";
import { TransactionsClient } from "./transactions-client";

export function TransactionsStorePage({ scope }: { scope: "LOCATION" | "ADMIN" }) {
  const state = useAppData();
  const currentLocationId = state.currentLocation?.id || state.locations[0]?.id;
  const transactions = buildLedgerTransactions(state).map((transaction) => {
    const location = state.locations.find((entry) => entry.id === transaction.locationId);
    return {
      ...transaction,
      date: transaction.date.toISOString(),
      locationName: location?.name || "All Locations",
    };
  });

  return (
    <TransactionsClient
      accounts={state.bankAccounts.map((account) => ({
        id: account.id,
        displayName: account.displayName,
      }))}
      locations={state.locations.map((location) => ({
        id: location.id,
        name: location.name,
      }))}
      transactions={transactions}
      initialLocationIds={scope === "LOCATION" && currentLocationId ? [currentLocationId] : []}
    />
  );
}
