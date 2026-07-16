import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateTextWithFallback } from "@/lib/ai.functions";
import { z } from "zod";

/** Generate a contact message for a specific channel */
export const generateContactMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      person_name: z.string().min(1).max(80),
      channel: z.enum(["whatsapp", "call", "email", "note", "sms", "reminder", "other"]),
      direction: z.enum(["outgoing", "incoming"]),
      amount: z.number().optional(),
      currency: z.string().optional(),
      context: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const channelLabel: Record<string, string> = {
      whatsapp: "واتساب",
      sms: "رسالة نصية",
      email: "بريد إلكتروني",
      reminder: "رسالة تذكير",
      call: "محادثة هاتفية",
      note: "ملاحظة داخلية",
      other: "رسالة",
    };

    const systemPrompt = data.direction === "incoming"
      ? `أنت مساعد يساعد في تسجيل ردود العملاء. اكتب ملاحظة مختصرة ومحايدة عن رد العميل ${data.person_name} بأسلوب مهني.`
      : `أنت كاتب رسائل عربية احترافية. اكتب رسالة ${channelLabel[data.channel] ?? "رسالة"} مهذبة لتذكير العميل ${data.person_name}${data.amount ? ` بمبلغ ${data.amount} ${data.currency ?? ""}` : ""}. القواعد: 3-5 أسطر، بدون رموز مبالغة، أسلوب احترافي ودي، عربية فصحى سهلة.`;

    const prompt = data.context
      ? `السياق: ${data.context}`
      : `العميل: ${data.person_name}${data.amount ? `\nالمبلغ: ${data.amount} ${data.currency ?? ""}` : ""}`;

    const { text } = await generateTextWithFallback({ system: systemPrompt, prompt });
    return { message: text.trim() };
  });
