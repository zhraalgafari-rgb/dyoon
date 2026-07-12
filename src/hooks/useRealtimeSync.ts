/**
 * useRealtimeSync
 * ===============
 * يُشترك في Supabase Realtime لجداول:
 *   - transactions  → يُبطل بيانات المعاملات والأرصدة
 *   - people        → يُبطل بيانات العملاء
 *
 * مجرد حدوث تغيير في قاعدة البيانات (من أي جهاز أو tab)
 * سيتم تحديث الواجهة فوراً.
 *
 * استخدام: ضعه في مكوّن جذري (AppLayout أو root layout) مرة واحدة فقط.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateAll } from "@/hooks/useInvalidateAll";
import { useAuth } from "@/lib/auth";

export function useRealtimeSync() {
  const { user } = useAuth();
  const invalidateAll = useInvalidateAll();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // إزالة الاشتراك القديم إن وجد
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`realtime:user:${user.id}`)

      // تغيرات المعاملات
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          invalidateAll("transaction");
        }
      )

      // تغيرات العملاء
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "people",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          invalidateAll("person");
        }
      )

      // تغيرات الأرصدة الافتتاحية
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "opening_balances",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          invalidateAll("transaction");
        }
      )

      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, invalidateAll]);
}
