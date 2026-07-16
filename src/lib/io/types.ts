/**
 * Shared types and helpers for the Excel/PDF export pipeline.
 */

export interface PersonRow {
  id: string;
  name: string;
  phone: string | null;
}

export interface TxRow {
  person_id?: string;
  amount: number;
  direction: string;
  transaction_date: string;
  details: string | null;
  currency_id: string;
}

export interface ExpRow {
  amount: number;
  expense_date: string;
  note: string | null;
  category_id: string;
  currency_id: string;
}

export interface CurRow {
  id: string;
  name: string;
  symbol: string;
  rate: number;
  is_base?: boolean;
}

export interface CatRow {
  id: string;
  name: string;
}

export interface OpeningRow {
  currency_id: string;
  amount: number;
  direction: string;
  note?: string | null;
  balance_date?: string | null;
}

export interface CompanyRow {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_number: string | null;
  notes?: string | null;
}

export const EXCEL_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Trigger a browser download for a Blob. */
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sanitize a name for use as a file name. */
export function safeFileName(name: string): string {
  return (name || "عميل").replace(/[\\/:*?"<>|]/g, "_");
}
