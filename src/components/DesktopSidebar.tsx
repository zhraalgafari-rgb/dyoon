import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Wallet, LogOut, ChevronLeft } from "lucide-react";
import { navGroups } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCount } from "@/components/common/BadgeCount";

export function DesktopSidebar() {
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

  const isItemActive = (match: (p: string) => boolean) => match(path);
  const isGroupActive = (items: { match: (p: string) => boolean }[]) =>
    items.some((it) => it.match(path));

  const email = user?.email ?? "";
  const initial = (email || "د").charAt(0).toUpperCase();

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 xl:w-80 h-screen sticky top-0 bg-card border-l border-border/60 overflow-hidden z-40">
      <div className="p-4 md:p-5 pb-3 flex items-center gap-2.5 border-b border-border/60">
        <div className="size-9 md:size-10 rounded-xl bg-gradient-hero text-white flex items-center justify-center shadow-elevated shrink-0">
          <Wallet className="size-4 md:size-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="font-black text-lg md:text-xl text-foreground leading-none">دفترك</div>
          <div className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5">إدارة الديون والمصاريف</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 md:px-4 py-3 flex flex-col gap-4">
        {navGroups.map((group) => {
          const activeGroup = isGroupActive(group.items);
          return (
            <div key={group.title}>
              <div className="flex items-center gap-1.5 px-2 mb-1.5">
                <group.icon
                  className={`size-3.5 ${activeGroup ? "text-primary" : "text-muted-foreground/70"}`}
                />
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80">
                  {group.title}
                </span>
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
                      className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-bold transition-colors ${active
                          ? "bg-gradient-primary text-primary-foreground shadow-glow"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                    >
                      {active && (
                        <span className="absolute inset-y-1.5 start-0 w-1 rounded-full bg-primary-foreground/80" />
                      )}
                      <div className="relative flex items-center justify-center shrink-0">
                        <Icon
                          className={`size-4 ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
                        />
                        {showBadge && (
                          <span className="absolute -top-1.5 -right-1.5">
                            <BadgeCount
                              count={pendingReminders}
                              tone={active ? "primary" : "danger"}
                            />
                          </span>
                        )}
                      </div>
                      <span>{it.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-secondary/50 px-2.5 py-2">
          <div className="size-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-black text-[12px] shadow-glow shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-bold text-foreground truncate leading-tight">
              {email || "حسابي"}
            </div>
            <div className="text-[9.5px] text-muted-foreground truncate">الحساب الحالي</div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              nav({ to: "/auth" });
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft transition-colors"
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
