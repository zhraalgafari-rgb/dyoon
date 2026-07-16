import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { ReportsStatsCards, buildStatsCards } from "./ReportsStatsCards";
import { ReportsTabNav, type ReportsTab } from "./ReportsTabNav";
import { OverviewTab } from "./OverviewTab";
import { MonthlyTab } from "./MonthlyTab";
import { DistributionTab, type CurrencyDatum } from "./DistributionTab";
import { CHART_COLORS } from "./chart-utils";
import type {
  ChartPoint,
  DebtorPoint,
  MonthlyDataRow,
  ReportCurrency,
  ReportPerson,
  TopDebtorRow,
  TotalsByCurrencyRow,
} from "./types";

interface Props {
  monthlyData: MonthlyDataRow[];
  topDebtors: TopDebtorRow[];
  totalsByCurrency: TotalsByCurrencyRow[];
  currencies: ReportCurrency[];
  people: ReportPerson[];
  categories: unknown[];
}

/**
 * ReportsDashboard - لوحة تقارير احترافية مع مخططات متعددة.
 * Composition of: stats cards, tab navigation, and per-tab chart panels.
 */
export function ReportsDashboard({
  monthlyData = [],
  topDebtors = [],
  totalsByCurrency = [],
  currencies = [],
  people = [],
  categories = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<ReportsTab>("overview");
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>("");

  useEffect(() => {
    if (!selectedCurrencyId && currencies.length > 0) {
      setSelectedCurrencyId(currencies[0].id);
    }
  }, [currencies, selectedCurrencyId]);

  const chartData: ChartPoint[] = useMemo(() => {
    const grouped: Record<string, ChartPoint> = {};
    monthlyData
      .filter((r) => r.currency_id === selectedCurrencyId)
      .forEach((r) => {
        const month = r.expense_month?.slice(0, 7) || "unknown";
        if (!grouped[month]) grouped[month] = { month, income: 0, expense: 0 };
        if (r.total > 0) grouped[month].income += Number(r.total);
        else grouped[month].expense += Math.abs(Number(r.total));
      });
    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  }, [monthlyData, selectedCurrencyId]);

  const topDebtorsData: DebtorPoint[] = useMemo(() => {
    return (topDebtors || [])
      .filter((r) => r.currency_id === selectedCurrencyId)
      .map((r) => {
        const person = people.find((p) => p.id === r.person_id);
        return {
          name: person?.name || "غير معروف",
          value: Math.abs(Number(r.net || 0)),
          isCredit: Number(r.net || 0) >= 0,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [topDebtors, people, selectedCurrencyId]);

  const currencyData: CurrencyDatum[] = useMemo(() => {
    return (totalsByCurrency || [])
      .map((r, i) => {
        const curr = currencies.find((c) => c.id === r.currency_id);
        return {
          name: curr?.symbol || curr?.name || "unknown",
          owed: Number(r.total_owed || 0),
          owe: Number(r.total_owe || 0),
          color: CHART_COLORS[i % CHART_COLORS.length],
        };
      })
      .filter((r) => r.owed > 0 || r.owe > 0);
  }, [totalsByCurrency, currencies]);

  const statsCards = useMemo(
    () => buildStatsCards(chartData, topDebtorsData),
    [chartData, topDebtorsData],
  );

  if (monthlyData.length === 0 && topDebtors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-16 md:size-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
          <BarChart3 className="size-8 md:size-10 text-primary/60" />
        </div>
        <h3 className="font-black text-lg text-foreground mb-1">لا توجد تقارير بعد</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          ابدأ بإضافة معاملات لترى تحليلات مفصلة لأرصدتك ومصروفاتك
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <ReportsStatsCards cards={statsCards} />

      <ReportsTabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currencies={currencies}
        selectedCurrencyId={selectedCurrencyId}
        onCurrencyChange={setSelectedCurrencyId}
      />

      {activeTab === "overview" && (
        <OverviewTab chartData={chartData} topDebtorsData={topDebtorsData} />
      )}

      {activeTab === "monthly" && chartData.length > 0 && <MonthlyTab chartData={chartData} />}

      {activeTab === "distribution" && currencyData.length > 0 && (
        <DistributionTab currencyData={currencyData} />
      )}
    </div>
  );
}

export default ReportsDashboard;
