import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { ChartPoint, DebtorPoint, StatCardData } from "./types";

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
