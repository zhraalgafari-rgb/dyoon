/**
 * نظام التنبيهات الآلي للعملاء
 * Automated Customer Notification & Alerting System
 * 
 * يجمع بين:
 * - كشف العملاء غير النشطين (Inactivity Detection)
 * - محرك القرار الذكي (Decision Engine)
 * - مولد الرسائل المخصصة (Message Generator)
 * - كشف التواريخ من النصوص (Date Parser)
 */

export { parseNoteDate, hasDateTrigger } from "./parseNoteDate";
export type { ParsedTrigger } from "./types";

export {
    calculateSeverityScore,
    severityFromScore,
    decide,
    decideFromDetection,
    getNextAutoAction,
} from "./decision-engine";

export {
    generateSmartMessage,
    analyzeCustomerBehavior,
    buildFallbackMessage,
} from "./message-generator";

export type {
    SmartAlert,
    AlertSource,
    AlertStatus,
    AlertSeverity,
    MessageTone,
    MessageChannel,
    GenerationContext,
    GeneratedMessage,
    DecisionResult,
    AlertAction,
    DetectionResult,
    CustomerProfile,
    FinancialSummary,
    ContactLogEntry,
    TransactionSummary,
} from "./types";

/**
 * دالة مساعدة: بناء سياق التوليد من بيانات العميل
 */
export function buildGenerationContext(params: {
    customerName: string;
    amount: number;
    currency: string;
    isCredit: boolean;
    daysOverdue?: number;
    phone?: string;
    creditLimit?: number;
    notes?: string;
    lastContactType?: string;
    lastContactDate?: string;
    contactCount: number;
    avgResponseDays?: number;
    pastPromptness?: number;
    previousRemindersSent?: number;
}) {
    return {
        customer: {
            name: params.customerName,
            phone: params.phone,
            credit_limit: params.creditLimit,
            notes: params.notes,
        },
        financial: {
            amount: params.amount,
            currency: params.currency,
            is_credit: params.isCredit,
            days_overdue: params.daysOverdue,
        },
        history: {
            last_contact_type: params.lastContactType,
            last_contact_date: params.lastContactDate,
            contact_count: params.contactCount,
            avg_response_days: params.avgResponseDays,
        },
        behavior: {
            past_promptness: params.pastPromptness,
            previous_reminders_sent: params.previousRemindersSent ?? 0,
        },
    };
}