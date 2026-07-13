/**
 * أنواع ومحددات نظام التنبيهات والرسائل الذكية
 * Automated Customer Notification & Alerting System - Types
 */

// ---- Enums ----

export type AlertSource = "note" | "reminder" | "followup" | "transaction" | "overdue" | "inactivity";
export type AlertStatus = "pending" | "triggered" | "done" | "dismissed" | "snoozed";
export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type MessageTone = "polite" | "firm" | "friendly" | "professional";
export type MessageChannel = "whatsapp" | "sms" | "email" | "in_app" | "push";

// ---- Core Data Interfaces ----

export interface SmartAlert {
  id: string;
  user_id: string;
  source_type: AlertSource;
  source_id: string;
  person_id: string | null;
  title: string;
  body: string | null;
  due_at: string | null;  // ISO timestamp (UTC)
  status: AlertStatus;
  severity: AlertSeverity;
  priority: number; // 1-100
  channel: MessageChannel;
  notification_job_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string | null;
  avatar_color: string | null;
  notes: string | null;
  credit_limit: number | null;
  risk_score: number;
}

export interface FinancialSummary {
  currency_id: string;
  currency_name: string;
  currency_symbol: string;
  net: number;
  total_credit: number;
  total_debit: number;
  tx_count: number;
  last_date: string | null;
  overdue_amount: number;
}

export interface ContactLogEntry {
  id: string;
  type: "call" | "whatsapp" | "sms" | "email" | "visit" | "note";
  note: string | null;
  status: string | null;
  created_at: string;
}

export interface TransactionSummary {
  id: string;
  amount: number;
  direction: "credit" | "debit";
  currency_id: string;
  transaction_date: string;
  due_date: string | null;
  is_paid: boolean;
  details: string | null;
}

export interface DetectionResult {
  person_id: string;
  person_name: string;
  phone: string | null;
  last_activity: string | null;
  inactive_days: number;
  total_balance: number;
  overdue_amount: number;
  risk_score: number;
  severity: AlertSeverity;
}

// ---- Message Generation ----

export interface GenerationContext {
  customer: {
    name: string;
    phone?: string;
    credit_limit?: number;
    notes?: string;
  };
  financial: {
    amount: number;
    currency: string;
    is_credit: boolean;
    due_date?: string;
    days_overdue?: number;
  };
  history: {
    last_contact_type?: string;
    last_contact_date?: string;
    contact_count: number;
    avg_response_days?: number;
  };
  behavior: {
    preferred_channel?: MessageChannel;
    preferred_tone?: MessageTone;
    past_promptness?: number;
    previous_reminders_sent: number;
  };
}

export interface GeneratedMessage {
  message: string;
  confidence: number;
  tone: MessageTone;
  alternatives?: string[];
}

// ---- Decision Engine ----

export interface DecisionResult {
  severity: AlertSeverity;
  priority: number;
  recommended_actions: AlertAction[];
  suggested_channel: MessageChannel;
  suggested_tone: MessageTone;
  followup_days: number;
}

export interface AlertAction {
  type: "whatsapp" | "call" | "snooze" | "dismiss" | "archive";
  label: string;
  auto: boolean; // can be auto-executed
}

// ---- Parsed Date ----

export interface ParsedTrigger {
  dueAt: string; // ISO timestamp
  matchedText: string;
  confidence: "high" | "medium" | "low";
}