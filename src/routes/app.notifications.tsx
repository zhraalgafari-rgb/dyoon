import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, ListFilter, BarChart3, CalendarClock, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/lib/auth";
import { NotificationList } from "@/components/notifications/NotificationList";
import { NotificationStats } from "@/components/notifications/NotificationStats";
import { AlertsDashboard } from "@/components/notifications/AlertsDashboard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/app/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [syncing, setSyncing] = useState(false);
  const { items, unreadCount, stats, loading, refresh, handleMarkRead, handleMarkAllRead, handleArchive } = useNotifications(userId);

  const syncAlerts = async () => {
    setSyncing(true);
    try {
      await Promise.all([
        (supabase.rpc as any)("sync_overdue_alerts"),
        (supabase.rpc as any)("fire_due_alerts"),
      ]);
      refresh();
      toast.success("تم تحديث التنبيهات");
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر المزامنة");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <PageHeader icon={Bell} title="الإشعارات" subtitle="تنبيهاتك وتذكيراتك" back="/app" />
        <button
          onClick={syncAlerts}
          disabled={syncing}
          className="shrink-0 mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-secondary hover:bg-secondary/70 text-muted-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
          مزامنة
        </button>
      </div>

      <Tabs defaultValue="center" className="space-y-2.5">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="center" className="gap-1.5">
            <ListFilter className="size-3.5" />
            <span>المركز</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center size-4 rounded-full bg-danger text-danger-foreground text-[9px] font-black">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5">
            <CalendarClock className="size-3.5" />
            <span>المتابعة</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            <span>الإحصائيات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="center">
          <NotificationList
            items={items}
            unreadCount={unreadCount}
            loading={loading}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onArchive={handleArchive}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsDashboard userId={userId} />
        </TabsContent>

        <TabsContent value="stats">
          <NotificationStats stats={stats} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
