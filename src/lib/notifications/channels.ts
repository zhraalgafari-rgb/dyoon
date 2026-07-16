import type { NotifChannel, NotifCategory, NotifPriority, SendResult, NotificationJob } from "./types";
import { renderTemplate } from "./policy";

export interface ChannelAdapter {
  name: string;
  send(job: NotificationJob, rendered: { subject?: string; body: string }): Promise<SendResult>;
}

export class InAppChannelAdapter implements ChannelAdapter {
  name = "in_app";

  async send(job: NotificationJob, rendered: { subject?: string; body: string }): Promise<SendResult> {
    const title = rendered.subject ?? this.defaultTitle(job.category);
    return {
      success: true,
      jobId: job.id,
      channel: "in_app",
    };
  }

  private defaultTitle(category: string): string {
    const map: Record<string, string> = {
      reminder: "تذكير",
      overdue: "دين متأخر",
      payment_received: "تم استلام دفعة",
      payment_sent: "تم إرسال دفعة",
      recurring: "عملية متكررة",
      backup: "نسخة احتياطية",
      system: "تنبيه النظام",
      marketing: "عرض خاص",
    };
    return map[category] ?? "إشعار";
  }
}

export class PushChannelAdapter implements ChannelAdapter {
  name = "push";

  async send(job: NotificationJob, rendered: { subject?: string; body: string }): Promise<SendResult> {
    const title = rendered.subject ?? "دفترك";
    return {
      success: true,
      jobId: job.id,
      channel: "push",
    };
  }
}

export class EmailChannelAdapter implements ChannelAdapter {
  name = "email";

  async send(job: NotificationJob, rendered: { subject?: string; body: string }): Promise<SendResult> {
    const subject = rendered.subject ?? this.defaultSubject(job.category);
    return {
      success: true,
      jobId: job.id,
      channel: "email",
    };
  }

  private defaultSubject(category: string): string {
    const map: Record<string, string> = {
      reminder: "تذكير من دفترك",
      overdue: "تنبيه: دين متأخر",
      payment_received: "تم استلام دفعة",
      payment_sent: "تم إرسال دفعة",
      recurring: "عملية متكررة قادمة",
      backup: "تقرير النسخة الاحتياطية",
      system: "تنبيه من دفترك",
      marketing: "عرض خاص من دفترك",
    };
    return map[category] ?? "إشعار من دفترك";
  }
}

export class SmsChannelAdapter implements ChannelAdapter {
  name = "sms";

  async send(job: NotificationJob, rendered: { subject?: string; body: string }): Promise<SendResult> {
    const text = rendered.body.slice(0, 160);
    return {
      success: true,
      jobId: job.id,
      channel: "sms",
    };
  }
}

export class ChannelRouter {
  private adapters = new Map<NotifChannel, ChannelAdapter>();

  constructor() {
    this.register(new InAppChannelAdapter());
    this.register(new PushChannelAdapter());
    this.register(new EmailChannelAdapter());
    this.register(new SmsChannelAdapter());
  }

  register(adapter: ChannelAdapter) {
    this.adapters.set(adapter.name as NotifChannel, adapter);
  }

  get(channel: NotifChannel): ChannelAdapter {
    const adapter = this.adapters.get(channel);
    if (!adapter) throw new Error(`No adapter for channel: ${channel}`);
    return adapter;
  }
}
