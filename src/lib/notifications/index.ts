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
import { InMemoryQueueAdapter, Scheduler } from "./queue";
import { ChannelRouter } from "./channels";

export class NotificationService {
  private policy: PolicyEngine;
  private queue: InMemoryQueueAdapter;
  private scheduler: Scheduler;
  private router: ChannelRouter;
  private initialized = false;

  constructor() {
    this.policy = new PolicyEngine();
    this.queue = new InMemoryQueueAdapter();
    this.router = new ChannelRouter();
    this.scheduler = new Scheduler(this.queue, (job) => this.processJob(job), { checkIntervalMs: 3000 });
  }

  async init(userId: string) {
    if (this.initialized) return;
    await this.loadPreferences(userId);
    this.initialized = true;
  }

  private async loadPreferences(userId: string) {
    const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", userId);
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
  }

  async create(input: CreateNotificationInput): Promise<NotificationJob> {
    const idempotencyKey = input.idempotencyKey ?? `${input.category}:${input.userId}:${Date.now()}`;

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

    if (input.channel === "in_app") {
      await this.deliverInApp(data as unknown as NotificationJob);
    }

    return data as unknown as NotificationJob;
  }

  async deliverInApp(job: NotificationJob) {
    let template: NotificationTemplate | null = null;
    if (job.template_id) {
      const { data } = await supabase.from("notification_templates").select("*").eq("id", job.template_id).maybeSingle();
      template = data as unknown as NotificationTemplate | null;
    }

    const rendered = template ? renderTemplate(template, job.payload) : { body: JSON.stringify(job.payload) };
    const title = rendered.subject ?? this.defaultTitle(job.category);

    await supabase.from("notification_inbox").insert({
      user_id: job.user_id,
      job_id: job.id,
      category: job.category,
      title,
      body: rendered.body,
      data: job.payload,
    });

    await supabase.from("notification_jobs").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", job.id);
    await supabase.from("notification_events").insert({ job_id: job.id, user_id: job.user_id, event_type: "delivered", channel: "in_app" });
  }

  private async processJob(job: NotificationJob): Promise<SendResult> {
    const adapter = this.router.get(job.channel ?? "in_app");
    let template: NotificationTemplate | null = null;
    if (job.template_id) {
      const { data } = await supabase.from("notification_templates").select("*").eq("id", job.template_id).maybeSingle();
      template = data as unknown as NotificationTemplate | null;
    }
    const rendered = template ? renderTemplate(template, job.payload) : { body: String(job.payload) };
    try {
      const result = await adapter.send(job, rendered);
      if (result.success) {
        await supabase.from("notification_jobs").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", job.id);
        await supabase.from("notification_events").insert({ job_id: job.id, user_id: job.user_id, event_type: "sent", channel: job.channel });
        await supabase.from("notification_delivery_logs").insert({
          job_id: job.id,
          channel: job.channel ?? "in_app",
          provider: adapter.name,
          status: "success",
          response_payload: result.providerMessageId ? { messageId: result.providerMessageId } : null,
        });
      }
      return result;
    } catch (e) {
      const error = e instanceof Error ? e.message : "unknown_error";
      await supabase.from("notification_jobs").update({ status: "failed", failed_at: new Date().toISOString(), failure_reason: error }).eq("id", job.id);
      await supabase.from("notification_delivery_logs").insert({ job_id: job.id, channel: job.channel ?? "in_app", provider: adapter.name, status: "error", error_message: error });
      return { success: false, jobId: job.id, channel: job.channel ?? "in_app", error };
    }
  }

  async getInbox(userId: string, limit = 50, offset = 0): Promise<NotificationInboxItem[]> {
    const { data } = await supabase.from("notification_inbox").select("*").eq("user_id", userId).is("archived_at", null).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    return (data ?? []) as unknown as NotificationInboxItem[];
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count } = await supabase.from("notification_inbox").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false).is("archived_at", null);
    return count ?? 0;
  }

  async markRead(userId: string, inboxId: string) {
    await supabase.from("notification_inbox").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", inboxId).eq("user_id", userId);
  }

  async markAllRead(userId: string) {
    await supabase.from("notification_inbox").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", userId).eq("is_read", false);
  }

  async archive(userId: string, inboxId: string) {
    await supabase.from("notification_inbox").update({ archived_at: new Date().toISOString() }).eq("id", inboxId).eq("user_id", userId);
  }

  async getStats(userId: string, days = 30): Promise<NotifStats> {
    const { data } = await supabase.rpc("get_notification_stats", { p_user_id: userId, p_days: days });
    if (!data || data.length === 0) return { totalSent: 0, totalDelivered: 0, totalRead: 0, totalFailed: 0, byChannel: {}, byCategory: {} };
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
    const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", userId);
    return (data ?? []) as unknown as NotificationPreference[];
  }

  async updatePreference(userId: string, category: string, channel: string, updates: Partial<NotificationPreference>) {
    await supabase.from("notification_preferences").upsert({ user_id: userId, category, channel, ...updates });
    this.initialized = false;
    await this.loadPreferences(userId);
  }

  async getTemplates(userId: string): Promise<NotificationTemplate[]> {
    const { data } = await supabase.from("notification_templates").select("*").eq("user_id", userId).order("category", { ascending: true });
    return (data ?? []) as unknown as NotificationTemplate[];
  }

  async createTemplate(userId: string, template: Omit<NotificationTemplate, "id" | "user_id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase.from("notification_templates").insert({ ...template, user_id: userId }).select("*").single();
    if (error) throw new Error(error.message);
    return data as unknown as NotificationTemplate;
  }

  async updateTemplate(userId: string, id: string, updates: Partial<NotificationTemplate>) {
    const { data, error } = await supabase.from("notification_templates").update(updates).eq("id", id).eq("user_id", userId).select("*").single();
    if (error) throw new Error(error.message);
    return data as unknown as NotificationTemplate;
  }

  async deleteTemplate(userId: string, id: string) {
    await supabase.from("notification_templates").delete().eq("id", id).eq("user_id", userId);
  }

  private defaultTitle(category: string): string {
    const map: Record<string, string> = { reminder: "تذكير", overdue: "دين متأخر", system: "تنبيه النظام" };
    return map[category] ?? "إشعار";
  }
}

export const notificationService = new NotificationService();
