import { useMemo, useState } from "react";
import {
  MessageCircle, Phone, Mail, FileText, Bell, Smartphone,
  ArrowUpRight, ArrowDownLeft, Bot, Trash2, ChevronDown, ChevronUp,
} from "lucide-react";
import { useContactLog, useDeleteContactLog, type ContactLog } from "@/hooks/useContactLog";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Skeleton";
import { toast } from "sonner";

const CHANNEL_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  whatsapp: { icon: <MessageCircle className="size-3.5" />, label: "واتساب",     color: "bg-green-500/10 text-green-600 border-green-500/20" },
  call:      { icon: <Phone className="size-3.5" />,          label: "مكالمة",     color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  sms:       { icon: <Smartphone className="size-3.5" />,     label: "رسالة نصية", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  email:     { icon: <Mail className="size-3.5" />,           label: "بريد",       color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  reminder:  { icon: <Bell className="size-3.5" />,           label: "تذكير",      color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  note:      { icon: <FileText className="size-3.5" />,       label: "ملاحظة",     color: "bg-secondary text-foreground border-border" },
  other:     { icon: <FileText className="size-3.5" />,       label: "أخرى",       color: "bg-secondary text-foreground border-border" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  sent:      { label: "تم الإرسال",   color: "text-blue-500" },
  delivered: { label: "تم التسليم",   color: "text-teal-500" },
  read:      { label: "تمت القراءة",  color: "text-green-500" },
  replied:   { label: "رد",           color: "text-emerald-600" },
  no_answer: { label: "لا إجابة",     color: "text-muted-foreground" },
  busy:      { label: "مشغول",        color: "text-orange-500" },
  failed:    { label: "فشل",          color: "text-danger" },
};

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

function LogCard({ log, personId }: { log: ContactLog; personId: string }) {
  const [expanded, setExpanded] = useState(false);
  const deleteLog = useDeleteContactLog(personId);
  const meta = CHANNEL_META[log.channel] ?? CHANNEL_META.other;
  const statusInfo = STATUS_LABELS[log.status] ?? { label: log.status, color: "text-muted-foreground" };
  const { date, time } = fmtDateTime(log.logged_at);
  const isIncoming = log.direction === "incoming";

  const handleDelete = async () => {
    if (!confirm("هل تريد حذف هذا السجل؟")) return;
    try {
      await deleteLog.mutateAsync(log.id);
      toast.success("تم الحذف");
    } catch {
      toast.error("فشل الحذف");
    }
  };

  return (
    <div className={`relative flex gap-3 group ${isIncoming ? "flex-row-reverse" : ""}`}>
      {/* Timeline line */}
      <div className="flex flex-col items-center gap-0">
        <div className={`size-8 rounded-full flex items-center justify-center border-2 ${meta.color} shadow-sm shrink-0`}>
          {meta.icon}
        </div>
        <div className="w-px flex-1 bg-border/50 my-1 min-h-[12px]" />
      </div>

      {/* Card */}
      <div className={`flex-1 mb-3 rounded-xl border bg-card shadow-sm p-3 group ${isIncoming ? "border-success/30 bg-success/5" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.color}`}>
              {meta.icon} {meta.label}
            </span>
            {isIncoming ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-success font-semibold">
                <ArrowDownLeft className="size-3" /> وارد
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 font-semibold">
                <ArrowUpRight className="size-3" /> صادر
              </span>
            )}
            <span className={`text-[10px] font-semibold ${statusInfo.color}`}>· {statusInfo.label}</span>
            {log.ai_generated && (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full font-bold border border-primary/20">
                <Bot className="size-3" /> ذكاء
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="text-left">
              <div className="text-[10px] font-bold text-foreground/80">{time}</div>
              <div className="text-[9px] text-muted-foreground">{date}</div>
            </div>
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-danger/60 hover:text-danger p-1 rounded"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {log.message && (
          <div className="mt-2">
            <p className={`text-[12px] text-foreground/90 whitespace-pre-wrap leading-relaxed ${!expanded && "line-clamp-3"}`}>
              {log.message}
            </p>
            {log.message.length > 120 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-0.5 text-[10px] text-primary mt-0.5 font-semibold"
              >
                {expanded ? <><ChevronUp className="size-3" /> عرض أقل</> : <><ChevronDown className="size-3" /> عرض الكل</>}
              </button>
            )}
          </div>
        )}

        {log.outcome && (
          <div className="mt-2 pt-2 border-t border-dashed border-border/50">
            <p className="text-[11px] text-muted-foreground font-medium">
              <span className="font-bold text-foreground/70">النتيجة: </span>{log.outcome}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  personId: string;
}

export function ContactLogList({ personId }: Props) {
  const { data: logs = [], isLoading } = useContactLog(personId);
  const [filterChannel, setFilterChannel] = useState<string>("all");

  const channels = useMemo(() => {
    const set = new Set(logs.map((l) => l.channel));
    return Array.from(set);
  }, [logs]);

  const filtered = useMemo(() => {
    if (filterChannel === "all") return logs;
    return logs.filter((l) => l.channel === filterChannel);
  }, [logs, filterChannel]);

  // Group by date
  const grouped = useMemo(() => {
    const g = new Map<string, ContactLog[]>();
    for (const l of filtered) {
      const d = new Date(l.logged_at).toLocaleDateString("ar-SA-u-nu-latn", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      const arr = g.get(d) ?? [];
      arr.push(l);
      g.set(d, arr);
    }
    return Array.from(g.entries());
  }, [filtered]);

  if (isLoading) return <ListSkeleton />;

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="لا يوجد تواصل مسجّل"
        description="اضغط على 'تسجيل تواصل' لإضافة مكالمة أو رسالة أو ملاحظة"
      />
    );
  }

  return (
    <div className="space-y-1">
      {/* Filter chips */}
      {channels.length > 1 && (
        <div className="flex gap-1.5 flex-wrap pb-3">
          <button
            onClick={() => setFilterChannel("all")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${filterChannel === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"}`}
          >
            الكل ({logs.length})
          </button>
          {channels.map((ch) => {
            const meta = CHANNEL_META[ch] ?? CHANNEL_META.other;
            const count = logs.filter((l) => l.channel === ch).length;
            return (
              <button
                key={ch}
                onClick={() => setFilterChannel(ch)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${filterChannel === ch ? "bg-primary text-primary-foreground border-primary" : `${meta.color}`}`}
              >
                {meta.icon} {meta.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Timeline grouped by date */}
      {grouped.map(([date, items]) => (
        <div key={date} className="space-y-0">
          <div className="flex items-center gap-2 py-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-black text-primary bg-primary/10 ring-1 ring-primary/20 px-3 py-1 rounded-full whitespace-nowrap">
              {date}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          {items.map((log) => (
            <LogCard key={log.id} log={log} personId={personId} />
          ))}
        </div>
      ))}
    </div>
  );
}
