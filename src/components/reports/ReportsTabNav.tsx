import { BarChart3, LineChart, PieChart, DownloadCloud, Printer } from "lucide-react";
import type { ComponentType } from "react";
import type { ReportCurrency } from "./types";

export type ReportsTab = "overview" | "monthly" | "distribution";

interface Props {
  activeTab: ReportsTab;
  onTabChange: (tab: ReportsTab) => void;
  currencies: ReportCurrency[];
  selectedCurrencyId: string;
  onCurrencyChange: (id: string) => void;
}

export function ReportsTabNav({
  activeTab,
  onTabChange,
  currencies,
  selectedCurrencyId,
  onCurrencyChange,
}: Props) {
  const tabBtn = (tab: ReportsTab, icon: ComponentType<{ className?: string }>, label: string) => {
    const Icon = icon;
    return (
      <button
        onClick={() => onTabChange(tab)}
        className={`px-3 py-2 text-sm font-bold rounded-t-lg transition-colors ${
          activeTab === tab
            ? "text-primary border-b-2 border-primary bg-primary/5"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        }`}
      >
        <Icon className="size-4 inline me-1.5" />
        {label}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-2 border-b border-border/50 pb-1">
      {tabBtn("overview", BarChart3, "نظرة عامة")}
      {tabBtn("monthly", LineChart, "تحليلات شهرية")}
      {tabBtn("distribution", PieChart, "توزيع العملات")}

      <div className="flex-1" />

      {currencies.length > 0 && (
        <select
          value={selectedCurrencyId}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="bg-transparent text-xs font-bold text-primary border-none outline-none cursor-pointer ms-2 focus:ring-0"
        >
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      <button
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        title="تصدير"
      >
        <DownloadCloud className="size-4" />
      </button>
      <button
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        title="طباعة"
      >
        <Printer className="size-4" />
      </button>
    </div>
  );
}
