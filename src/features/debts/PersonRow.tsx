import React from "react";
import { Link } from "@tanstack/react-router";
import { Phone, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { fmtMoney, fmtDate } from "@/lib/format";
import { RowActions } from "@/components/common/RowActions";
import type { PersonCurrencyBalance, Currency } from "@/hooks/useDashboardData";

interface Person {
  id: string;
  name: string;
  phone?: string | null;
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

/** Rich micro-card for a person — phone, last payment, totals per currency. */
export const PersonRow = React.memo(function PersonRow({
  person,
  balance,
  currencyBalances = [],
  currencies = [],
  index = 0,
  onEdit,
  onArchive,
  onDelete,
}: Props) {
  // تحديد الحالة العامة: إذا كان مجموع الأرصدة موجبًا = له، سالب = عليه
  const hasMultiCurrency = currencyBalances.length > 1;
  // العملة الأساسية لعرض الحالة اللونية
  const baseCurr = currencies.find((c) => c.is_base);
  const baseBalance = baseCurr
    ? currencyBalances.find((b) => b.currency_id === baseCurr.id)
    : currencyBalances[0];

  // لتحديد اللون: نستخدم رصيد العملة الأساسية إن وُجد، وإلا نجمع الأرصدة
  const displayNet = baseBalance?.net ?? balance.net;
  const isCredit = displayNet >= 0;
  const settled = currencyBalances.every((b) => Math.abs(b.net) < 0.001) ||
    (currencyBalances.length === 0 && Math.abs(balance.net) < 0.001);

  const hasActions = !!(onEdit || onArchive || onDelete);
  const lastDate = balance.lastDate;

  return (
    <Link
      to="/app/person/$id"
      params={{ id: person.id }}
      className={`block relative overflow-hidden rounded-xl md:rounded-2xl border bg-gradient-to-br ${isCredit ? 'from-success/5 to-card border-success/20' : settled ? 'from-secondary/30 to-card border-border/50' : 'from-danger/5 to-card border-danger/20'} shadow-sm hover:shadow-md transition-all p-3 md:p-4 active:scale-[0.98] group`}
    >
      <div className="flex items-start gap-3 md:gap-4">
        <div
          className={`size-10 md:size-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-[14px] md:text-[18px] shadow-sm shrink-0 transition-transform group-hover:scale-105 ${settled
              ? "bg-secondary text-muted-foreground"
              : isCredit
                ? "bg-success text-success-foreground"
                : "bg-danger text-danger-foreground"
            }`}
        >
          {person.name.trim().charAt(0)}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="font-bold text-[14px] md:text-[16px] truncate leading-tight group-hover:text-primary transition-colors">{person.name}</div>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] md:text-[12px] text-muted-foreground font-medium">
            {person.phone ? (
              <span className="inline-flex items-center gap-1 bg-secondary/50 px-1.5 py-0.5 rounded-md" dir="ltr">
                <Phone className="size-3 md:size-3.5 opacity-70" />{person.phone}
              </span>
            ) : (
              <span className="bg-secondary/50 px-1.5 py-0.5 rounded-md">{balance.count} معاملة</span>
            )}
            {person.phone && <span className="bg-secondary/50 px-1.5 py-0.5 rounded-md">{balance.count} معاملة</span>}
          </div>
        </div>

        {/* Status Badge Top Right */}
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {settled ? (
            <span className="inline-block px-2 py-1 rounded-full bg-secondary text-muted-foreground text-[10px] md:text-[11px] font-bold tracking-wide">مسوّى</span>
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
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] md:text-[11px] font-black tabular-nums shadow-sm border ${isPos
                          ? "bg-success-soft text-success border-success/30"
                          : "bg-danger-soft text-danger border-danger/30"
                        }`}
                    >
                      {isPos ? "" : "-"}{fmtMoney(Math.abs(b.net))}
                      <span className="opacity-70 text-[8px] font-bold">{curr?.symbol ?? ""}</span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className={`flex flex-col items-end`}>
              <div className={`font-black text-[15px] md:text-[18px] tabular-nums leading-none tracking-tight ${isCredit ? "text-success" : "text-danger"}`}>
                {isCredit ? "" : "-"}{fmtMoney(Math.abs(displayNet))}
              </div>
              <div className="text-[9px] md:text-[11px] text-muted-foreground font-bold mt-1 bg-secondary/60 px-1.5 py-0.5 rounded">{isCredit ? "له" : "عليه"}</div>
            </div>
          )}

          {hasActions && (
            <div className="mt-1" onClick={(e) => e.preventDefault()}>
              <RowActions
                onEdit={onEdit ? () => onEdit(person) : undefined}
                onArchive={onArchive ? () => onArchive(person) : undefined}
                onDelete={onDelete ? () => onDelete(person) : undefined}
              />
            </div>
          )}
        </div>
      </div>

      {/* Details Section */}
      {currencyBalances.length > 0 ? (
        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-border/50 space-y-2 md:space-y-3">
          {currencyBalances.map((b) => {
            const curr = currencies.find((c) => c.id === b.currency_id);
            const sym = curr?.symbol ?? "";
            return (
              <div key={b.currency_id} className="grid grid-cols-3 gap-2 md:gap-4 bg-background/50 rounded-lg p-2 md:p-3 border border-border/30">
                {hasMultiCurrency && (
                  <div className="col-span-3 text-[10px] md:text-[11px] font-black text-foreground/80 mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                    {curr?.name ?? sym}
                  </div>
                )}
                <div className="flex flex-col bg-success/5 p-1.5 md:p-2 rounded-md border border-success/10">
                  <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-0.5"><TrendingUp className="size-3 text-success" /> إجمالي له</span>
                  <span className="tabular-nums font-black text-[11px] md:text-[13px] text-success">{fmtMoney(b.totalCredit)} <span className="opacity-60 text-[9px]">{sym}</span></span>
                </div>
                <div className="flex flex-col bg-danger/5 p-1.5 md:p-2 rounded-md border border-danger/10">
                  <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-0.5"><TrendingDown className="size-3 text-danger" /> إجمالي عليه</span>
                  <span className="tabular-nums font-black text-[11px] md:text-[13px] text-danger">{fmtMoney(b.totalDebit)} <span className="opacity-60 text-[9px]">{sym}</span></span>
                </div>
                <div className="flex flex-col items-end bg-secondary/30 p-1.5 md:p-2 rounded-md border border-border/40">
                  <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-0.5"><Clock className="size-3" /> آخر دفعة</span>
                  <span className="tabular-nums font-bold text-[11px] md:text-[13px] text-foreground/90 truncate">
                    {b.lastDate ? fmtDate(new Date(b.lastDate).toISOString()) : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (balance.totalCredit ?? 0) > 0 || (balance.totalDebit ?? 0) > 0 ? (
        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-border/50 grid grid-cols-3 gap-2 md:gap-4 bg-background/50 rounded-lg p-2 md:p-3 border border-border/30">
          <div className="flex flex-col bg-success/5 p-1.5 md:p-2 rounded-md border border-success/10">
            <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-0.5"><TrendingUp className="size-3 text-success" /> إجمالي له</span>
            <span className="tabular-nums font-black text-[11px] md:text-[13px] text-success">{fmtMoney(balance.totalCredit ?? 0)}</span>
          </div>
          <div className="flex flex-col bg-danger/5 p-1.5 md:p-2 rounded-md border border-danger/10">
            <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-0.5"><TrendingDown className="size-3 text-danger" /> إجمالي عليه</span>
            <span className="tabular-nums font-black text-[11px] md:text-[13px] text-danger">{fmtMoney(balance.totalDebit ?? 0)}</span>
          </div>
          <div className="flex flex-col items-end bg-secondary/30 p-1.5 md:p-2 rounded-md border border-border/40">
            <span className="text-muted-foreground flex items-center gap-1 text-[9px] md:text-[10px] font-bold mb-0.5"><Clock className="size-3" /> آخر دفعة</span>
            <span className="tabular-nums font-bold text-[11px] md:text-[13px] text-foreground/90 truncate">
              {lastDate ? fmtDate(new Date(lastDate).toISOString()) : "—"}
            </span>
          </div>
        </div>
      ) : null}
    </Link>
  );
});
