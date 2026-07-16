import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import {
  type CompanyInfo,
  type Currency,
  type OpeningBalance,
  type Tx,
  PDF_COLORS,
} from "./pdf-format";
import { buildStatementHtml } from "./pdf-html";

/**
 * Arabic-safe PDF pipeline.
 *
 * We render a styled HTML document (RTL, Tajawal/Cairo via Google Fonts already
 * loaded in __root.tsx) into an offscreen DOM node, capture it with html2canvas,
 * then paginate the resulting bitmap into a jsPDF A4 document. This guarantees
 * correct Arabic shaping, RTL, mixed Arabic/English on the same line, and
 * identical rendering across Acrobat / Chrome / Edge / Firefox / iOS / Android.
 */

async function fetchCompany(): Promise<CompanyInfo | null> {
  const { data } = await supabase.from("company_profile").select("*").maybeSingle();
  return data ?? null;
}

async function logoDataUrl(path: string): Promise<string | null> {
  try {
    const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 600);
    if (!data?.signedUrl) return null;
    const res = await fetch(data.signedUrl);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Ensure the Arabic web font is fully loaded before capturing. */
async function ensureArabicFontLoaded() {
  try {
    const f: FontFaceSet | undefined = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!f) return;
    await Promise.all([
      f.load('700 16px "Tajawal"'),
      f.load('500 14px "Tajawal"'),
      f.load('400 12px "Tajawal"'),
    ]);
    await f.ready;
  } catch {
    /* ignore */
  }
}

/** Render an offscreen HTML node to a paginated A4 jsPDF document. */
async function renderHtmlToPdf(html: string, personName: string) {
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;inset:auto auto 0 -10000px;width:794px;z-index:-1;pointer-events:none;opacity:0;";
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => setTimeout(r, 50));

    const node = host.firstElementChild as HTMLElement;
    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: 794,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pageW = pdf.internal.pageSize.getWidth(); // 210
    const pageH = pdf.internal.pageSize.getHeight(); // 297
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= pageH) {
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        0,
        0,
        imgW,
        imgH,
        undefined,
        "FAST",
      );
    } else {
      const pxPerMm = canvas.width / pageW;
      const pageHpx = Math.floor(pageH * pxPerMm);
      let y = 0;
      let first = true;
      while (y < canvas.height) {
        const sliceH = Math.min(pageHpx, canvas.height - y);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = sliceH;
        const ctx = slice.getContext("2d");
        if (!ctx) break;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const sliceImgH = (sliceH * imgW) / canvas.width;
        if (!first) pdf.addPage();
        pdf.addImage(
          slice.toDataURL("image/jpeg", 0.95),
          "JPEG",
          0,
          0,
          imgW,
          sliceImgH,
          undefined,
          "FAST",
        );
        first = false;
        y += sliceH;
      }
    }

    const pageCount = (pdf as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      pdf.setPage(p);
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text(`Page ${p} / ${pageCount}`, pageW - 10, pageH - 5, { align: "right" });
    }

    pdf.save(`statement-${personName}-${Date.now()}.pdf`);
  } finally {
    document.body.removeChild(host);
  }
}

export async function exportPersonStatementPDF(opts: {
  personName: string;
  phone?: string | null;
  txs: Tx[];
  currencies: Currency[];
  openings?: OpeningBalance[];
  balance?: number;
  dateFrom?: Date | null;
  dateTo?: Date | null;
}) {
  const { personName, phone, txs, currencies, openings = [], dateFrom, dateTo } = opts;
  const company = await fetchCompany();
  const logo = company?.logo_path ? await logoDataUrl(company.logo_path) : null;
  await ensureArabicFontLoaded();

  const filteredTxs = txs.filter((t) => {
    const d = new Date(t.transaction_date).getTime();
    if (dateFrom && d < dateFrom.getTime()) return false;
    if (dateTo && d > dateTo.getTime()) return false;
    return true;
  });

  const html = buildStatementHtml({
    personName,
    phone,
    company,
    logo,
    filteredTxs,
    currencies,
    openings,
    dateFrom,
    dateTo,
  });

  await renderHtmlToPdf(html, personName);
}

export { PDF_COLORS };
