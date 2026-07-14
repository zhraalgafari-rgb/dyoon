import { TrendingUp, TrendingDown, Pencil, Trash2, CheckCircle2, Clock } from "lucide-react";
import { fmtMoney, fmtDate } from "@/lib/format";

interface Tx {
  id: string;
  person_id?: string;
  amount: number;
  direction: string;
  currency_id: string;
  transaction_date: string;
  details: string | null;
  due_date?: string | null;
  is_paid?: boolean;
  allocations?: { allocated_amount: number }[];
}
interface Currency { id: string; name: string }

interface Props<T extends Tx = Tx> {
  txs: T[];
  currencies: Currency[];
  running: Record<string, number>;
  onEdit: (t: T) => void;
  onDelete: (id: string) => void;
  onPay?: (t: T) => void;
}

function dueState(due: string | null | undefined, is_paid?: boolean): "none" | "overdue" | "soon" | "paid" {
  if (is_paid) return "paid";
  if (!due) return "none";
  const d = new Date(due); d.setHours(23, 59, 59, 999);
  const ms = d.getTime() - Date.now();
  if (ms < 0) return "overdue";
  if (ms < 3 * 86400000) return "soon";
  return "none";
}

export function TransactionTable<T extends Tx>({ txs, currencies, running, onEdit, onDelete, onPay }: Props<T>) {
  return (
    <div className="rounded-xl border-2 border-border bg-card shadow-card overflow-hidden md:overflow-visible">
      <div className="overflow-x-auto md:overflow-x-visible">
        <table className="w-full text-[11px] md:text-[12.5px] border-collapse" dir="rtl">
          <thead>
            <tr className="bg-gradient-to-l from-primary/15 via-primary/10 to-primary/5 text-foreground">
              <th className="px-1.5 py-2 md:px-3 md:py-2.5 text-center font-bold border-b-2 border-l border-border w-10 md:w-12">#</th>
              <th className="px-1.5 py-2 md:px-3 md:py-2.5 text-center font-bold border-b-2 border-l border-border w-20 md:w-28">التاريخ</th>
              <th className="px-1.5 py-2 md:px-3 md:py-2.5 text-center font-bold border-b-2 border-l border-border w-12 md:w-14">النوع</th>
              <th className="px-1.5 py-2 md:px-3 md:py-2.5 text-end font-bold border-b-2 border-l border-border">المبلغ</th>
              <th className="px-1.5 py-2 md:px-3 md:py-2.5 text-center font-bold border-b-2 border-l border-border w-12 md:w-16">العملة</th>
              <th className="px-1.5 py-2 md:px-3 md:py-2.5 text-start font-bold border-b-2 border-l border-border">البيان</th>
              <th className="px-1.5 py-2 md:px-3 md:py-2.5 text-end font-bold border-b-2 border-l border-border w-24 md:w-32">الرصيد</th>
              <th className="px-1.5 py-2 md:px-3 md:py-2.5 text-center font-bold border-b-2 border-border w-16 md:w-20">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t, i) => {
              const credit = t.direction === "credit";
              const cur = currencies.find((c) => c.id === t.currency_id);
              const bal = running[t.id] ?? 0;
              const state = dueState(t.due_date, t.is_paid);
              const rowTint = state === "overdue"
                ? "bg-danger-soft/40"
                : credit ? "bg-success-soft/20" : "bg-danger-soft/15";
              const zebra = i % 2 === 0 ? "" : "bg-muted/30";
              const totalAllocated = t.allocations?.reduce((s, a) => s + Number(a.allocated_amount), 0) ?? 0;
              const isPartiallyPaid = totalAllocated > 0 && totalAllocated < t.amount;
              return (
                <tr key={t.id} className={`${zebra} hover:bg-primary/5 transition-colors ${t.is_paid ? "opacity-60" : ""}`}>
                  <td className={`px-1.5 py-1.5 md:px-3 md:py-2 text-center border-b border-l border-border tabular-nums text-muted-foreground ${rowTint}`}>
                    {i + 1}
                  </td>
                  <td className="px-1.5 py-1.5 md:px-3 md:py-2 text-center border-b border-l border-border tabular-nums text-[10px] md:text-[12px]">
                    {fmtDate(t.transaction_date)}
                  </td>
                  <td className="px-1.5 py-1.5 md:px-3 md:py-2 text-center border-b border-l border-border">
                    <span className={`inline-flex items-center justify-center size-5 md:size-6 rounded-md ring-1 ${credit ? "bg-success-soft text-success ring-success/30" : "bg-danger-soft text-danger ring-danger/30"}`}>
                      {credit ? <TrendingUp className="size-3 md:size-3.5" /> : <TrendingDown className="size-3 md:size-3.5" />}
                    </span>
                  </td>
                  <td className={`px-1.5 py-1.5 md:px-3 md:py-2 text-end border-b border-l border-border font-bold tabular-nums text-[12px] md:text-[14px] ${credit ? "text-success" : "text-danger"} ${t.is_paid ? "line-through" : ""}`}>
                    {credit ? "+" : "-"}{fmtMoney(Number(t.amount))}
                    {isPartiallyPaid && (
                      <div className="text-[9px] md:text-[10px] font-normal text-primary mt-0.5">
                        مسدد {fmtMoney(totalAllocated)}
                      </div>
                    )}
                  </td>
                  <td className="px-1.5 py-1.5 md:px-3 md:py-2 text-center border-b border-l border-border text-[10px] md:text-[12px] text-muted-foreground font-semibold">
                    {cur?.name ?? "—"}
                  </td>
                  <td className="px-1.5 py-1.5 md:px-3 md:py-2 text-start border-b border-l border-border max-w-[140px] md:max-w-[220px] lg:max-w-[280px]">
                    <div className="truncate text-foreground/90">{t.details || "—"}</div>
                    {t.due_date && (
                      <span className={`mt-0.5 inline-flex items-center gap-0.5 text-[9px] md:text-[10px] font-bold px-1 py-0.5 rounded ${state === "paid" ? "bg-success-soft text-success" :
                        state === "overdue" ? "bg-danger-soft text-danger" :
                          state === "soon" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                            "bg-secondary text-muted-foreground"
                        }`}>
                        {state === "paid" ? <CheckCircle2 className="size-2.5 md:size-3" /> : <Clock className="size-2.5 md:size-3" />}
                        {fmtDate(t.due_date)}
                      </span>
                    )}
                  </td>
                  <td className={`px-1.5 py-1.5 md:px-3 md:py-2 text-end border-b border-l border-border tabular-nums font-semibold text-[12px] md:text-[14px] ${bal >= 0 ? "text-success" : "text-danger"}`}>
                    {fmtMoney(Math.abs(bal))}
                    <span className="ms-0.5 text-[9px] md:text-[10px] text-muted-foreground font-normal">{bal >= 0 ? "له" : "عليه"}</span>
                  </td>
                  <td className="px-1 py-1.5 md:px-2 md:py-2 text-center border-b border-border">
                    <div className="inline-flex items-center gap-0.5 md:gap-1">
                      {onPay && !t.is_paid && (
                        <button onClick={() => onPay(t)} aria-label="تسجيل سداد" className="p-1 md:p-1.5 rounded hover:bg-success/10 text-muted-foreground hover:text-success">
                          <CheckCircle2 className="size-3 md:size-3.5" />
                        </button>
                      )}
                      <button onClick={() => onEdit(t)} aria-label="تعديل" className="p-1 md:p-1.5 rounded text-muted-foreground hover:bg-primary/10 hover:text-primary">
                        <Pencil className="size-3 md:size-3.5" />
                      </button>
                      <button onClick={() => onDelete(t.id)} aria-label="حذف" className="p-1 md:p-1.5 rounded text-muted-foreground hover:bg-danger/10 hover:text-danger">
                        <Trash2 className="size-3 md:size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
