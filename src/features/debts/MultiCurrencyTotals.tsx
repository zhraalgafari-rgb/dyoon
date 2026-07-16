import { fmtMoney } from "@/lib/format";
import type { CurrencyLite } from "@/lib/money/balances";
import { BalanceCardV2 } from "@/components/common/BalanceCardV2";

interface Props {
  rpcTotals: any[];
  currencies: CurrencyLite[];
}

/**
 * Global per-currency balance cards. 2-per-row, interactive (tap to expand).
 * Each currency stays strictly separate.
 */
export function MultiCurrencyTotals({ rpcTotals, currencies }: Props) {
  // Map rpcTotals to the rows format
  const rows = (rpcTotals || [])
    .map((rt) => {
      const c = currencies.find((x) => x.id === rt.currency_id);
      if (!c) return null;
      return { currency: c, owed: Number(rt.total_owe || 0), owe: Number(rt.total_owed || 0) };
    })
    .filter(Boolean) as { currency: CurrencyLite; owed: number; owe: number }[];

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-bold text-muted-foreground tracking-wide">
          الأرصدة حسب العملة
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">{rows.length} عملة</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-2">
        {rows.map((r) => (
          <BalanceCardV2
            key={r.currency.id}
            data={{ currency: r.currency, owed: r.owed, owe: r.owe }}
            defaultOpen={r.currency.is_base}
            index={rows.indexOf(r)}
          />
        ))}
      </div>
    </div>
  );
}

export { fmtMoney };
