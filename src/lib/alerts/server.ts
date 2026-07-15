// Thin server-side orchestration. These functions contain NO business rules —
// they call the backend engine (Supabase RLS + DB functions/triggers). Date
// parsing is delegated to the backend lib parseNoteDate before insert, and the
// note->alert linkage + due/overdue materialization happen entirely in the DB.

import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { parseNoteDate } from "./parseNoteDate";
import type { TransactionNote, SmartAlert, FollowupLog, FollowupChannel } from "./types";

const sb = supabase as any;

function genId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export const createTransactionNote = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const { userId, transactionId, body } = data as { userId: string; transactionId: string; body: string };
  const parsed = parseNoteDate(body);
  const { data: note, error } = await sb
    .from("transaction_notes")
    .insert({
      transaction_id: transactionId,
      body,
      has_reminder: parsed ? true : false,
      parsed_due_at: parsed ? parsed.dueAt : null,
      matched_text: parsed ? parsed.matchedText : null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return note as TransactionNote;
});

export const listTransactionNotes = createServerFn({ method: "GET" }).handler(async ({ data }) => {
  const { userId, transactionId } = data as { userId: string; transactionId: string };
  const { data: notes, error } = await sb
    .from("transaction_notes")
    .select("*")
    .eq("user_id", userId)
    .eq("transaction_id", transactionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (notes ?? []) as TransactionNote[];
});

export const listAlerts = createServerFn({ method: "GET" }).handler(async ({ data }) => {
  const { userId } = data as { userId: string };
  const { data: alerts, error } = await sb
    .from("smart_alerts")
    .select("*")
    .eq("user_id", userId)
    .order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (alerts ?? []) as SmartAlert[];
});

export const completeAlert = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const { userId, id } = data as { userId: string; id: string };
  const { data: alert, error } = await sb
    .from("smart_alerts")
    .select("notification_job_id")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  if (alert?.notification_job_id) {
    await sb.from("notification_jobs").update({ status: "cancelled" }).eq("id", alert.notification_job_id);
  }
  const { error: uErr } = await sb
    .from("smart_alerts")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (uErr) throw new Error(uErr.message);
  return { ok: true };
});

export const snoozeAlert = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const { userId, id, days } = data as { userId: string; id: string; days: number };
  const due = new Date(Date.now() + days * 86400000).toISOString();
  const { error } = await sb
    .from("smart_alerts")
    .update({ due_at: due, status: "pending", notification_job_id: null })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { ok: true };
});

export const scheduleFollowup = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const { userId, personId, transactionId, dueAt, body } = data as {
    userId: string;
    personId: string | null;
    transactionId?: string | null;
    dueAt: string;
    body: string;
  };
  const { data: alert, error } = await sb
    .from("smart_alerts")
    .insert({
      source_type: "followup",
      source_id: genId(),
      person_id: personId,
      transaction_id: transactionId ?? null,
      title: body.trim().slice(0, 120) || "متابعة عميل",
      body: body.trim() || null,
      due_at: dueAt,
      status: "pending",
      priority: "normal",
      channel: "in_app",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return alert as SmartAlert;
});

export const logFollowupAttempt = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const { userId, personId, transactionId, channel, message, outcome } = data as {
    userId: string;
    personId: string | null;
    transactionId?: string | null;
    channel: FollowupChannel;
    message?: string | null;
    outcome?: string | null;
  };
  const { data: log, error } = await sb
    .from("followup_logs")
    .insert({
      person_id: personId,
      transaction_id: transactionId ?? null,
      channel,
      message: message ?? null,
      outcome: outcome ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return log as FollowupLog;
});

export const listFollowupLogs = createServerFn({ method: "GET" }).handler(async ({ data }) => {
  const { userId, personId } = data as { userId: string; personId?: string | null };
  let q = sb.from("followup_logs").select("*").eq("user_id", userId);
  if (personId) q = q.eq("person_id", personId);
  const { data: logs, error } = await q.order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return (logs ?? []) as FollowupLog[];
});
