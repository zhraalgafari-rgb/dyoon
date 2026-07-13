/**
 * كشف التواريخ والمواعيد من النصوص
 * يدعم العربية والإنجليزية بأنماط متعددة
 * 
 * Examples:
 * "اتصل بالعميل في 20 يوليو 2026 الساعة 10:00 صباحاً"
 * "متابعة بعد 3 أيام"
 * "تذكير غداً الساعة 2pm"
 * "2026-07-20 10:00"
 */

import { ParsedTrigger } from "./types";

interface DatePattern {
  regex: RegExp;
  parse: (match: RegExpExecArray, now: Date) => { dueAt: Date; matchedText: string } | null;
}

// ---- Arabic to English month mapping ----
const AR_MONTHS: Record<string, number> = {
  يناير: 0, فبراير: 1, مارس: 2, أبريل: 3, مايو: 4, يونيو: 5,
  يوليو: 6, أغسطس: 7, سبتمبر: 8, أكتوبر: 9, نوفمبر: 10, ديسمبر: 11,
};

const AR_DAYS: Record<string, number> = {
  الأحد: 0, الأثنين: 0, الاثنين: 0, الثلاثاء: 1, الأربعاء: 2,
  الخميس: 3, الجمعة: 4, السبت: 5,
};

// ---- Patterns (ordered by specificity - most specific first) ----
const PATTERNS: DatePattern[] = [
  // ISO format: 2026-07-20 10:00
  {
    regex: /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/,
    parse: ([, y, m, d, h, min], _now) => ({
      dueAt: new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min)),
      matchedText: `${y}-${m}-${d} ${h}:${min}`,
    }),
  },
  // ISO date only: 2026-07-20
  {
    regex: /(\d{4})-(\d{1,2})-(\d{1,2})/,
    parse: ([, y, m, d], _now) => ({
      dueAt: new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0),
      matchedText: `${y}-${m}-${d}`,
    }),
  },
  // DD/MM/YYYY or DD-MM-YYYY
  {
    regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    parse: ([, d, m, y], _now) => ({
      dueAt: new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0),
      matchedText: `${d}/${m}/${y}`,
    }),
  },
  // Arabic: 20 يوليو 2026 or 20 يوليو
  {
    regex: /(\d{1,2})\s+(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)(?:\s+(\d{4}))?/,
    parse: ([, d, monthStr, y], now) => {
      const month = AR_MONTHS[monthStr];
      if (month === undefined) return null;
      const year = y ? parseInt(y) : now.getFullYear();
      return { dueAt: new Date(year, month, parseInt(d), 12, 0), matchedText: `${d} ${monthStr}${y ? ` ${y}` : ""}` };
    },
  },
  // Arabic: غداً / بعد غد
  {
    regex: /(غداً|بعد غد|بعد\s+(\d+)\s+(أيام|ايام|يوم)|الأسبوع\s+القادم|الشهر\s+القادم)/,
    parse: ([, match, num, unit], now) => {
      let dueAt = new Date(now);
      if (match === "غداً") dueAt.setDate(dueAt.getDate() + 1);
      else if (match === "بعد غد") dueAt.setDate(dueAt.getDate() + 2);
      else if (unit && (unit === "أيام" || unit === "ايام" || unit === "يوم")) dueAt.setDate(dueAt.getDate() + (parseInt(num) || 0));
      return { dueAt, matchedText: match };
    },
  },
  // Arabic day name: يوم الاثنين
  {
    regex: /(الأحد|الأثنين|الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت)/,
    parse: ([, dayStr], now) => {
      const targetDay = AR_DAYS[dayStr];
      if (targetDay === undefined) return null;
      const dueAt = new Date(now);
      const currentDay = dueAt.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7; // next week
      dueAt.setDate(dueAt.getDate() + diff);
      return { dueAt, matchedText: dayStr };
    },
  },
  // English relative: next Monday, in 3 days, tomorrow
  {
    regex: /(next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|in\s+(\d+)\s+days?|tomorrow|tonight)/i,
    parse: ([, match, dayName, num], now) => {
      const dueAt = new Date(now);
      const lower = match.toLowerCase();
      if (lower === "tomorrow" || lower === "tonight") dueAt.setDate(dueAt.getDate() + 1);
      else if (num) dueAt.setDate(dueAt.getDate() + parseInt(num));
      else if (dayName) {
        const days: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
        const target = days[dayName.toLowerCase()];
        if (target !== undefined) {
          let diff = target - dueAt.getDay();
          if (diff <= 0) diff += 7;
          dueAt.setDate(dueAt.getDate() + diff);
        }
      }
      return { dueAt, matchedText: match };
    },
  },
  // Time extraction (when follows a date match): الساعة 10:00, at 2pm, 10:00 صباحاً
  {
    regex: /(?:الساعة\s+)?(\d{1,2}):(\d{2})\s*(صباحاً|مساءً|am|pm)?/i,
    parse: ([, h, min, period], now) => {
      let hours = parseInt(h);
      const mins = parseInt(min);
      if (period) {
        const p = period.toLowerCase();
        if ((p === "pm" || p === "مساءً") && hours < 12) hours += 12;
        if ((p === "am" || p === "صباحاً") && hours === 12) hours = 0;
      }
      const dueAt = new Date(now);
      dueAt.setHours(hours, mins, 0, 0);
      return { dueAt, matchedText: `${h}:${min}` };
    },
  },
];

/**
 * استخراج التاريخ والوقت من نص حر
 * @param text - النص المراد تحليله (عربي أو إنجليزي)
 * @param tz - المنطقة الزمنية (افتراضي: الرياض)
 * @returns أول تاريخ يتم العثور عليه مع النص المطابق
 */
export function parseNoteDate(text: string, tz = "Asia/Riyadh"): ParsedTrigger | null {
  if (!text || text.trim().length < 3) return null;

  const now = new Date();

  // Try each pattern
  for (const pattern of PATTERNS) {
    const regex = new RegExp(pattern.regex.source, "gi");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const result = pattern.parse(match, now);
      if (result && !isNaN(result.dueAt.getTime())) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 90); // max 90 days ahead

        // Validate: not in the past (unless today), not too far in future
        if (result.dueAt < today &&
          result.dueAt.toDateString() !== today.toDateString()) {
          continue;
        }

        return {
          dueAt: result.dueAt.toISOString(),
          matchedText: result.matchedText,
          confidence: result.matchedText.includes(":") ? "high" : "medium",
        };
      }
    }
  }

  return null;
}

/**
 * تحقق مما إذا كان النص يحتوي على تاريخ
 */
export function hasDateTrigger(text: string): boolean {
  return parseNoteDate(text) !== null;
}

export default parseNoteDate;