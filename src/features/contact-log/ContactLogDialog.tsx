import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle, Phone, Mail, FileText, Bell, Loader2,
  Sparkles, Send, ArrowUpRight, ArrowDownLeft, Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateContactMessage } from "@/lib/ai.contact.functions";
import {
  useAddContactLog,
  type ContactChannel,
  type ContactDirection,
  type ContactStatus,
} from "@/hooks/useContactLog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  personId: string;
  personName: string;
  phone?: string | null;
  amount?: number;
  currency?: string;
}

const CHANNELS: { id: ContactChannel; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "whatsapp", label: "واتساب", icon: <MessageCircle className="size-4" />, color: "bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/25" },
  { id: "call",     label: "مكالمة", icon: <Phone className="size-4" />,          color: "bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/25" },
  { id: "sms",      label: "رسالة نصية", icon: <Smartphone className="size-4" />, color: "bg-purple-500/15 text-purple-600 border-purple-500/30 hover:bg-purple-500/25" },
  { id: "email",    label: "بريد", icon: <Mail className="size-4" />,             color: "bg-orange-500/15 text-orange-600 border-orange-500/30 hover:bg-orange-500/25" },
  { id: "reminder", label: "تذكير", icon: <Bell className="size-4" />,            color: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 hover:bg-yellow-500/25" },
  { id: "note",     label: "ملاحظة", icon: <FileText className="size-4" />,       color: "bg-secondary text-foreground border-border hover:bg-secondary/80" },
];

const DIRECTIONS: { id: ContactDirection; label: string; icon: React.ReactNode }[] = [
  { id: "outgoing", label: "صادر (أرسلته)",     icon: <ArrowUpRight className="size-4 text-blue-500" /> },
  { id: "incoming", label: "وارد (رد العميل)", icon: <ArrowDownLeft className="size-4 text-green-500" /> },
];

const STATUSES: Record<ContactChannel, { id: ContactStatus; label: string }[]> = {
  whatsapp: [
    { id: "sent", label: "تم الإرسال" },
    { id: "delivered", label: "تم التسليم" },
    { id: "read", label: "تمت القراءة" },
    { id: "replied", label: "رد علينا" },
    { id: "failed", label: "فشل الإرسال" },
  ],
  call: [
    { id: "replied", label: "تم الرد" },
    { id: "no_answer", label: "لا إجابة" },
    { id: "busy", label: "مشغول" },
    { id: "failed", label: "فشل الاتصال" },
  ],
  sms: [
    { id: "sent", label: "تم الإرسال" },
    { id: "delivered", label: "تم التسليم" },
    { id: "replied", label: "رد علينا" },
    { id: "failed", label: "فشل الإرسال" },
  ],
  email: [
    { id: "sent", label: "تم الإرسال" },
    { id: "read", label: "تمت القراءة" },
    { id: "replied", label: "رد علينا" },
    { id: "failed", label: "فشل الإرسال" },
  ],
  reminder: [
    { id: "sent", label: "تم الإرسال" },
    { id: "replied", label: "رد العميل" },
  ],
  note: [
    { id: "sent", label: "تم الحفظ" },
  ],
  other: [
    { id: "sent", label: "تم" },
    { id: "replied", label: "رد" },
  ],
};

export function ContactLogDialog({
  open, onOpenChange, personId, personName, phone, amount, currency,
}: Props) {
  const addLog = useAddContactLog();
  const genMsg = useServerFn(generateContactMessage);

  const [channel, setChannel] = useState<ContactChannel>("whatsapp");
  const [direction, setDirection] = useState<ContactDirection>("outgoing");
  const [status, setStatus] = useState<ContactStatus>("sent");
  const [message, setMessage] = useState("");
  const [outcome, setOutcome] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [loggedAt, setLoggedAt] = useState(
    new Date().toISOString().slice(0, 16) // datetime-local format
  );

  const availableStatuses = STATUSES[channel] ?? STATUSES.other;

  const handleChannelChange = (ch: ContactChannel) => {
    setChannel(ch);
    const statuses = STATUSES[ch];
    if (statuses?.length) setStatus(statuses[0].id);
  };

  const generateAiMessage = async () => {
    setAiLoading(true);
    try {
      const r = await genMsg({
        data: {
          person_name: personName,
          channel,
          direction,
          amount: amount ?? 0,
          currency: currency ?? "",
        },
      });
      setMessage(r.message);
    } catch (e: any) {
      toast.error(e?.message ?? "تعذّر توليد الرسالة");
    } finally {
      setAiLoading(false);
    }
  };

  const sendWhatsApp = () => {
    if (!message) return;
    const text = encodeURIComponent(message);
    const p = phone ? phone.replace(/\D/g, "") : "";
    window.open(p ? `https://wa.me/${p}?text=${text}` : `https://wa.me/?text=${text}`, "_blank");
  };

  const handleSave = async () => {
    if (!message.trim() && !outcome.trim()) {
      toast.error("أدخل رسالة أو ملاحظة على الأقل");
      return;
    }
    try {
      await addLog.mutateAsync({
        person_id: personId,
        channel,
        direction,
        status,
        message: message.trim() || undefined,
        outcome: outcome.trim() || undefined,
        ai_generated: false,
        logged_at: new Date(loggedAt).toISOString(),
      });
      toast.success("تم تسجيل التواصل");
      onOpenChange(false);
      setMessage("");
      setOutcome("");
    } catch (e: any) {
      toast.error(e?.message ?? "فشل الحفظ");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined} dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-primary">📋</span> تسجيل تواصل مع {personName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-right">
          {/* Channel */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground mb-2">قناة التواصل</p>
            <div className="grid grid-cols-3 gap-1.5">
              {CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => handleChannelChange(ch.id)}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-[11px] font-semibold transition-all ${
                    channel === ch.id
                      ? ch.color + " ring-2 ring-offset-1 ring-current/40"
                      : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {ch.icon} {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Direction */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground mb-2">الاتجاه</p>
            <div className="grid grid-cols-2 gap-2">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDirection(d.id)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-semibold transition-all ${
                    direction === d.id
                      ? "bg-primary/10 text-primary border-primary/40 ring-1 ring-primary/30"
                      : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {d.icon} {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground mb-2">الحالة</p>
            <div className="flex flex-wrap gap-1.5">
              {availableStatuses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatus(s.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                    status === s.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground mb-2">التاريخ والوقت</p>
            <input
              type="datetime-local"
              value={loggedAt}
              onChange={(e) => setLoggedAt(e.target.value)}
              className="w-full h-9 rounded-lg border bg-background px-3 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-muted-foreground">الرسالة / المحتوى</p>
              {channel !== "note" && (
                <button
                  onClick={generateAiMessage}
                  disabled={aiLoading}
                  className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full hover:bg-primary/20 transition-colors"
                >
                  {aiLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                  توليد بالذكاء
                </button>
              )}
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={channel === "note" ? "اكتب ملاحظتك هنا..." : "اكتب الرسالة أو اضغط توليد بالذكاء..."}
              rows={4}
              className="text-[13px] resize-none"
            />
            {channel === "whatsapp" && message && (
              <button
                onClick={sendWhatsApp}
                className="mt-1.5 flex items-center gap-1 text-[11px] text-green-600 font-bold hover:underline"
              >
                <Send className="size-3" /> إرسال عبر واتساب
              </button>
            )}
          </div>

          {/* Outcome */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground mb-2">نتيجة التواصل / ملاحظة</p>
            <Textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="مثال: وعد بالدفع الأسبوع القادم، طلب مهلة أسبوع..."
              rows={2}
              className="text-[12px] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={addLog.isPending}
              className="flex-1 bg-gradient-primary text-primary-foreground h-10 font-bold"
            >
              {addLog.isPending ? <Loader2 className="size-4 animate-spin" /> : "✓ حفظ السجل"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="px-4">
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
