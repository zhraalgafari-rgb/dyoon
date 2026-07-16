import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fmtMoney } from "@/lib/format";
import type { CurrencyLite } from "@/lib/money/balances";

interface Props {
  rpcTotals: any[];
  currencies: CurrencyLite[];
  peopleCount: number;
  filter: "all" | "credit" | "debit";
  onFilterChange: (f: "all" | "credit" | "debit") => void;
}

export function DebtsHeader({ rpcTotals, currencies, peopleCount, filter, onFilterChange }: Props) {
  // بناء بيانات البطاقات لكل عملة لها رصيد
  const rows = (rpcTotals || [])
    .map((rt) => {
      const c = currencies.find((x) => x.id === rt.currency_id);
      if (!c) return null;
      return { currency: c, owed: Number(rt.total_owed || 0), owe: Number(rt.total_owe || 0) };
    })
    .filter(Boolean) as { currency: CurrencyLite; owed: number; owe: number }[];

  if (rows.length === 0) {
    return (
      <div className="bg-gradient-primary text-primary-foreground rounded-xl p-2.5 md:p-4 shadow-elevated">
        <div className="text-center text-[11px] py-4">لا توجد أرصدة</div>
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-1.5 md:gap-2 -mx-2 md:-mx-0 px-2 md:px-0 pb-1.5 md:pb-2">
      {rows.map((row) => {
        const net = row.owed - row.owe;
        return (
          <div key={row.currency.id} className="min-w-[47vw] sm:min-w-[155px] md:min-w-[180px] lg:min-w-0 md:flex-1 snap-center bg-gradient-primary text-primary-foreground rounded-2xl p-2 md:p-3 shadow-elevated shrink-0 transition-transform duration-300 hover:scale-[1.01]">
            <div className="flex items-center justify-between text-[11px] md:text-xs opacity-85 mb-1.5 md:mb-2 font-medium">
              <span>إجمالي الأرصدة ({row.currency.name})</span>
              <Link to="/app/insights" className="flex items-center gap-1 bg-white/15 backdrop-blur px-1.5 py-0.5 md:px-2 md:py-1 rounded-full hover:bg-white/25 transition-colors text-[9px] md:text-[11px] font-bold shadow-sm border border-white/10">
                <Sparkles className="size-2.5 md:size-3" /> ذكاء
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-1.5 md:gap-2">
              <button
                onClick={() => onFilterChange(filter === "debit" ? "all" : "debit")}
                className={`bg-white/10 backdrop-blur rounded-xl p-1.5 md:p-2.5 text-right hover:bg-white/15 transition-all active:scale-[0.98] border border-white/5 shadow-inner ${filter === "debit" ? "ring-2 ring-white/60 bg-white/20" : ""}`}
              >
                <div className="flex items-center gap-1 text-[9px] md:text-[11px] opacity-90 mb-0.5 md:mb-1 font-semibold"><TrendingUp className="size-3 md:size-3.5" /> لك</div>
                <div className="font-black text-sm md:text-xl tabular-nums leading-tight tracking-tight">{fmtMoney(row.owe)}</div>
                <div className="text-[8px] md:text-[11px] opacity-75 mt-0.5 md:mt-1 font-medium">{row.currency.symbol}</div>
              </button>
              <button
                onClick={() => onFilterChange(filter === "credit" ? "all" : "credit")}
                className={`bg-white/10 backdrop-blur rounded-xl p-1.5 md:p-2.5 text-right hover:bg-white/15 transition-all active:scale-[0.98] border border-white/5 shadow-inner ${filter === "credit" ? "ring-2 ring-white/60 bg-white/20" : ""}`}
              >
                <div className="flex items-center gap-1 text-[9px] md:text-[11px] opacity-90 mb-0.5 md:mb-1 font-semibold"><TrendingDown className="size-3 md:size-3.5" /> عليك</div>
                <div className="font-black text-sm md:text-xl tabular-nums leading-tight tracking-tight">{fmtMoney(row.owed)}</div>
                <div className="text-[8px] md:text-[11px] opacity-75 mt-0.5 md:mt-1 font-medium">{row.currency.symbol}</div>
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 md:mt-2 text-[9px] md:text-[11px] opacity-90 px-1 font-medium bg-black/10 p-1 md:p-1.5 rounded-lg backdrop-blur-sm">
              <span>الصافي: <span className={`tabular-nums font-bold ${net < 0 ? "text-emerald-300" : net > 0 ? "text-rose-300" : ""}`}>{fmtMoney(-net)}</span></span>
              <span className="opacity-80">{peopleCount} شخص</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

