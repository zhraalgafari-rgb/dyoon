import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, CalendarPlus, PhoneCall, Check, Clock, Bell, Snooze, History, XCircle } from "lucide-react";
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

const CHANNELS: { id: FollowupChannel; label: string; icon: string }[] = [
  { id: "whatsapp", label: "واتساب", icon: "💬" },
  { id: "call", label: "اتصال", icon: "📞" },
  { id: "email", label: "بريد", icon: "📧" },
  { id: "note", label: "ملاحظة", icon: "📝" },
  { id: "other", label: "أخرى", icon: "🔗" },
];

const SNOOZE_OPTIONS = [
  { days: 1, label: "يوم واحد", icon: "🕐" },
  { days: 3, label: "3 أيام", icon: "🕒" },
  { days: 7, label: "أسبوع", icon: "📅" },
  { days: 14, label: "أسبوعين", icon: "📆" },
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
  const [activeSection, setActiveSection] = useState<"scheduled" | "schedule" | "log" | null>(null);

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
      setActiveSection(null);
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
      setActiveSection(null);
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  };

  const hasScheduled = scheduled.length > 0;
  const hasLogs = logs.length > 0;

  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-border/50">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center">
            <Users className="size-3.5" />
          </div>
          <span className="font-bold text-[12px]">جدولة وتتبع المتابعات</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveSection(activeSection === "schedule" ? null : "schedule")}
            className={`text-[10px] px-2 py-1.5 rounded-lg border transition ${activeSection === "schedule" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-secondary"
              }`}
          >
            <CalendarPlus className="size-3 inline ml-1" />
            جدولة
          </button>
          <button
            onClick={() => setActiveSection(activeSection === "log" ? null : "log")}
            className={`text-[10px] px-2 py-1.5 rounded-lg border transition ${activeSection === "log" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-secondary"
              }`}
          >
            <PhoneCall className="size-3 inline ml-1" />
            تسجيل
          </button>
        </div>
      </div>

      {/* Scheduled follow-ups */}
      {hasScheduled && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
              <Bell className="size-3 text-primary" />
              المتابعات المجدولة
              <span className="px-1.5 py-0.5 rounded bg-secondary text-[9px] font-black">{scheduled.length}</span>
            </div>
          </div>
          {isLoading ? (
            <div className="text-center text-xs text-muted-foreground py-3">جاري التحميل...</div>
          ) : (
            <div className="space-y-1.5">
              {scheduled.map((a) => {
                const overdue = a.due_at && new Date(a.due_at).getTime() < Date.now() && a.status === "pending";
                return (
                  <Card key={a.id} className={`p-3 flex items-start gap-2.5 transition-all ${overdue ? "border-danger/40 ring-1 ring-danger/20" : "hover:shadow-card"}`}>
                    <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${overdue ? "bg-danger-soft text-danger" : "bg-primary/10 text-primary"}`}>
                      <Clock className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[12px] truncate">{nameOf(a.person_id)}</span>
                        {a.due_at && (
                          <span className={`text-[10px] shrink-0 ${overdue ? "text-danger font-bold" : "text-muted-foreground"}`}>
                            {fmtDate(a.due_at)} · {fmtTime(a.due_at)}
                          </span>
                        )}
                      </div>
                      {a.body && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{a.body}</div>}
                      {a.status === "pending" && (
                        <div className="flex items-center gap-1 mt-2">
                          <button
                            onClick={async () => { await completeAlert({ data: { userId, id: a.id } }); refresh(); }}
                            className="text-[10px] inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors font-medium"
                          >
                            <Check className="size-2.5" /> إكمال
                          </button>
                          <div className="flex items-center gap-0.5 mr-1">
                            {SNOOZE_OPTIONS.slice(0, 2).map((opt) => (
                              <button
                                key={opt.days}
                                onClick={async () => { await snoozeAlert({ data: { userId, id: a.id, days: opt.days } }); refresh(); }}
                                className="text-[9px] px-1.5 py-0.5 rounded border bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                              >
                                {opt.icon} {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {a.status === "done" && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-success font-medium">
                          <Check className="size-2.5" /> مكتمل
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Schedule Form */}
      {activeSection === "schedule" && (
        <Card className="p-3 space-y-2.5 border-2 border-primary/20 bg-gradient-to-br from-primary/[0.02] to-primary/[0.06] animate-slide-up-fade">
          <div className="flex items-center gap-1.5 text-[12px] font-bold">
            <CalendarPlus className="size-3.5 text-primary" />
            جدولة متابعة جديدة
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
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px]" onClick={() => setActiveSection(null)}>
              إلغاء
            </Button>
            <Button size="sm" onClick={doSchedule} disabled={busy} className="flex-1 h-8 text-[11px] bg-gradient-primary text-primary-foreground">
              {busy ? "جاري الجدولة..." : "جدولة"}
            </Button>
          </div>
        </Card>
      )}

      {/* Log Attempt Form */}
      {activeSection === "log" && (
        <Card className="p-3 space-y-2.5 border-2 border-primary/20 bg-gradient-to-br from-primary/[0.02] to-primary/[0.06] animate-slide-up-fade">
          <div className="flex items-center gap-1.5 text-[12px] font-bold">
            <PhoneCall className="size-3.5 text-primary" />
            تسجيل محاولة تواصل
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
                  {CHANNELS.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea rows={2} dir="rtl" className="text-[12px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="ملخص المحادثة (اختياري)..." />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px]" onClick={() => setActiveSection(null)}>
              إلغاء
            </Button>
            <Button size="sm" variant="outline" onClick={doLog} disabled={busy} className="flex-1 h-8 text-[11px]">تسجيل</Button>
          </div>
        </Card>
      )}

      {/* Recent Logs Timeline */}
      {hasLogs && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
            <History className="size-3 text-primary" />
            آخر المحاولات
            <span className="px-1.5 py-0.5 rounded bg-secondary text-[9px] font-black">{logs.length}</span>
          </div>
          <div className="space-y-1">
            {logs.slice(0, 8).map((l, index) => {
              const channelInfo = CHANNELS.find((c) => c.id === l.channel);
              return (
                <div
                  key={l.id}
                  className="text-[10.5px] flex items-center gap-2 bg-secondary/30 rounded-lg px-2.5 py-2 hover:bg-secondary/50 transition-colors animate-slide-up-fade"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                    {channelInfo?.icon || "🔗"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">{nameOf(l.person_id)}</span>
                      <span className="px-1 py-0.5 rounded bg-card text-[9px] text-muted-foreground">{channelInfo?.label || l.channel}</span>
                    </div>
                    {l.message && <div className="text-[10px] text-muted-foreground truncate mt-0.5">{l.message}</div>}
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0">{formatDistanceToNow(l.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasScheduled && !hasLogs && !activeSection && (
        <div className="text-center py-6 text-muted-foreground">
          <div className="size-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
            <CalendarPlus className="size-6 text-muted-foreground opacity-60" />
          </div>
          <div className="text-[12px] font-medium mb-1">لا توجد متابعات مجدولة</div>
          <div className="text-[10px]">استخدم الأزرار أعلاه لجدولة متابعة أو تسجيل محاولة تواصل</div>
        </div>
      )}
    </div>
  );
}