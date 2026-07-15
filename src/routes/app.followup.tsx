import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { ListSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { fmtMoney } from "@/lib/format";
import { AlertTriangle, CheckCircle2, BellRing, RefreshCw, Search, Users, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { generateReminderMessage } from "@/lib/ai.functions";
import { ensureNotificationPermission, notify } from "@/lib/push";
import { toast } from "sonner";
import { Bucket, buildBuckets } from "@/lib/money/followup";
import { FollowupBucketCard } from "@/features/reminders/FollowupBucketCard";
import { FollowupDraftDialog } from "@/features/reminders/FollowupDraftDialog";
import { FollowupManager } from "@/features/reminders/FollowupManager";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/followup")({ component: FollowupPage });

function FollowupPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"all" | "critical" | "late" | "soon" | "ok">("all");
  const [draftFor, setDraftFor] = useState<Bucket | null>(null);
  const [draftText, setDraftText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"severity" | "amount" | "days" | "name">("severity");

  const { data: dashboard, isLoading: dashLoading } = useDashboardData(user?.id);
  const people = dashboard?.people ?? [];
  const currencies = dashboard?.currencies ?? [];

  const { data: buckets = [], isLoading: bucketsLoading } = useQuery({
    queryKey: ["followupBuckets", user?.id],
    queryFn: async () => {
      if (!user || !dashboard) return [];
      const { data: tx } = await supabase
        .from("transactions")
        .select("id,person_id,currency_id,due_date")
        .not("due_date", "is", null)
        .eq("is_paid", false);

      const currencyMap = new Map<string, any>(currencies.map((c: any) => [c.id, c]));
      const peopleMap = new Map<string, any>();
      people.forEach((p) => peopleMap.set(p.id, p));

      return buildBuckets(dashboard.personCurrencyBalances, tx ?? [], peopleMap, currencyMap);
    },
    enabled: !!user && !!dashboard,
  });

  const isLoading = dashLoading || bucketsLoading;

  // Run sync_overdue_alerts to populate smart_alerts from overdue transactions
  const syncOverdue = async () => {
    setSyncing(true);
    try {
      const { error } = await (supabase.rpc as any)("sync_overdue_alerts");
      if (error) throw new Error(error.message);
      toast.success("تم تحديث التنبيهات المتأخرة");
      queryClient.invalidateQueries({ queryKey: ["followupBuckets"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر المزامنة");
    } finally {
      setSyncing(false);
    }
  };

  // Local notification for critical/late buckets once per session
  useMemo(() => {
    if (isLoading || buckets.length === 0) return;
    const crit = buckets.filter((b) => b.severity === "critical" || b.severity === "late");
    if (crit.length === 0) return;
    const key = `followup-notified-${new Date().toDateString()}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    ensureNotificationPermission().then((ok) => {
      if (ok) notify("ديون متأخرة تستدعي المتابعة", `لديك ${crit.length} عميل متأخر — راجع صفحة المتابعة الذكية.`, "/app/followup", "followup-daily");
    });
  }, [isLoading, buckets]);

  const counts = useMemo(() => ({
    all: buckets.length,
    critical: buckets.filter((b) => b.severity === "critical").length,
    late: buckets.filter((b) => b.severity === "late").length,
    soon: buckets.filter((b) => b.severity === "soon").length,
    ok: buckets.filter((b) => b.severity === "ok").length,
  }), [buckets]);

  // Search and sort logic
  const filtered = useMemo(() => {
    let result = tab === "all" ? buckets : buckets.filter((b) => b.severity === tab);

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((b) =>
        b.person.name.toLowerCase().includes(q) ||
        b.person.phone?.toLowerCase().includes(q) ||
        b.currency.toLowerCase().includes(q)
      );
    }

    // Apply sorting
    const sortOrder = { critical: 0, late: 1, soon: 2, ok: 3 };
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "severity":
          return sortOrder[a.severity] - sortOrder[b.severity];
        case "amount":
          return b.net - a.net;
        case "days":
          return b.daysOverdue - a.daysOverdue;
        case "name":
          return a.person.name.localeCompare(b.person.name, 'ar');
        default:
          return 0;
      }
    });
  }, [buckets, tab, searchQuery, sortBy]);

  const totalAtRisk = useMemo(() => {
    const map = new Map<string, number>();
    buckets.filter((b) => b.severity !== "ok").forEach((b) => map.set(b.currency, (map.get(b.currency) ?? 0) + b.net));
    return [...map.entries()];
  }, [buckets]);

  // Statistics calculations
  const stats = useMemo(() => {
    const atRisk = buckets.filter((b) => b.severity !== "ok");
    const totalAtRiskAmount = atRisk.reduce((sum, b) => sum + b.net, 0);
    const avgDaysOverdue = atRisk.length > 0
      ? Math.round(atRisk.reduce((sum, b) => sum + Math.max(0, b.daysOverdue), 0) / atRisk.length)
      : 0;
    const criticalPercentage = buckets.length > 0
      ? Math.round((counts.critical / buckets.length) * 100)
      : 0;
    return { totalAtRiskAmount, avgDaysOverdue, criticalPercentage, atRiskCount: atRisk.length };
  }, [buckets, counts]);

  async function genMessage(b: Bucket, tone: "polite" | "firm" | "friendly" = "polite") {
    setDraftFor(b);
    setDraftText("");
    setAiLoading(true);
    try {
      const res = await generateReminderMessage({
        data: { person_name: b.person.name, amount: b.net, currency: b.currency, days_overdue: b.daysOverdue > 0 ? b.daysOverdue : undefined, tone },
      });
      setDraftText(res.message);
    } catch (e: any) {
      const dayPart = b.daysOverdue > 0 ? `\nتأخر السداد ${b.daysOverdue} يوم.` : "";
      setDraftText(`السلام عليكم ${b.person.name}،\nنود تذكيركم بمبلغ ${fmtMoney(b.net)} ${b.currency} المستحق علينا.${dayPart}\nنشكر تعاونكم — وفقكم الله.`);
      toast.message("استخدمنا قالب جاهز (الذكاء الاصطناعي غير متاح حالياً)");
    } finally {
      setAiLoading(false);
    }
  }

  function openWhatsApp(b: Bucket, text: string) {
    if (!b.person.phone) { toast.error("لا يوجد رقم هاتف لهذا العميل"); return; }
    const phone = b.person.phone.replace(/[^\d]/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <PageHeader icon={BellRing} title="المتابعة الذكية" subtitle="تذكير وإدارة الديون المتأخرة بمساعدة الذكاء الاصطناعي" />
        <button
          onClick={syncOverdue}
          disabled={syncing}
          className="shrink-0 mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-secondary hover:bg-secondary/70 text-muted-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
          مزامنة
        </button>
      </div>

      {/* Statistics Cards */}
      {!isLoading && buckets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-xl border bg-card shadow-card p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Users className="size-3" />
              العملاء المتأخرون
            </div>
            <div className="font-black text-lg tabular-nums text-danger">{stats.atRiskCount}</div>
            <div className="text-[9px] text-muted-foreground">من أصل {buckets.length} عميل</div>
          </div>
          <div className="rounded-xl border bg-card shadow-card p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <DollarSign className="size-3" />
              المبلغ المعرض للخطر
            </div>
            <div className="font-black text-lg tabular-nums text-danger">{fmtMoney(stats.totalAtRiskAmount)}</div>
            <div className="text-[9px] text-muted-foreground">إجمالي الديون المتأخرة</div>
          </div>
          <div className="rounded-xl border bg-card shadow-card p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <TrendingDown className="size-3" />
              متوسط التأخير
            </div>
            <div className="font-black text-lg tabular-nums text-amber-600">{stats.avgDaysOverdue} يوم</div>
            <div className="text-[9px] text-muted-foreground">للعميل المتأخر</div>
          </div>
          <div className="rounded-xl border bg-card shadow-card p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <BarChart3 className="size-3" />
              نسبة الحرج
            </div>
            <div className="font-black text-lg tabular-nums text-danger">{stats.criticalPercentage}%</div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
              <div className="h-full bg-danger rounded-full" style={{ width: `${stats.criticalPercentage}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Search & Sort Bar */}
      {!isLoading && buckets.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="ابحث عن عميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pr-8 text-[12px]"
            />
          </div>
          <div className="flex items-center gap-1">
            {(["severity", "amount", "days", "name"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`text-[10px] px-2 py-1.5 rounded-lg border transition ${sortBy === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-secondary"
                  }`}
              >
                {s === "severity" ? "الأهمية" : s === "amount" ? "المبلغ" : s === "days" ? "الأيام" : "الاسم"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-5 gap-1.5">
        {(["all", "critical", "late", "soon", "ok"] as const).map((t) => {
          const active = tab === t;
          const meta: Record<string, { label: string; cls: string }> = {
            all: { label: "الكل", cls: "bg-primary text-primary-foreground" },
            critical: { label: "حرج", cls: "bg-danger text-danger-foreground" },
            late: { label: "متأخر", cls: "bg-danger-soft text-danger" },
            soon: { label: "قريب", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
            ok: { label: "آمن", cls: "bg-success-soft text-success" },
          };
          const percentage = buckets.length > 0 ? Math.round((counts[t] / buckets.length) * 100) : 0;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg p-1.5 border text-[10px] font-bold flex flex-col items-center gap-0.5 transition-all ${active
                ? meta[t].cls + " border-transparent shadow-card scale-105"
                : "bg-card border-border text-foreground hover:bg-secondary"
                }`}
            >
              <span>{meta[t].label}</span>
              <span className="text-[10px] opacity-80 tabular-nums">{counts[t]}</span>
              {t !== "all" && (
                <div className="w-full h-1 bg-secondary/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${t === "critical" ? "bg-danger" :
                      t === "late" ? "bg-danger" :
                        t === "soon" ? "bg-amber-500" : "bg-success"
                      }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Total at Risk Banner */}
      {totalAtRisk.length > 0 && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft/40 p-2.5 flex items-start gap-2 animate-slide-up-fade">
          <AlertTriangle className="size-4 text-danger shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <div className="font-bold text-danger mb-0.5">إجمالي المبالغ المعرضة للخطر:</div>
            <div className="flex flex-wrap gap-1.5">
              {totalAtRisk.map(([cur, amt]) => (
                <span key={cur} className="bg-card border rounded px-1.5 py-0.5 font-black tabular-nums text-danger">{fmtMoney(amt)} {cur}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <div className="space-y-3">
          <EmptyState
            icon={searchQuery ? Search : CheckCircle2}
            title={searchQuery
              ? `لا توجد نتائج للبحث عن "${searchQuery}"`
              : tab === "all" ? "لا يوجد ما يستوجب المتابعة" : `لا يوجد عملاء في حالة "${tab === "critical" ? "حرج" : tab === "late" ? "متأخر" : tab === "soon" ? "قريب" : "آمن"}"`
            }
            description={searchQuery
              ? "جرّب البحث باسم آخر أو رقم هاتف."
              : tab === "all"
                ? "جميع العملاء ضمن الحدود الآمنة، أو لا توجد ديون مسجلة. اضغط 'مزامنة' لتحديث التنبيهات."
                : "جرّب تبويباً آخر لعرض حالات مختلفة."}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b, index) => (
            <div key={`${b.person.id}-${b.currency}`} className="animate-slide-up-fade" style={{ animationDelay: `${index * 50}ms` }}>
              <FollowupBucketCard
                bucket={b}
                onGenerateMessage={genMessage}
                onSendWhatsApp={openWhatsApp}
              />
            </div>
          ))}
        </div>
      )}

      {/* AI draft modal */}
      <FollowupDraftDialog
        draftFor={draftFor}
        draftText={draftText}
        aiLoading={aiLoading}
        onClose={() => setDraftFor(null)}
        onDraftTextChange={setDraftText}
        onGenerateMessage={genMessage}
        onSendWhatsApp={openWhatsApp}
      />

      {user && (
        <FollowupManager userId={user.id} people={people} />
      )}
    </div>
  );
}