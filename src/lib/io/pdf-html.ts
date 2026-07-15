import {
  type Currency,
  type OpeningBalance,
  type Tx,
  PDF_COLORS,
  dmy,
  esc,
  fmt,
  fmtInt,
  statusFor,
} from "./pdf-format";

interface SectionInput {
  cur: Currency;
  open: number;
  curTxs: Tx[];
}

/** Build the table rows HTML for a single currency's statement section. */
function buildSectionRows(cur: Currency, open: number, curTxs: Tx[]): string {
  let acc = open;
  let cCredit = 0;
  let cDebit = 0;
  const rows: string[] = [];

  if (open !== 0) {
    rows.push(`
      <tr style="background:${PDF_COLORS.primarySoft};">
        <td style="padding:10px 12px;border-bottom:1px solid ${PDF_COLORS.border};text-align:center;color:${PDF_COLORS.muted};">—</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${PDF_COLORS.border};text-align:center;color:${PDF_COLORS.muted};">0</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${PDF_COLORS.border};text-align:right;font-weight:700;">رصيد افتتاحي</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${PDF_COLORS.border};text-align:left;color:${PDF_COLORS.accent};font-weight:700;">${open > 0 ? fmt(Math.abs(open)) : "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${PDF_COLORS.border};text-align:left;color:${PDF_COLORS.danger};font-weight:700;">${open < 0 ? fmt(Math.abs(open)) : "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${PDF_COLORS.border};text-align:left;font-weight:800;">${fmt(open)}</td>
      </tr>`);
  }

  curTxs.forEach((t, i) => {
    const amt = Number(t.amount);
    if (t.direction === "credit") {
      acc += amt;
      cCredit += amt;
    } else {
      acc -= amt;
      cDebit += amt;
    }
    const zebra = i % 2 === 1 ? PDF_COLORS.bgAlt : PDF_COLORS.white;
    const desc = t.details ?? (t.direction === "credit" ? "دائن" : "مدين");
    rows.push(`
      <tr style="background:${zebra};">
        <td style="padding:10px 12px;border-bottom:1px solid ${PDF_COLORS.border};text-align:center;white-space:nowrap;">${dmy(t.transaction_date)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${PDF_COLORS.border};text-align:center;color:${PDF_COLORS.muted};">${i + 1}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${PDF_COLORS.border};text-align:right;color:${PDF_COLORS.text};">${esc(desc)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${PDF_COLORS.border};text-align:left;color:${PDF_COLORS.accent};font-weight:700;white-space:nowrap;">${t.direction === "credit" ? fmt(amt) : "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${PDF_COLORS.border};text-align:left;color:${PDF_COLORS.danger};font-weight:700;white-space:nowrap;">${t.direction === "debit" ? fmt(amt) : "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${PDF_COLORS.border};text-align:left;font-weight:800;white-space:nowrap;color:${PDF_COLORS.primary};">${fmt(acc)}</td>
      </tr>`);
  });

  const closing = open + cCredit - cDebit;
  const st = statusFor(closing);

  return `
    <section style="margin-top:24px;page-break-inside:avoid;border:1px solid ${PDF_COLORS.border};border-radius:12px;overflow:hidden;">
      <div style="background:${PDF_COLORS.primary};color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-weight:800;font-size:14px;display:flex;align-items:center;gap:8px;">
          <span style="background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:4px;font-size:12px;">عملة الكشف</span>
          ${esc(cur.name)} (${esc(cur.symbol)})
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:auto;">
        <thead>
          <tr style="background:${PDF_COLORS.primarySoft};color:${PDF_COLORS.text};border-bottom:2px solid ${PDF_COLORS.border};">
            <th style="padding:10px 12px;text-align:center;width:80px;font-weight:700;">التاريخ</th>
            <th style="padding:10px 12px;text-align:center;width:40px;font-weight:700;">#</th>
            <th style="padding:10px 12px;text-align:right;font-weight:700;">البيان / الوصف</th>
            <th style="padding:10px 12px;text-align:left;width:100px;font-weight:700;">دائن (لكم)</th>
            <th style="padding:10px 12px;text-align:left;width:100px;font-weight:700;">مدين (عليكم)</th>
            <th style="padding:10px 12px;text-align:left;width:110px;font-weight:800;">الرصيد (${esc(cur.symbol)})</th>
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
        <tfoot>
          <tr style="background:${PDF_COLORS.bgAlt};border-top:2px solid ${PDF_COLORS.border};">
            <td colspan="3" style="padding:12px;text-align:right;font-weight:800;color:${PDF_COLORS.muted};">إجمالي الحركات</td>
            <td style="padding:12px;text-align:left;color:${PDF_COLORS.accent};font-weight:800;">${fmt(cCredit)}</td>
            <td style="padding:12px;text-align:left;color:${PDF_COLORS.danger};font-weight:800;">${fmt(cDebit)}</td>
            <td style="padding:12px;text-align:left;font-weight:800;"></td>
          </tr>
        </tfoot>
      </table>

      <div style="background:${st.bg};padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid ${PDF_COLORS.border};">
        <div style="font-weight:700;font-size:14px;color:${st.color};">${st.label}</div>
        <div style="font-weight:900;font-size:18px;color:${st.color};">${fmt(Math.abs(closing))} ${esc(cur.symbol)}</div>
      </div>
    </section>`;
}

interface BuildHtmlOpts {
  personName: string;
  phone?: string | null;
  company: {
    name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    tax_number?: string | null;
    notes?: string | null;
  } | null;
  logo: string | null;
  filteredTxs: Tx[];
  currencies: Currency[];
  openings: OpeningBalance[];
  dateFrom?: Date | null;
  dateTo?: Date | null;
}

/** Compose the full statement HTML document. */
export function buildStatementHtml(opts: BuildHtmlOpts): string {
  const { personName, phone, company, logo, filteredTxs, currencies, openings, dateFrom, dateTo } =
    opts;
  const C = PDF_COLORS;

  const used = currencies.filter(
    (c) =>
      filteredTxs.some((t) => t.currency_id === c.id) ||
      openings.some((o) => o.currency_id === c.id),
  );
  if (used.length === 0 && currencies.length > 0) used.push(currencies[0]);
  used.sort((a, b) => a.name.localeCompare(b.name, "ar"));

  const sections = used
    .map((cur) => {
      const open = openings
        .filter((o) => o.currency_id === cur.id)
        .reduce((s, o) => s + Number(o.amount) * (o.direction === "credit" ? 1 : -1), 0);
      const curTxs = [...filteredTxs.filter((t) => t.currency_id === cur.id)].sort(
        (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime(),
      );
      if (curTxs.length === 0 && open === 0) return "";
      return buildSectionRows(cur, open, curTxs);
    })
    .join("");

  const periodLabel =
    dateFrom || dateTo
      ? `من: ${dateFrom ? dmy(dateFrom) : "بداية السجلات"}  إلى: ${dateTo ? dmy(dateTo) : "تاريخ اليوم"}`
      : "";

  return `
    <div id="__statement_root" dir="rtl" lang="ar" style="
      width: 794px; min-height: 1122px; padding: 40px; background: #fff; color: ${C.text};
      font-family: 'Tajawal','Cairo',Arial,sans-serif;
      font-size: 13px; line-height: 1.6; -webkit-font-smoothing: antialiased; box-sizing: border-box;">

      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${C.primary};padding-bottom:20px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:16px;">
          ${logo ? `<img src="${logo}" style="width:64px;height:64px;border-radius:12px;object-fit:contain;border:1px solid ${C.border};padding:4px;" crossorigin="anonymous" />` : ""}
          <div>
            <div style="font-size:24px;font-weight:900;color:${C.primary};letter-spacing:-0.5px;">${esc(company?.name) || "دفترك"}</div>
            ${company?.address ? `<div style="font-size:12px;color:${C.muted};margin-top:4px;">${esc(company.address)}</div>` : ""}
            <div style="font-size:12px;color:${C.muted};margin-top:2px;display:flex;gap:12px;">
              ${company?.phone ? `<span>📞 ${esc(company.phone)}</span>` : ""}
              ${company?.email ? `<span>✉️ ${esc(company.email)}</span>` : ""}
            </div>
            ${company?.tax_number ? `<div style="font-size:12px;color:${C.muted};margin-top:2px;">الرقم الضريبي: ${esc(company.tax_number)}</div>` : ""}
          </div>
        </div>
        <div style="text-align:left;">
          <div style="font-size:28px;font-weight:900;color:${C.primary};text-transform:uppercase;letter-spacing:1px;">كشف حساب</div>
          <div style="font-size:14px;color:${C.muted};font-weight:700;margin-top:4px;">STATEMENT OF ACCOUNT</div>
          <div style="margin-top:12px;background:${C.primarySoft};padding:6px 12px;border-radius:6px;display:inline-block;border:1px solid ${C.border};">
            <div style="font-size:11px;color:${C.muted};font-weight:700;">تاريخ الإصدار</div>
            <div style="font-size:13px;font-weight:800;color:${C.primary};">${dmy(new Date())}</div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:16px;margin-bottom:24px;">
        <div style="flex:2;background:${C.bgAlt};border:1px solid ${C.border};border-radius:8px;padding:16px;">
          <div style="font-size:11px;color:${C.muted};font-weight:700;text-transform:uppercase;">تفاصيل العميل</div>
          <div style="font-size:18px;font-weight:900;color:${C.primary};margin-top:4px;">${esc(personName)}</div>
          ${phone ? `<div style="font-size:13px;color:${C.text};margin-top:4px;direction:ltr;text-align:right;">${esc(phone)} 📞</div>` : ""}
        </div>
        <div style="flex:1;background:${C.bgAlt};border:1px solid ${C.border};border-radius:8px;padding:16px;display:flex;flex-direction:column;justify-content:center;">
          <div style="font-size:11px;color:${C.muted};font-weight:700;text-transform:uppercase;">فترة الكشف</div>
          <div style="font-size:13px;font-weight:800;color:${C.primary};margin-top:4px;">${periodLabel || "تاريخ مفتوح"}</div>
          <div style="font-size:11px;color:${C.muted};margin-top:8px;">إجمالي الحركات: <strong style="color:${C.primary};">${fmtInt(filteredTxs.length)}</strong></div>
        </div>
      </div>

      ${sections || `<div style="margin-top:32px;padding:40px;text-align:center;color:${C.muted};border:2px dashed ${C.border};border-radius:12px;background:${C.bgAlt};font-size:15px;font-weight:700;">لا توجد معاملات مسجلة في هذه الفترة</div>`}

      ${
        company?.notes
          ? `
        <div style="margin-top:32px;padding:16px;border:1px solid ${C.border};border-radius:8px;background:${C.bgAlt};border-right:4px solid ${C.primary};">
          <div style="font-size:12px;color:${C.primary};font-weight:800;margin-bottom:6px;">ملاحظات هامة</div>
          <div style="font-size:12px;color:${C.text};white-space:pre-wrap;line-height:1.6;">${esc(company.notes)}</div>
        </div>`
          : ""
      }

      <div style="margin-top:48px;padding-top:16px;border-top:1px solid ${C.border};display:flex;justify-content:space-between;align-items:center;color:${C.muted};font-size:11px;">
        <div>
          <span>صدر بواسطة نظام <strong>دفترك</strong> للإدارة المالية</span>
        </div>
        <div style="text-align:left;">
          <div>توقيع / ختم المنشأة</div>
          <div style="margin-top:24px;border-bottom:1px dashed ${C.muted};width:150px;"></div>
        </div>
      </div>
    </div>`;
}
