import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, ListFilter, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { NotificationStats } from "@/components/notifications/NotificationStats";

export const Route = createFileRoute("/app/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const userId = Route.useSearch().userId ?? "";
  const { items, unreadCount, stats, loading, refresh, handleMarkRead, handleMarkAllRead, handleArchive } = useNotifications(userId);

  return (
    <div className="space-y-2.5">
      <PageHeader icon={Bell} title="الإشعارات" subtitle="تنبيهاتك وتذكيراتك" back="/app" />

      <Tabs defaultValue="center" className="space-y-2.5">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="center" className="gap-1.5">
            <ListFilter className="size-3.5" />
            <span>المركز</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            <span>الإحصائيات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="center">
          <Card className="p-2.5">
            <NotificationCenter
              userId={userId}
              items={items}
              unreadCount={unreadCount}
              loading={loading}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
              onArchive={handleArchive}
            />
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <NotificationStats stats={stats} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
