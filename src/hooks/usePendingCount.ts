import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { getUnreadCount } from "@/lib/notifications/server";

export function usePendingCount() {
  const { user } = useAuth();
  return useQuery<number>({
    queryKey: ["notif-unread", user?.id], // Align cache key with useRealtimeSync
    queryFn: async () => {
      if (!user) return 0;
      const count = await getUnreadCount({ data: { userId: user.id } });
      return count as number;
    },
    enabled: !!user,
    staleTime: 1000 * 30,
    refetchInterval: 5 * 60 * 1000,
  });
}

