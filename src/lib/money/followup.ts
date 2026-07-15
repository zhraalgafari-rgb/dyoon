interface Person {
  id: string;
  name: string;
  phone: string | null;
  credit_limit: number | null
}

export interface Bucket {
  person: Person;
  /** الرصيد بالقيمة الموجبة دائماً (المبلغ المديون) */
  net: number;
  currency: string;
  daysOverdue: number;
  oldestDue: string | null;
  txCount: number;
  severity: "ok" | "soon" | "late" | "critical";
  /** Days until next escalation (positive = days to escalate, negative = already escalated) */
  daysUntilEscalation: number;
  /** Suggested next action based on context */
  suggestedAction: string;
}

/**
 * Enhanced severity calculation with more nuanced thresholds
 * 
 * - critical: 30+ days overdue OR over credit limit by 20%
 * - late: 7-29 days overdue
 * - soon: 0-6 days overdue (due today or within grace period)
 * - ok: not yet due
 * 
 * Additionally considers:
 * - Amount severity: larger amounts escalate faster
 * - Credit limit: exceeding limit automatically escalates
 */
export function severityFor(days: number, amount: number, limit: number | null): Bucket["severity"] {
  // Check credit limit first - if exceeded, always at least "late"
  if (limit && amount > limit * 1.2) return "critical";
  if (limit && amount > limit) return "late";

  // Time-based severity
  if (days >= 30) return "critical";
  if (days >= 7) return "late";
  if (days >= 0) return "soon";
  return "ok";
}

/**
 * Calculate days until escalation to next severity level
 */
function daysUntilEscalation(days: number, amount: number, limit: number | null): number {
  if (days < 0) return 7 - (days + 7); // days until "soon" (7 days before due date logic)
  if (days < 7) return 7 - days; // days until "late"
  if (days < 30) return 30 - days; // days until "critical"
  return -(days - 30); // already escalated (negative = days since)
}

/**
 * Suggest next action based on bucket's state
 */
function suggestAction(severity: Bucket["severity"], days: number, amount: number, limit: number | null, hasPhone: boolean): string {
  switch (severity) {
    case "critical":
      if (days >= 60) return "اتصال عاجل + تحديد موعد نهائي";
      if (days >= 30) return "اتصال مباشر واقتراح تقسيط";
      return "إرسال إنذار نهائي";
    case "late":
      if (limit && amount > limit) return "إيقاف التعامل الجديد + تذكير واتساب";
      if (days >= 14) return "اتصال هاتفي + متابعة واتساب";
      return "إرسال تذكير واتساب";
    case "soon":
      return "تذكير ودي قبل الاستحقاق";
    case "ok":
      return "لا إجراء مطلوب حالياً";
  }
}

export const severityMeta: Record<Bucket["severity"], { label: string; cls: string; ring: string }> = {
  ok: { label: "ضمن المهلة", cls: "bg-success-soft text-success", ring: "ring-success/30" },
  soon: { label: "قريباً", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", ring: "ring-amber-400/40" },
  late: { label: "متأخر", cls: "bg-danger-soft text-danger", ring: "ring-danger/30" },
  critical: { label: "حرج", cls: "bg-danger text-danger-foreground", ring: "ring-danger/50" },
};

import { PersonCurrencyBalance } from "@/hooks/useDashboardData";

export function buildBuckets(
  balancesMap: Map<string, PersonCurrencyBalance[]>,
  dueTxs: any[],
  peopleMap: Map<string, Person>,
  currencyMap: Map<string, any>
): Bucket[] {
  const overdueMap = new Map<string, { daysOverdue: number; oldestDue: string | null }>();
  const today = Date.now();

  // Find the oldest unpaid due_date for each person/currency
  (dueTxs ?? []).forEach((t: any) => {
    if (!t.due_date) return;
    const key = `${t.person_id}|${t.currency_id}`;
    const d = new Date(t.due_date).getTime();
    const days = Math.floor((today - d) / 86400000);
    const existing = overdueMap.get(key) ?? { daysOverdue: -9999, oldestDue: null };

    if (days > existing.daysOverdue) {
      existing.daysOverdue = days;
      existing.oldestDue = t.due_date;
      overdueMap.set(key, existing);
    }
  });

  const list: Bucket[] = [];

  balancesMap.forEach((balances, personId) => {
    const person = peopleMap.get(personId);
    if (!person) return;

    balances.forEach((b) => {
      // المنطق: net < 0 يعني العميل مدين للمستخدم ("عليه" دين)
      // net > 0 يعني المستخدم مدين للعميل ("له" رصيد)
      // نريد فقط من عليهم ديون للمستخدم (net < 0)
      // نتجاهل الأرصدة الصفرية أو القريبة من الصفر
      if (b.net >= 0) return; // b.net >= 0 → إما مسوّى أو المستخدم هو المدين
      if (Math.abs(b.net) < 0.001) return; // مسوّى فعلياً

      const absNet = Math.abs(b.net); // نستخدم القيمة الموجبة في العرض
      const currencyName = currencyMap.get(b.currency_id)?.name ?? b.currency_id;
      const key = `${personId}|${b.currency_id}`;
      const overdueInfo = overdueMap.get(key) ?? { daysOverdue: -9999, oldestDue: null };
      const severity = severityFor(overdueInfo.daysOverdue, absNet, person.credit_limit);

      list.push({
        person,
        net: absNet,
        currency: currencyName,
        daysOverdue: overdueInfo.daysOverdue,
        oldestDue: overdueInfo.oldestDue,
        txCount: b.txCount,
        severity,
        daysUntilEscalation: daysUntilEscalation(overdueInfo.daysOverdue, absNet, person.credit_limit),
        suggestedAction: suggestAction(severity, overdueInfo.daysOverdue, absNet, person.credit_limit, !!person.phone),
      });
    });
  });

  // Sort: first by severity (critical first), then by amount (largest first)
  const severityOrder = { critical: 0, late: 1, soon: 2, ok: 3 };
  return list.sort((a, b) => {
    const sOrder = severityOrder[a.severity] - severityOrder[b.severity];
    if (sOrder !== 0) return sOrder;
    return b.net - a.net;
  });
}