import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Bell, AlarmClock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { completeReminder, snoozeReminder, type Reminder } from "@/lib/reminders";
import { syncRemindersFn } from "@/lib/jobs.functions";
import { ReminderCard, REPEAT_LABEL } from "@/features/reminders/ReminderCard";
import { ReminderFormDialog } from "@/features/reminders/ReminderFormDialog";

export const Route = createFileRoute("/app/reminders")({ component: RemindersPage });

interface Person { id: string; name: string }
type Filter = "overdue" | "today" | "upcoming" | "done";

function RemindersPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Reminder[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [filter, setFilter] = useState<Filter>("overdue");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from("reminders").select("*").order("due_date"),
      supabase.from("people").select("id,name").eq("is_archived", false),
    ]);
    setItems((r ?? []) as Reminder[]);
    setPeople((p ?? []) as Person[]);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await syncRemindersFn();
      await load();
    })();
  }, [user, load]);

  const sync = async () => {
    if (!user) return;
    setSyncing(true);
    const res = await syncRemindersFn();
    setSyncing(false);
    toast.success(res.created > 0 ? `تم إضافة ${res.created} تذكير من الديون` : "لا توجد ديون جديدة بتاريخ استحقاق");
    load();
  };

  const toggleDone = async (r: Reminder) => {
    if (r.is_done) {
      await supabase.from("reminders").update({ is_done: false }).eq("id", r.id);
    } else {
      await completeReminder(r);
      if (r.repeat !== "none") toast.success(`تم. التالي: ${REPEAT_LABEL[r.repeat]}`);
    }
    load();
  };

  const snooze = async (id: string, days: number) => {
    await snoozeReminder(id, days);
    toast.success(`مؤجل ${days === 1 ? "يوم" : `${days} أيام`}`);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("حذف التذكير؟")) return;
    await supabase.from("reminders").delete().eq("id", id);
    toast.success("تم الحذف"); load();
  };

  const filtered = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
    return items.filter((r) => {
      const d = new Date(r.due_date);
      if (filter === "done") return r.is_done;
      if (r.is_done) return false;
      if (filter === "overdue") return d < startToday;
      if (filter === "today") return d >= startToday && d <= endToday;
      return d > endToday;
    });
  }, [items, filter]);

  const counts = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
    const c = { overdue: 0, today: 0, upcoming: 0, done: 0 };
    for (const r of items) {
      if (r.is_done) { c.done++; continue; }
      const d = new Date(r.due_date);
      if (d < startToday) c.overdue++;
      else if (d <= endToday) c.today++;
      else c.upcoming++;
    }
    return c;
  }, [items]);

  const TABS: Array<{ id: Filter; label: string; count: number; tone: string }> = [
    { id: "overdue", label: "متأخر", count: counts.overdue, tone: "text-danger" },
    { id: "today", label: "اليوم", count: counts.today, tone: "text-warning" },
    { id: "upcoming", label: "قادمة", count: counts.upcoming, tone: "text-primary" },
    { id: "done", label: "مكتملة", count: counts.done, tone: "text-success" },
  ];

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader icon={Bell} title="التذكيرات" subtitle={`${counts.overdue + counts.today + counts.upcoming} نشط · ${counts.done} مكتمل`} back="/app" />

      <div className="flex items-center gap-2 md:gap-3">
        <Button size="sm" variant="outline" onClick={sync} disabled={syncing} className="h-9 md:h-10 text-xs md:text-sm gap-1.5 md:gap-2">
          <RefreshCw className={`size-3.5 md:size-4 ${syncing ? "animate-spin" : ""}`} />
          مزامنة من الديون
        </Button>
        {user && (
          <ReminderFormDialog
            open={open}
            onOpenChange={(v) => { if (!v) setEditing(null); setOpen(v); }}
            editing={editing}
            userId={user.id}
            people={people}
            onSaved={load}
          />
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`shrink-0 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 md:gap-2 ${filter === t.id
                ? "bg-gradient-primary text-primary-foreground shadow-glow scale-105"
                : "bg-secondary hover:bg-secondary/70 hover:scale-105"
              }`}
          >
            <span>{t.label}</span>
            <span className={`text-[11px] md:text-xs font-black ${filter === t.id ? "opacity-90" : t.tone}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={AlarmClock} title="لا توجد تذكيرات" description="أضف تذكيراً أو زامن من الديون التي لها تاريخ استحقاق" />
      ) : (
        <div className="space-y-2 md:space-y-3 animate-in fade-in">
          {filtered.map((r) => (
            <ReminderCard
              key={r.id}
              r={r}
              personName={people.find((p) => p.id === r.person_id)?.name}
              onToggle={() => toggleDone(r)}
              onSnooze={(d) => snooze(r.id, d)}
              onEdit={() => { setEditing(r); setOpen(true); }}
              onDelete={() => del(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
