import type { PersonCurrencyBalance, Currency } from "@/hooks/useDashboardData";

export interface PersonSummary {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  avatar_color: string | null;
  notes?: string | null;
  credit_limit?: number | null;
}

export interface PersonBalance {
  net: number;
  count: number;
  lastDate: number;
  lastAmount?: number;
  lastDirection?: string;
  totalCredit?: number;
  totalDebit?: number;
}

export interface PersonRowActions {
  onEdit?: (p: PersonSummary) => void;
  onArchive?: (p: PersonSummary) => void;
  onDelete?: (p: PersonSummary) => void;
}

export interface PersonRowProps extends PersonRowActions {
  person: PersonSummary;
  balance: PersonBalance;
  currencyBalances?: PersonCurrencyBalance[];
  currencies?: Currency[];
  index?: number;
}
