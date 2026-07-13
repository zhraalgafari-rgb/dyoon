import { supabase } from "@/integrations/supabase/client";

export type RepeatKind = "none" | "daily" | "weekly" | "monthly";

export interface Reminder {
  id: string;
  user_id: string;
  person_id: string | null;
  title: string;
  note: string | null;
  due_date: string;
  is_done: boolean;
  repeat: RepeatKind;
  transaction_id: string | null;
  snoozed_until: string | null;
  created_at: string;
}

/** Advance a date according to a repeat rule. */
export function advanceDate(iso: string, kind: RepeatKind): string {
  const d = new Date(iso);
  switch (kind) {
    case "daily": d.setDate(d.getDate() + 1); break;
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    default: return iso;
  }
  return d.toISOString();
}

/** Mark reminder done; if it has a repeat rule, schedule the next occurrence instead. */
export async function completeReminder(r: Pick<Reminder, "id" | "due_date" | "repeat">) {
  if (r.repeat && r.repeat !== "none") {
    const next = advanceDate(r.due_date, r.repeat);
    return supabase.from("reminders").update({ due_date: next, snoozed_until: null }).eq("id", r.id);
  }
  return supabase.from("reminders").update({ is_done: true }).eq("id", r.id);
}

/** Snooze a reminder by N days (updates due_date + snoozed_until). */
export async function snoozeReminder(id: string, days: number) {
  const d = new Date(); d.setDate(d.getDate() + days);
  const iso = d.toISOString();
  return supabase.from("reminders").update({ due_date: iso, snoozed_until: iso }).eq("id", id);
}
