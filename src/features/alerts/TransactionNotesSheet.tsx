import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareText, Bell, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { fmtDate, fmtTime, formatDistanceToNow } from "@/lib/format";
import { listTransactionNotes, createTransactionNote } from "@/lib/alerts/server";
import type { TransactionNote } from "@/lib/alerts/types";

interface Props {
  transactionId: string;
  personId?: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function TransactionNotesSheet({ transactionId, personId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: notes = [], isLoading } = useQuery<TransactionNote[]>({
    queryKey: ["txnNotes", user?.id, transactionId],
    queryFn: () => listTransactionNotes({ data: { userId: user!.id, transactionId } }),
    enabled: !!user && open,
  });

  const add = async () => {
    if (!user || !body.trim()) return;
    setBusy(true);
    try {
      await createTransactionNote({ data: { userId: user.id, transactionId, body: body.trim() } });
      setBody("");
      await qc.invalidateQueries({ queryKey: ["txnNotes", user.id, transactionId] });
      toast.success("تمت إضافة الملاحظة");
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <MessageSquareText className="size-4 text-primary" /> ملاحظات المعاملة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-xs text-muted-foreground py-4">جاري التحميل...</div>
          ) : notes.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4">لا توجد ملاحظات بعد</div>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="rounded-lg border bg-card p-2.5 space-y-1">
                <div className="text-[12px] leading-relaxed">{n.body}</div>
                {n.has_reminder && n.parsed_due_at && (
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    <Bell className="size-2.5" />
                    تذكير: {fmtDate(n.parsed_due_at)} · {fmtTime(n.parsed_due_at)}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground">{formatDistanceToNow(n.created_at)}</div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-1.5 pt-1 border-t">
          <Textarea
            rows={3}
            dir="rtl"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="اكتب ملاحظة... مثال: اتصل بالعميل في 20 يوليو الساعة 10:00 صباحاً"
          />
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="size-3" />
            إذا احتوت الملاحظة تاريخاً ووقتاً، سيُنشأ تذكير تلقائياً.
          </div>
          <Button onClick={add} disabled={busy || !body.trim()} className="w-full bg-gradient-primary text-primary-foreground">
            {busy ? "..." : "إضافة ملاحظة"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
