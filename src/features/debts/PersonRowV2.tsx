import React from "react";
import { Link } from "@tanstack/react-router";
import { Phone, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertCircle, User } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { PersonRowProps } from "./types";
import { PersonRowActionsMenu } from "./person/PersonRowActionsMenu";
import { PersonCurrencyBreakdown } from "./person/PersonCurrencyBreakdown";

type Props = PersonRowProps;

/**
 * PersonRowV2 - بطاقة شخص محسّنة بشكل احترافي
 * مع Quick Actions, Status Timeline, وتحليلات بصرية.
 *
 * Composition of:
 *  - header (avatar, name, status)
 *  - balance badges
 *  - PersonRowActionsMenu (edit/archive/delete dropdown)
 *  - PersonCurrencyBreakdown (per-currency grid)
 */
export const PersonRowV2 = React.memo(function PersonRowV2({
  person,
  balance,
  currencyBalances = [],
  currencies = [],
  index = 0,
  onEdit,
  onArchive,
  onDelete,
}: Props) {
  const settled =
    currencyBalances.every((b) => Math.abs(b.net) < 0.001) || currencyBalances.length === 0;
  const hasOwe = currencyBalances.some((b) => b.net < -0.001);

  const hasActions = !!(onEdit || onArchive || onDelete);

  const avatarColors = [
    "from-blue-500 to-blue-600",
    "from-emerald-500 to-emerald-600",
    "from-purple-500 to-purple-600",
    "from-amber-500 to-amber-600",
    "from-rose-500 to-rose-600",
    "from-cyan-500 to-cyan-600",
  ];
  const avatarColorIndex = person.name.length % avatarColors.length;
  const avatarGradient = person.avatar_color || avatarColors[avatarColorIndex];

  const getStatusIcon = () => {
    if (settled) return <CheckCircle2 className="size-3 text-success" />;
    if (balance.count === 0) return <User className="size-3 text-muted-foreground" />;
    return <AlertCircle className="size-3 text-warning" />;
  };

  const getStatusLabel = () => {
    if (settled) return "مسوّى";
    if (balance.count === 0) return "جديد";
    return "نشط";
  };

  const borderColor = settled
    ? "border-border/50"
    : hasOwe
      ? "border-danger/20"
      : "border-success/20";

  const gradientColor = settled
    ? "bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/10"
    : hasOwe
      ? "bg-gradient-to-r from-danger to-danger/40"
      : "bg-gradient-to-r from-success to-success/40";

  return (
    <Link
      to="/app/person/$id"
      params={{ id: person.id }}
      className={`block relative overflow-hidden rounded-xl md:rounded-2xl border shadow-sm hover:shadow-elevated transition-all duration-300 p-0 group animate-slide-up-fade ${borderColor}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Gradient status bar */}
      <div className={`h-1 w-full ${gradientColor}`} />

      <div className="p-4 md:p-4">
        {/* Main Row */}
        <div className="flex items-start gap-4 md:gap-4">
          {/* Avatar */}
          <div
            className={`relative size-12 md:size-12 rounded-xl md:rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center font-black text-white text-base md:text-lg shadow-sm shrink-0 transition-transform group-hover:scale-105 duration-300`}
          >
            {person.name.trim().charAt(0)}
            {!settled && (
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success border-2 border-card animate-pulse-ring" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm md:text-base text-foreground truncate group-hover:text-primary transition-colors">
                {person.name}
              </h3>
              {person.notes && (
                <span className="text-xs text-muted-foreground hidden md:inline">
                  • {person.notes}
                </span>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-2 mt-2 text-xs md:text-sm text-muted-foreground">
              {person.phone ? (
                <span
                  className="inline-flex items-center gap-1.5 bg-secondary/60 px-2 py-1 rounded-md font-medium"
                  dir="ltr"
                >
                  <Phone className="size-3.5 opacity-70" />
                  {person.phone}
                </span>
              ) : null}

              <span className="inline-flex items-center gap-1.5 bg-secondary/60 px-2 py-1 rounded-md font-medium">
                {getStatusIcon()}
                {balance.count} معاملة
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-bold ${
                  settled
                    ? "bg-success/10 text-success"
                    : hasOwe
                      ? "bg-danger/10 text-danger"
                      : "bg-success/10 text-success"
                }`}
              >
                {getStatusLabel()}
              </span>
            </div>
          </div>

          {/* Balance + Actions */}
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            {settled && currencyBalances.length > 0 ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/15">
                <CheckCircle2 className="size-3.5 text-success" />
                <span className="text-[10px] md:text-[11px] font-black text-success">مسوّى</span>
              </div>
            ) : currencyBalances.length > 0 ? (
              <div className="flex flex-col gap-1 items-end">
                {currencyBalances
                  .filter((b) => Math.abs(b.net) >= 0.001)
                  .map((b) => {
                    const curr = currencies.find((c) => c.id === b.currency_id);
                    const isPos = b.net >= 0;
                    return (
                      <div
                        key={b.currency_id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] md:text-[11px] font-black tabular-nums shadow-sm border transition-all hover:scale-105 ${
                          isPos
                            ? "bg-success-soft text-success border-success/30"
                            : "bg-danger-soft text-danger border-danger/30"
                        }`}
                      >
                        {isPos ? (
                          <ArrowUpRight className="size-2.5" />
                        ) : (
                          <ArrowDownRight className="size-2.5" />
                        )}
                        {isPos ? "" : "-"}
                        {fmtMoney(Math.abs(b.net))}
                        <span className="opacity-60 text-[8px] font-bold">
                          {curr?.symbol ?? ""}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground bg-secondary/50 px-2 py-1 rounded-lg">
                جديد
              </span>
            )}

            {hasActions && (
              <PersonRowActionsMenu
                person={person}
                onEdit={onEdit}
                onArchive={onArchive}
                onDelete={onDelete}
              />
            )}
          </div>
        </div>

        {/* Currency Breakdown */}
        <PersonCurrencyBreakdown currencyBalances={currencyBalances} currencies={currencies} />
      </div>
    </Link>
  );
});

export default PersonRowV2;
