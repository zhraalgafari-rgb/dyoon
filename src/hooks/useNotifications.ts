import { useState, useEffect } from "react";
import { notificationService } from "@/lib/notifications";
import type { NotificationInboxItem, NotifStats } from "@/lib/notifications/types";
import { getInbox, getUnreadCount, markRead, markAllRead, archiveNotification, getStats } from "@/lib/notifications/server";

export function useNotifications(userId: string | undefined) {
  const [items, setItems] = useState<NotificationInboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<NotifStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      getInbox({ data: { userId } }),
      getUnreadCount({ data: { userId } }),
      getStats({ data: { userId } }),
    ]).then(([inbox, count, s]) => {
      setItems(inbox as NotificationInboxItem[]);
      setUnreadCount(count as number);
      setStats(s as NotifStats);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  const refresh = async () => {
    if (!userId) return;
    const [inbox, count, s] = await Promise.all([
      getInbox({ data: { userId } }),
      getUnreadCount({ data: { userId } }),
      getStats({ data: { userId } }),
    ]);
    setItems(inbox as NotificationInboxItem[]);
    setUnreadCount(count as number);
    setStats(s as NotifStats);
  };

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
