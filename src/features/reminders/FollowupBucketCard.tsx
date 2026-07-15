import { Bucket, severityMeta } from "@/lib/money/followup";
import { fmtMoney } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { Phone, Clock, Sparkles, MessageCircle, Copy, PhoneCall, CalendarPlus, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  bucket: Bucket;
  onGenerateMessage: (bucket: Bucket, tone?: "polite" | "firm" | "friendly") => void;
  onSendWhatsApp: (bucket: Bucket, text: string) => void;
}

export function FollowupBucketCard({ bucket, onGenerateMessage, onSendWhatsApp }: Props) {
  const meta = severityMeta[bucket.severity];
  const [showActions, setShowActions] = useState(false);

  function getSuggestions(b: Bucket): string[] {
    const out: string[] = [];
    if (b.severity === "critical") {
      out.push(b.suggestedAction || "اتصل مباشرة بالعميل وحدد موعداً نهائياً للسداد.");
      out.push("اقترح تقسيط المبلغ على دفعتين أو ثلاث.");
      out.push("ابدأ بإيقاف أي تعاملات جديدة حتى السداد.");
    } else if (b.severity === "late") {
      out.push(b.suggestedAction || "أرسل تذكيراً مهذباً عبر الواتساب الآن.");
      out.push("حدّد موعد سداد جديد ودوّنه كتذكير.");
    } else if (b.severity === "soon") {
      out.push(b.suggestedAction || "أرسل تذكيراً ودياً قبل موعد الاستحقاق.");
    }
    if (b.person.credit_limit && b.net > b.person.credit_limit) {
      out.push("تجاوز الحد الائتماني — يفضل تقليل التعامل الآجل.");
    }
    return out;
  }

  const suggestions = getSuggestions(bucket);

  // Calculate severity percentage for progress bar
  const severityPercentage = bucket.severity === "critical" ? 100 :
    bucket.severity === "late" ? 75 :
      bucket.severity === "soon" ? 50 : 25;

  const copyPhone = () => {
    if (bucket.person.phone) {
      navigator.clipboard.writeText(bucket.person.phone);
      toast.success("تم نسخ رقم الهاتف");
    }
  };

  return (
    <div className={`rounded-xl border bg-card shadow-card p-3 space-y-2.5 ring-1 ${meta.ring} transition-all hover:shadow-elevated`}>
      {/* Header Section - Person & Amount */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${meta.cls}`}>
            {bucket.severity === "critical" && <AlertCircle className="size-5" />}
            {bucket.severity === "late" && <Clock className="size-5" />}
            {bucket.severity === "soon" && <TrendingUp className="size-5" />}
            {bucket.severity === "ok" && <Sparkles className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <Link to="/app/person/$id" params={{ id: bucket.person.id }} className="font-bold text-[13px] text-foreground hover:text-primary block truncate">
              {bucket.person.name}
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${meta.cls}`}>
                {meta.label}
              </span>
              {bucket.daysOverdue >= 0 && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="size-2.5" />
                  {bucket.daysOverdue === 0 ? "اليوم" : `${bucket.daysOverdue} يوم`}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-left shrink-0">
          <div className="text-[10px] text-muted-foreground mb-0.5">المستحق</div>
          <div className="font-black tabular-nums text-danger text-base leading-tight">
            {fmtMoney(bucket.net)}
          </div>
          <div className="text-[10px] text-muted-foreground">{bucket.currency}</div>
        </div>
      </div>

      {/* Severity Progress Bar */}
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bucket.severity === "critical" ? "bg-danger" :
            bucket.severity === "late" ? "bg-danger" :
              bucket.severity === "soon" ? "bg-amber-500" : "bg-success"
            }`}
          style={{ width: `${severityPercentage}%` }}
        />
      </div>

      {/* Days until escalation indicator */}
      {bucket.daysUntilEscalation > 0 && bucket.severity !== "ok" && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 py-1.5 border border-amber-200 dark:border-amber-800/30">
          <Clock className="size-3" />
          <span>
            {bucket.severity === "soon"
              ? `متبقي ${bucket.daysUntilEscalation} أيام قبل التأخير`
              : `ترقية خلال ${bucket.daysUntilEscalation} أيام`
            }
          </span>
        </div>
      )}
      {bucket.severity === "critical" && bucket.daysUntilEscalation < 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-danger bg-danger-soft/50 rounded-lg px-2 py-1.5 border border-danger/20">
          <AlertCircle className="size-3" />
          <span className="font-medium">مضى {Math.abs(bucket.daysUntilEscalation)} يوم على التصنيف الحرج</span>
        </div>
      )}

      {/* Details Section */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10.5px] text-muted-foreground bg-secondary/30 rounded-lg px-2.5 py-2">
        {bucket.person.phone && (
          <button
            onClick={copyPhone}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            title="نسخ الرقم"
          >
            <Phone className="size-3" />
            <span dir="ltr">{bucket.person.phone}</span>
            <Copy className="size-2.5 opacity-60" />
          </button>
        )}
        <span className="flex items-center gap-1">
          <MessageCircle className="size-3" />
          {bucket.txCount} معاملة
        </span>
        {bucket.oldestDue && (
          <span className="flex items-center gap-1">
            <CalendarPlus className="size-3" />
            أقدم استحقاق: {new Date(bucket.oldestDue).toLocaleDateString('ar-SA')}
          </span>
        )}
      </div>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-primary flex items-center gap-1">
            <Sparkles className="size-3" />
            اقتراحات ذكية
          </div>
          <ul className="text-[10.5px] space-y-1 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-2 border border-primary/20">
            {suggestions.map((s, i) => (
              <li key={i} className="flex gap-2 items-start">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span className="flex-1 leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions Section */}
      <div className="flex gap-1.5 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2.5 text-[11px] flex-1 font-medium hover:bg-primary hover:text-primary-foreground transition-all"
          onClick={() => onGenerateMessage(bucket, "polite")}
        >
          <Sparkles className="size-3.5 ml-1" />
          رسالة ذكية
        </Button>
        <Button
          size="sm"
          className="h-8 px-2.5 text-[11px] flex-1 bg-success text-success-foreground hover:bg-success/90 font-medium shadow-sm"
          onClick={() => {
            const t = `السلام عليكم ${bucket.person.name}،\nتذكير ودي بمبلغ ${fmtMoney(bucket.net)} ${bucket.currency} المستحق.\nشكراً لتعاونكم.`;
            onSendWhatsApp(bucket, t);
          }}
        >
          <MessageCircle className="size-3.5 ml-1" />
          واتساب
        </Button>
        {bucket.person.phone && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-[11px] hover:bg-primary hover:text-primary-foreground transition-all"
            onClick={() => window.location.href = `tel:${bucket.person.phone}`}
            title="اتصال مباشر"
          >
            <PhoneCall className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}