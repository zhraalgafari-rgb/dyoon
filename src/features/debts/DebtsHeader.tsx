import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fmtMoney } from "@/lib/format";

interface Props {
  owed: number;        // money owed TO user
  owe: number;         // money user OWES
  baseName: string;
  peopleCount: number;
  txCount: number;
  filter: "all" | "credit" | "debit";
  onFilterChange: (f: "all" | "credit" | "debit") => void;
}

export function DebtsHeader({ owed, owe, baseName, peopleCount, txCount, filter, onFilterChange }: Props) {
  const net = owed - owe;
  return (
    <div className="bg-gradient-primary text-primary-foreground rounded-xl p-2.5 md:p-4 shadow-elevated">
      <div className="flex items-center justify-between text-[10px] md:text-[11px] opacity-85 mb-1 md:mb-1.5">
        <span>إجمالي الأرصدة ({baseName})</span>
        <Link to="/app/insights" className="flex items-center gap-1 bg-white/15 backdrop-blur px-1.5 py-0.5 rounded-full hover:bg-white/25 transition-colors text-[9px] md:text-[10px]">
          <Sparkles className="size-2.5 md:size-3" /> ذكاء
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-1.5 md:gap-3">
        <button
          onClick={() => onFilterChange(filter === "credit" ? "all" : "credit")}
          className={`bg-white/10 backdrop-blur rounded-lg p-1.5 md:p-3 text-right hover:bg-white/15 transition-all active:scale-[0.98] ${filter === "credit" ? "ring-2 ring-white/50" : ""}`}
        >
          <div className="flex items-center gap-1 text-[9px] md:text-[11px] opacity-90 mb-0.5"><TrendingUp className="size-2.5 md:size-3.5" /> لك</div>
          <div className="font-black text-[14px] md:text-[22px] tabular-nums leading-tight">{fmtMoney(owed)}</div>
          <div className="text-[8px] md:text-[10px] opacity-70 mt-0.5">{baseName}</div>
        </button>
        <button
          onClick={() => onFilterChange(filter === "debit" ? "all" : "debit")}
          className={`bg-white/10 backdrop-blur rounded-lg p-1.5 md:p-3 text-right hover:bg-white/15 transition-all active:scale-[0.98] ${filter === "debit" ? "ring-2 ring-white/50" : ""}`}
        >
          <div className="flex items-center gap-1 text-[9px] md:text-[11px] opacity-90 mb-0.5"><TrendingDown className="size-2.5 md:size-3.5" /> عليك</div>
          <div className="font-black text-[14px] md:text-[22px] tabular-nums leading-tight">{fmtMoney(owe)}</div>
          <div className="text-[8px] md:text-[10px] opacity-70 mt-0.5">{baseName}</div>
        </button>
      </div>
      <div className="flex items-center justify-between mt-1 md:mt-2 text-[9px] md:text-[11px] opacity-85 px-0.5">
        <span>الصافي: <span className={`tabular-nums font-semibold`}>{fmtMoney(net)}</span></span>
        <span>{peopleCount} شخص</span>
      </div>
    </div>
  );
}

