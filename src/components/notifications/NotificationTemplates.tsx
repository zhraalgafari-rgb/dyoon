import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { notificationService } from "@/lib/notifications";
import type { NotificationTemplate } from "@/lib/notifications/types";
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from "@/lib/notifications/server";

const CATEGORIES = [
  { value: "reminder", label: "تذكير" },
  { value: "overdue", label: "دين متأخر" },
  { value: "payment_received", label: "مدفوعات مستلمة" },
  { value: "payment_sent", label: "مدفوعات مرسلة" },
  { value: "recurring", label: "عمليات متكررة" },
  { value: "backup", label: "نسخ احتياطي" },
  { value: "system", label: "نظام" },
  { value: "marketing", label: "تسويق" },
];

const CHANNELS = [
  { value: "in_app", label: "داخل التطبيق" },
  { value: "push", label: "إشعارات المتصفح" },
  { value: "email", label: "بريد إلكتروني" },
  { value: "sms", label: "رسائل نصية" },
];

export function NotificationTemplates({ userId }: { userId: string }) {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [form, setForm] = useState({ name: "", category: "reminder", channel: "in_app", subject: "", body: "", body_ar: "", variables: "", is_active: true });

  useEffect(() => { load(); }, [userId]);

  const load = async () => {
    const data = await getTemplates({ data: { userId } });
    setTemplates(data as NotificationTemplate[]);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await updateTemplate({ data: { userId, id: editing.id, updates: { ...form, variables: form.variables.split(",").map(v => v.trim()).filter(Boolean) } } });
        toast.success("تم تحديث القالب");
      } else {
        await createTemplate({ data: { userId, template: { ...form, variables: form.variables.split(",").map(v => v.trim()).filter(Boolean) } } });
        toast.success("تم إنشاء القالب");
      }
      setOpen(false);
      setEditing(null);
      setForm({ name: "", category: "reminder", channel: "in_app", subject: "", body: "", body_ar: "", variables: "", is_active: true });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate({ data: { userId, id } });
    toast.success("تم حذف القالب");
    load();
  };

  const startEdit = (t: NotificationTemplate) => {
    setEditing(t);
    setForm({ name: t.name, category: t.category, channel: t.channel, subject: t.subject ?? "", body: t.body, body_ar: t.body_ar ?? "", variables: (t.variables ?? []).join(", "), is_active: t.is_active });
    setOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold">القوالب النشطة</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-[11px]" onClick={() => { setEditing(null); setForm({ name: "", category: "reminder", channel: "in_app", subject: "", body: "", body_ar: "", variables: "", is_active: true }); }}>
              <Plus className="size-3 mr-1" /> قالب جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "تعديل القالب" : "قالب جديد"}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-4">
              <div className="space-y-1">
                <Label className="text-[11px]">الاسم</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-8 text-[12px]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">التصنيف</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">القناة</Label>
                  <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">الموضوع</Label>
                <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="h-8 text-[12px]" dir="rtl" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">المحتوى (AR)</Label>
                <Textarea value={form.body_ar} onChange={e => setForm({ ...form, body_ar: e.target.value })} className="text-[12px] min-h-[80px]" dir="rtl" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">المحتوى (Default)</Label>
                <Textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="text-[12px] min-h-[80px]" dir="rtl" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">المتغيرات (مفصولة بفاصلة)</Label>
                <Input value={form.variables} onChange={e => setForm({ ...form, variables: e.target.value })} className="h-8 text-[12px]" dir="ltr" placeholder="name, amount, due_date" />
              </div>
              <Button onClick={handleSave} className="w-full h-8 text-[12px]">حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {templates.length === 0 && <div className="text-center text-xs text-muted-foreground py-4">لا توجد قوالب بعد</div>}
        {templates.map(t => (
          <Card key={t.id} className="p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] font-semibold">{t.name}</div>
                <div className="text-[10px] text-muted-foreground">{t.category} · {t.channel} {t.is_active ? "· نشط" : "· معطل"}</div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(t)}><span className="text-[10px]">✏️</span></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="size-3" /></Button>
              </div>
            </div>
            {templates.subject && <div className="text-[11px] text-muted-foreground">الموضوع: {templates.subject}</div>}
            <div className="text-[11px] text-muted-foreground line-clamp-2">{templates.body}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
