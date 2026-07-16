import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Settings2, FileText } from "lucide-react";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { NotificationTemplates } from "@/components/notifications/NotificationTemplates";

export const Route = createFileRoute("/app/settings/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  return (
    <div className="space-y-2.5">
      <PageHeader icon={Bell} title="الإشعارات" subtitle="إدارة التفضيلات والقوالب" back="/app/settings" />

      <Tabs defaultValue="preferences" className="space-y-2.5">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preferences" className="gap-1.5">
            <Settings2 className="size-3.5" />
            <span>التفضيلات</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <FileText className="size-3.5" />
            <span>القوالب</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preferences">
          <Card className="p-2.5">
            <NotificationPreferences />
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card className="p-2.5">
            <NotificationTemplates />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
