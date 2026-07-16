/**
 * ExcelJS styling constants and helpers for the professional
 * per-currency customer statement workbook.
 */

export const COL_HEAD_BG = "FF0B3D91"; // Deep professional blue
export const COL_HEAD_TXT = "FFFFFFFF";
export const COL_SUBHEAD_BG = "FF1E40AF";
export const COL_SECTION_BG = "FFE0E7FF";
export const COL_INFO_BG = "FFF1F5F9";
export const COL_ZEBRA = "FFF8FAFC";
export const COL_TOTAL_BG = "FFFEF3C7";
export const COL_CREDIT = "FF047857";
export const COL_DEBIT = "FFB91C1C";
export const COL_BORDER = "FF94A3B8";
export const COL_BORDER_STRONG = "FF0B3D91";

export const thinBorder = {
  top: { style: "thin" as const, color: { argb: COL_BORDER } },
  left: { style: "thin" as const, color: { argb: COL_BORDER } },
  bottom: { style: "thin" as const, color: { argb: COL_BORDER } },
  right: { style: "thin" as const, color: { argb: COL_BORDER } },
};

// English digits, thousands separator, 2 decimals, red negatives, dash for zero
export const NUM_FMT = '[$-en-US]#,##0.00;[Red][$-en-US]-#,##0.00;[$-en-US]"-"';
export const INT_FMT = "[$-en-US]0";
export const DATE_FMT = "[$-en-US]dd/mm/yyyy";

export const fmtDateENStr = (d: string | Date) => new Date(d).toLocaleDateString("en-GB"); // dd/MM/yyyy in Latin digits

export const fmtNumEN = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
