import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import {
  type CatRow,
  type CompanyRow,
  type CurRow,
  type ExpRow,
  type OpeningRow,
  type PersonRow,
  type TxRow,
  EXCEL_MIME,
  download,
  safeFileName,
  wait,
} from "./types";
import { buildStatementWorkbookForCurrency } from "./excel-statement-builder";

/**
 * Bulk export — all people, transactions, and expenses into a single
 * multi-sheet RTL workbook.
 */
export async function exportAllToExcel(userId: string, fileName = `daftarak-${Date.now()}.xlsx`) {
  const [
    { data: people },
    { data: txs },
    { data: expenses },
    { data: currencies },
    { data: cats },
  ] = await Promise.all([
    supabase.from("people").select("id,name,phone").eq("user_id", userId),
    supabase
      .from("transactions")
      .select("person_id,amount,direction,transaction_date,details,currency_id")
      .eq("user_id", userId),
    supabase
      .from("expenses")
      .select("amount,expense_date,note,category_id,currency_id")
      .eq("user_id", userId),
    supabase.from("currencies").select("id,name,symbol,rate").eq("user_id", userId),
    supabase.from("expense_categories").select("id,name").eq("user_id", userId),
  ]);

  const pMap = new Map<string, PersonRow>(((people as PersonRow[]) ?? []).map((p) => [p.id, p]));
  const cMap = new Map<string, CurRow>(((currencies as CurRow[]) ?? []).map((c) => [c.id, c]));
  const catMap = new Map<string, CatRow>(((cats as CatRow[]) ?? []).map((c) => [c.id, c]));

  const peopleSheet = ((people as PersonRow[]) ?? []).map((p) => {
    let bal = 0;
    for (const t of ((txs as TxRow[]) ?? []).filter((x) => x.person_id === p.id)) {
      const r = cMap.get(t.currency_id)?.rate ?? 1;
      bal += Number(t.amount) * (t.direction === "credit" ? 1 : -1) * r;
    }
    return {
      الاسم: p.name,
      الجوال: p.phone ?? "",
      الرصيد: Math.abs(bal),
      الحالة: bal >= 0 ? "له" : "عليه",
    };
  });

  const txSheet = ((txs as TxRow[]) ?? []).map((t) => ({
    التاريخ: new Date(t.transaction_date).toLocaleDateString("en-GB"),
    الاسم: pMap.get(t.person_id ?? "")?.name ?? "—",
    النوع: t.direction === "credit" ? "له" : "عليه",
    المبلغ: Number(t.amount),
    العملة: cMap.get(t.currency_id)?.name ?? "",
    التفاصيل: t.details ?? "",
  }));

  const expSheet = ((expenses as unknown as ExpRow[]) ?? []).map((e) => ({
    التاريخ: new Date(e.expense_date).toLocaleDateString("en-GB"),
    التصنيف: catMap.get(e.category_id)?.name ?? "—",
    المبلغ: Number(e.amount),
    العملة: cMap.get(e.currency_id)?.name ?? "",
    الوصف: e.note ?? "",
  }));

  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(peopleSheet), "الأشخاص");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txSheet), "المعاملات");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expSheet), "المصاريف");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  download(new Blob([out], { type: EXCEL_MIME }), fileName);
}

/**
 * Export professional Excel statements for a customer.
 * Produces ONE polished workbook per currency the customer transacted in
 * (or has an opening balance in). E.g. SAR + YER → two files.
 */
export async function exportPersonToExcel(personId: string, personName: string) {
  const [
    { data: person },
    { data: txs },
    { data: currencies },
    { data: company },
    { data: openings },
  ] = await Promise.all([
    supabase.from("people").select("id,name,phone").eq("id", personId).maybeSingle(),
    supabase
      .from("transactions")
      .select("amount,direction,transaction_date,details,currency_id")
      .eq("person_id", personId)
      .order("transaction_date", { ascending: true }),
    supabase.from("currencies").select("id,name,symbol,rate"),
    supabase
      .from("company_profile")
      .select("name,address,phone,email,tax_number,notes")
      .maybeSingle(),
    supabase
      .from("opening_balances")
      .select("currency_id,amount,direction")
      .eq("person_id", personId),
  ]);

  const p: PersonRow = (person as PersonRow | null) ?? {
    id: personId,
    name: personName,
    phone: null,
  };
  const cMap = new Map<string, CurRow>(((currencies as CurRow[]) ?? []).map((c) => [c.id, c]));
  const txList = (txs as TxRow[]) ?? [];
  const opList = (openings as OpeningRow[]) ?? [];
  const comp = (company as CompanyRow | null) ?? null;

  const usedIds = new Set<string>();
  txList.forEach((t) => usedIds.add(t.currency_id));
  opList.forEach((o) => usedIds.add(o.currency_id));

  if (usedIds.size === 0) {
    const base = (currencies as CurRow[])?.[0];
    if (!base) return;
    const buf = await buildStatementWorkbookForCurrency({
      person: p,
      currency: base,
      txs: [],
      opening: 0,
      company: comp,
    });
    download(
      new Blob([buf], { type: EXCEL_MIME }),
      `كشف-حساب-${safeFileName(p.name || personName)}-${base.name}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    return;
  }

  const ordered = Array.from(usedIds).sort((a, b) => {
    const na = cMap.get(a)?.name || "";
    const nb = cMap.get(b)?.name || "";
    return na.localeCompare(nb, "ar");
  });

  const safe = safeFileName(p.name || personName);
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < ordered.length; i++) {
    const curId = ordered[i];
    const cur = cMap.get(curId);
    if (!cur) continue;
    const currencyTxs = txList.filter((t) => t.currency_id === curId);
    const openingSigned = opList
      .filter((o) => o.currency_id === curId)
      .reduce((s, o) => s + Number(o.amount) * (o.direction === "credit" ? 1 : -1), 0);
    const buf = await buildStatementWorkbookForCurrency({
      person: p,
      currency: cur,
      txs: currencyTxs,
      opening: openingSigned,
      company: comp,
    });
    download(new Blob([buf], { type: EXCEL_MIME }), `كشف-حساب-${safe}-${cur.name}-${today}.xlsx`);
    if (i < ordered.length - 1) await wait(400); // give the browser time between downloads
  }
}
