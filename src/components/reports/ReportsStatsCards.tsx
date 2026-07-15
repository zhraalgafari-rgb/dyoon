import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { fmtNum } from "./chart-utils";
import type { ChartPoint, DebtorPoint, StatCardData } from "./types";

export type { StatCardData };

export function buildStatsCards(
  chartData: ChartPoint[],
  topDebtorsData: DebtorPoint[],
): StatCardData[] {
  return [
    {
      title: "إجمالي المصروفات",
      value: chartData.reduce((s, r) => s + r.expense, 0),
      icon: TrendingDown,
      color: "danger",
      subtitle: `${chartData.length} شهر`,
    },
    {
      title: "إجمالي الإيرادات",
      value: chartData.reduce((s, r) => s + r.income, 0),
      icon: TrendingUp,
      color: "success",
      subtitle: `${chartData.length} شهر`,
    },
    {
      title: "أعلى مدين",
      value: topDebtorsData[0]?.value || 0,
      icon: ArrowUpRight,
      color: "danger",
      subtitle: topDebtorsData[0]?.name || "—",
    },
    {
      title: "أعلى دائن",
      value: topDebtorsData.find((d) => d.isCredit)?.value || 0,
      icon: ArrowDownRight,
      color: "success",
      subtitle: topDebtorsData.find((d) => d.isCredit)?.name || "—",
    },
  ];
}

export function ReportsStatsCards({ cards }: { cards: StatCardData[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        const isPos = card.color === "success";
        return (
          <div
            key={card.title}
            className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-background border-border/50 shadow-sm hover:shadow-elevated transition-all duration-300 animate-slide-up-fade"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div
              className={`h-0.5 w-full bg-gradient-to-r ${isPos ? "from-success to-success/40" : "from-danger to-danger/40"}`}
            />
            <div className="p-3 md:p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">{card.title}</span>
                <div
                  className={`size-8 rounded-lg flex items-center justify-center ${isPos ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}
                >
                  <Icon className="size-4" />
                </div>
              </div>
              <div
                className={`font-black text-lg md:text-xl tabular-nums leading-none ${isPos ? "text-success" : "text-danger"}`}
              >
                {fmtNum(card.value)}
              </div>
              <div className="text-xs text-muted-foreground font-medium truncate">
                {card.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
