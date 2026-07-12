import type { NotifChannel, NotifCategory, NotifPriority, NotificationJob, SendResult } from "./types";
import { PolicyEngine, renderTemplate, calculateNextRetry } from "./policy";

export interface QueueAdapter {
  enqueue(job: NotificationJob): Promise<void>;
  dequeue(channel?: NotifChannel): Promise<NotificationJob | null>;
  ack(jobId: string): Promise<void>;
  nack(jobId: string, retry: boolean): Promise<void>;
  getJob(jobId: string): Promise<NotificationJob | null>;
}

export class InMemoryQueueAdapter implements QueueAdapter {
  private queue: NotificationJob[] = [];
  private processing = new Set<string>();

  async enqueue(job: NotificationJob): Promise<void> {
    this.queue.push(job);
  }

  async dequeue(channel?: NotifChannel): Promise<NotificationJob | null> {
    const idx = this.queue.findIndex(j => !this.processing.has(j.id) && (!channel || j.channel === channel));
    if (idx === -1) return null;
    const job = this.queue[idx];
    this.processing.add(job.id);
    return job;
  }

  async ack(jobId: string): Promise<void> {
    this.processing.delete(jobId);
    this.queue = this.queue.filter(j => j.id !== jobId);
  }

  async nack(jobId: string, retry: boolean): Promise<void> {
    this.processing.delete(jobId);
    if (!retry) {
      this.queue = this.queue.filter(j => j.id !== jobId);
    }
  }

  async getJob(jobId: string): Promise<NotificationJob | null> {
    return this.queue.find(j => j.id === jobId) ?? null;
  }
}

export interface SchedulerOptions {
  checkIntervalMs?: number;
}

export class Scheduler {
  private policy: PolicyEngine;
  private queue: QueueAdapter;
  private running = false;
  private checkIntervalMs: number;
  private processor: (job: NotificationJob) => Promise<SendResult>;

  constructor(queue: QueueAdapter, processor: (job: NotificationJob) => Promise<SendResult>, options: SchedulerOptions = {}) {
    this.policy = new PolicyEngine();
    this.queue = queue;
    this.processor = processor;
    this.checkIntervalMs = options.checkIntervalMs ?? 5000;
  }

  setPreferences(prefs: Array<{ userId: string; category: string; channel: string; enabled: boolean; quietStart?: string; quietEnd?: string; maxPerDay?: number; maxPerWeek?: number }>) {
    this.policy.clearCache();
    for (const p of prefs) {
      this.policy.setPreference(`${p.userId}:${p.category}:${p.channel}`, {
        enabled: p.enabled,
        quietStart: p.quietStart,
        quietEnd: p.quietEnd,
        maxPerDay: p.maxPerDay,
        maxPerWeek: p.maxPerWeek,
      });
    }
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        const job = await this.queue.dequeue();
        if (job) {
          const ctx = {
            userId: job.user_id,
            category: job.category,
            channel: job.channel ?? "in_app",
            priority: job.priority,
            payload: job.payload,
            scheduledAt: job.scheduled_at,
          };
          const decision = await this.policy.evaluate(ctx);
          if (!decision.allowed) {
            await this.queue.nack(job.id, false);
            continue;
          }
          const result = await this.processor(job);
          if (result.success) {
            await this.queue.ack(job.id);
            this.policy.recordSent(ctx);
          } else if (job.retry_count < job.max_retries) {
            job.retry_count += 1;
            job.scheduled_at = new Date(Date.now() + calculateNextRetry(job.retry_count)).toISOString();
            await this.queue.enqueue(job);
            await this.queue.nack(job.id, false);
          } else {
            job.status = "failed";
            job.failure_reason = result.error ?? "max_retries_exceeded";
            job.failed_at = new Date().toISOString();
            await this.queue.ack(job.id);
          }
        }
      } catch (e) {
        console.error("[scheduler] error", e);
      }
      await new Promise(r => setTimeout(r, this.checkIntervalMs));
    }
  }
}
