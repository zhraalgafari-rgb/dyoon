import { Users, Wallet, BarChart3, Settings, Tags, PieChart, BellRing, Coins } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof Users;
  match: (p: string) => boolean;
  badgeKey?: "reminders";
}

const SETTINGS_PREFIXES = ["/app/settings", "/app/currencies", "/app/reminders", "/app/recurring"];

export const debtsItems: NavItem[] = [
  { to: "/app", label: "الديون", icon: Users, match: (p) => p === "/app" || p === "/app/" },
  {
    to: "/app/followup",
    label: "المتابعة",
    icon: BellRing,
    match: (p) => p.startsWith("/app/followup"),
    badgeKey: "reminders",
  },
  {
    to: "/app/reports",
    label: "التقارير",
    icon: BarChart3,
    match: (p) => p.startsWith("/app/reports"),
  },
  {
    to: "/app/settings",
    label: "الإعدادات",
    icon: Settings,
    match: (p) => SETTINGS_PREFIXES.some((x) => p.startsWith(x)),
  },
];

export const expensesItems: NavItem[] = [
  {
    to: "/app/expenses",
    label: "المصاريف",
    icon: Wallet,
    match: (p) => p === "/app/expenses" || p === "/app/expenses/",
  },
  {
    to: "/app/budgets",
    label: "الميزانيات",
    icon: Coins,
    match: (p) => p.startsWith("/app/budgets"),
  },
  {
    to: "/app/categories",
    label: "التصنيفات",
    icon: Tags,
    match: (p) => p.startsWith("/app/categories"),
  },
  {
    to: "/app/insights",
    label: "تحليلات",
    icon: PieChart,
    match: (p) => p.startsWith("/app/insights"),
  },
];

/** Grouped navigation used by the desktop sidebar (both areas visible at once). */
export const navGroups: { title: string; icon: typeof Users; items: NavItem[] }[] = [
  { title: "الديون", icon: Users, items: debtsItems },
  { title: "المصاريف", icon: Wallet, items: expensesItems },
];
