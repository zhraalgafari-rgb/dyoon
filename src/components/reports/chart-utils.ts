export const CHART_COLORS = [
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
] as const;

export const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

export const fmtCompact = (v: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact" }).format(v);

export const fmtNum = (v: number) => new Intl.NumberFormat("en-US").format(v);

/** "yyyy-mm" -> "mm/yy" for compact axis ticks. */
export const formatMonthTick = (v: unknown) => {
  const [y, m] = String(v ?? "").split("-");
  return `${m}/${y.slice(2)}`;
};

/** "yyyy-mm" -> "ArabicMonth yyyy" for tooltip labels. */
export const formatMonthLabel = (v: unknown) => {
  const [y, m] = String(v ?? "").split("-");
  const idx = parseInt(m, 10) - 1;
  return `${ARABIC_MONTHS[idx] ?? m} ${y}`;
};

export const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  boxShadow: "0 10px 30px -12px rgba(0,0,0,0.18)",
} as const;

export const axisTickProps = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
  axisLine: false,
  tickLine: false,
} as const;
