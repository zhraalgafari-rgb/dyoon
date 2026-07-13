import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notificationService } from "@/lib/notifications";
import type { NotificationInboxItem, NotifStats } from "@/lib/notifications/types";
import { getInbox, getUnreadCount, markRead, markAllRead, archiveNotification, getStats } from "@/lib/notifications/server";

export function useNotifications(userId: string | undefined) {
  const [items, setItems] = useState<NotificationInboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<NotifStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    const [inbox, count, s] = await Promise.all([
      getInbox({ data: { userId } }),
      getUnreadCount({ data: { userId } }),
      getStats({ data: { userId } }),
    ]);
    setItems(inbox as NotificationInboxItem[]);
    setUnreadCount(count as number);
    setStats(s as NotifStats);
    setLoading(false);
  }, [userId]);

  // Initial load
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchAll().catch(() => setLoading(false));
  }, [userId, fetchAll]);

  // Realtime subscription — inbox updates instantly when server fires alerts
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:inbox:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_inbox",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Re-fetch the full list so counts + items stay in sync
          fetchAll();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchAll]);

  const refresh = fetchAll;

  const handleMarkRead = async (id: string) => {
    await markRead({ data: { userId: userId!, inboxId: id } });
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_read: true, read_at: new Date().toISOString() } : i));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllRead({ data: { userId: userId! } });
    setItems(prev => prev.map(i => ({ ...i, is_read: true, read_at: new Date().toISOString() })));
    setUnreadCount(0);
  };

  const handleArchive = async (id: string) => {
    await archiveNotification({ data: { userId: userId!, inboxId: id } });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return { items, unreadCount, stats, loading, refresh, handleMarkRead, handleMarkAllRead, handleArchive };
}
