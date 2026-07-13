import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Wallet, LogOut, ChevronLeft, Home, TrendingUp, TrendingDown, Users, BarChart3 } from "lucide-react";
import { navGroups } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCount } from "@/components/common/BadgeCount";

interface Props {
  isOpen: boolean;
}

export function DesktopSidebar({ isOpen }: Props) {
  const loc = useLocation();
  const path = loc.pathname;
  const nav = useNavigate();
  const { user, signOut } = useAuth();

  const { data: pendingReminders = 0 } = useQuery({
    queryKey: ["pendingReminders", user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const { count } = await supabase
        .from("reminders")
        .select("id", { count: "exact", head: true })
        .eq("is_done", false)
        .lte("due_date", today.toISOString());
      return count ?? 0;
    },
    enabled: !!user,
  });

  // Get quick stats
  const { data: quickStats } = useQuery({
    queryKey: ["sidebarStats", user?.id],
    queryFn: async () => {
      const { data: totals } = await supabase
        .from("view_person_balances_detailed" as any)
        .select("total_credit, total_debit");

      const totalCredit = (totals as any[] || []).reduce((sum: number, r: any) => sum + Number(r.total_credit || 0), 0);
      const totalDebit = (totals as any[] || []).reduce((sum: number, r: any) => sum + Number(r.total_debit || 0), 0);

      const { count: peopleCount } = await supabase
        .from("people")
        .select("id", { count: "exact", head: true })
        .eq("is_archived", false);

      return { totalCredit, totalDebit, peopleCount: peopleCount ?? 0 };
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const isItemActive = (match: (p: string) => boolean) => match(path);
  const isGroupActive = (items: { match: (p: string) => boolean }[]) =>
    items.some((it) => it.match(path));

  const email = user?.email ?? "";
  const initial = (email || "د").charAt(0).toUpperCase();

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-gradient-to-b from-card to-card/95 border-l border-border/50 overflow-hidden z-40 transition-all duration-300 ease-in-out ${isOpen ? "w-64 lg:w-72 xl:w-80" : "w-0 border-l-0"
        }`}
    >
      {/* Logo Section */}
      <div className="relative p-4 md:p-5 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="relative size-10 md:size-11 rounded-xl bg-gradient-hero text-white flex items-center justify-center shadow-elevated shrink-0 transition-transform hover:scale-105 duration-300">
            <Wallet className="size-4 md:size-[18px]" />
            <div className="absolute -top-1 -right-1 size-2.5 rounded-full bg-success animate-pulse-ring" />
          </div>
          <div className="min-w-0">
            <div className="font-black text-lg md:text-xl text-foreground leading-none tracking-tight">
              دفترك
            </div>
            <div className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5 font-medium">
              إدارة الديون والمصاريف
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {quickStats && (
        <div className="px-3 md:px-4 pt-3 pb-1">
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-gradient-to-br from-background/80 to-background/40 border border-border/40">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-1 text-[9px] font-bold text-success mb-0.5">
                <TrendingUp className="size-2.5" />
                له
              </div>
              <div className="text-[11px] font-black text-success tabular-nums leading-none">
                {new Intl.NumberFormat("ar-SA").format(quickStats.totalCredit)}
              </div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-1 text-[9px] font-bold text-danger mb-0.5">
                <TrendingDown className="size-2.5" />
                عليه
              </div>
              <div className="text-[11px] font-black text-danger tabular-nums leading-none">
                {new Intl.NumberFormat("ar-SA").format(quickStats.totalDebit)}
              </div>
            </div>
            <div className="col-span-2 pt-1.5 mt-1.5 border-t border-border/30 flex items-center justify-center gap-1.5">
              <Users className="size-3 text-muted-foreground/70" />
              <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                {quickStats.peopleCount} عميل
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 md:px-4 py-3 flex flex-col gap-4 scrollbar-thin">
        {navGroups.map((group) => {
          const activeGroup = isGroupActive(group.items);
          return (
            <div key={group.title}>
              <div className="flex items-center gap-1.5 px-2 mb-1.5">
                <group.icon
                  className={`size-3.5 transition-colors ${activeGroup ? "text-primary" : "text-muted-foreground/50"
                    }`}
                />
                <span
                  className={`text-[10px] font-black uppercase tracking-wider transition-colors ${activeGroup ? "text-primary/80" : "text-muted-foreground/60"
                    }`}
                >
                  {group.title}
                </span>
                {activeGroup && (
                  <span className="h-px flex-1 bg-gradient-to-l from-primary/20 to-transparent" />
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((it) => {
                  const active = isItemActive(it.match);
                  const Icon = it.icon;
                  const showBadge =
                    (it.badgeKey === "reminders" || it.to === "/app/settings") &&
                    pendingReminders > 0;
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      preload="viewport"
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 ${active
                          ? "bg-gradient-primary text-primary-foreground shadow-glow scale-[1.02]"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-[1.01]"
                        }`}
                    >
                      {/* Active Indicator */}
                      {active && (
                        <span className="absolute inset-y-1.5 start-0 w-1 rounded-r-full bg-white/80 shadow-glow" />
                      )}

                      {/* Icon Container */}
                      <div className="relative flex items-center justify-center shrink-0">
                        <div
                          className={`size-8 rounded-lg flex items-center justify-center transition-all duration-200 ${active
                              ? "bg-white/15"
                              : "bg-transparent group-hover:bg-secondary/80"
                            }`}
                        >
                          <Icon
                            className={`size-4 transition-transform group-hover:scale-110 duration-200 ${active
                                ? "text-primary-foreground"
                                : "text-muted-foreground group-hover:text-foreground"
                              }`}
                          />
                        </div>
                        {showBadge && (
                          <span className="absolute -top-1.5 -right-1.5">
                            <BadgeCount
                              count={pendingReminders}
                              tone={active ? "primary" : "danger"}
                            />
                          </span>
                        )}
                      </div>

                      {/* Label */}
                      <span className="truncate">{it.label}</span>

                      {/* Hover Glow Effect */}
                      {!active && (
                        <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/[0.02] to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-border/40 p-3">
        <div className="group relative flex items-center gap-2.5 rounded-xl bg-gradient-to-br from-secondary/60 to-secondary/30 px-2.5 py-2.5 transition-all hover:shadow-sm">
          {/* Avatar with ring */}
          <div className="relative shrink-0">
            <div className="size-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-black text-[12px] shadow-glow transition-transform group-hover:scale-110 duration-300">
              {initial}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success border-2 border-card" />
          </div>

          {/* User Info */}
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-bold text-foreground truncate leading-tight">
              {email || "حسابي"}
            </div>
            <div className="text-[9.5px] text-muted-foreground truncate font-medium">
              الحساب الحالي
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={async () => {
              await signOut();
              nav({ to: "/auth" });
            }}
            className="p-2 rounded-lg text-muted-foreground/60 hover:text-danger hover:bg-danger/10 transition-all duration-200 group/logout"
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
          >
            <LogOut className="size-4 transition-transform group-hover/logout:scale-110 group-hover/logout:-translate-x-0.5 duration-200" />
          </button>
        </div>
      </div>
    </aside>
  );
}