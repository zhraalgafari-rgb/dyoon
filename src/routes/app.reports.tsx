import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, FileText, TrendingUp, TrendingDown, Sparkles, Calendar, RefreshCw } from "lucide-react";
import { fmtMoney, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { useCurrencies } from "@/hooks/useCurrencies";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useAllPeople } from "@/hooks/usePeople";
import { ReportsDashboard } from "@/components/reports/ReportsDashboard";
import { tokens } from "@/lib/design-tokens";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

interface Person { id: string; name: string }
interface MonthlyRow { expense_month: string; total: number; currency_id: string }
interface TopDebtorRow { person_id: string; net_base: number }
interface TotalsRow { currency_id: string; total_owed: number; total_owe: number }

function ReportsPage() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<"dashboard" | "export">("dashboard");

  const { data: curs = [] } = useCurrencies();
  const { data: allPeople = [] } = useAllPeople();
  const { data: cats = [] } = useExpenseCategories();

  const { data: rpcMonthly, isLoading: loadingMonthly } = useQuery({
    queryKey: ["rpcMonthly", user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase.rpc as any)("rpc_get_monthly_expenses");
        if (error) throw error;
        return (data ?? []);
      } catch {
        return [];
      }
    },
    enabled: !!user,
  });

  const { data: rpcTop, isLoading: loadingTop } = useQuery({
    queryKey: ["rpcTopDebtors", user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase.rpc as any)("rpc_get_top_debtors", { p_limit: 10 });
        if (error) throw error;
        return (data ?? []);
      } catch {
        return [];
      }
    },
    enabled: !!user,
  });

  const { data: rpcTotals, isLoading: loadingTotals } = useQuery({
    queryKey: ["rpcTotals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase.rpc as any)("rpc_get_dashboard_totals");
        if (error) throw error;
        return (data ?? []);
      } catch {
        return [];
      }
    },
    enabled: !!user,
  });

  const people = allPeople as any[];
  const isLoading = loadingMonthly || loadingTop || loadingTotals;

  const topPeople = useMemo(() => {
    const raw = rpcTop ?? [];
    return raw.map((row: any) => {
      const c = curs.find((c: any) => c.id === row.currency_id);
      return {
        id: row.person_id,
        name: people.find((x: any) => x.id === row.person_id)?.name ?? "—",
        net: Number(row.net ?? 0),
        currency_name: c?.name ?? "",
      };
    });
  }, [rpcTop, people, curs]);

  const exportCSV = async () => {
    if (people.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    toast.loading("جارِ التصدير...");
    const [{ data: t }, { data: e }] = await Promise.all([
      supabase.from("transactions").select("*").order("transaction_date", { ascending: false }),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    ]);
    toast.dismiss();
    const rows = [["نوع", "تاريخ", "المبلغ", "العملة", "شخص/تصنيف", "ملاحظة"]];
    for (const tx of (t ?? [])) {
      const cur = curs.find((c: any) => c.id === tx.currency_id)?.name ?? "";
      const person = people.find((p) => p.id === tx.person_id)?.name ?? "";
      rows.push([tx.direction === "credit" ? "له" : "عليه", fmtDate(tx.transaction_date), String(tx.amount), cur, person, tx.details ?? ""]);
    }
    for (const ex of (e ?? [])) {
      const cur = curs.find((c: any) => c.id === ex.currency_id)?.name ?? "";
      const cat = cats.find((c: any) => c.id === ex.category_id)?.name ?? "";
      rows.push(["مصروف", fmtDate(ex.expense_date), String(ex.amount), cur, cat, ex.note ?? ""]);
    }
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `daftarak-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url); toast.success("تم التنزيل");
  };

  const exportPDF = () => {
    if (people.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Daftarak Report", 14, 20);
    doc.setFontSize(10); doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`, 14, 28);
    
    let y = 42;
    doc.setFontSize(12);
    (rpcTotals ?? []).forEach((rt: any) => {
        const cname = curs.find((c: any) => c.id === rt.currency_id)?.name ?? "";
        const owe = Number(rt.total_owed ?? 0);
        const owed = Number(rt.total_owe ?? 0);
        doc.text(`${cname} - Owed to you: ${fmtMoney(owe)} | You owe: ${fmtMoney(owed)} | Net: ${fmtMoney(owed - owe)}`, 14, y);
        y += 8;
    });

    doc.text("Top balances:", 14, y + 6);
    y += 14;
    topPeople.forEach((p: any) => {
      doc.text(`${p.name} (${p.currency_name}): ${p.net >= 0 ? "+" : ""}${fmtMoney(p.net)}`, 14, y); y += 8;
    });
    doc.save(`daftarak-report-${Date.now()}.pdf`);
    toast.success("تم التنزيل");
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative size-11 md:size-13 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
            <BarChart3 className="size-5 md:size-6" />
            <div className="absolute -top-1 -right-1 size-2.5 rounded-full bg-success animate-pulse-ring" />
          </div>
          <div>
            <h1 className="font-black text-[18px] md:text-[24px] text-foreground leading-tight tracking-tight">
              التقارير والتحليلات
            </h1>
            <p className="text-[11px] md:text-[13px] text-muted-foreground font-medium mt-0.5">
              نظرة شاملة على جميع معاملاتك بمختلف العملات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setActiveView("dashboard")}
            variant={activeView === "dashboard" ? "default" : "outline"}
            size="sm"
            className={`h-9 gap-1.5 text-[11px] font-bold ${activeView === "dashboard" ? "bg-gradient-primary text-primary-foreground shadow-glow" : ""}`}
          >
            <BarChart3 className="size-3.5" />
            التحليلات
          </Button>
          <Button
            onClick={() => setActiveView("export")}
            variant={activeView === "export" ? "default" : "outline"}
            size="sm"
            className={`h-9 gap-1.5 text-[11px] font-bold ${activeView === "export" ? "bg-gradient-primary text-primary-foreground shadow-glow" : ""}`}
          >
            <Download className="size-3.5" />
            التصدير
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-border/50 bg-card p-4 space-y-3 animate-pulse">
                <div className="skeleton h-3 w-16 rounded-md" />
                <div className="skeleton h-6 w-24 rounded-md" />
                <div className="skeleton h-2 w-full rounded-md" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="skeleton h-48 w-full rounded-xl" />
          </div>
        </div>
      ) : activeView === "dashboard" ? (
        <ReportsDashboard
          monthlyData={rpcMonthly || []}
          topDebtors={rpcTop || []}
          totalsByCurrency={rpcTotals || []}
          currencies={curs}
          people={allPeople}
          categories={cats}
        />
      ) : (
        <div className="space-y-4">
          {/* Export Options */}
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={exportCSV}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-background p-5 md:p-6 shadow-sm hover:shadow-elevated transition-all duration-300 text-right"
            >
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-primary/40" />
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-300">
                  <FileText className="size-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-[15px] text-foreground mb-1">تصدير CSV</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    تصدير جميع المعاملات والمصروفات إلى ملف CSV لفتحه في Excel أو Google Sheets
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-lg">
                    <Download className="size-3.5" />
                    تنزيل الملف
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={exportPDF}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-background p-5 md:p-6 shadow-sm hover:shadow-elevated transition-all duration-300 text-right"
            >
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-danger to-danger/40" />
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-300">
                  <Download className="size-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-[15px] text-foreground mb-1">تصدير PDF</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    تصدير تقرير احترافي بصيغة PDF مع ملخص الأرصدة وأكبر الديون
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-danger bg-danger/5 px-2.5 py-1 rounded-lg">
                    <Download className="size-3.5" />
                    تنزيل التقرير
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Export Info */}
          <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-info/5 to-info/[0.02] p-4 md:p-5">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0">
                <Sparkles className="size-4" />
              </div>
              <div className="text-[11px] md:text-[12px] text-muted-foreground leading-relaxed">
                <span className="font-bold text-foreground">معلومات التصدير:</span> سيتم تصدير جميع المعاملات المسجلة مع التواريخ والمبالغ والعملات. يمكنك فتح ملف CSV في Excel أو أي برنامج جداول بيانات.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}