import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  axisTickProps,
  formatMonthLabel,
  formatMonthTick,
  fmtCompact,
  tooltipStyle,
} from "./chart-utils";
import type { ChartPoint } from "./types";

export function MonthlyTab({ chartData }: { chartData: ChartPoint[] }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-lg md:text-xl text-foreground">الاتجاهات الشهرية</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            تحليل خط الاتجاه للإيرادات والمصروفات
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
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tickFormatter={formatMonthTick} {...axisTickProps} />
            <YAxis tickFormatter={fmtCompact} {...axisTickProps} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={formatMonthLabel} />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#10b981"
              fill="url(#incomeGradient)"
              strokeWidth={2}
              name="إيرادات"
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#ef4444"
              fill="url(#expenseGradient)"
              strokeWidth={2}
              name="مصروفات"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
