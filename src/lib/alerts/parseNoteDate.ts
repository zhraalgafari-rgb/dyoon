// Core business rule: extract a date/time trigger from free-text note content.
// Used ONLY by the backend server function (src/lib/alerts/server.ts); never
// imported by React components, keeping the frontend free of business logic.

export interface ParsedTrigger {
  dueAt: string; // ISO 8601 (UTC)
  matchedText: string; // the exact substring that was detected
}

const AR_MONTHS: Record<string, number> = {
  "يناير": 1, "كانون الثاني": 1, "كانون الاول": 1,
  "فبراير": 2, "شباط": 2,
  "مارس": 3, "آذار": 3,
  "أبريل": 4, "نيسان": 4,
  "مايو": 5, "ماي": 5,
  "يونيو": 6, "حزيران": 6,
  "يوليو": 7, "تموز": 7,
  "أغسطس": 8, "آب": 8,
  "سبتمبر": 9, "أيلول": 9,
  "أكتوبر": 10, "تشرين الأول": 10,
  "نوفمبر": 11, "تشرين الثاني": 11,
  "ديسمبر": 12, "كانون الأول": 12,
};

const EN_MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

export function parseNoteDate(input: string): ParsedTrigger | null {
  if (!input) return null;
  const text = input.trim();
  const matched: string[] = [];
  const now = new Date();
  let base: Date | null = null;
  let hasBase = false;

  // --- Absolute: YYYY-MM-DD [HH:MM] ---
  const iso = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (iso) {
    const y = +iso[1], m = +iso[2], d = +iso[3];
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      base = new Date(Date.UTC(y, m - 1, d));
      hasBase = true;
      matched.push(iso[0]);
    }
  }

  // --- Absolute: DD/MM/YYYY or DD-MM-YYYY ---
  if (!hasBase) {
    const sl = text.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
    if (sl) {
      const d = +sl[1], m = +sl[2], y = +sl[3];
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        base = new Date(Date.UTC(y, m - 1, d));
        hasBase = true;
        matched.push(sl[0]);
      }
    }
  }

  // --- Absolute: "<day> <arabic month> [<year>]" ---
  if (!hasBase) {
    const ar = text.match(/(\d{1,2})\s+([\u0600-\u06FF ]+?)(?:\s+(\d{4}))?/);
    if (ar) {
      const day = +ar[1];
      const name = ar[2].trim();
      const mon = AR_MONTHS[name];
      if (mon && day >= 1 && day <= 31) {
        const y = ar[3] ? +ar[3] : now.getUTCFullYear();
        base = new Date(Date.UTC(y, mon - 1, day));
        hasBase = true;
        matched.push(ar[0]);
      }
    }
  }

  // --- Absolute: "<day> <english month> [<year>]" ---
  if (!hasBase) {
    const en = text.match(/(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/i);
    if (en) {
      const day = +en[1];
      const mon = EN_MONTHS[en[2].toLowerCase()];
      if (mon && day >= 1 && day <= 31) {
        const y = en[3] ? +en[3] : now.getUTCFullYear();
        base = new Date(Date.UTC(y, mon - 1, day));
        hasBase = true;
        matched.push(en[0]);
      }
    }
  }

  // --- Relative date cues ---
  if (!hasBase) {
    if (/(غداً|غدا|غدًا|tomorrow)/i.test(text)) {
      base = new Date(now.getTime() + 86400000);
      hasBase = true;
      matched.push("غداً");
    } else {
      const days = text.match(/بعد\s+(\d+)\s*(يوم|أيام|days?)/i) || text.match(/in\s+(\d+)\s*days?/i);
      if (days) {
        base = new Date(now.getTime() + parseInt(days[1], 10) * 86400000);
        hasBase = true;
        matched.push(days[0]);
      } else if (/(الأسبوع القادم|الاسبوع القادم|أسبوعين|next week)/i.test(text)) {
        const w = /أسبوعين/i.test(text) ? 14 : 7;
        base = new Date(now.getTime() + w * 86400000);
        hasBase = true;
        matched.push("أسبوع");
      }
    }
  }

  if (!hasBase) return null;

  // --- Time extraction (default 09:00 if none found) ---
  let hours = 9;
  let minutes = 0;
  let timeMatched = false;

  // "الساعة H[:MM]"
  const arClock = text.match(/الساعة\s*(\d{1,2})(?::(\d{2}))?/);
  if (arClock) {
    hours = +arClock[1];
    minutes = arClock[2] ? +arClock[2] : 0;
    timeMatched = true;
    matched.push(arClock[0]);
  }
  // "H صباحاً|ص|مساءً|م" or "Ham|Hpm"
  if (!timeMatched) {
    const arMeridiem = text.match(/(\d{1,2})\s*(صباحاً|ص|مساءً|م|am|pm)/i);
    if (arMeridiem) {
      hours = +arMeridiem[1];
      const mer = arMeridiem[2].toLowerCase();
      if (mer === "مساءً" || mer === "م" || mer === "pm") {
        if (hours < 12) hours += 12;
      } else if (mer === "صباحاً" || mer === "ص" || mer === "am") {
        if (hours === 12) hours = 0;
      }
      timeMatched = true;
      matched.push(arMeridiem[0]);
    }
  }
  // 24h "HH:MM"
  if (!timeMatched) {
    const hm = text.match(/(\d{1,2}):(\d{2})/);
    if (hm) {
      hours = +hm[1];
      minutes = +hm[2];
      timeMatched = true;
      matched.push(hm[0]);
    }
  }

  const result = new Date(base!.getTime());
  result.setUTCHours(hours, minutes, 0, 0);

  // If a relative cue produced a past timestamp (e.g. "yesterday" phrasing), ignore.
  if (result.getTime() < now.getTime() - 60000 && !hasBase) return null;

  return { dueAt: result.toISOString(), matchedText: matched.join(" · ") };
}
