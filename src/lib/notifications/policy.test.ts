import { describe, it, expect, beforeEach } from "vitest";
import { PolicyEngine, renderTemplate, buildIdempotencyKey, calculateNextRetry } from "./policy";

describe("NotificationPolicyEngine", () => {
  let policy: PolicyEngine;

  beforeEach(() => {
    policy = new PolicyEngine();
  });

  it("allows notification when preference is enabled", async () => {
    policy.setPreference("u1:reminder:in_app", { enabled: true, maxPerDay: 10, maxPerWeek: 50 });
    const result = await policy.evaluate({ userId: "u1", category: "reminder", channel: "in_app", priority: "normal", payload: {} });
    expect(result.allowed).toBe(true);
  });

  it("blocks notification when preference is disabled", async () => {
    policy.setPreference("u1:reminder:in_app", { enabled: false });
    const result = await policy.evaluate({ userId: "u1", category: "reminder", channel: "in_app", priority: "normal", payload: {} });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("user_disabled");
  });

  it("blocks notification during quiet hours for normal priority", async () => {
    policy.setPreference("u1:reminder:in_app", { enabled: true, quietStart: "22:00", quietEnd: "08:00", maxPerDay: 10 });
    const result = await policy.evaluate({ userId: "u1", category: "reminder", channel: "in_app", priority: "normal", payload: {} });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("quiet_hours");
  });

  it("allows critical notification during quiet hours", async () => {
    policy.setPreference("u1:overdue:in_app", { enabled: true, quietStart: "22:00", quietEnd: "08:00" });
    const result = await policy.evaluate({ userId: "u1", category: "overdue", channel: "in_app", priority: "critical", payload: {} });
    expect(result.allowed).toBe(true);
  });

  it("blocks when daily cap is reached", async () => {
    policy.setPreference("u1:reminder:in_app", { enabled: true, maxPerDay: 2 });
    await policy.evaluate({ userId: "u1", category: "reminder", channel: "in_app", priority: "normal", payload: {} });
    policy.recordSent({ userId: "u1", category: "reminder", channel: "in_app", priority: "normal", payload: {} });
    const result = await policy.evaluate({ userId: "u1", category: "reminder", channel: "in_app", priority: "normal", payload: {} });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("daily_cap_reached");
  });

  it("records sent count", async () => {
    policy.setPreference("u1:reminder:in_app", { enabled: true, maxPerDay: 10 });
    await policy.evaluate({ userId: "u1", category: "reminder", channel: "in_app", priority: "normal", payload: {} });
    policy.recordSent({ userId: "u1", category: "reminder", channel: "in_app", priority: "normal", payload: {} });
    const result = await policy.evaluate({ userId: "u1", category: "reminder", channel: "in_app", priority: "normal", payload: {} });
    expect(result.allowed).toBe(true);
  });
});

describe("NotificationTemplate", () => {
  it("renders template with variables", () => {
    const template = { id: "1", user_id: "u1", category: "reminder" as const, channel: "in_app" as const, name: "test", body: "Hello {{name}}, your amount is {{amount}}", body_ar: null, variables: [], is_active: true, variant_of: null, created_at: "", updated_at: "" };
    const result = renderTemplate(template, { name: "Ahmed", amount: "100" });
    expect(result.body).toBe("Hello Ahmed, your amount is 100");
  });

  it("renders Arabic template when available", () => {
    const template = { id: "1", user_id: "u1", category: "reminder" as const, channel: "in_app" as const, name: "test", body: "Hello", body_ar: "مرحباً {{name}}", variables: [], is_active: true, variant_of: null, created_at: "", updated_at: "" };
    const result = renderTemplate(template, { name: "أحمد" }, "ar");
    expect(result.body).toBe("مرحباً أحمد");
  });

  it("removes unmatched variables", () => {
    const template = { id: "1", user_id: "u1", category: "reminder" as const, channel: "in_app" as const, name: "test", body: "Hello {{name}} {{missing}}", body_ar: null, variables: [], is_active: true, variant_of: null, created_at: "", updated_at: "" };
    const result = renderTemplate(template, { name: "Ahmed" });
    expect(result.body).toBe("Hello Ahmed ");
  });
});

describe("NotificationUtils", () => {
  it("builds idempotency key", () => {
    expect(buildIdempotencyKey("producer1", "notif123")).toBe("producer1:notif123");
  });

  it("calculates retry delays with jitter", () => {
    const d1 = calculateNextRetry(0);
    const d2 = calculateNextRetry(1);
    expect(d1).toBeGreaterThanOrEqual(5000);
    expect(d1).toBeLessThanOrEqual(6000);
    expect(d2).toBeGreaterThanOrEqual(15000);
    expect(d2).toBeLessThanOrEqual(16000);
  });
});
