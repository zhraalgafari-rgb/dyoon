import { createFileRoute, Outlet, useNavigate, useLocation, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Loader2, Bell, Search, Moon, Sun } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { ModuleTabs } from "@/components/common/ModuleTabs";
import { BadgeCount } from "@/components/common/BadgeCount";
import { GlobalSearchDialog } from "@/components/GlobalSearchDialog";
import { useTheme } from "@/lib/theme";
import { usePendingCount } from "@/hooks/usePendingCount";
import { syncRemindersFn } from "@/lib/jobs.functions";
import { registerServiceWorker } from "@/lib/push";
import { SmartAssistant } from "@/components/SmartAssistant";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export const Route = createFileRoute("/app")({ component: AppLayout });

function sectionTitle(path: string): string {
  if (
    path.startsWith("/app/expenses") ||
    path.startsWith("/app/budgets") ||
    path.startsWith("/app/categories") ||
    path.startsWith("/app/insights")
  )
    return "المصاريف";
  if (path.startsWith("/app/followup")) return "المتابعة";
  if (path.startsWith("/app/reports")) return "التقارير";
  if (
    path.startsWith("/app/settings") ||
    path.startsWith("/app/currencies") ||
    path.startsWith("/app/reminders") ||
    path.startsWith("/app/recurring") ||
    path.startsWith("/app/opening-balances") ||
    path.startsWith("/app/exchange-rates")
  )
    return "الإعدادات";
  if (path.startsWith("/app/person")) return "ملف العميل";
  if (path.startsWith("/app/archive")) return "الأرشيف";
  return "الديون";
}

let swRegistered = false;
function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname: path } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: pending } = usePendingCount();
  const { theme, set: setTheme } = useTheme();

  // تحديث فوري لجميع أجزاء التطبيق عند أي تغيير في قاعدة البيانات
  useRealtimeSync();

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    if (!swRegistered) {
      registerServiceWorker();
      swRegistered = true;
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  useEffect(() => {
    if (!user) return;
    const idle = (cb: () => void) =>
      (window as any).requestIdleCallback?.(cb, { timeout: 2000 }) ?? setTimeout(cb, 1200);
    const handle = idle(async () => {
      try {
        await (supabase.rpc as any)("get_or_create_default_account", { p_user_id: user.id });
        await syncRemindersFn();
      } catch (e) {
        // ignore errors in background sync
      }
    });
    return () => {
      (window as any).cancelIdleCallback?.(handle);
    };
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background md:bg-muted/30 md:flex flex-row">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-h-screen relative w-full lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl lg:mx-auto md:bg-background md:shadow-2xl md:border-x border-border/50">
        <header className="bg-gradient-hero text-white sticky top-0 z-30 shadow-elevated">
          <div className="w-full px-3 md:px-6 h-12 md:h-14 flex items-center justify-between gap-3">
            <Link to="/app" className="flex items-center gap-2 font-black text-[14px] md:hidden">
              <div className="size-7 rounded-md bg-white/20 backdrop-blur flex items-center justify-center ring-1 ring-white/15">
                <Wallet className="size-3.5" />
              </div>
              دفترك
            </Link>
            <h1 className="hidden md:block font-bold text-[15px] md:text-[17px] tracking-tight">
              {sectionTitle(path)}
            </h1>

            <div className="flex items-center gap-1.5 md:gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex items-center gap-2 ps-3 pe-2 h-8 md:h-9 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur transition-colors text-white/90 text-[12px] md:text-[13px] font-semibold w-48 lg:w-56"
                aria-label="بحث"
              >
                <Search className="size-3.5 md:size-4" />
                <span className="opacity-80">ابحث...</span>
                <kbd className="ms-auto text-[9px] md:text-[10px] bg-white/20 rounded px-1.5 py-0.5 font-sans">
                  /
                </kbd>
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="md:hidden p-2 rounded-md hover:bg-white/10 transition-colors"
                aria-label="بحث"
              >
                <Search className="size-4" />
              </button>
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="p-2 md:p-2.5 rounded-md hover:bg-white/10 transition-colors"
                aria-label="تبديل المظهر"
              >
                {isDark ? <Sun className="size-4 md:size-[18px]" /> : <Moon className="size-4 md:size-[18px]" />}
              </button>
              <Link
                to="/app/notifications"
                className="relative p-2 md:p-2.5 rounded-md hover:bg-white/10 transition-colors"
                aria-label="الإشعارات"
              >
                <Bell className="size-4 md:size-[18px]" />
                {(pending ?? 0) > 0 && (
                  <span className="absolute top-1 right-1">
                    <BadgeCount count={pending ?? 0} tone="danger" />
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full mx-auto px-3 py-4 pb-20 md:pb-8 md:px-6 lg:px-8 xl:px-10 lg:py-6 xl:py-8">
          <div className="md:hidden">
            <ModuleTabs />
          </div>
          <Outlet />
        </main>

        <BottomNav />
      </div>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <SmartAssistant />
    </div>
  );
}
