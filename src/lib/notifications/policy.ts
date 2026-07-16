import type { NotifChannel, NotifCategory, NotifPriority, NotificationJob, NotificationTemplate } from "./types";

export interface PolicyContext {
  userId: string;
  category: NotifCategory;
  channel: NotifChannel;
  priority: NotifPriority;
  payload: Record<string, unknown>;
  scheduledAt?: string;
}

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
  adjustedPayload?: Record<string, unknown>;
}

export class PolicyEngine {
  private preferences: Map<string, { enabled: boolean; quietStart?: string; quietEnd?: string; maxPerDay?: number; maxPerWeek?: number }> = new Map();
  private dailyCounts: Map<string, { date: string; count: number }> = new Map();
  private weeklyCounts: Map<string, { weekStart: string; count: number }> = new Map();

  setPreference(key: string, pref: { enabled: boolean; quietStart?: string; quietEnd?: string; maxPerDay?: number; maxPerWeek?: number }) {
    this.preferences.set(key, pref);
  }

  clearCache() {
    this.preferences.clear();
    this.dailyCounts.clear();
    this.weeklyCounts.clear();
  }

  async evaluate(ctx: PolicyContext): Promise<PolicyResult> {
    const prefKey = `${ctx.userId}:${ctx.category}:${ctx.channel}`;
    const pref = this.preferences.get(prefKey);

    if (pref && !pref.enabled) {
      return { allowed: false, reason: "user_disabled" };
    }

    if (this.isQuietHours(ctx, pref)) {
      if (ctx.priority === "critical" || ctx.priority === "high") {
        return { allowed: true, reason: "override_quiet_hours_high_priority" };
      }
      return { allowed: false, reason: "quiet_hours" };
    }

    const dailyKey = `${ctx.userId}:${ctx.channel}:daily`;
    const weeklyKey = `${ctx.userId}:${ctx.channel}:weekly`;

    if (pref?.maxPerDay && this.getCount(dailyKey) >= pref.maxPerDay) {
      return { allowed: false, reason: "daily_cap_reached" };
    }

    if (pref?.maxPerWeek && this.getCount(weeklyKey) >= pref.maxPerWeek) {
      return { allowed: false, reason: "weekly_cap_reached" };
    }

    return { allowed: true };
  }

  recordSent(ctx: PolicyContext) {
    const dailyKey = `${ctx.userId}:${ctx.channel}:daily`;
    const weeklyKey = `${ctx.userId}:${ctx.channel}:weekly`;
    this.incrementCount(dailyKey);
    this.incrementCount(weeklyKey);
  }

  private isQuietHours(ctx: PolicyContext, pref: { quietStart?: string; quietEnd?: string } | undefined): boolean {
    if (!pref?.quietStart || !pref?.quietEnd) return false;
    const now = new Date();
    const [sh, sm] = pref.quietStart.split(":").map(Number);
    const [eh, em] = pref.quietEnd.split(":").map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  private getCount(key: string): number {
    const entry = this.dailyCounts.get(key) ?? this.weeklyCounts.get(key);
    if (!entry) return 0;
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const currentWeek = this.getWeekStart(now);
    if (key.includes("daily") && entry.date !== currentDate) return 0;
    if (key.includes("weekly") && entry.weekStart !== currentWeek) return 0;
    return entry.count;
  }

  private incrementCount(key: string) {
    const now = new Date();
    const entry = this.dailyCounts.get(key) ?? this.weeklyCounts.get(key);
    const currentDate = now.toISOString().split("T")[0];
    const currentWeek = this.getWeekStart(now);
    if (!entry || (key.includes("daily") && entry.date !== currentDate) || (key.includes("weekly") && entry.weekStart !== currentWeek)) {
      const target = key.includes("daily") ? this.dailyCounts : this.weeklyCounts;
      target.set(key, { date: currentDate, weekStart: currentWeek, count: 1 });
    } else {
      entry.count++;
    }
  }

  private getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split("T")[0];
  }
}

export function renderTemplate(template: NotificationTemplate, payload: Record<string, unknown>, locale = "ar"): { subject?: string; body: string } {
  const body = locale === "ar" && template.body_ar ? template.body_ar : template.body;
  let rendered = body;
  if (template.subject) {
    rendered = rendered.replace(/\{\{subject\}\}/g, template.subject);
  }
  for (const [key, value] of Object.entries(payload)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    rendered = rendered.replace(regex, String(value ?? ""));
  }
  rendered = rendered.replace(/\{\{[^}]+\}\}/g, "");
  return { subject: template.subject ?? undefined, body: rendered };
}

export function buildIdempotencyKey(producer: string, notificationId: string): string {
  return `${producer}:${notificationId}`;
}

export function calculateNextRetry(retryCount: number): number {
  const delays = [5000, 15000, 60000, 300000, 900000];
  const idx = Math.min(retryCount, delays.length - 1);
  const jitter = Math.floor(Math.random() * 1000);
  return delays[idx] + jitter;
}
