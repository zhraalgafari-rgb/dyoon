import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, CalendarPlus, PhoneCall, Check, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonSelector } from "@/components/PersonSelector";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { fmtDate, fmtTime, formatDistanceToNow } from "@/lib/format";
import { listAlerts, completeAlert, snoozeAlert, scheduleFollowup, logFollowupAttempt, listFollowupLogs } from "@/lib/alerts/server";
import type { PersonLite } from "@/hooks/usePeople";
import type { SmartAlert, FollowupChannel } from "@/lib/alerts/types";

const CHANNELS: { id: FollowupChannel; label: string }[] = [
  { id: "whatsapp", label: "واتساب" },
  { id: "call", label: "اتصال" },
  { id: "email", label: "بريد" },
  { id: "note", label: "ملاحظة" },
  { id: "other", label: "أخرى" },
];

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FollowupManager({ userId, people }: { userId: string; people: PersonLite[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [personId, setPersonId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [dueDate, setDueDate] = useState(() => toLocalInput(new Date(Date.now() + 86400000)));
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState<FollowupChannel>("whatsapp");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: alerts = [], isLoading } = useQuery<SmartAlert[]>({
    queryKey: ["alerts", userId],
    queryFn: () => listAlerts({ data: { userId } }),
    enabled: !!userId,
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["followupLogs", userId],
    queryFn: () => listFollowupLogs({ data: { userId } }),
    enabled: !!userId,
  });

  const scheduled = useMemo(
    () =>
      alerts
        .filter((a) => a.person_id && a.source_type !== "transaction")
        .sort((a, b) => new Date(a.due_at ?? 0).getTime() - new Date(b.due_at ?? 0).getTime()),
    [alerts]
  );

  const nameOf = (id: string | null) => people.find((p) => p.id === id)?.name ?? "—";
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["alerts", userId] });
    qc.invalidateQueries({ queryKey: ["followupLogs", userId] });
  };

  const doSchedule = async () => {
    if (!user || !personId || !note.trim()) return toast.error("اختر العميل واكتب الملاحظة");
    setBusy(true);
    try {
      await scheduleFollowup({
        data: { userId: user.id, personId, transactionId: null, dueAt: new Date(dueDate).toISOString(), body: note.trim() },
      });
      setNote("");
      refresh();
      toast.success("تم جدولة المتابعة");
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر الجدولة");
    } finally {
      setBusy(false);
    }
  };

  const doLog = async () => {
    if (!user || !personId) return toast.error("اختر العميل");
    setBusy(true);
    try {
      await logFollowupAttempt({
        data: { userId: user.id, personId, transactionId: null, channel, message: message.trim() || null },
      });
      setMessage("");
      refresh();
      toast.success("تم تسجيل المحاولة");
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Scheduled follow-ups */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[12px] font-bold">
          <Users className="size-3.5 text-primary" /> المتابعات المجدولة
        </div>
        {isLoading ? (
          <div className="text-center text-xs text-muted-foreground py-3">جاري التحميل...</div>
        ) : scheduled.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-3">لا توجد متابعات مجدولة</div>
        ) : (
          scheduled.map((a) => {
            const overdue = a.due_at && new Date(a.due_at).getTime() < Date.now() && a.status === "pending";
            return (
              <Card key={a.id} className={`p-2.5 flex items-start gap-2 ${overdue ? "border-danger/40" : ""}`}>
                <div className={`size-6 rounded-lg flex items-center justify-center shrink-0 ${overdue ? "bg-danger-soft text-danger" : "bg-primary/10 text-primary"}`}>
                  <Clock className="size-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[12px] truncate">{nameOf(a.person_id)}</span>
                    {a.due_at && (
                      <span className={`text-[10px] ${overdue ? "text-danger font-bold" : "text-muted-foreground"}`}>
                        {fmtDate(a.due_at)} · {fmtTime(a.due_at)}
                      </span>
                    )}
                  </div>
                  {a.body && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.body}</div>}
                  {a.status === "pending" && (
                    <div className="flex gap-1 mt-1.5">
                      <button onClick={async () => { await completeAlert({ data: { userId, id: a.id } }); refresh(); }}
                        className="text-[10px] inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-success/10 text-success hover:opacity-80">
                        <Check className="size-2.5" /> إكمال
                      </button>
                      <button onClick={async () => { await snoozeAlert({ data: { userId, id: a.id, days: 1 } }); refresh(); }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:opacity-80">يوم</button>
                      <button onClick={async () => { await snoozeAlert({ data: { userId, id: a.id, days: 7 } }); refresh(); }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:opacity-80">أسبوع</button>
                    </div>
                  )}
                  {a.status === "done" && <div className="text-[10px] text-success mt-1">مكتمل</div>}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Schedule form */}
      <Card className="p-2.5 space-y-2 border-dashed">
        <div className="flex items-center gap-1.5 text-[12px] font-bold">
          <CalendarPlus className="size-3.5 text-primary" /> جدولة متابعة
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px]">العميل</Label>
            <PersonSelector people={people} personId={personId} setPersonId={setPersonId} newName={newName} setNewName={setNewName} allowCreate={false} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">التاريخ والوقت</Label>
            <Input type="datetime-local" dir="ltr" className="h-8 text-[12px]" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <Textarea rows={2} dir="rtl" className="text-[12px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="سبب المتابعة أو ما يجب فعله..." />
        <Button size="sm" onClick={doSchedule} disabled={busy} className="w-full bg-gradient-primary text-primary-foreground">
          جدولة
        </Button>
      </Card>

      {/* Log attempt */}
      <Card className="p-2.5 space-y-2 border-dashed">
        <div className="flex items-center gap-1.5 text-[12px] font-bold">
          <PhoneCall className="size-3.5 text-primary" /> تسجيل محاولة تواصل
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px]">العميل</Label>
            <PersonSelector people={people} personId={personId} setPersonId={setPersonId} newName={newName} setNewName={setNewName} allowCreate={false} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">القناة</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as FollowupChannel)}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Textarea rows={2} dir="rtl" className="text-[12px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="ملخص المحادثة (اختياري)..." />
        <Button size="sm" variant="outline" onClick={doLog} disabled={busy} className="w-full">تسجيل</Button>
      </Card>

      {/* Recent logs */}
      {logs.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-muted-foreground">آخر المحاولات</div>
          {logs.slice(0, 8).map((l) => (
            <div key={l.id} className="text-[10.5px] text-muted-foreground flex items-center gap-1.5 bg-secondary/30 rounded px-2 py-1">
              <span className="font-semibold text-foreground">{nameOf(l.person_id)}</span>
              <span className="px-1 py-0.5 rounded bg-card text-[9px]">{CHANNELS.find((c) => c.id === l.channel)?.label}</span>
              <span className="truncate flex-1">{l.message || "—"}</span>
              <span>{formatDistanceToNow(l.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
