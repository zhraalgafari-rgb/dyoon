import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { processRecurringFn } from "@/lib/jobs.functions";
import { type PersonBalance } from "@/features/debts/PersonRow";

export interface Currency {
  id: string;
  name: string;
  symbol: string;
  rate: number;
  is_base: boolean;
}

export interface Person {
  id: string;
  name: string;
  type: string;
  is_archived: boolean;
  avatar_color: string | null;
  phone: string | null;
  notes?: string | null;
  credit_limit?: number | null;
}

/**
 * Balance per person per currency (strict separation — no mixing).
 */
export interface PersonCurrencyBalance {
  currency_id: string;
  net: number;
  totalCredit: number;
  totalDebit: number;
  txCount: number;
  lastDate: number;
  lastAmount?: number;
  lastDirection?: string;
  opening: number;
}

export function useDashboardData(userId?: string) {
  return useQuery({
    queryKey: ["dashboard", userId],
    queryFn: async () => {
      // Fire-and-forget background recurring process
      if (userId) processRecurringFn().catch(console.error);

      const [peopleRes, balancesRes, currenciesRes] = await Promise.all([
        supabase.from("people").select("*").eq("is_archived", false).order("created_at", { ascending: false }),
        // استخدام view_person_balances_detailed التي تحافظ على الفصل الكامل للعملات
        supabase.from("view_person_balances_detailed" as any).select("*").eq("user_id", userId),
        supabase.from("currencies").select("*").order("is_base", { ascending: false }),
      ]);
      
      const p = peopleRes.data;
      const dbBalances = balancesRes.data || [];
      const c = currenciesRes.data;

      if (peopleRes.error) console.error("Error fetching people:", peopleRes.error);
      if (balancesRes.error) console.error("Error fetching balances:", balancesRes.error);
      if (currenciesRes.error) console.error("Error fetching currencies:", currenciesRes.error);

      // استدعاء RPC للحصول على الإجماليات (يعتمد على auth.uid() داخل الدالة الآن)
      let rpcTotals: any[] = [];
      if (userId) {
        const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)(
          "rpc_get_dashboard_totals"
        );
        if (!rpcErr && rpcData) {
          rpcTotals = rpcData;
        }
      }

      // بناء Map<person_id, PersonBalance> من العملة الأساسية فقط (للعرض المبسط في القائمة)
      // الحفاظ على أكبر رصيد بالقيمة المطلقة لأغراض الفرز
      const map = new Map<string, PersonBalance>();
      // Map<person_id, PersonCurrencyBalance[]> للعرض متعدد العملات
      const multiMap = new Map<string, PersonCurrencyBalance[]>();

      if (dbBalances && Array.isArray(dbBalances)) {
        for (const row of dbBalances) {
          const pid = row.person_id;
          const entry: PersonCurrencyBalance = {
            currency_id: row.currency_id,
            net: Number(row.net ?? 0),
            totalCredit: Number(row.total_credit ?? 0),
            totalDebit: Number(row.total_debit ?? 0),
            txCount: Number(row.tx_count ?? 0),
            lastDate: row.last_date ? new Date(row.last_date).getTime() : 0,
            lastAmount: row.last_amount ? Number(row.last_amount) : undefined,
            lastDirection: row.last_direction ?? undefined,
            opening: Number(row.opening_net ?? 0),
          };

          // Multi-currency map
          if (!multiMap.has(pid)) multiMap.set(pid, []);
          multiMap.get(pid)!.push(entry);

          // للخريطة البسيطة: نجمع الأرقام عبر العملات (للفرز والعرض المبسط)
          // نجمع بدون تحويل عملة — القيم تُستخدم للفرز فقط
          const existing = map.get(pid);
          if (!existing) {
            map.set(pid, {
              net: entry.net,
              count: entry.txCount,
              lastDate: entry.lastDate,
              lastAmount: entry.lastAmount,
              lastDirection: entry.lastDirection,
              totalCredit: entry.totalCredit,
              totalDebit: entry.totalDebit,
            });
          } else {
            // نجمع القيم لأغراض الفرز فقط
            map.set(pid, {
              net: existing.net + entry.net,
              count: existing.count + entry.txCount,
              lastDate: Math.max(existing.lastDate, entry.lastDate),
              lastAmount: existing.lastAmount,
              lastDirection: existing.lastDirection,
              totalCredit: existing.totalCredit + entry.totalCredit,
              totalDebit: existing.totalDebit + entry.totalDebit,
            });
          }
        }
      }

      return {
        people: (p ?? []) as Person[],
        personBalances: map,
        personCurrencyBalances: multiMap,
        rpcTotals: rpcTotals as any[],
        currencies: (c ?? []) as Currency[],
      };
    },
    enabled: !!userId,
  });
}
