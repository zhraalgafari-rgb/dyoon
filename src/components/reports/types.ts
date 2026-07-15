/** Shared domain types for the reports dashboard. */

import type { TrendingUp } from "lucide-react";

export interface ReportCurrency {
  id: string;
  name: string;
  symbol?: string;
}

export interface ReportPerson {
  id: string;
  name: string;
}

export interface MonthlyDataRow {
  expense_month: string;
  total: number;
  currency_id: string;
}

export interface TopDebtorRow {
  person_id: string;
  net: number;
  currency_id: string;
}

export interface TotalsByCurrencyRow {
  currency_id: string;
  total_owed: number;
  total_owe: number;
}

export interface ChartPoint {
  month: string;
  income: number;
  expense: number;
}

export interface DebtorPoint {
  name: string;
  value: number;
  isCredit: boolean;
}

export interface StatCardData {
  title: string;
  value: number;
  icon: typeof TrendingUp;
  color: "success" | "danger";
  subtitle: string;
}
