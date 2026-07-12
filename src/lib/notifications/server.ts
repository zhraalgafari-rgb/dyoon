import { createServerFn } from "@tanstack/react-start";
import { notificationService } from "@/lib/notifications";

export const getInbox = createServerFn({ method: "GET" }).handler(async ({ data }) => {
  const userId = data?.userId;
  if (!userId) throw new Error("Unauthorized");
  return notificationService.getInbox(userId);
});

export const getUnreadCount = createServerFn({ method: "GET" }).handler(async ({ data }) => {
  const userId = data?.userId;
  if (!userId) throw new Error("Unauthorized");
  return notificationService.getUnreadCount(userId);
});

export const markRead = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const { userId, inboxId } = data as { userId: string; inboxId: string };
  return notificationService.markRead(userId, inboxId);
});

export const markAllRead = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const userId = data?.userId;
  if (!userId) throw new Error("Unauthorized");
  return notificationService.markAllRead(userId);
});

export const archiveNotification = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const { userId, inboxId } = data as { userId: string; inboxId: string };
  return notificationService.archive(userId, inboxId);
});

export const getStats = createServerFn({ method: "GET" }).handler(async ({ data }) => {
  const userId = data?.userId;
  if (!userId) throw new Error("Unauthorized");
  return notificationService.getStats(userId);
});

export const getPreferences = createServerFn({ method: "GET" }).handler(async ({ data }) => {
  const userId = data?.userId;
  if (!userId) throw new Error("Unauthorized");
  return notificationService.getPreferences(userId);
});

export const updatePreference = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const { userId, category, channel, updates } = data as { userId: string; category: string; channel: string; updates: Record<string, unknown> };
  return notificationService.updatePreference(userId, category, channel, updates);
});

export const getTemplates = createServerFn({ method: "GET" }).handler(async ({ data }) => {
  const userId = data?.userId;
  if (!userId) throw new Error("Unauthorized");
  return notificationService.getTemplates(userId);
});

export const createTemplate = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const { userId, template } = data as { userId: string; template: Record<string, unknown> };
  return notificationService.createTemplate(userId, template);
});

export const updateTemplate = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const { userId, id, updates } = data as { userId: string; id: string; updates: Record<string, unknown> };
  return notificationService.updateTemplate(userId, id, updates);
});

export const deleteTemplate = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  const { userId, id } = data as { userId: string; id: string };
  return notificationService.deleteTemplate(userId, id);
});
