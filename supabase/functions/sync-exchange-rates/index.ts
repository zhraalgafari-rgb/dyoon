import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Maps Arabic currency names from ye-rial.com/aden to ISO symbols.
 * All rates are expressed as YER per 1 unit of the foreign currency.
 */
const ARABIC_TO_SYMBOL: Record<string, string> = {
  "دولار": "USD",
  "دولار امريكي": "USD",
  "دولار أمريكي": "USD",
  "يورو": "EUR",
  "جنيه استرليني": "GBP",
  "ريال سعودي": "SAR",
  "درهم اماراتي": "AED",
  "درهم إماراتي": "AED",
  "دينار كويتي": "KWD",
  "ريال قطري": "QAR",
  "ريال عماني": "OMR",
  "دينار اردني": "JOD",
  "دينار أردني": "JOD",
  "دينار بحريني": "BHD",
  "جنيه مصري": "EGP",
  "ريال يمني": "YER",
};

const ISO_TO_SYMBOL: Record<string, string> = {
  USD: "USD", EUR: "EUR", SAR: "SAR", AED: "AED",
  GBP: "GBP", KWD: "KWD", QAR: "QAR", OMR: "OMR",
  JOD: "JOD", BHD: "BHD", EGP: "EGP", YER: "YER",
};

/** Parse ye-rial.com/aden HTML → Map<ISO_symbol, rate_in_YER> */
function parseRates(html: string): Map<string, number> {
  const rates = new Map<string, number>();

  // Strategy 1: JS variables in <script> blocks: var USD = 1554;
  const scriptBlocks = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of scriptBlocks) {
    const inner = block.replace(/<\/?script[^>]*>/gi, "");

    const varPat = /(?:var|let|const)\s+(\w+)\s*=\s*([\d]+(?:\.[\d]+)?)/g;
    let m;
    while ((m = varPat.exec(inner)) !== null) {
      const sym = ISO_TO_SYMBOL[m[1].toUpperCase()];
      const rate = parseFloat(m[2]);
      if (sym && rate > 100 && rate < 10_000_000 && !rates.has(sym)) {
        rates.set(sym, rate);
      }
    }

    // JSON arrays: [{name:"USD", rate:1554}, ...]
    const jsonPat = /(\[\s*\{[\s\S]*?\}\s*\])/g;
    while ((m = jsonPat.exec(inner)) !== null) {
      try {
        const arr = JSON.parse(m[1]);
        if (!Array.isArray(arr)) continue;
        for (const item of arr) {
          const rawName = String(item.name || item.currency || item.cur || "").trim();
          const rate = parseFloat(item.rate || item.value || item.price || item.buy || 0);
          if (!rawName || rate < 100 || rate > 10_000_000) continue;
          const sym = ISO_TO_SYMBOL[rawName.toUpperCase()] ?? ARABIC_TO_SYMBOL[rawName];
          if (sym && !rates.has(sym)) rates.set(sym, rate);
        }
      } catch { /* skip */ }
    }
  }

  // Strategy 2: Arabic name scanning in full HTML
  for (const [arabicName, sym] of Object.entries(ARABIC_TO_SYMBOL)) {
    if (rates.has(sym)) continue;
    const escaped = arabicName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`${escaped}[^\\d]{0,200}([\\d,]+(?:\\.\\d+)?)`, "g");
    let match;
    while ((match = re.exec(html)) !== null) {
      const rate = parseFloat(match[1].replace(/,/g, ""));
      if (rate > 100 && rate < 10_000_000) { rates.set(sym, rate); break; }
    }
  }

  return rates;
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const log: Record<string, unknown> = {
    source: "ye-rial.com/aden",
    currencies_updated: 0,
    raw_data: null,
    error_msg: null,
  };

  try {
    // Fetch Aden exchange rates page
    const res = await fetch("https://ye-rial.com/aden/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ar,en;q=0.9",
        "Cache-Control": "no-cache",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ye-rial.com/aden`);
    const html = await res.text();

    // Parse: all values are YER per 1 unit of currency
    const ratesInYER = parseRates(html);
    log.raw_data = {
      html_length: html.length,
      fetched_at: new Date().toISOString(),
      rates_in_yer: Object.fromEntries(ratesInYER),
    };

    // Load DB currencies
    const { data: dbCurs, error: dbErr } = await supabase
      .from("currencies")
      .select("id, name, symbol, rate, is_base");
    if (dbErr) throw dbErr;

    // Determine base currency and its YER equivalent
    const baseCur = (dbCurs ?? []).find((c) => c.is_base);
    const baseSymbol = (baseCur?.symbol ?? "SAR").toUpperCase();
    const yerPerBase = ratesInYER.get(baseSymbol) ?? 1;

    let updatedCount = 0;
    const updateLog: Array<{ currency: string; symbol: string; old_rate: number; new_rate: number }> = [];

    for (const dbCur of (dbCurs ?? [])) {
      if (dbCur.is_base) continue;
      const sym = dbCur.symbol?.toUpperCase();
      if (!sym) continue;

      const yerPerThis = ratesInYER.get(sym);
      if (!yerPerThis) continue;

      // Rate = how many base-units per 1 of this currency
      // e.g. base=SAR, this=YER: SAR_per_YER = YER_per_SAR / YER_per_YER = 410/1 → 1 YER = 1/410 SAR
      const newRate = baseSymbol === "YER"
        ? yerPerThis                    // base is YER: store directly
        : yerPerThis / yerPerBase;       // base is SAR: USD_per_SAR = 1554/410 ≈ 3.79
      const rounded = Math.round(newRate * 10000) / 10000;

      if (Math.abs(rounded - Number(dbCur.rate)) > 0.0001) {
        const { error: upErr } = await supabase
          .from("currencies")
          .update({ rate: rounded })
          .eq("id", dbCur.id);
        if (!upErr) {
          updatedCount++;
          updateLog.push({ currency: dbCur.name, symbol: sym, old_rate: Number(dbCur.rate), new_rate: rounded });
        }
      }
    }

    log.currencies_updated = updatedCount;
    log.raw_data = { ...(log.raw_data as object), update_log: updateLog };
    await supabase.from("exchange_rate_sync_log").insert(log);

    return new Response(
      JSON.stringify({ ok: true, base: baseSymbol, yer_per_base: yerPerBase, updated: updatedCount, log: updateLog }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    log.error_msg = err instanceof Error ? err.message : String(err);
    await supabase.from("exchange_rate_sync_log").insert(log).catch(() => {});
    return new Response(
      JSON.stringify({ ok: false, error: log.error_msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
