import { useMemo, useState } from "react";
import {
    BarChart3,
    Download,
    FileText,
    TrendingUp,
    TrendingDown,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    LineChart,
    DownloadCloud,
    Printer,
    Share2,
    Maximize2,
} from "lucide-react";
import { fmtMoney, fmtDate, monthRange } from "@/lib/format";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart as RechartsLine,
    Line,
    PieChart as RechartsPie,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area,
} from "recharts";
import { Button } from "@/components/ui/button";
import { tokens } from "@/lib/design-tokens";

interface Props {
    monthlyData: any[];
    topDebtors: any[];
    totalsByCurrency: any[];
    currencies: any[];
    people: any[];
    categories: any[];
}

const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

/**
 * ReportsDashboard - لوحة تقارير احترافية مع مخططات متعددة
 */
export function ReportsDashboard({
    monthlyData = [],
    topDebtors = [],
    totalsByCurrency = [],
    currencies = [],
    people = [],
    categories = [],
}: Props) {
    const [activeTab, setActiveTab] = useState<"overview" | "monthly" | "distribution">("overview");
    const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>("");

    // Initialize selected currency
    useMemo(() => {
        if (!selectedCurrencyId && currencies.length > 0) {
            setSelectedCurrencyId(currencies[0].id);
        }
    }, [currencies, selectedCurrencyId]);

    // Format monthly data for charts (filtered by selected currency)
    const chartData = useMemo(() => {
        const grouped: Record<string, any> = {};
        monthlyData
            .filter(r => r.currency_id === selectedCurrencyId)
            .forEach((r: any) => {
                const month = r.expense_month?.slice(0, 7) || "unknown";
                if (!grouped[month]) grouped[month] = { month, income: 0, expense: 0 };
                if (r.total > 0) grouped[month].income += Number(r.total);
                else grouped[month].expense += Math.abs(Number(r.total));
            });
        return Object.values(grouped).sort((a: any, b: any) => a.month.localeCompare(b.month));
    }, [monthlyData, selectedCurrencyId]);

    // Format top debtors (filtered by selected currency)
    const topDebtorsData = useMemo(() => {
        return (topDebtors || [])
            .filter(r => r.currency_id === selectedCurrencyId)
            .map((r: any) => {
                const person = people.find((p: any) => p.id === r.person_id);
                return {
                    name: person?.name || "غير معروف",
                    value: Math.abs(Number(r.net || 0)),
                    isCredit: Number(r.net || 0) >= 0,
                };
            })
            .sort((a: any, b: any) => b.value - a.value)
            .slice(0, 10);
    }, [topDebtors, people, selectedCurrencyId]);

    // Currency distribution (overall, not filtered by selected currency)
    const currencyData = useMemo(() => {
        return (totalsByCurrency || [])
            .map((r: any, i: number) => {
                const curr = currencies.find((c: any) => c.id === r.currency_id);
                return {
                    name: curr?.symbol || curr?.name || "unknown",
                    owed: Number(r.total_owed || 0),
                    owe: Number(r.total_owe || 0),
                    color: COLORS[i % COLORS.length],
                };
            })
            .filter((r: any) => r.owed > 0 || r.owe > 0);
    }, [totalsByCurrency, currencies]);

    // Stats cards
    const statsCards = [
        {
            title: "إجمالي المصروفات",
            value: chartData.reduce((s: number, r: any) => s + r.expense, 0),
            icon: TrendingDown,
            color: "danger" as const,
            subtitle: `${chartData.length} شهر`,
        },
        {
            title: "إجمالي الإيرادات",
            value: chartData.reduce((s: number, r: any) => s + r.income, 0),
            icon: TrendingUp,
            color: "success" as const,
            subtitle: `${chartData.length} شهر`,
        },
        {
            title: "أعلى مدين",
            value: topDebtorsData[0]?.value || 0,
            icon: ArrowUpRight,
            color: "danger" as const,
            subtitle: topDebtorsData[0]?.name || "—",
        },
        {
            title: "أعلى دائن",
            value: topDebtorsData.find((d: any) => d.isCredit)?.value || 0,
            icon: ArrowDownRight,
            color: "success" as const,
            subtitle: topDebtorsData.find((d: any) => d.isCredit)?.name || "—",
        },
    ];

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
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                {statsCards.map((card, i) => {
                    const Icon = card.icon;
                    const isPos = card.color === "success";
                    const isNeg = card.color === "danger";
                    return (
                        <div
                            key={card.title}
                            className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-background border-border/50 shadow-sm hover:shadow-elevated transition-all duration-300 animate-slide-up-fade"
                            style={{ animationDelay: `${i * 80}ms` }}
                        >
                            <div className={`h-0.5 w-full bg-gradient-to-r ${isPos ? "from-success to-success/40" : "from-danger to-danger/40"}`} />
                            <div className="p-3 md:p-4 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-muted-foreground">{card.title}</span>
                                    <div className={`size-8 rounded-lg flex items-center justify-center ${isPos ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                                        <Icon className="size-4" />
                                    </div>
                                </div>
                                <div className={`font-black text-lg md:text-xl tabular-nums leading-none ${isPos ? "text-success" : "text-danger"}`}>
                                    {new Intl.NumberFormat("en-US").format(card.value)}
                                </div>
                                <div className="text-xs text-muted-foreground font-medium truncate">
                                    {card.subtitle}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-border/50 pb-1">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`px-3 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab === "overview"
                        ? "text-primary border-b-2 border-primary bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        }`}
                >
                    <BarChart3 className="size-4 inline me-1.5" />
                    نظرة عامة
                </button>
                <button
                    onClick={() => setActiveTab("monthly")}
                    className={`px-3 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab === "monthly"
                        ? "text-primary border-b-2 border-primary bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        }`}
                >
                    <LineChart className="size-4 inline me-1.5" />
                    تحليلات شهرية
                </button>
                <button
                    onClick={() => setActiveTab("distribution")}
                    className={`px-3 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab === "distribution"
                        ? "text-primary border-b-2 border-primary bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        }`}
                >
                    <PieChart className="size-4 inline me-1.5" />
                    توزيع العملات
                </button>

                <div className="flex-1" />

                {currencies.length > 0 && (
                    <select
                        value={selectedCurrencyId}
                        onChange={(e) => setSelectedCurrencyId(e.target.value)}
                        className="bg-transparent text-xs font-bold text-primary border-none outline-none cursor-pointer ms-2 focus:ring-0"
                    >
                        {currencies.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                )}

                <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors" title="تصدير">
                    <DownloadCloud className="size-4" />
                </button>
                <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors" title="طباعة">
                    <Printer className="size-4" />
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
                <div className="space-y-4">
                    {/* Bar Chart */}
                    <div className="rounded-2xl border border-border/50 bg-card p-4 md:p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-black text-lg md:text-xl text-foreground">
                                    الإيرادات والمصروفات
                                </h3>
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
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                        tickFormatter={(v) => {
                                            const [y, m] = v.split("-");
                                            return `${m}/${y.slice(2)}`;
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => new Intl.NumberFormat("en-US", { notation: "compact" }).format(v)}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: "var(--card)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "12px",
                                            boxShadow: "0 10px 30px -12px rgba(0,0,0,0.18)",
                                        }}
                                        labelFormatter={(v) => {
                                            const [y, m] = v.split("-");
                                            const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
                                            return `${months[parseInt(m) - 1]} ${y}`;
                                        }}
                                    />
                                    <Bar dataKey="income" name="إيرادات" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="expense" name="مصروفات" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Debtors Table */}
                    <div className="rounded-2xl border border-border/50 bg-card p-4 md:p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-lg md:text-xl text-foreground">
                                أكبر 10 مدينين/دائنين
                            </h3>
                            <span className="text-xs text-muted-foreground font-bold tabular-nums">
                                {topDebtorsData.length} شخص
                            </span>
                        </div>
                        <div className="space-y-1">
                            {topDebtorsData.map((d: any, i: number) => (
                                <div
                                    key={d.name}
                                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors animate-slide-up-fade"
                                    style={{ animationDelay: `${i * 40}ms` }}
                                >
                                    <div className={`size-8 rounded-lg flex items-center justify-center font-black text-sm ${d.isCredit ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                                        }`}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-foreground truncate">{d.name}</div>
                                        <div className="text-xs text-muted-foreground font-medium">
                                            {d.isCredit ? "دائن" : "مدين"}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`font-black text-sm tabular-nums ${d.isCredit ? "text-success" : "text-danger"}`}>
                                            {d.isCredit ? "" : "-"}{new Intl.NumberFormat("en-US").format(d.value)}
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
            )}

            {activeTab === "monthly" && chartData.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-card p-4 md:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-black text-lg md:text-xl text-foreground">
                                الاتجاهات الشهرية
                            </h3>
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
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                    tickFormatter={(v) => {
                                        const [y, m] = v.split("-");
                                        return `${m}/${y.slice(2)}`;
                                    }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => new Intl.NumberFormat("en-US", { notation: "compact" }).format(v)}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--card)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "12px",
                                    }}
                                    labelFormatter={(v) => {
                                        const [y, m] = v.split("-");
                                        const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
                                        return `${months[parseInt(m) - 1]} ${y}`;
                                    }}
                                />
                                <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#incomeGradient)" strokeWidth={2} name="إيرادات" />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#expenseGradient)" strokeWidth={2} name="مصروفات" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {activeTab === "distribution" && currencyData.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-border/50 bg-card p-4 md:p-6 shadow-sm">
                        <h3 className="font-black text-lg md:text-xl text-foreground mb-4">
                            توزيع الأرصدة حسب العملة
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                <RechartsPie>
                                    <Pie
                                        data={currencyData.map((d: any) => ({ name: d.name, value: d.owed + d.owe }))}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {currencyData.map((_: any, i: number) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: "var(--card)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "12px",
                                        }}
                                    />
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
                        <h3 className="font-black text-lg md:text-xl text-foreground mb-4">
                            تفاصيل العملات
                        </h3>
                        <div className="space-y-3">
                            {currencyData.map((c: any, i: number) => (
                                <div key={c.name} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="text-sm font-bold text-foreground">{c.name}</span>
                                        </div>
                                        <span className="text-sm font-black tabular-nums text-foreground/80">
                                            {new Intl.NumberFormat("en-US").format(c.owed + c.owe)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs">
                                        <span className="text-success font-bold">
                                            له: {new Intl.NumberFormat("en-US").format(c.owed)}
                                        </span>
                                        <span className="text-muted-foreground">·</span>
                                        <span className="text-danger font-bold">
                                            عليه: {new Intl.NumberFormat("en-US").format(c.owe)}
                                        </span>
                                    </div>
                                    <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className="absolute inset-y-0 right-0 bg-success/60 rounded-full" style={{ width: `${(c.owed / (c.owed + c.owe + 1)) * 100}%` }} />
                                        <div className="absolute inset-y-0 left-0 bg-danger/60 rounded-full" style={{ width: `${(c.owe / (c.owed + c.owe + 1)) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReportsDashboard;