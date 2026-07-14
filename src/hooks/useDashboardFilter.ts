import { useState, useDeferredValue, useMemo } from "react";
import { type PersonCurrencyBalance } from "./useDashboardData";
import { type Person } from "./useDashboardData";

export type Filter = "all" | "credit" | "debit";
export type Sort = "active" | "name" | "recent";
export type ViewMode = "cards" | "table";

export function useDashboardFilter(
  people: Person[],
  personCurrencyBalances: Map<string, PersonCurrencyBalance[]>
) {
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("active");

  const filtered = useMemo(() => {
    const list = people.filter((p) => {
      if (deferredQ && !p.name.toLowerCase().includes(deferredQ.toLowerCase())) return false;
      const balances = personCurrencyBalances.get(p.id) || [];
      if (filter === "credit") return balances.some((b) => b.net > 0.001);
      if (filter === "debit") return balances.some((b) => b.net < -0.001);
      return true;
    });
    
    return list.sort((a, b) => {
      const ba = personCurrencyBalances.get(a.id) || [];
      const bb = personCurrencyBalances.get(b.id) || [];
      if (sort === "name") return a.name.localeCompare(b.name, "ar");
      
      if (sort === "recent") {
          const aLastDate = Math.max(0, ...ba.map(b => b.lastDate));
          const bLastDate = Math.max(0, ...bb.map(b => b.lastDate));
          return bLastDate - aLastDate;
      }
      
      // active: most-owed/owing first
      const aActive = Math.max(0, ...ba.map(b => Math.abs(b.net)));
      const bActive = Math.max(0, ...bb.map(b => Math.abs(b.net)));
      return bActive - aActive;
    });
  }, [people, deferredQ, filter, sort, personCurrencyBalances]);

  return {
    q, setQ,
    deferredQ,
    filter, setFilter,
    sort, setSort,
    filtered
  };
}
