import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ContactChannel = "whatsapp" | "call" | "email" | "note" | "sms" | "reminder" | "other";
export type ContactDirection = "outgoing" | "incoming";
export type ContactStatus =
  | "sent" | "delivered" | "read" | "replied"
  | "no_answer" | "busy" | "failed";

export interface ContactLog {
  id: string;
  channel: ContactChannel;
  direction: ContactDirection;
  status: ContactStatus;
  message: string | null;
  outcome: string | null;
  ai_generated: boolean;
  logged_at: string;
  transaction_id: string | null;
  created_at: string;
}

export interface NewContactLog {
  person_id: string;
  channel: ContactChannel;
  direction: ContactDirection;
  status: ContactStatus;
  message?: string;
  outcome?: string;
  ai_generated?: boolean;
  transaction_id?: string | null;
  logged_at?: string;
}

export function useContactLog(personId: string) {
  return useQuery({
    queryKey: ["contact-log", personId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)(
        "rpc_get_contact_log",
        { p_person_id: personId }
      );
      if (error) throw error;
      return (data ?? []) as ContactLog[];
    },
    enabled: !!personId,
  });
}

export function useContactStats(personId: string) {
  return useQuery({
    queryKey: ["contact-stats", personId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)(
        "rpc_contact_stats",
        { p_person_id: personId }
      );
      if (error) throw error;
      return (data ?? []) as { channel: string; count: number; last_contact: string }[];
    },
    enabled: !!personId,
  });
}

export function useAddContactLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: NewContactLog) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      const { data, error } = await supabase
        .from("followup_logs" as any)
        .insert({
          user_id: user.id,
          person_id: log.person_id,
          channel: log.channel,
          direction: log.direction,
          status: log.status,
          message: log.message ?? null,
          outcome: log.outcome ?? null,
          ai_generated: log.ai_generated ?? false,
          transaction_id: log.transaction_id ?? null,
          logged_at: log.logged_at ?? new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["contact-log", vars.person_id] });
      qc.invalidateQueries({ queryKey: ["contact-stats", vars.person_id] });
    },
  });
}

export function useDeleteContactLog(personId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase
        .from("followup_logs" as any)
        .delete()
        .eq("id", logId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact-log", personId] });
      qc.invalidateQueries({ queryKey: ["contact-stats", personId] });
    },
  });
}
