import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, Clock, CalendarClock, AlarmClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { fmtDate, fmtTime } from "@/lib/format";
import { listAlerts, completeAlert, snoozeAlert } from "@/lib/alerts/server";
import { useAllPeople } from "@/hooks/usePeople";
import type { SmartAlert, AlertSource } from "@/lib/alerts/types";

const SOURCE_LABEL: Record<AlertSource, string> = {
  note: "ملاحظة", reminder: "تذكير", followup: "متابعة", transaction: "معاملة", overdue: "دين متأخر",
};

type Tab = "overdue" | "upcoming" | "done";

export function AlertsDashboard({ userId }: { userId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("upcoming");
  const { data: people = [] } = useAllPeople();
  const { data: alerts = [], isLoading } = useQuery<SmartAlert[]>({
    queryKey: ["alerts", userId],
    queryFn: () => listAlerts({ data: { userId } }),
    enabled: !!userId,
  });

  const nameOf = (id: string | null) => people.find((p) => p.id === id)?.name ?? null;

  const grouped = useMemo(() => {
    const now = Date.now();
    const overdue: SmartAlert[] = [];
    const upcoming: SmartAlert[] = [];
    const done: SmartAlert[] = [];
    for (const a of alerts) {
      if (a.status === "done" || a.status === "dismissed") done.push(a);
      else if (a.due_at && new Date(a.due_at).getTime() < now) overdue.push(a);
      else upcoming.push(a);
    }
    return { overdue, upcoming, done };
  }, [alerts]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["alerts", userId] });

  const done = async (id: string) => {
    try {
      await completeAlert({ data: { userId, id } });
      toast.success("تم الإكمال");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر التنفيذ");
    }
  };

  const snooze = async (id: string, days: number) => {
    try {
      await snoozeAlert({ data: { userId, id, days } });
      toast.success(`مؤجل ${days} يوم`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر التنفيذ");
    }
  };

  const list = grouped[tab];

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1">
        {([
          { id: "overdue", label: "متأخر", tone: "text-danger", count: grouped.overdue.length },
          { id: "upcoming", label: "قادم", tone: "text-primary", count: grouped.upcoming.length },
          { id: "done", label: "مكتمل", tone: "text-success", count: grouped.done.length },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 ${
              tab === t.id ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"
            }`}
          >
            <span>{t.label}</span>
            <span className={`text-[10px] font-bold ${tab === t.id ? "opacity-80" : t.tone}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center text-xs text-muted-foreground py-6">جاري التحميل...</div>
      ) : list.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-6">لا توجد تنبيهات</div>
      ) : (
        <div className="space-y-1.5">
          {list.map((a) => {
            const pname = nameOf(a.person_id);
            return (
              <Card key={a.id} className={`p-2.5 flex items-start gap-2 ${tab === "overdue" ? "border-danger/40" : ""}`}>
                <div className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${
                  tab === "overdue" ? "bg-danger-soft text-danger" : "bg-primary/10 text-primary"
                }`}>
                  {a.source_type === "overdue" ? <AlarmClock className="size-3.5" />
                    : a.source_type === "followup" ? <BellRing className="size-3.5" />
                    : <CalendarClock className="size-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] leading-tight">{a.title}</div>
                  <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                    <span className="text-[10px] px-1 py-0.5 rounded bg-secondary text-muted-foreground">
                      {SOURCE_LABEL[a.source_type]}
                    </span>
                    {pname && <span className="text-[10px] text-primary font-semibold">{pname}</span>}
                  </div>
                  {a.body && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.body}</div>}
                  {a.due_at && (
                    <div className={`text-[10px] mt-1 flex items-center gap-1 ${tab === "overdue" ? "text-danger font-bold" : "text-muted-foreground"}`}>
                      <Clock className="size-2.5" /> {fmtDate(a.due_at)} · {fmtTime(a.due_at)}
                    </div>
                  )}
                  {tab !== "done" && (
                    <div className="flex gap-1 mt-1.5">
                      <button onClick={() => done(a.id)} className="text-[10px] inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-success/10 text-success hover:opacity-80">
                        <Check className="size-2.5" /> إكمال
                      </button>
                      <button onClick={() => snooze(a.id, 1)} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:opacity-80">يوم</button>
                      <button onClick={() => snooze(a.id, 7)} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:opacity-80">أسبوع</button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
