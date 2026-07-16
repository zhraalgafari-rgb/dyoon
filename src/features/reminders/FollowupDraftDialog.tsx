import { Sparkles, Loader2, Send, Copy, Check, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bucket } from "@/lib/money/followup";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  draftFor: Bucket | null;
  draftText: string;
  aiLoading: boolean;
  onClose: () => void;
  onDraftTextChange: (text: string) => void;
  onGenerateMessage: (bucket: Bucket, tone: "polite" | "friendly" | "firm") => void;
  onSendWhatsApp: (bucket: Bucket, text: string) => void;
}

export function FollowupDraftDialog({ draftFor, draftText, aiLoading, onClose, onDraftTextChange, onGenerateMessage, onSendWhatsApp }: Props) {
  const [copied, setCopied] = useState(false);

  if (!draftFor) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      toast.success("تم النسخ");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="bg-card rounded-2xl border shadow-elevated w-full max-w-md p-4 space-y-3 animate-slide-up-fade" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
              <Sparkles className="size-4" />
            </div>
            <div>
              <div className="font-bold text-sm">رسالة لـ {draftFor.person.name}</div>
              <div className="text-[10px] text-muted-foreground">توليد وتحرير وإرسال الرسائل الذكية</div>
            </div>
          </div>
          <button onClick={onClose} className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-sm">✕</button>
        </div>

        {/* Tone Selector */}
        <div className="flex gap-1.5">
          {(["polite", "friendly", "firm"] as const).map((t) => (
            <button
              key={t}
              onClick={() => onGenerateMessage(draftFor, t)}
              className="flex-1 text-[10px] px-2 py-2 rounded-lg border bg-secondary hover:bg-primary hover:text-primary-foreground transition-all font-medium"
            >
              {t === "polite" ? "🤝 مهذبة" : t === "friendly" ? "😊 ودية" : "⚡ حازمة"}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={draftText}
            onChange={(e) => onDraftTextChange(e.target.value)}
            rows={6}
            dir="rtl"
            className="w-full text-[12px] p-3 rounded-xl border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            placeholder={aiLoading ? "جاري توليد الرسالة..." : "اكتب أو عدّل الرسالة..."}
          />
          {aiLoading && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2 text-[10.5px] text-muted-foreground bg-secondary/80 rounded-lg px-2.5 py-1.5 backdrop-blur-sm">
              <Loader2 className="size-3 animate-spin" />
              جاري التوليد بالذكاء الاصطناعي...
            </div>
          )}
        </div>

        {/* Character Count */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {draftText.length > 0
              ? `${draftText.length} حرف`
              : 'اضغط "توليد" لإنشاء رسالة'}
          </span>
          {draftText.length > 500 && (
            <span className="text-amber-600 font-medium">رسالة طويلة</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-9 text-[11px] hover:bg-primary hover:text-primary-foreground transition-all"
            onClick={copyToClipboard}
            disabled={!draftText.trim()}
          >
            {copied ? <Check className="size-3.5 ml-1 text-success" /> : <Copy className="size-3.5 ml-1" />}
            {copied ? "تم النسخ" : "نسخ"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-9 text-[11px] hover:bg-primary hover:text-primary-foreground transition-all"
            onClick={() => onGenerateMessage(draftFor, "polite")}
          >
            <RefreshCw className="size-3.5 ml-1" />
            إعادة توليد
          </Button>
          <Button
            size="sm"
            className="flex-1 h-9 text-[11px] bg-success text-success-foreground hover:bg-success/90 font-medium shadow-sm transition-all"
            disabled={!draftText.trim()}
            onClick={() => { onSendWhatsApp(draftFor, draftText); onClose(); }}
          >
            <Send className="size-3.5 ml-1" />
            إرسال واتساب
          </Button>
        </div>

        {/* Quick Send Options */}
        <div className="text-[10px] text-center text-muted-foreground pt-1 border-t border-border/30">
          <MessageCircle className="size-3 inline ml-1" />
          سيتم فتح واتساب مع {draftFor.person.name} لإرسال الرسالة مباشرة
        </div>
      </div>
    </div>
  );
}