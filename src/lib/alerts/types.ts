// Shared DTOs mirroring the backend `smart_alerts` / `transaction_notes` /
// `followup_logs` tables. Pure data shapes — no logic.

export interface TransactionNote {
  id: string;
  user_id: string;
  transaction_id: string;
  person_id: string | null;
  author: string;
  body: string;
  has_reminder: boolean;
  parsed_due_at: string | null;
  matched_text: string | null;
  created_at: string;
  updated_at: string;
}

export type AlertSource = "note" | "reminder" | "followup" | "transaction" | "overdue";
export type AlertStatus = "pending" | "triggered" | "done" | "dismissed" | "snoozed";

export interface SmartAlert {
  id: string;
  user_id: string;
  source_type: AlertSource;
  source_id: string;
  person_id: string | null;
  transaction_id: string | null;
  title: string;
  body: string | null;
  due_at: string | null;
  status: AlertStatus;
  priority: string;
  channel: string;
  notification_job_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type FollowupChannel = "whatsapp" | "call" | "email" | "note" | "other";

export interface FollowupLog {
  id: string;
  user_id: string;
  person_id: string | null;
  transaction_id: string | null;
  channel: FollowupChannel;
  message: string | null;
  outcome: string | null;
  created_at: string;
}
