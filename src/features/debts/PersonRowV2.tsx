import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
    Phone,
    Clock,
    TrendingUp,
    TrendingDown,
    MoreVertical,
    BarChart3,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle2,
    AlertCircle,
    User,
    Pencil,
    Archive,
    Trash2,
} from "lucide-react";
import { fmtMoney, fmtDate } from "@/lib/format";
import { RowActions } from "@/components/common/RowActions";
import type { PersonCurrencyBalance, Currency } from "@/hooks/useDashboardData";

interface Person {
    id: string;
    name: string;
    type: string;
    phone?: string | null;
    avatar_color?: string | null;
    notes?: string | null;
    credit_limit?: number | null;
}

export interface PersonBalance {
    net: number;
    count: number;
    lastDate: number;
    lastAmount?: number;
    lastDirection?: string;
    totalCredit?: number;
    totalDebit?: number;
}

interface Props {
    person: Person;
    balance: PersonBalance;
    currencyBalances?: PersonCurrencyBalance[];
    currencies?: Currency[];
    index?: number;
    onEdit?: (p: Person) => void;
    onArchive?: (p: Person) => void;
    onDelete?: (p: Person) => void;
}

/**
 * PersonRowV2 - بطاقة شخص محسّنة بشكل احترافي
 * مع Quick Actions, Status Timeline, وتحليلات بصرية
 */
export const PersonRowV2 = React.memo(function PersonRowV2({
    person,
    balance,
    currencyBalances = [],
    currencies = [],
    index = 0,
    onEdit,
    onArchive,
    onDelete,
}: Props) {
    const [showActions, setShowActions] = useState(false);

    // العملة الأساسية
    const baseCurr = currencies.find((c) => c.is_base);
    const baseBalance = baseCurr
        ? currencyBalances.find((b) => b.currency_id === baseCurr.id)
        : currencyBalances[0];

    const displayNet = baseBalance?.net ?? balance.net;
    const isCredit = displayNet >= 0;
    const settled =
        currencyBalances.every((b) => Math.abs(b.net) < 0.001) ||
        (currencyBalances.length === 0 && Math.abs(balance.net) < 0.001);

    const hasMultiCurrency = currencyBalances.length > 1;
    const hasActions = !!(onEdit || onArchive || onDelete);
    const lastDate = balance.lastDate;

    // Generated avatar color based on name
    const avatarColors = [
        "from-blue-500 to-blue-600",
        "from-emerald-500 to-emerald-600",
        "from-purple-500 to-purple-600",
        "from-amber-500 to-amber-600",
        "from-rose-500 to-rose-600",
        "from-cyan-500 to-cyan-600",
    ];
    const avatarColorIndex = person.name.length % avatarColors.length;
    const avatarGradient = person.avatar_color || avatarColors[avatarColorIndex];

    const getStatusIcon = () => {
        if (settled) return <CheckCircle2 className="size-3 text-success" />;
        if (balance.count === 0) return <User className="size-3 text-muted-foreground" />;
        return <AlertCircle className="size-3 text-warning" />;
    };

    const getStatusLabel = () => {
        if (settled) return "مسوّى";
        if (balance.count === 0) return "جديد";
        return "نشط";
    };

    return (
        <Link
            to="/app/person/$id"
            params={{ id: person.id }}
            className={`block relative overflow-hidden rounded-xl md:rounded-2xl border shadow-sm hover:shadow-elevated transition-all duration-300 p-0 group animate-slide-up-fade ${settled
                    ? "border-border/50"
                    : isCredit
                        ? "border-success/20"
                        : "border-danger/20"
                }`}
            style={{ animationDelay: `${index * 60}ms` }}
        >
            {/* Gradient status bar */}
            <div
                className={`h-1 w-full ${settled
                        ? "bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/10"
                        : isCredit
                            ? "bg-gradient-to-r from-success to-success/40"
                            : "bg-gradient-to-r from-danger to-danger/40"
                    }`}
            />

            <div className="p-3 md:p-4">
                {/* Main Row */}
                <div className="flex items-start gap-3 md:gap-4">
                    {/* Avatar */}
                    <div
                        className={`relative size-11 md:size-13 rounded-xl md:rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center font-black text-white text-[15px] md:text-[19px] shadow-sm shrink-0 transition-transform group-hover:scale-105 duration-300`}
                    >
                        {person.name.trim().charAt(0)}
                        {/* Active indicator dot */}
                        {!settled && (
                            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success border-2 border-card animate-pulse-ring" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-[14px] md:text-[16px] text-foreground truncate group-hover:text-primary transition-colors">
                                {person.name}
                            </h3>
                            {person.notes && (
                                <span className="text-[9px] text-muted-foreground hidden md:inline">
                                    • {person.notes}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5 text-[10px] md:text-[11px] text-muted-foreground">
                            {person.phone ? (
                                <span
                                    className="inline-flex items-center gap-1 bg-secondary/60 px-1.5 py-0.5 rounded-md font-medium"
                                    dir="ltr"
                                >
                                    <Phone className="size-3 opacity-70" />
                                    {person.phone}
                                </span>
                            ) : null}

                            <span className="inline-flex items-center gap-1 bg-secondary/60 px-1.5 py-0.5 rounded-md font-medium">
                                {getStatusIcon()}
                                {balance.count} معاملة
                            </span>

                            <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold ${settled
                                        ? "bg-success/10 text-success"
                                        : isCredit
                                            ? "bg-success/10 text-success"
                                            : "bg-danger/10 text-danger"
                                    }`}
                            >
                                {getStatusLabel()}
                            </span>
                        </div>
                    </div>

                    {/* Balance + Actions */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                        {settled ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/15">
                                <CheckCircle2 className="size-3.5 text-success" />
                                <span className="text-[10px] md:text-[11px] font-black text-success">
                                    مسوّى
                                </span>
                            </div>
                        ) : hasMultiCurrency ? (
                            <div className="flex flex-col gap-1 items-end">
                                {currencyBalances
                                    .filter((b) => Math.abs(b.net) >= 0.001)
                                    .map((b) => {
                                        const curr = currencies.find((c) => c.id === b.currency_id);
                                        const isPos = b.net >= 0;
                                        return (
                                            <div
                                                key={b.currency_id}
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] md:text-[11px] font-black tabular-nums shadow-sm border transition-all hover:scale-105 ${isPos
                                                        ? "bg-success-soft text-success border-success/30"
                                                        : "bg-danger-soft text-danger border-danger/30"
                                                    }`}
                                            >
                                                {isPos ? (
                                                    <ArrowUpRight className="size-2.5" />
                                                ) : (
                                                    <ArrowDownRight className="size-2.5" />
                                                )}
                                                {isPos ? "" : "-"}
                                                {fmtMoney(Math.abs(b.net))}
                                                <span className="opacity-60 text-[8px] font-bold">
                                                    {curr?.symbol ?? ""}
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-end">
                                <div
                                    className={`font-black text-[16px] md:text-[19px] tabular-nums leading-none tracking-tight transition-all ${isCredit ? "text-success" : "text-danger"
                                        }`}
                                >
                                    {isCredit ? "" : "-"}
                                    {fmtMoney(Math.abs(displayNet))}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                    <span
                                        className={`text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded ${isCredit
                                                ? "bg-success/10 text-success"
                                                : "bg-danger/10 text-danger"
                                            }`}
                                    >
                                        {isCredit ? "له" : "عليه"}
                                    </span>
                                    {lastDate > 0 && (
                                        <span className="text-[9px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                                            <Calendar className="size-2.5 inline me-0.5" />
                                            {fmtDate(new Date(lastDate).toISOString())}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {hasActions && (
                            <div className="mt-0.5" onClick={(e) => e.preventDefault()}>
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowActions(!showActions);
                                        }}
                                        className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground"
                                        aria-label="خيارات إضافية"
                                    >
                                        <MoreVertical className="size-4" />
                                    </button>

                                    {showActions && (
                                        <div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border/60 rounded-xl shadow-elevated p-1.5 min-w-[140px] animate-scale-in origin-top-left">
                                            {onEdit && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        onEdit(person);
                                                        setShowActions(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-foreground hover:bg-secondary transition-colors"
                                                >
                                                    <Pencil className="size-3.5" />
                                                    تعديل
                                                </button>
                                            )}
                                            {onArchive && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        onArchive(person);
                                                        setShowActions(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-foreground hover:bg-secondary transition-colors"
                                                >
                                                    <Archive className="size-3.5" />
                                                    أرشفة
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        onDelete(person);
                                                        setShowActions(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-danger hover:bg-danger/10 transition-colors"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                    حذف
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Currency Breakdown */}
                {currencyBalances.length > 0 ? (
                    <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-border/40 space-y-2">
                        {currencyBalances.map((b) => {
                            const curr = currencies.find((c) => c.id === b.currency_id);
                            const sym = curr?.symbol ?? "";
                            const isPos = b.net >= 0;
                            return (
                                <div
                                    key={b.currency_id}
                                    className="grid grid-cols-3 gap-2 bg-gradient-to-br from-background/80 to-background/40 rounded-lg p-2 md:p-2.5 border border-border/30 transition-all hover:border-border/60"
                                >
                                    {hasMultiCurrency && (
                                        <div className="col-span-3 text-[10px] md:text-[11px] font-black text-foreground/70 mb-0.5 flex items-center gap-1.5">
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${isPos ? "bg-success" : "bg-danger"
                                                    }`}
                                            />
                                            {curr?.name ?? sym}
                                        </div>
                                    )}

                                    <div className="flex flex-col bg-success/5 p-1.5 md:p-2 rounded-lg border border-success/10">
                                        <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-1">
                                            <TrendingUp className="size-3 text-success" />
                                            له
                                        </span>
                                        <span className="tabular-nums font-black text-[11px] md:text-[13px] text-success">
                                            {fmtMoney(b.totalCredit)}{" "}
                                            <span className="opacity-50 text-[9px]">{sym}</span>
                                        </span>
                                    </div>

                                    <div className="flex flex-col bg-danger/5 p-1.5 md:p-2 rounded-lg border border-danger/10">
                                        <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-1">
                                            <TrendingDown className="size-3 text-danger" />
                                            عليه
                                        </span>
                                        <span className="tabular-nums font-black text-[11px] md:text-[13px] text-danger">
                                            {fmtMoney(b.totalDebit)}{" "}
                                            <span className="opacity-50 text-[9px]">{sym}</span>
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-end bg-secondary/30 p-1.5 md:p-2 rounded-lg border border-border/30">
                                        <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-1">
                                            <Clock className="size-3" />
                                            آخر دفعة
                                        </span>
                                        <span className="tabular-nums font-bold text-[11px] md:text-[13px] text-foreground/80 truncate">
                                            {b.lastDate
                                                ? fmtDate(new Date(b.lastDate).toISOString())
                                                : "—"}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (balance.totalCredit ?? 0) > 0 || (balance.totalDebit ?? 0) > 0 ? (
                    <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-border/40">
                        <div className="grid grid-cols-3 gap-2 bg-gradient-to-br from-background/80 to-background/40 rounded-lg p-2 md:p-2.5 border border-border/30">
                            <div className="flex flex-col bg-success/5 p-1.5 md:p-2 rounded-lg border border-success/10">
                                <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-1">
                                    <TrendingUp className="size-3 text-success" />
                                    له
                                </span>
                                <span className="tabular-nums font-black text-[11px] md:text-[13px] text-success">
                                    {fmtMoney(balance.totalCredit ?? 0)}
                                </span>
                            </div>

                            <div className="flex flex-col bg-danger/5 p-1.5 md:p-2 rounded-lg border border-danger/10">
                                <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-1">
                                    <TrendingDown className="size-3 text-danger" />
                                    عليه
                                </span>
                                <span className="tabular-nums font-black text-[11px] md:text-[13px] text-danger">
                                    {fmtMoney(balance.totalDebit ?? 0)}
                                </span>
                            </div>

                            <div className="flex flex-col items-end bg-secondary/30 p-1.5 md:p-2 rounded-lg border border-border/30">
                                <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-1">
                                    <Clock className="size-3" />
                                    آخر دفعة
                                </span>
                                <span className="tabular-nums font-bold text-[11px] md:text-[13px] text-foreground/80 truncate">
                                    {lastDate
                                        ? fmtDate(new Date(lastDate).toISOString())
                                        : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </Link>
    );
});

export default PersonRowV2;