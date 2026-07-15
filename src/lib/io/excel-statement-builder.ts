import ExcelJS from "exceljs";
import type { CompanyRow, CurRow, PersonRow, TxRow } from "./types";
import {
  COL_CREDIT,
  COL_DEBIT,
  COL_HEAD_BG,
  COL_HEAD_TXT,
  COL_INFO_BG,
  COL_SECTION_BG,
  COL_SUBHEAD_BG,
  COL_TOTAL_BG,
  COL_ZEBRA,
  COL_BORDER_STRONG,
  DATE_FMT,
  INT_FMT,
  NUM_FMT,
  fmtDateENStr,
  fmtNumEN,
  thinBorder,
} from "./excel-styling";

interface BuildOpts {
  person: PersonRow;
  currency: CurRow;
  txs: TxRow[];
  opening: number;
  company: CompanyRow | null;
}

/** Build one professional workbook for a single currency's statement. */
export async function buildStatementWorkbookForCurrency(opts: BuildOpts): Promise<ArrayBuffer> {
  const { person: p, currency: cur, txs: list, opening, company: comp } = opts;

  const wb = new ExcelJS.Workbook();
  wb.creator = comp?.name ?? "دفترك";
  wb.created = new Date();

  const ws = wb.addWorksheet(`كشف ${cur.name}`, {
    views: [{ rightToLeft: true, showGridLines: false, state: "normal" }],
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });

  ws.columns = [
    { width: 6 }, // A #
    { width: 14 }, // B Date
    { width: 42 }, // C Details
    { width: 16 }, // D Debit
    { width: 16 }, // E Credit
    { width: 18 }, // F Balance
  ];

  let row = buildHeader(ws, cur, comp);
  row = buildCustomerInfo(ws, row, p, list.length);

  /* ============ TABLE HEADER ============ */
  row += 1;
  const headers = [
    "#",
    "التاريخ",
    "البيان",
    "مدين (عليه)",
    "دائن (له)",
    `الرصيد (${cur.symbol || cur.name})`,
  ];
  headers.forEach((h, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = h;
    c.font = { name: "Arial", size: 11, bold: true, color: { argb: COL_HEAD_TXT } };
    c.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl", wrapText: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COL_HEAD_BG } };
    c.border = thinBorder;
  });
  ws.getRow(row).height = 30;
  row++;

  row = buildOpeningRow(ws, row, opening);
  row = buildTxRows(ws, row, list, opening);

  /* ============ TOTALS ============ */
  let balance = opening;
  let totalDebit = 0;
  let totalCredit = 0;
  for (const t of list) {
    const amt = Number(t.amount);
    if (t.direction === "credit") {
      balance += amt;
      totalCredit += amt;
    } else {
      balance -= amt;
      totalDebit += amt;
    }
  }

  const totalCells: (string | number | null)[] = [
    "",
    "",
    "الإجمالي",
    totalDebit,
    totalCredit,
    balance,
  ];
  totalCells.forEach((v, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = v;
    c.border = { ...thinBorder, top: { style: "double" as const, color: { argb: COL_HEAD_BG } } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COL_TOTAL_BG } };
    c.alignment = {
      horizontal: i === 2 ? "right" : "center",
      vertical: "middle",
      readingOrder: "rtl",
    };
    c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF111827" } };
    if (i >= 3) c.numFmt = NUM_FMT;
    if (i === 3) c.font = { name: "Arial", size: 11, bold: true, color: { argb: COL_DEBIT } };
    if (i === 4) c.font = { name: "Arial", size: 11, bold: true, color: { argb: COL_CREDIT } };
    if (i === 5)
      c.font = {
        name: "Arial",
        size: 12,
        bold: true,
        color: { argb: balance >= 0 ? COL_CREDIT : COL_DEBIT },
      };
  });
  ws.getRow(row).height = 26;
  row++;

  /* ============ FINAL BALANCE ============ */
  ws.mergeCells(`A${row}:F${row}`);
  const fb = ws.getCell(`A${row}`);
  const status = balance >= 0 ? "له" : "عليه";
  fb.value = `الرصيد النهائي بعملة ${cur.name}: ${fmtNumEN(Math.abs(balance))} ${cur.symbol ?? ""} (${status})`;
  fb.font = {
    name: "Arial",
    size: 13,
    bold: true,
    color: { argb: balance >= 0 ? COL_CREDIT : COL_DEBIT },
  };
  fb.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  fb.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COL_INFO_BG } };
  fb.border = thinBorder;
  ws.getRow(row).height = 28;
  row += 2;

  if (comp?.notes) {
    ws.mergeCells(`A${row}:F${row}`);
    const nt = ws.getCell(`A${row}`);
    nt.value = comp.notes;
    nt.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF374151" } };
    nt.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl", wrapText: true };
    ws.getRow(row).height = 22;
    row++;
  }

  /* ============ FOOTER ============ */
  ws.mergeCells(`A${row}:F${row}`);
  const ft = ws.getCell(`A${row}`);
  ft.value = `${comp?.name ? comp.name + "  •  " : ""}تم الإنشاء بواسطة دفترك  •  ${fmtDateENStr(new Date())}`;
  ft.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF6B7280" } };
  ft.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  ws.getRow(row).height = 18;

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

/** Company brand header rows (rows 1-4). Returns the next free row index. */
function buildHeader(ws: ExcelJS.Worksheet, cur: CurRow, comp: CompanyRow | null): number {
  ws.mergeCells("A1:F1");
  const h1 = ws.getCell("A1");
  h1.value = comp?.name || "اسم المنشأة";
  h1.font = { name: "Arial", size: 22, bold: true, color: { argb: "FFFFFFFF" } };
  h1.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COL_HEAD_BG } };
  ws.getRow(1).height = 42;

  ws.mergeCells("A2:F2");
  const h2 = ws.getCell("A2");
  h2.value = comp?.address ? `العنوان: ${comp.address}` : " ";
  h2.font = { name: "Arial", size: 11, color: { argb: "FFFFFFFF" } };
  h2.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  h2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COL_SUBHEAD_BG } };
  ws.getRow(2).height = 20;

  ws.mergeCells("A3:F3");
  const h3 = ws.getCell("A3");
  const contactParts: string[] = [];
  if (comp?.phone) contactParts.push(`هاتف: ${comp.phone}`);
  if (comp?.email) contactParts.push(`البريد: ${comp.email}`);
  if (comp?.tax_number) contactParts.push(`الرقم الضريبي: ${comp.tax_number}`);
  h3.value = contactParts.length ? contactParts.join("   |   ") : " ";
  h3.font = { name: "Arial", size: 10, color: { argb: "FFE0E7FF" } };
  h3.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  h3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COL_SUBHEAD_BG } };
  ws.getRow(3).height = 18;

  ws.mergeCells("A4:F4");
  const h4 = ws.getCell("A4");
  h4.value = `كشف حساب عميل — بعملة ${cur.name}`;
  h4.font = { name: "Arial", size: 14, bold: true, color: { argb: COL_HEAD_BG } };
  h4.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  h4.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COL_SECTION_BG } };
  h4.border = { bottom: { style: "medium", color: { argb: COL_BORDER_STRONG } } };
  ws.getRow(4).height = 28;

  return 5;
}

/** Two-row customer info block. Returns the next free row index. */
function buildCustomerInfo(
  ws: ExcelJS.Worksheet,
  startRow: number,
  p: PersonRow,
  txCount: number,
): number {
  const infoRows: [string, string | number | Date, string, string | number | Date][] = [
    ["اسم العميل:", p.name || "—", "رقم الجوال:", p.phone ?? "—"],
    ["تاريخ الكشف:", new Date(), "عدد الحركات:", txCount],
  ];

  let r = startRow;
  for (const [l1, v1, l2, v2] of infoRows) {
    ws.getCell(`A${r}`).value = l1;
    ws.mergeCells(`B${r}:C${r}`);
    ws.getCell(`B${r}`).value = v1;
    ws.getCell(`D${r}`).value = l2;
    ws.mergeCells(`E${r}:F${r}`);
    ws.getCell(`E${r}`).value = v2;

    for (const ref of [`A${r}`, `D${r}`]) {
      const c = ws.getCell(ref);
      c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF1F2937" } };
      c.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl" };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COL_INFO_BG } };
      c.border = thinBorder;
    }
    for (const ref of [`B${r}`, `E${r}`]) {
      const c = ws.getCell(ref);
      c.font = { name: "Arial", size: 11, color: { argb: "FF111827" } };
      c.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl" };
      c.border = thinBorder;
      if (typeof v1 === "number") ws.getCell(`B${r}`).numFmt = INT_FMT;
      if (v1 instanceof Date) ws.getCell(`B${r}`).numFmt = DATE_FMT;
      if (typeof v2 === "number") ws.getCell(`E${r}`).numFmt = INT_FMT;
      if (v2 instanceof Date) ws.getCell(`E${r}`).numFmt = DATE_FMT;
    }
    ws.getRow(r).height = 22;
    r++;
  }
  return r;
}

/** Optional opening-balance row. Returns the next free row index. */
function buildOpeningRow(ws: ExcelJS.Worksheet, row: number, opening: number): number {
  if (opening === 0) return row;

  const balance = opening;
  const openCells: (string | number | null)[] = [
    0,
    "—",
    "رصيد افتتاحي",
    opening < 0 ? Math.abs(opening) : null,
    opening > 0 ? opening : null,
    balance,
  ];
  openCells.forEach((v, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = v;
    c.border = thinBorder;
    c.alignment = {
      horizontal: i === 2 ? "right" : "center",
      vertical: "middle",
      readingOrder: "rtl",
    };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } };
    c.font = { name: "Arial", size: 10, italic: true, bold: true, color: { argb: "FF9A3412" } };
    if (i >= 3) c.numFmt = NUM_FMT;
    else if (typeof v === "number") c.numFmt = INT_FMT;
  });
  ws.getRow(row).height = 20;
  return row + 1;
}

/** Transaction rows with running balance. Returns the next free row index. */
function buildTxRows(ws: ExcelJS.Worksheet, row: number, list: TxRow[], opening: number): number {
  let balance = opening;
  const sorted = list
    .slice()
    .sort(
      (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime(),
    );

  sorted.forEach((t, idx) => {
    const amt = Number(t.amount);
    const credit = t.direction === "credit";
    if (credit) balance += amt;
    else balance -= amt;

    const cells: (string | number | Date | null)[] = [
      idx + 1,
      new Date(t.transaction_date),
      t.details ?? "—",
      credit ? null : amt,
      credit ? amt : null,
      balance,
    ];
    const zebra = idx % 2 === 1;
    cells.forEach((v, i) => {
      const c = ws.getCell(row, i + 1);
      c.value = v;
      c.border = thinBorder;
      c.alignment = {
        horizontal: i === 2 ? "right" : "center",
        vertical: "middle",
        readingOrder: "rtl",
        wrapText: i === 2,
      };
      c.font = { name: "Arial", size: 10, color: { argb: "FF111827" } };
      if (zebra) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COL_ZEBRA } };
      if (i >= 3) c.numFmt = NUM_FMT;
      else if (i === 1) c.numFmt = DATE_FMT;
      else if (i === 0) c.numFmt = INT_FMT;
      if (i === 3 && v != null)
        c.font = { name: "Arial", size: 10, bold: true, color: { argb: COL_DEBIT } };
      if (i === 4 && v != null)
        c.font = { name: "Arial", size: 10, bold: true, color: { argb: COL_CREDIT } };
      if (i === 5)
        c.font = {
          name: "Arial",
          size: 10,
          bold: true,
          color: { argb: balance >= 0 ? COL_CREDIT : COL_DEBIT },
        };
    });
    ws.getRow(row).height = 20;
    row++;
  });

  return row;
}
