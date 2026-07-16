import { Card } from "@/components/ui/card";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "@/lib/format";
import type { NotificationInboxItem } from "@/lib/notifications/types";
import { EmptyState } from "@/components/EmptyState";

const CATEGORY_LABEL: Record<string, { label: string; color: string }> = {
  reminder: { label: "تذكير", color: "bg-primary/10 text-primary" },
  overdue: { label: "دين متأخر", color: "bg-danger/10 text-danger" },
  payment_received: { label: "تم استلام دفعة", color: "bg-success/10 text-success" },
  payment_sent: { label: "تم إرسال دفعة", color: "bg-blue-500/10 text-blue-600" },
  recurring: { label: "متكرر", color: "bg-purple-500/10 text-purple-600" },
  backup: { label: "نسخة احتياطية", color: "bg-orange-500/10 text-orange-600" },
  system: { label: "النظام", color: "bg-secondary text-foreground" },
  marketing: { label: "عرض", color: "bg-yellow-400/10 text-yellow-700" },
};

interface Props {
  items: NotificationInboxItem[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onArchive: (id: string) => void;
}

export function NotificationList({ items, unreadCount, loading, onMarkRead, onMarkAllRead, onArchive }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-secondary/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="لا توجد إشعارات"
        description="ستظهر هنا تنبيهاتك وتذكيراتك عند وصولها. يمكنك الضغط على 'مزامنة' لتحديث التنبيهات."
      />
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm font-bold text-muted-foreground">
          {items.length} إشعار{unreadCount > 0 && ` · ${unreadCount} غير مقروء`}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
          >
            <CheckCheck className="size-3.5" />
            تعيين الكل كمقروء
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {items.map((item) => {
          const meta = CATEGORY_LABEL[item.category] ?? { label: item.category, color: "bg-secondary text-foreground" };
          return (
            <Card
              key={item.id}
              className={`p-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-accent/40 ${!item.is_read ? "border-primary/30 bg-primary/3" : "opacity-80"}`}
              onClick={() => !item.is_read && onMarkRead(item.id)}
            >
              {/* Unread dot */}
              <div className="shrink-0 mt-1">
                {!item.is_read ? (
                  <span className="size-2 rounded-full bg-primary block" />
                ) : (
                  <span className="size-2 rounded-full bg-transparent block" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm leading-tight ${!item.is_read ? "text-foreground" : "text-foreground/80"}`}>
                      {item.title}
                    </div>
                    {item.body && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.body}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(item.created_at)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onArchive(item.id); }}
                    className="shrink-0 p-1.5 rounded-lg text-muted-foreground/50 hover:text-danger hover:bg-danger/10 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
