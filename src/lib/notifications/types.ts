export type NotifChannel = "in_app" | "push" | "email" | "sms";
export type NotifCategory = "reminder" | "overdue" | "payment_received" | "payment_sent" | "recurring" | "backup" | "system" | "marketing";
export type NotifPriority = "critical" | "high" | "normal" | "low";
export type NotifStatus = "pending" | "queued" | "sent" | "delivered" | "read" | "failed" | "cancelled";

export interface NotificationJob {
  id: string;
  user_id: string;
  alert_id: string | null;
  category: NotifCategory;
  priority: NotifPriority;
  status: NotifStatus;
  channel: NotifChannel | null;
  template_id: string | null;
  payload: Record<string, unknown>;
  scheduled_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  idempotency_key: string | null;
  retry_count: number;
  max_retries: number;
  parent_job_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  user_id: string;
  category: NotifCategory;
  channel: NotifChannel;
  name: string;
  subject: string | null;
  body: string;
  body_ar: string | null;
  variables: string[];
  is_active: boolean;
  variant_of: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  category: NotifCategory;
  channel: NotifChannel;
  enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  max_per_day: number | null;
  max_per_week: number | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationInboxItem {
  id: string;
  job_id: string;
  alert_id: string | null;
  category: NotifCategory;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface NotificationEvent {
  id: string;
  job_id: string;
  user_id: string;
  event_type: string;
  channel: NotifChannel | null;
  provider: string | null;
  provider_message_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NotificationDeliveryLog {
  id: string;
  job_id: string;
  channel: NotifChannel;
  provider: string | null;
  status: string;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
}

export interface CreateNotificationInput {
  userId: string;
  category: NotifCategory;
  priority?: NotifPriority;
  channel?: NotifChannel;
  templateId?: string;
  payload: Record<string, unknown>;
  scheduledAt?: string;
  idempotencyKey?: string;
  parentJobId?: string;
}

export interface SendResult {
  success: boolean;
  jobId: string;
  channel: NotifChannel;
  providerMessageId?: string;
  error?: string;
}

export interface NotifStats {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  byChannel: Record<string, number>;
  byCategory: Record<string, number>;
}
