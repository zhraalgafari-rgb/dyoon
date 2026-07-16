import { PieChart as RechartsPie, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CHART_COLORS, fmtNum, tooltipStyle } from "./chart-utils";

export interface CurrencyDatum {
  name: string;
  owed: number;
  owe: number;
  color: string;
}

export function DistributionTab({ currencyData }: { currencyData: CurrencyDatum[] }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-border/50 bg-card p-4 md:p-6 shadow-sm">
        <h3 className="font-black text-lg md:text-xl text-foreground mb-4">
          توزيع الأرصدة حسب العملة
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <RechartsPie>
              <Pie
                data={currencyData.map((d) => ({ name: d.name, value: d.owed + d.owe }))}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {currencyData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                formatter={(value: string) => (
                  <span className="text-sm font-bold text-foreground">{value}</span>
                )}
              />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4 md:p-6 shadow-sm">
        <h3 className="font-black text-lg md:text-xl text-foreground mb-4">تفاصيل العملات</h3>
        <div className="space-y-3">
          {currencyData.map((c, i) => (
            <div key={c.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-sm font-bold text-foreground">{c.name}</span>
                </div>
                <span className="text-sm font-black tabular-nums text-foreground/80">
                  {fmtNum(c.owed + c.owe)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-success font-bold">له: {fmtNum(c.owed)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-danger font-bold">عليه: {fmtNum(c.owe)}</span>
              </div>
              <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 right-0 bg-success/60 rounded-full"
                  style={{ width: `${(c.owed / (c.owed + c.owe + 1)) * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-danger/60 rounded-full"
                  style={{ width: `${(c.owe / (c.owed + c.owe + 1)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
