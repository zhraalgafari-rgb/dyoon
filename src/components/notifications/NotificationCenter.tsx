import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BadgeCount } from "@/components/common/BadgeCount";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "@/lib/format";
import type { NotificationInboxItem } from "@/lib/notifications/types";

interface NotificationCenterProps {
  userId: string;
  items: NotificationInboxItem[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onArchive: (id: string) => void;
}

export function NotificationCenter({ userId, items, unreadCount, loading, onMarkRead, onArchive }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 && <BadgeCount count={unreadCount} className="absolute -top-0.5 -left-0.5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold text-sm">الإشعارات</div>
          {unreadCount > 0 && (
            <button onClick={onMarkAllRead} className="text-[11px] text-primary hover:underline">
              تعيين الكل كمقروء
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {loading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">جاري التحميل...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">لا توجد إشعارات</div>
          ) : (
            items.map(item => (
              <Card key={item.id} className={`m-2 p-2.5 cursor-pointer hover:bg-accent/50 transition-colors ${item.is_read ? "opacity-70" : "border-primary/20"}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0" onClick={() => !item.is_read && onMarkRead(item.id)}>
                    <div className="text-[12px] font-semibold truncate">{item.title}</div>
                    {item.body && <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.body}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(item.created_at)}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onArchive(item.id); }} className="text-[10px] text-muted-foreground hover:text-destructive">
                    حذف
                  </button>
                </div>
              </Card>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
