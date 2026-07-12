/**
 * useInvalidateAll
 * ================
 * Hook مركزي يُبطل جميع cache keys في التطبيق دفعةً واحدة.
 * يُستدعى بعد أي mutation: إضافة/تعديل/حذف معاملة أو عميل.
 *
 * استخدام:
 *   const invalidateAll = useInvalidateAll();
 *   await invalidateAll();                    // كل شيء
 *   await invalidateAll("person", personId);  // شخص بعينه + الداشبورد
 */
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/** جميع query keys المستخدمة في التطبيق */
export const QUERY_KEYS = {
  // Dashboard & global
  dashboard:       "dashboard",
  rpcTotals:       "rpcTotals",
  rpcMonthly:      "rpcMonthly",
  rpcTopDebtors:   "rpcTopDebtors",
  insights:        "insights",
  pendingCount:    "pendingCount",
  pendingReminders:"pendingReminders",
  moduleTabsCounts:"moduleTabsCounts",
  globalSearch:    "globalSearch",

  // People
  activePeople:    "activePeople",
  archivedPeople:  "archivedPeople",
  people:          "people",
  person:          "person",

  // Transactions & balances
  personTx:        "personTx",
  personBalances:  "personBalances",
  openings:        "openings",
  followupBuckets: "followupBuckets",

  // Finances
  expenses:        "expenses",
  budgets:         "budgets",
  budgetExpenses:  "budgetExpenses",
  accounts:        "accounts",
  currencies:      "currencies",

  // Misc
  companyProfile:  "companyProfile",
  expenseCategories:"expenseCategories",
};

/**
 * إبطال الـ queries المتعلقة بالمعاملات والأرصدة
 * (لا يُبطل expenses/budgets لأنها غير مرتبطة بمعاملات الديون)
 */
const TRANSACTION_RELATED: string[] = [
  QUERY_KEYS.dashboard,
  QUERY_KEYS.rpcTotals,
  QUERY_KEYS.rpcMonthly,
  QUERY_KEYS.rpcTopDebtors,
  QUERY_KEYS.insights,
  QUERY_KEYS.pendingCount,
  QUERY_KEYS.pendingReminders,
  QUERY_KEYS.moduleTabsCounts,
  QUERY_KEYS.activePeople,
  QUERY_KEYS.people,
  QUERY_KEYS.person,
  QUERY_KEYS.personTx,
  QUERY_KEYS.personBalances,
  QUERY_KEYS.openings,
  QUERY_KEYS.followupBuckets,
];

/**
 * إبطال الـ queries المتعلقة بالعملاء (بيانات الشخص نفسه)
 */
const PERSON_RELATED: string[] = [
  QUERY_KEYS.dashboard,
  QUERY_KEYS.rpcTotals,
  QUERY_KEYS.activePeople,
  QUERY_KEYS.archivedPeople,
  QUERY_KEYS.people,
  QUERY_KEYS.person,
  QUERY_KEYS.personTx,
  QUERY_KEYS.personBalances,
  QUERY_KEYS.openings,
  QUERY_KEYS.moduleTabsCounts,
  QUERY_KEYS.pendingCount,
  QUERY_KEYS.insights,
  QUERY_KEYS.followupBuckets,
  QUERY_KEYS.globalSearch,
];

export function useInvalidateAll() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(
    async (scope?: "transaction" | "person" | "expense" | "all", _id?: string) => {
      let keys: string[];

      switch (scope) {
        case "transaction":
          keys = TRANSACTION_RELATED;
          break;
        case "person":
          keys = PERSON_RELATED;
          break;
        case "expense":
          keys = [QUERY_KEYS.expenses, QUERY_KEYS.budgets, QUERY_KEYS.budgetExpenses, QUERY_KEYS.rpcMonthly, QUERY_KEYS.insights, QUERY_KEYS.moduleTabsCounts];
          break;
        default:
          // "all" أو بدون scope → أبطل كل شيء
          keys = Object.values(QUERY_KEYS);
      }

      await Promise.all(
        keys.map((key) =>
          queryClient.invalidateQueries({ queryKey: [key], refetchType: "active" })
        )
      );
    },
    [queryClient]
  );

  return invalidateAll;
}
