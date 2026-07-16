import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { Bell, BellRing, Clock, MessageSquare, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { notificationService } from "@/lib/notifications";
import type { NotificationPreference } from "@/lib/notifications/types";
import { getPreferences, updatePreference } from "@/lib/notifications/server";

const CHANNELS: Array<{ value: string; label: string; icon: typeof Bell }> = [
  { value: "in_app", label: "داخل التطبيق", icon: MessageSquare },
  { value: "push", label: "إشعارات المتصفح", icon: Smartphone },
  { value: "email", label: "البريد الإلكتروني", icon: Mail },
];

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "reminder", label: "التذكيرات" },
  { value: "overdue", label: "الديون المتأخرة" },
  { value: "payment_received", label: "المدفوعات المستلمة" },
  { value: "payment_sent", label: "المدفوعات المرسلة" },
  { value: "recurring", label: "العمليات المتكررة" },
  { value: "backup", label: "النسخ الاحتياطي" },
  { value: "system", label: "النظام" },
];

export function NotificationPreferences({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrefs();
  }, [userId]);

  const loadPrefs = async () => {
    setLoading(true);
    const data = await getPreferences({ data: { userId } });
    setPrefs(data as NotificationPreference[]);
    setLoading(false);
  };

  const toggle = async (category: string, channel: string, enabled: boolean) => {
    await updatePreference({ data: { userId, category, channel, updates: { enabled } } });
    setPrefs(prev => prev.map(p => p.category === category && p.channel === channel ? { ...p, enabled } : p));
    toast.success(enabled ? "تم تفعيل الإشعار" : "تم تعطيل الإشعار");
  };

  if (loading) return <div className="p-4 text-center text-xs text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      {CATEGORIES.map(cat => (
        <Card key={cat.value} className="p-3 space-y-2.5">
          <div className="font-semibold text-[12px]">{cat.label}</div>
          <div className="space-y-2">
            {CHANNELS.map(ch => {
              const pref = prefs.find(p => p.category === cat.value && p.channel === ch.value);
              const enabled = pref?.enabled ?? true;
              return (
                <div key={ch.value} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ch.icon className="size-3.5 text-muted-foreground" />
                    <span className="text-[12px]">{ch.label}</span>
                  </div>
                  <Switch checked={enabled} onCheckedChange={(v) => toggle(cat.value, ch.value, v)} />
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
