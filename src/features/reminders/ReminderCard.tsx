import { Card } from "@/components/ui/card";
import { Check, Clock, Pencil, Repeat, Trash2 } from "lucide-react";
import { fmtDate } from "@/lib/format";
import type { Reminder, RepeatKind } from "@/lib/reminders";

const REPEAT_LABEL: Record<RepeatKind, string> = {
  none: "لا يتكرر", daily: "يومي", weekly: "أسبوعي", monthly: "شهري",
};

interface Props {
  r: Reminder;
  personName?: string;
  onToggle: () => void;
  onSnooze: (days: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ReminderCard({ r, personName, onToggle, onSnooze, onEdit, onDelete }: Props) {
  const due = new Date(r.due_date);
  const overdue = !r.is_done && due < new Date();
  return (
    <Card className={`p-3 md:p-4 flex items-start gap-3 md:gap-4 transition-all duration-200 hover:shadow-md group ${overdue ? "border-danger/40 bg-danger/5" : ""} ${r.is_done ? "opacity-60" : ""}`}>
      <button
        onClick={onToggle}
        className={`size-6 md:size-7 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-all duration-200 ${r.is_done ? "bg-success border-success text-success-foreground shadow-sm" : "border-muted-foreground hover:border-primary hover:scale-110 active:scale-95"
          }`}
        aria-label={r.is_done ? "إلغاء الإكمال" : "إكمال"}
      >
        {r.is_done && <Check className="size-3.5 md:size-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-sm md:text-base leading-snug transition-all ${r.is_done ? "line-through text-muted-foreground" : "group-hover:text-primary"}`}>{r.title}</div>
        <div className="flex items-center flex-wrap gap-2 mt-1.5">
          {personName && <span className="text-[11px] md:text-xs text-primary font-bold">{personName}</span>}
          {r.transaction_id && <span className="text-[10px] md:text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">دين مرتبط</span>}
          {r.repeat !== "none" && (
            <span className="text-[10px] md:text-xs inline-flex items-center gap-1 text-muted-foreground font-medium">
              <Repeat className="size-3 md:size-3.5" /> {REPEAT_LABEL[r.repeat as RepeatKind]}
            </span>
          )}
          {overdue && (
            <span className="text-[10px] md:text-xs px-2 py-0.5 rounded-md bg-danger/10 text-danger font-bold animate-pulse">
              ⚠️ متأخر
            </span>
          )}
        </div>
        {r.note && <div className="text-xs md:text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{r.note}</div>}
        <div className={`text-[11px] md:text-xs mt-2 font-semibold ${overdue ? "text-danger" : "text-muted-foreground"}`}>
          <span className="tabular-nums">{fmtDate(r.due_date)}</span>
        </div>
        {!r.is_done && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button onClick={() => onSnooze(1)} className="text-[11px] md:text-xs inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 active:scale-95 transition-all font-semibold">
              <Clock className="size-3 md:size-3.5" /> يوم
            </button>
            <button onClick={() => onSnooze(7)} className="text-[11px] md:text-xs px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 active:scale-95 transition-all font-semibold">أسبوع</button>
            <button onClick={onEdit} className="text-[11px] md:text-xs inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 active:scale-95 transition-all font-semibold mr-auto">
              <Pencil className="size-3 md:size-3.5" /> تعديل
            </button>
          </div>
        )}
      </div>
      <button onClick={onDelete} className="text-muted-foreground hover:text-danger p-2 transition-all hover:bg-danger/10 rounded-lg opacity-0 group-hover:opacity-100 active:scale-95" aria-label="حذف">
        <Trash2 className="size-4 md:size-[18px]" />
      </button>
    </Card>
  );
}

export { REPEAT_LABEL };
