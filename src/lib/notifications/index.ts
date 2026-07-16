import { supabase } from "@/integrations/supabase/client";
import type {
  NotifChannel,
  NotifCategory,
  NotifPriority,
  NotificationJob,
  NotificationTemplate,
  NotificationPreference,
  NotificationInboxItem,
  NotifStats,
  CreateNotificationInput,
  SendResult,
} from "./types";
import { PolicyEngine, renderTemplate } from "./policy";
import { ChannelRouter } from "./channels";

// ---------------------------------------------------------------
// NotificationService
// - Uses Supabase directly for all persistence (no in-memory queue)
// - Preferences are loaded lazily per user so no explicit init() call
//   is required from route code.
// - The heavy lifting (scheduling, overdue detection) is done by
//   pg_cron + fire_due_alerts() / sync_overdue_alerts() on the server.
// ---------------------------------------------------------------
export class NotificationService {
  private policy: PolicyEngine;
  private router: ChannelRouter;
  // Cache key: userId — prevents re-fetching prefs on every call
  private prefsLoaded = new Set<string>();

  constructor() {
    this.policy = new PolicyEngine();
    this.router = new ChannelRouter();
  }

  /** Lazily loads preferences for a user (call before evaluate). */
  async ensurePrefs(userId: string) {
    if (this.prefsLoaded.has(userId)) return;
    const { data } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId);
    if (data) {
      for (const p of data as unknown as NotificationPreference[]) {
        this.policy.setPreference(`${p.user_id}:${p.category}:${p.channel}`, {
          enabled: p.enabled,
          quietStart: p.quiet_hours_start ?? undefined,
          quietEnd: p.quiet_hours_end ?? undefined,
          maxPerDay: p.max_per_day ?? undefined,
          maxPerWeek: p.max_per_week ?? undefined,
        });
      }
    }
    this.prefsLoaded.add(userId);
  }

  /** Create and (for in_app) immediately deliver a notification. */
  async create(input: CreateNotificationInput): Promise<NotificationJob> {
    await this.ensurePrefs(input.userId);

    const ctx = {
      userId: input.userId,
      category: input.category,
      channel: input.channel ?? "in_app",
      priority: input.priority ?? "normal",
      payload: input.payload,
    } as const;

    const decision = await this.policy.evaluate(ctx);
    if (!decision.allowed) {
      // Return a synthetic cancelled job instead of throwing so callers
      // don't need to special-case policy denials.
      return {
        id: "policy-denied",
        user_id: input.userId,
        alert_id: null,
        category: input.category,
        priority: input.priority ?? "normal",
        status: "cancelled",
        channel: input.channel ?? "in_app",
        template_id: null,
        payload: input.payload,
        scheduled_at: new Date().toISOString(),
        sent_at: null, delivered_at: null, read_at: null,
        failed_at: null, failure_reason: decision.reason ?? "policy_denied",
        idempotency_key: input.idempotencyKey ?? null,
        retry_count: 0, max_retries: 3, parent_job_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as NotificationJob;
    }

    const idempotencyKey =
      input.idempotencyKey ?? `${input.category}:${input.userId}:${Date.now()}`;

    const { data, error } = await supabase
      .from("notification_jobs")
      .insert({
        user_id: input.userId,
        category: input.category,
        priority: input.priority ?? "normal",
        channel: input.channel ?? "in_app",
        template_id: input.templateId ?? null,
        payload: input.payload,
        scheduled_at: input.scheduledAt ?? new Date().toISOString(),
        idempotency_key: idempotencyKey,
        max_retries: 3,
        status: "pending",
      })
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create notification job");

    const job = data as unknown as NotificationJob;

    if ((input.channel ?? "in_app") === "in_app") {
      await this.deliverInApp(job);
    }

    this.policy.recordSent(ctx);
    return job;
  }

  async deliverInApp(job: NotificationJob) {
    let template: NotificationTemplate | null = null;
    if (job.template_id) {
      const { data } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("id", job.template_id)
        .maybeSingle();
      template = data as unknown as NotificationTemplate | null;
    }

    const rendered = template
      ? renderTemplate(template, job.payload)
      : { body: JSON.stringify(job.payload) };
    const title = rendered.subject ?? this.defaultTitle(job.category);

    await supabase.from("notification_inbox").insert({
      user_id: job.user_id,
      job_id: job.id,
      category: job.category,
      title,
      body: rendered.body,
      data: job.payload,
    });

    await supabase
      .from("notification_jobs")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", job.id);

    await supabase.from("notification_events").insert({
      job_id: job.id,
      user_id: job.user_id,
      event_type: "delivered",
      channel: "in_app",
    });
  }

  async getInbox(userId: string, limit = 50, offset = 0): Promise<NotificationInboxItem[]> {
    const { data } = await supabase
      .from("notification_inbox")
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    return (data ?? []) as unknown as NotificationInboxItem[];
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from("notification_inbox")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .is("archived_at", null);
    return count ?? 0;
  }

  async markRead(userId: string, inboxId: string) {
    await supabase
      .from("notification_inbox")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", inboxId)
      .eq("user_id", userId);
  }

  async markAllRead(userId: string) {
    await supabase
      .from("notification_inbox")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false);
  }

  async archive(userId: string, inboxId: string) {
    await supabase
      .from("notification_inbox")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", inboxId)
      .eq("user_id", userId);
  }

  async getStats(userId: string, days = 30): Promise<NotifStats> {
    const { data } = await supabase.rpc("get_notification_stats", {
      p_user_id: userId,
      p_days: days,
    });
    if (!data || data.length === 0)
      return { totalSent: 0, totalDelivered: 0, totalRead: 0, totalFailed: 0, byChannel: {}, byCategory: {} };
    const row = data[0];
    return {
      totalSent: Number(row.total_sent) || 0,
      totalDelivered: Number(row.total_delivered) || 0,
      totalRead: Number(row.total_read) || 0,
      totalFailed: Number(row.total_failed) || 0,
      byChannel: (row.by_channel as Record<string, number>) ?? {},
      byCategory: (row.by_category as Record<string, number>) ?? {},
    };
  }

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    const { data } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId);
    return (data ?? []) as unknown as NotificationPreference[];
  }

  async updatePreference(
    userId: string,
    category: string,
    channel: string,
    updates: Partial<NotificationPreference>
  ) {
    await supabase
      .from("notification_preferences")
      .upsert({ user_id: userId, category, channel, ...updates });
    // Invalidate cache so next call reloads fresh prefs
    this.prefsLoaded.delete(userId);
  }

  async getTemplates(userId: string): Promise<NotificationTemplate[]> {
    const { data } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("user_id", userId)
      .order("category", { ascending: true });
    return (data ?? []) as unknown as NotificationTemplate[];
  }

  async createTemplate(
    userId: string,
    template: Omit<NotificationTemplate, "id" | "user_id" | "created_at" | "updated_at">
  ) {
    const { data, error } = await supabase
      .from("notification_templates")
      .insert({ ...template, user_id: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as NotificationTemplate;
  }

  async updateTemplate(userId: string, id: string, updates: Partial<NotificationTemplate>) {
    const { data, error } = await supabase
      .from("notification_templates")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as NotificationTemplate;
  }

  async deleteTemplate(userId: string, id: string) {
    await supabase.from("notification_templates").delete().eq("id", id).eq("user_id", userId);
  }

  private defaultTitle(category: string): string {
    const map: Record<string, string> = {
      reminder: "تذكير",
      overdue: "دين متأخر",
      system: "تنبيه النظام",
      payment_received: "تم استلام دفعة",
      payment_sent: "تم إرسال دفعة",
      recurring: "عملية متكررة",
      backup: "نسخة احتياطية",
      marketing: "عرض خاص",
    };
    return map[category] ?? "إشعار";
  }
}

export const notificationService = new NotificationService();
