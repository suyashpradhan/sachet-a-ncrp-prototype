import type { IncidentDraft } from "./schema";

export type ResolvedLossSource =
  | "CANONICAL_TRANSACTIONS"
  | "STATED_TOTAL"
  | "USER_CONFIRMED"
  | "NONE";

export type FinancialLossSummary = {
  statedTotalLoss: number | null;
  totalDebited: number | null;
  totalCreditedBack: number | null;
  computedTransactionLoss: number | null;
  resolvedLoss: number | null;
  resolvedLossSource: ResolvedLossSource;
  hasExplicitTotalConflict: boolean;
  openingBalance: number | null;
  intermediateBalances: number[];
  closingBalance: number | null;
  balanceDelta: number | null;
  transactionTotalAlignsWithBalanceChange: boolean | null;
};

function positiveAmount(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

export function resolveFinancialLoss(
  draft: IncidentDraft,
  citizenSelectedLoss?: number | null,
): FinancialLossSummary {
  const statedTotalLoss = positiveAmount(draft.incident.statedTotalLoss);
  const knownTransactions = draft.transactions.filter(
    (transaction) => transaction.status === "KNOWN",
  );
  const debited = knownTransactions.reduce(
    (total, transaction) =>
      transaction.direction === "CREDIT"
        ? total
        : total + (positiveAmount(transaction.amount) ?? 0),
    0,
  );
  const credited = knownTransactions.reduce(
    (total, transaction) =>
      transaction.direction === "CREDIT"
        ? total + (positiveAmount(transaction.amount) ?? 0)
        : total,
    0,
  );
  const computed = Math.max(0, debited - credited);
  const totalDebited = debited > 0 ? debited : null;
  const totalCreditedBack = credited > 0 ? credited : null;
  const computedTransactionLoss = computed > 0 ? computed : null;
  const hasExplicitTotalConflict = Boolean(
    statedTotalLoss &&
      computedTransactionLoss &&
      statedTotalLoss !== computedTransactionLoss,
  );
  const selected = positiveAmount(
    citizenSelectedLoss ?? draft.incident.citizenConfirmedLoss,
  );
  const openingBalance = draft.incident.openingBalance;
  const closingBalance = draft.incident.closingBalance;
  const balanceDelta = openingBalance !== null && closingBalance !== null && openingBalance >= closingBalance
    ? openingBalance - closingBalance
    : null;

  let resolvedLoss: number | null = null;
  let resolvedLossSource: ResolvedLossSource = "NONE";
  if (draft.incident.financialLossState === "YES") {
    if (selected) {
      resolvedLoss = selected;
      resolvedLossSource = "USER_CONFIRMED";
    } else if (hasExplicitTotalConflict) {
      resolvedLoss = null;
      resolvedLossSource = "NONE";
    } else if (computedTransactionLoss) {
      resolvedLoss = computedTransactionLoss;
      resolvedLossSource = draft.citizenConfirmedFields.includes("incident.statedTotalLoss")
        ? "USER_CONFIRMED"
        : statedTotalLoss
          ? "STATED_TOTAL"
          : "CANONICAL_TRANSACTIONS";
    } else if (statedTotalLoss) {
      resolvedLoss = statedTotalLoss;
      resolvedLossSource = draft.citizenConfirmedFields.includes("incident.statedTotalLoss")
        ? "USER_CONFIRMED"
        : "STATED_TOTAL";
    }
  }

  return {
    statedTotalLoss,
    totalDebited,
    totalCreditedBack,
    computedTransactionLoss,
    resolvedLoss,
    resolvedLossSource,
    hasExplicitTotalConflict,
    openingBalance,
    intermediateBalances: draft.incident.intermediateBalances,
    closingBalance,
    balanceDelta,
    transactionTotalAlignsWithBalanceChange:
      balanceDelta === null || computedTransactionLoss === null
        ? null
        : balanceDelta === computedTransactionLoss,
  };
}
