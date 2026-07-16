import { useMemo, useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { TransactionTable } from "@/features/debts/TransactionTable";
import { fmtMonthAr } from "@/lib/format";
import type { PaymentPromise } from "@/features/promises/types";

interface Currency { id: string; name: string; symbol: string; rate: number; is_base: boolean }
interface Tx { id: string; person_id: string; amount: number; direction: string; currency_id: string; transaction_date: string; details: string | null; due_date: string | null; is_paid: boolean; allocations?: { allocated_amount: number }[] }

interface TimelineItem {
  type: "transaction" | "promise";
  date: string;
  key: string;
}

interface Props {
  txs: Tx[];
  currencies: Currency[];
  running: Record<string, number>;
  onEdit: (t: Tx) => void;
  onDelete: (id: string) => void;
  onPay: (t: Tx) => void;
  promises?: PaymentPromise[];
}

export function PersonTimeline({ txs, currencies, running, onEdit, onDelete, onPay, promises = [] }: Props) {
  const [visibleCount, setVisibleCount] = useState(30);
  const visibleTxs = useMemo(() => txs.slice(0, visibleCount), [txs, visibleCount]);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + 30, txs.length));
      }
    }, { rootMargin: "400px" });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [txs.length]);

  const grouped = useMemo(() => {
    const g = new Map<string, { type: "transaction"; items: Tx[] } | { type: "promise"; items: PaymentPromise[] }>();

    // Add transactions
    for (const t of visibleTxs) {
      const d = new Date(t.transaction_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const existing = g.get(key);
      if (existing && existing.type === "transaction") {
        existing.items.push(t);
      } else {
        g.set(key, { type: "transaction", items: [t] });
      }
    }

    // Add promises
    for (const p of promises) {
      const d = new Date(p.promise_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const existing = g.get(key);
      if (existing && existing.type === "promise") {
        existing.items.push(p);
      } else {
        g.set(key, { type: "promise", items: [p] });
      }
    }

    return Array.from(g.entries())
      .map(([key, group]) => {
        const [y, m] = key.split("-").map(Number);
        return { key, label: fmtMonthAr(new Date(y, m, 1)), group };
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [visibleTxs, promises]);

  const getPromiseIcon = (status: string) => {
    switch (status) {
      case "fulfilled": return CheckCircle;
      case "broken": return XCircle;
      default: return Clock;
    }
  };

  const getPromiseColor = (status: string) => {
    switch (status) {
      case "fulfilled": return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30";
      case "broken": return "text-red-600 bg-red-50 dark:bg-red-950/30";
      case "cancelled": return "text-gray-600 bg-gray-50 dark:bg-gray-950/30";
      default: return "text-amber-600 bg-amber-50 dark:bg-amber-950/30";
    }
  };

  return (
    <div className="space-y-3">
      {grouped.map(({ key, label, group }) => (
        <div key={key} className="space-y-1.5">
          <div className="flex items-center gap-2 px-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-bold text-primary bg-primary/10 ring-1 ring-primary/20 px-2 py-0.5 rounded-full">{label}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {group.type === "transaction" ? (
            <TransactionTable
              txs={group.items}
              currencies={currencies}
              running={running}
              onEdit={onEdit}
              onDelete={onDelete}
              onPay={onPay}
            />
          ) : (
            <div className="space-y-1.5">
              {(group.items as PaymentPromise[]).map((promise) => {
                const Icon = getPromiseIcon(promise.status);
                const colorClass = getPromiseColor(promise.status);
                return (
                  <div
                    key={promise.id}
                    className={`rounded-lg border p-2.5 flex items-center gap-2.5 ${colorClass}`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold">
                        وعد سداد: {promise.amount.toLocaleString("ar-SA")}
                      </div>
                      <div className="text-[10px] opacity-80">
                        {promise.promise_date}
                        {promise.notes && ` - ${promise.notes}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {visibleTxs.length > 0 && visibleTxs.length < txs.length && (
        <div ref={loadMoreRef} className="h-20 flex items-center justify-center text-muted-foreground pb-20">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}
    </div>
  );
}
