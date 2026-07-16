import { Card } from "@/components/ui/card";
import type { NotifStats } from "@/lib/notifications/types";

interface NotificationStatsProps {
  stats: NotifStats | null;
  loading: boolean;
}

export function NotificationStats({ stats, loading }: NotificationStatsProps) {
  if (loading) return <div className="p-4 text-center text-xs text-muted-foreground">جاري التحميل...</div>;
  if (!stats) return <div className="p-4 text-center text-xs text-muted-foreground">لا توجد بيانات</div>;

  const items = [
    { label: "تم الإرسال", value: stats.totalSent, color: "text-primary" },
    { label: "تم التسليم", value: stats.totalDelivered, color: "text-success" },
    { label: "تمت القراءة", value: stats.totalRead, color: "text-info" },
    { label: "فشل", value: stats.totalFailed, color: "text-danger" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {items.map(item => (
          <Card key={item.label} className="p-3 text-center">
            <div className={`text-xl font-black ${item.color}`}>{item.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{item.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-3 space-y-2">
        <div className="text-[12px] font-semibold">حسب القناة</div>
        <div className="space-y-1.5">
          {Object.entries(stats.byChannel).map(([channel, count]) => (
            <div key={channel} className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">{channel}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
          {Object.keys(stats.byChannel).length === 0 && <div className="text-[11px] text-muted-foreground">لا توجد بيانات</div>}
        </div>
      </Card>

      <Card className="p-3 space-y-2">
        <div className="text-[12px] font-semibold">حسب التصنيف</div>
        <div className="space-y-1.5">
          {Object.entries(stats.byCategory).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">{category}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
          {Object.keys(stats.byCategory).length === 0 && <div className="text-[11px] text-muted-foreground">لا توجد بيانات</div>}
        </div>
      </Card>
    </div>
  );
}
