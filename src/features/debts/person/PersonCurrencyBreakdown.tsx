import { Clock, TrendingUp, TrendingDown } from "lucide-react";
import { fmtMoney, fmtDate } from "@/lib/format";
import type { PersonCurrencyBalance, Currency } from "@/hooks/useDashboardData";

interface Props {
  currencyBalances: PersonCurrencyBalance[];
  currencies: Currency[];
}

/**
 * Per-currency breakdown grid (credit / debit / last payment) rendered at the
 * bottom of a PersonRowV2 card.
 */
export function PersonCurrencyBreakdown({ currencyBalances, currencies }: Props) {
  if (currencyBalances.length === 0) return null;

  return (
    <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-border/40 space-y-2">
      {currencyBalances.map((b) => {
        const curr = currencies.find((c) => c.id === b.currency_id);
        const sym = curr?.symbol ?? "";
        const isPos = b.net >= 0;
        return (
          <div
            key={b.currency_id}
            className="grid grid-cols-3 gap-2 bg-gradient-to-br from-background/80 to-background/40 rounded-lg p-2 md:p-2.5 border border-border/30 transition-all hover:border-border/60"
          >
            <div className="col-span-3 text-[10px] md:text-[11px] font-black text-foreground/70 mb-0.5 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isPos ? "bg-success" : "bg-danger"}`} />
              {curr?.name ?? sym}
            </div>

            <div className="flex flex-col bg-success/5 p-1.5 md:p-2 rounded-lg border border-success/10">
              <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-1">
                <TrendingUp className="size-3 text-success" />
                له
              </span>
              <span className="tabular-nums font-black text-[11px] md:text-[13px] text-success">
                {fmtMoney(b.totalCredit)} <span className="opacity-50 text-[9px]">{sym}</span>
              </span>
            </div>

            <div className="flex flex-col bg-danger/5 p-1.5 md:p-2 rounded-lg border border-danger/10">
              <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-1">
                <TrendingDown className="size-3 text-danger" />
                عليه
              </span>
              <span className="tabular-nums font-black text-[11px] md:text-[13px] text-danger">
                {fmtMoney(b.totalDebit)} <span className="opacity-50 text-[9px]">{sym}</span>
              </span>
            </div>

            <div className="flex flex-col items-end bg-secondary/30 p-1.5 md:p-2 rounded-lg border border-border/30">
              <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-1">
                <Clock className="size-3" />
                آخر دفعة
              </span>
              <span className="tabular-nums font-bold text-[11px] md:text-[13px] text-foreground/80 truncate">
                {b.lastDate ? fmtDate(new Date(b.lastDate).toISOString()) : "—"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
