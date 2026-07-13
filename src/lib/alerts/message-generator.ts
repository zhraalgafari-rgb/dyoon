/**
 * مولد الرسائل الذكي
 * يقوم بتوليد رسائل متابعة مخصصة لكل عميل بناءً على:
 * - سلوك العميل السابق
 * - المبلغ المستحق
 * - مدة التأخير
 * - قناة التواصل المفضلة
 */

import { generateReminderMessage } from "@/lib/ai.functions";
import { fmtMoney } from "@/lib/format";
import {
    GenerationContext,
    GeneratedMessage,
    MessageTone,
    MessageChannel,
} from "./types";

/**
 * تحليل سلوك العميل لاختيار أفضل نبرة وقناة
 */
export function analyzeCustomerBehavior(context: GenerationContext): {
    optimal_tone: MessageTone;
    optimal_channel: MessageChannel;
    followup_frequency: number;
} {
    // إذا كان العميل يستجيب بسرعة للرسائل السابقة → friendly + whatsapp
    if (context.history.avg_response_days && context.history.avg_response_days < 2) {
        return { optimal_tone: "friendly", optimal_channel: "whatsapp", followup_frequency: 3 };
    }
    // إذا كان العميل متأخر باستمرار → firm + sms
    if (context.behavior.past_promptness && context.behavior.past_promptness < 30) {
        return { optimal_tone: "firm", optimal_channel: "sms", followup_frequency: 5 };
    }
    // إذا كان هناك تواصل سابق → polite + preferred channel
    if (context.history.contact_count > 3) {
        return {
            optimal_tone: context.behavior.preferred_tone || "polite",
            optimal_channel: context.behavior.preferred_channel || "whatsapp",
            followup_frequency: 7,
        };
    }
    // الحالة الافتراضية
    return { optimal_tone: "professional", optimal_channel: "whatsapp", followup_frequency: 7 };
}

/**
 * بناء رسالة بديلة (Fallback) بناءً على السياق
 */
export function buildFallbackMessage(ctx: GenerationContext, tone: MessageTone): string {
    const amount = fmtMoney(ctx.financial.amount);
    const currency = ctx.financial.currency;
    const name = ctx.customer.name;

    const templates: Record<MessageTone, string> = {
        polite: `السلام عليكم ${name}،\nنود تذكيركم بمبلغ ${amount} ${currency} المتبقي لديكم.\نشكر تعاونكم.`,
        firm: `السيد ${name}،\nنحيطكم علماً بأن المبلغ المستحق ${amount} ${currency} لم يتم سداده بعد.\nيرجى التفضل بالتواصل معنا للترتيب.`,
        friendly: `مرحباً ${name} 👋\nمجرد تذكير ودي بخصوص ${amount} ${currency}.\nتواصل معنا وقت ما يناسبك.`,
        professional: `عزيزي ${name}،\nنود إعلامكم بأن رصيدكم المستحق وقدره ${amount} ${currency} قد تجاوز تاريخ الاستحقاق.\nيرجى التكرم بالسداد في أقرب وقت ممكن.\nشاكرين تعاونكم.`,
    };

    let message = templates[tone] || templates.professional;

    // إضافة تفاصيل التأخير إن وجدت
    if (ctx.financial.days_overdue && ctx.financial.days_overdue > 0) {
        message += `\n(تأخر السداد ${ctx.financial.days_overdue} يوم)`;
    }

    // إضافة تذييل حسب القناة
    if (ctx.history.last_contact_type === "whatsapp") {
        message += "\nللتواصل: واتساب أو اتصال";
    }

    return message;
}

/**
 * تخصيص الرسالة بناءً على سلوك العميل (تطبيق الـ personalization)
 */
function applyPersonalization(message: string, ctx: GenerationContext): string {
    let personalized = message;

    // إضافة إشارة إلى تاريخ التواصل السابق
    if (ctx.history.last_contact_date) {
        const lastContact = new Date(ctx.history.last_contact_date);
        const daysSince = Math.floor((Date.now() - lastContact.getTime()) / 86400000);
        if (daysSince > 30) {
            personalized += `\n\nآخر تواصل كان منذ ${daysSince} يوم، نأمل في تجديد التواصل.`;
        }
    }

    // إشارة إلى حد الائتمان
    if (ctx.customer.credit_limit && ctx.financial.amount > ctx.customer.credit_limit * 0.8) {
        personalized += `\nيرجى ملاحظة أن المبلغ يقترب من الحد الائتماني المحدد.`;
    }

    return personalized;
}

/**
 * توليد رسالة متابعة ذكية
 * @param context - سياق العميل والمعاملة
 * @param tone - النبرة المطلوبة
 * @param channel - قناة التواصل
 * @returns الرسالة المُنشأة مع درجة الثقة
 */
export async function generateSmartMessage(
    context: GenerationContext,
    tone: MessageTone = "professional",
    channel: MessageChannel = "whatsapp",
): Promise<GeneratedMessage> {
    // 1. تحليل السلوك لاختيار أفضل إعدادات
    const analysis = analyzeCustomerBehavior(context);
    const effectiveTone = tone === "professional" ? analysis.optimal_tone : tone;

    // 2. محاولة استخدام AI
    try {
        const response = await generateReminderMessage({
            data: {
                person_name: context.customer.name,
                amount: context.financial.amount,
                currency: context.financial.currency,
                days_overdue: context.financial.days_overdue,
                tone: effectiveTone,
                channel,
                history: JSON.stringify(context.history),
            },
        });
        return {
            message: applyPersonalization(response.message, context),
            confidence: 0.85,
            tone: effectiveTone,
            alternatives: [
                buildFallbackMessage(context, "polite"),
                buildFallbackMessage(context, "friendly"),
            ],
        };
    } catch {
        // 3. Fallback: قالب ذكي
        const message = applyPersonalization(
            buildFallbackMessage(context, effectiveTone),
            context,
        );
        return {
            message,
            confidence: 0.6,
            tone: effectiveTone,
            alternatives: [
                buildFallbackMessage(context, "polite"),
                buildFallbackMessage(context, "friendly"),
            ],
        };
    }
}

export default { generateSmartMessage, analyzeCustomerBehavior, buildFallbackMessage };