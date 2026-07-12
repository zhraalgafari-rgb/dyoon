import { notificationService } from "@/lib/notifications/index";
import type { NotifCategory, NotifChannel } from "@/lib/notifications/types";

export async function triggerReminderNotification(userId: string, reminderId: string, title: string, dueDate: string) {
  try {
    await notificationService.create({
      userId,
      category: "reminder",
      priority: "normal",
      channel: "in_app",
      payload: { reminder_id: reminderId, title, due_date: dueDate },
      idempotencyKey: `reminder:${reminderId}:in_app`,
    });
  } catch (e) {
    console.error("[notif] failed to trigger reminder", e);
  }
}

export async function triggerOverdueNotification(userId: string, txnId: string, details: string, amount: number, dueDate: string) {
  try {
    await notificationService.create({
      userId,
      category: "overdue",
      priority: "high",
      channel: "in_app",
      payload: { txn_id: txnId, details, amount, due_date: dueDate },
      idempotencyKey: `overdue:${txnId}:in_app`,
    });
  } catch (e) {
    console.error("[notif] failed to trigger overdue", e);
  }
}

export async function triggerBackupNotification(userId: string, kind: "success" | "error", message: string) {
  try {
    await notificationService.create({
      userId,
      category: "backup",
      priority: kind === "error" ? "high" : "low",
      channel: "in_app",
      payload: { kind, message },
      idempotencyKey: `backup:${userId}:${Date.now()}`,
    });
  } catch (e) {
    console.error("[notif] failed to trigger backup", e);
  }
}

export async function triggerRecurringNotification(userId: string, ruleId: string, title: string, amount: number) {
  try {
    await notificationService.create({
      userId,
      category: "recurring",
      priority: "normal",
      channel: "in_app",
      payload: { rule_id: ruleId, title, amount },
      idempotencyKey: `recurring:${ruleId}:${new Date().toISOString().split("T")[0]}`,
    });
  } catch (e) {
    console.error("[notif] failed to trigger recurring", e);
  }
}
