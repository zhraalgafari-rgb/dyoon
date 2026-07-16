/**
 * محرك القرار الذكي
 * يحلل بيانات العميل ويقرر الإجراء المناسب بناءً على:
 * - مدة الخمول (Inactivity)
 * - المبالغ المتأخرة (Overdue)
 * - حد الائتمان (Credit Limit)
 * - تاريخ التواصل السابق
 */

import {
    AlertSeverity,
    DecisionResult,
    AlertAction,
    MessageChannel,
    MessageTone,
    DetectionResult,
} from "./types";

interface DecisionInput {
    inactive_days: number;
    threshold: number;
    total_balance: number;
    overdue_amount: number;
    credit_limit: number | null;
    contact_count: number;
    days_since_last_contact: number;
    past_promptness?: number; // 0-100
}

/**
 * حساب شدة الخطورة (Severity Score)
 */
export function calculateSeverityScore(input: DecisionInput): number {
    let score = 0;

    // Inactivity factor (max 40 points)
    const inactivityRatio = input.inactive_days / input.threshold;
    score += Math.min(40, inactivityRatio * 20);

    // Overdue factor (max 30 points)
    if (input.overdue_amount > 0 && input.credit_limit) {
        const overdueRatio = input.overdue_amount / input.credit_limit;
        score += Math.min(30, overdueRatio * 15);
    } else if (input.overdue_amount > 0) {
        score += 20;
    }

    // Contact gap factor (max 20 points)
    if (input.days_since_last_contact > 0) {
        const contactGap = input.days_since_last_contact / 7; // in weeks
        score += Math.min(20, contactGap * 5);
    }

    // Past behavior factor (max 10 points)
    if (input.past_promptness !== undefined) {
        if (input.past_promptness < 30) score += 10; // always late
        else if (input.past_promptness < 60) score += 5; // sometimes late
    }

    return Math.min(100, score);
}

/**
 * تحويل النتيجة الرقمية إلى مستوى خطورة
 */
export function severityFromScore(score: number): AlertSeverity {
    if (score >= 70) return "critical";
    if (score >= 40) return "high";
    if (score >= 20) return "medium";
    return "low";
}

/**
 * محرك القرار الرئيسي
 */
export function decide(input: DecisionInput): DecisionResult {
    const score = calculateSeverityScore(input);
    const severity = severityFromScore(score);

    const actions: AlertAction[] = [
        { type: "dismiss", label: "تمت المتابعة", auto: false },
        { type: "snooze", label: "تأجيل 3 أيام", auto: false },
    ];

    // Add call action if critical/high
    if (severity === "critical" || severity === "high") {
        actions.unshift({ type: "call", label: "اقتراح اتصال", auto: false });
        actions.unshift({ type: "whatsapp", label: "إرسال واتساب", auto: severity === "critical" });
    }

    // Determine optimal channel
    let suggested_channel: MessageChannel = "in_app";
    if (severity === "critical") suggested_channel = "whatsapp";
    else if (severity === "high") suggested_channel = "push";

    // Determine tone based on severity + past behavior
    let suggested_tone: MessageTone = "professional";
    if (severity === "critical" && (input.past_promptness ?? 50) < 40) {
        suggested_tone = "firm";
    } else if (severity === "low" || input.past_promptness === undefined) {
        suggested_tone = "friendly";
    } else if (severity === "medium") {
        suggested_tone = "polite";
    }

    // Follow-up frequency
    const followup_days = severity === "critical" ? 3 : severity === "high" ? 5 : severity === "medium" ? 7 : 14;

    return {
        severity,
        priority: score,
        recommended_actions: actions,
        suggested_channel,
        suggested_tone,
        followup_days,
    };
}

/**
 * تحويل نتيجة الكشف إلى قرار
 */
export function decideFromDetection(
    detection: DetectionResult,
    threshold: number,
    contact_count: number,
    days_since_last_contact: number,
    past_promptness?: number
): DecisionResult {
    return decide({
        inactive_days: detection.inactive_days,
        threshold,
        total_balance: detection.total_balance,
        overdue_amount: detection.overdue_amount,
        credit_limit: null,
        contact_count,
        days_since_last_contact,
        past_promptness,
    });
}

/**
 * الحصول على الإجراء التلقائي التالي للعميل
 */
export function getNextAutoAction(decision: DecisionResult): AlertAction | null {
    return decision.recommended_actions.find((a) => a.auto) ?? null;
}

export default { calculateSeverityScore, severityFromScore, decide, decideFromDetection };