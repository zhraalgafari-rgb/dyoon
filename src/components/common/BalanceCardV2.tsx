import { useState } from "react";
import { ChevronDown, TrendingUp, TrendingDown, Info } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import type { CurrencyLite } from "@/lib/money/balances";
import { tokens } from "@/lib/design-tokens";

export interface BalanceData {
    currency: CurrencyLite;
    owed: number;   // له (المبالغ المستحقة له)
    owe: number;    // عليه (المبالغ المستحقة عليه)
}

interface Props {
    data: BalanceData;
    defaultOpen?: boolean;
    index?: number;
}

/**
 * BalanceCardV2 - بطاقة رصيد احترافية مع رسوم بيانية صغيرة وتحليلات
 * تعرض الرصيد الكلي مع توزيع "له" و "عليه" ونسبة مئوية مرئية
 */
export function BalanceCardV2({ data, defaultOpen = false, index = 0 }: Props) {
    const [open, setOpen] = useState(defaultOpen);
    const { currency, owed, owe } = data;
    const net = owed - owe;
    const total = owed + owe;
    const owedPct = total > 0 ? (owed / total) * 100 : 0;
    const owePct = total > 0 ? (owe / total) * 100 : 0;
    const isPositive = net >= 0;

    return (
        <div
            className="group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-background border-border/60 shadow-sm hover:shadow-elevated transition-all duration-300 animate-slide-up-fade"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Status bar at top */}
            <div
                className={`h-1 w-full ${isPositive ? 'bg-gradient-to-r from-success to-success/60' : 'bg-gradient-to-r from-danger to-danger/60'}`}
            />

            <div className="p-4 md:p-4 space-y-3">
                {/* Header */}
                <button
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-center justify-between group cursor-pointer"
                    aria-expanded={open}
                    aria-label={`${currency.name} - ${net >= 0 ? 'له' : 'عليه'} ${fmtMoney(Math.abs(net))}`}
                >
                    <div className="flex items-center gap-2">
                        <div className={`size-8 rounded-xl flex items-center justify-center font-black text-sm shadow-sm transition-transform group-hover:scale-110 ${isPositive
                            ? 'bg-success text-success-foreground'
                            : 'bg-danger text-danger-foreground'
                            }`}>
                            {currency.symbol}
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-sm md:text-base text-foreground leading-tight">
                                {currency.name}
                            </div>
                            <div className="text-xs text-muted-foreground font-medium">
                                {isPositive ? 'صافي له' : 'صافي عليه'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="text-right">
                            <div className={`font-black text-[16px] md:text-[18px] tabular-nums leading-none tracking-tight ${isPositive ? 'text-success' : 'text-danger'
                                }`}>
                                {isPositive ? '' : '-'}{fmtMoney(Math.abs(net))}
                            </div>
                        </div>
                        <ChevronDown
                            className={`size-4 text-muted-foreground transition-transform duration-300 ${open ? 'rotate-180' : ''
                                }`}
                        />
                    </div>
                </button>

                {/* Progress Bar */}
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div
                        className="absolute inset-y-0 right-0 bg-success/70 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${owedPct}%` }}
                    />
                    <div
                        className="absolute inset-y-0 left-0 bg-danger/70 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${owePct}%` }}
                    />
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col p-2 md:p-2.5 rounded-xl bg-success/5 border border-success/10">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                            <TrendingUp className="size-3.5 text-success/70" />
                            له
                        </div>
                        <div className="tabular-nums font-black text-sm md:text-base text-success">
                            {fmtMoney(owed)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                            {owedPct.toFixed(0)}% من الإجمالي
                        </div>
                    </div>

                    <div className="flex flex-col p-2 md:p-2.5 rounded-xl bg-danger/5 border border-danger/10">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                            <TrendingDown className="size-3.5 text-danger/70" />
                            عليه
                        </div>
                        <div className="tabular-nums font-black text-sm md:text-base text-danger">
                            {fmtMoney(owe)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                            {owePct.toFixed(0)}% من الإجمالي
                        </div>
                    </div>
                </div>

                {/* Expanded Details */}
                <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
                        }`}
                >
                    <div className="pt-3 border-t border-border/50 space-y-2">
                        <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="text-muted-foreground font-medium">الإجمالي</span>
                            <span className="font-bold tabular-nums">{fmtMoney(total)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="text-muted-foreground font-medium">صافي الرصيد</span>
                            <span className={`font-black tabular-nums ${isPositive ? 'text-success' : 'text-danger'}`}>
                                {isPositive ? '' : '-'}{fmtMoney(Math.abs(net))}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="text-muted-foreground font-medium">نسبة الربح/الخسارة</span>
                            <span className="font-bold tabular-nums">
                                {total > 0 ? ((net / total) * 100).toFixed(1) : '0.0'}%
                            </span>
                        </div>

                        {/* Active indicator */}
                        {currency.is_base && (
                            <div className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/15 text-xs font-bold text-primary">
                                <Info className="size-3.5" />
                                العملة الأساسية
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BalanceCardV2;