/**
 * Formatting helpers and color palette for the Arabic-safe PDF statement.
 */

export function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n);
}

export function fmtInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function dmy(d: string | Date) {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}/${x.getFullYear()}`;
}

export function esc(s: string | null | undefined) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface Tx {
  amount: number;
  direction: string;
  transaction_date: string;
  details: string | null;
  currency_id: string;
}

export interface Currency {
  id: string;
  name: string;
  symbol: string;
  rate: number;
  is_base?: boolean;
}

export interface OpeningBalance {
  currency_id: string;
  amount: number;
  direction: string;
}

export interface CompanyInfo {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  tax_number?: string | null;
  notes?: string | null;
  logo_path?: string | null;
}

export const PDF_COLORS = {
  primary: "#0f172a", // Dark slate for a premium look
  primarySoft: "#f1f5f9", // Light slate
  accent: "#16a34a", // Green
  accentSoft: "#dcfce7",
  danger: "#ef4444", // Red
  dangerSoft: "#fee2e2",
  text: "#334155", // Slate 700
  muted: "#64748b", // Slate 500
  border: "#e2e8f0", // Slate 200
  bgAlt: "#f8fafc", // Slate 50
  white: "#ffffff",
} as const;

export function statusFor(closing: number): {
  label: string;
  bg: string;
  color: string;
} {
  if (closing > 0)
    return {
      label: "الرصيد الإجمالي لكم (دائن)",
      bg: PDF_COLORS.accentSoft,
      color: PDF_COLORS.accent,
    };
  if (closing < 0)
    return {
      label: "الرصيد الإجمالي عليكم (مدين)",
      bg: PDF_COLORS.dangerSoft,
      color: PDF_COLORS.danger,
    };
  return { label: "الرصيد مسدد بالكامل", bg: PDF_COLORS.primarySoft, color: PDF_COLORS.text };
}
