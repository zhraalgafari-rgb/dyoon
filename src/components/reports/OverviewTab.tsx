import { TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  axisTickProps,
  formatMonthLabel,
  formatMonthTick,
  fmtCompact,
  fmtNum,
  tooltipStyle,
} from "./chart-utils";
import type { ChartPoint, DebtorPoint } from "./types";

interface Props {
  chartData: ChartPoint[];
  topDebtorsData: DebtorPoint[];
}

export function OverviewTab({ chartData, topDebtorsData }: Props) {
  return (
    <div className="space-y-4">
      {/* Bar Chart */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-lg md:text-xl text-foreground">الإيرادات والمصروفات</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              تحليل شهري لآخر {chartData.length} شهر
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-success" />
              <span className="text-xs font-bold text-muted-foreground">إيرادات</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-danger" />
              <span className="text-xs font-bold text-muted-foreground">مصروفات</span>
            </div>
          </div>
        </div>
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={chartData} barGap={4} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tickFormatter={formatMonthTick} {...axisTickProps} />
              <YAxis tickFormatter={fmtCompact} {...axisTickProps} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={formatMonthLabel} />
              <Bar
                dataKey="income"
                name="إيرادات"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="expense"
                name="مصروفات"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Debtors Table */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg md:text-xl text-foreground">أكبر 10 مدينين/دائنين</h3>
          <span className="text-xs text-muted-foreground font-bold tabular-nums">
            {topDebtorsData.length} شخص
          </span>
        </div>
        <div className="space-y-1">
          {topDebtorsData.map((d, i) => (
            <div
              key={d.name}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors animate-slide-up-fade"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div
                className={`size-8 rounded-lg flex items-center justify-center font-black text-sm ${d.isCredit ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground truncate">{d.name}</div>
                <div className="text-xs text-muted-foreground font-medium">
                  {d.isCredit ? "دائن" : "مدين"}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-black text-sm tabular-nums ${d.isCredit ? "text-success" : "text-danger"}`}
                >
                  {d.isCredit ? "" : "-"}
                  {fmtNum(d.value)}
                </span>
                {d.isCredit ? (
                  <TrendingUp className="size-4 text-success" />
                ) : (
                  <TrendingDown className="size-4 text-danger" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
