import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Download, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { fmtMoney, fmtDate, monthRange } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { useCurrencies } from "@/hooks/useCurrencies";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useAllPeople } from "@/hooks/usePeople";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

interface Person { id: string; name: string }
interface MonthlyRow { expense_month: string; total: number; currency_id: string }
interface TopDebtorRow { person_id: string; net_base: number }
interface TotalsRow { currency_id: string; total_owed: number; total_owe: number }

function ReportsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: curs = [] } = useCurrencies();
  const { data: allPeople = [] } = useAllPeople();
  const { data: cats = [] } = useExpenseCategories();

  const { data: rpcMonthly } = useQuery({
    queryKey: ["rpcMonthly", user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase.rpc as any)("rpc_get_monthly_expenses");
        if (error) throw error;
        return (data ?? []) as MonthlyRow[];
      } catch {
        return [] as MonthlyRow[];
      }
    },
    enabled: !!user,
  });

  const { data: rpcTop } = useQuery({
    queryKey: ["rpcTopDebtors", user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase.rpc as any)("rpc_get_top_debtors", { p_limit: 8 });
        if (error) throw error;
        return (data ?? []) as TopDebtorRow[];
      } catch {
        return [] as TopDebtorRow[];
      }
    },
    enabled: !!user,
  });

  const { data: rpcTotals } = useQuery({
    queryKey: ["rpcTotals", user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase.rpc as any)("rpc_get_dashboard_totals");
        if (error) throw error;
        return (data ?? []) as TotalsRow[];
      } catch {
        return [] as TotalsRow[];
      }
    },
    enabled: !!user,
  });

  const monthlyData = useMemo(() => {
    const curList = curs;
    const raw = rpcMonthly ?? [];
    const toBase = (amt: number, cid: string) => amt * (curList.find((x) => x.id === cid)?.rate ?? 1);
    const mMap = new Map<string, number>();
    raw.forEach((row: any) => {
      const val = toBase(row.total, row.currency_id);
      mMap.set(row.expense_month, (mMap.get(row.expense_month) ?? 0) + val);
    });
    const arr: { month: string; total: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const disp = `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
      arr.push({ month: disp, total: Math.round(mMap.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`) ?? 0) });
    }
    return arr;
  }, [rpcMonthly, curs]);

  const topPeople = useMemo(() => {
    const raw = rpcTop ?? [];
    return raw.map((row: any) => ({
      id: row.person_id,
      name: allPeople.find((x) => x.id === row.person_id)?.name ?? "—",
      net: Number(row.net_base),
    }));
  }, [rpcTop, allPeople]);

  // إجماليات العملة الأساسية فقط — كل عملة منفصلة في BalanceCard
  const totals = useMemo(() => {
    const baseRow = (rpcTotals ?? []).find(
      (rt) => curs.find((c) => c.id === rt.currency_id)?.is_base,
    );
    const owed = Number(baseRow?.total_owed ?? 0);
    const owe  = Number(baseRow?.total_owe  ?? 0);
    return { owe, owed, net: owed - owe };
  }, [rpcTotals, curs]);

  const base = curs.find((c) => c.is_base) ?? curs[0];
  const people = allPeople as Person[];

  const exportCSV = async () => {
    toast.loading("جارِ التصدير...");
    const [{ data: t }, { data: e }] = await Promise.all([
      supabase.from("transactions").select("*").order("transaction_date", { ascending: false }),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    ]);
    toast.dismiss();
    const rows = [["نوع", "تاريخ", "المبلغ", "العملة", "شخص/تصنيف", "ملاحظة"]];
    for (const tx of (t ?? [])) {
      const cur = curs.find((c) => c.id === tx.currency_id)?.name ?? "";
      const person = people.find((p) => p.id === tx.person_id)?.name ?? "";
      rows.push([tx.direction === "credit" ? "له" : "عليه", fmtDate(tx.transaction_date), String(tx.amount), cur, person, tx.details ?? ""]);
    }
    for (const ex of (e ?? [])) {
      const cur = curs.find((c) => c.id === ex.currency_id)?.name ?? "";
      const cat = cats.find((c) => c.id === ex.category_id)?.name ?? "";
      rows.push(["مصروف", fmtDate(ex.expense_date), String(ex.amount), cur, cat, ex.note ?? ""]);
    }
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `daftarak-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url); toast.success("تم التنزيل");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Daftarak Report", 14, 20);
    doc.setFontSize(10); doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`, 14, 28);
    doc.setFontSize(12); doc.text(`Total Owed to you: ${fmtMoney(totals.owed)} ${base?.name ?? ""}`, 14, 42);
    doc.text(`Total You owe: ${fmtMoney(totals.owe)} ${base?.name ?? ""}`, 14, 50);
    doc.text(`Net: ${fmtMoney(totals.net)}`, 14, 58);
    doc.text("Top balances:", 14, 72);
    let y = 80;
    topPeople.forEach((p) => {
      doc.text(`${p.name}: ${p.net >= 0 ? "+" : ""}${fmtMoney(p.net)}`, 14, y); y += 8;
    });
    doc.save(`daftarak-report-${Date.now()}.pdf`);
    toast.success("تم التنزيل");
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="size-10 md:size-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
          <BarChart3 className="size-5 md:size-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg md:text-2xl leading-tight">التقارير والتحليلات</h1>
          <p className="text-xs md:text-sm text-muted-foreground">نظرة شاملة بالـ {base?.name ?? "محلي"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card className="p-3 md:p-5"><div className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="size-3 md:size-4 text-success" />لك</div><div className="font-bold text-success text-sm md:text-xl mt-1">{fmtMoney(totals.owed)}</div></Card>
        <Card className="p-3 md:p-5"><div className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="size-3 md:size-4 text-danger" />عليك</div><div className="font-bold text-danger text-sm md:text-xl mt-1">{fmtMoney(totals.owe)}</div></Card>
        <Card className="p-3 md:p-5"><div className="text-[10px] md:text-xs text-muted-foreground">الصافي</div><div className={`font-bold text-sm md:text-xl mt-1 ${totals.net >= 0 ? "text-success" : "text-danger"}`}>{fmtMoney(totals.net)}</div></Card>
      </div>

      <Tabs defaultValue="expenses">
        <TabsList className="grid grid-cols-2 w-full md:w-80">
          <TabsTrigger value="expenses">المصاريف</TabsTrigger>
          <TabsTrigger value="people">الأشخاص</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-3 md:space-y-4 mt-3">
          <Card className="p-4 md:p-6">
            <h3 className="font-semibold text-sm md:text-base mb-3">آخر 6 أشهر</h3>
            <div className="w-full">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                  <Bar dataKey="total" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <h3 className="font-semibold text-sm md:text-base mb-3">اتجاه المصاريف</h3>
            <div className="w-full">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                  <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="people" className="space-y-2 md:space-y-3 mt-3">
          <Card className="p-3 md:p-5">
            <h3 className="font-semibold text-sm md:text-base mb-2">أكبر الأرصدة</h3>
            {topPeople.length === 0 ? (
              <div className="text-sm md:text-base text-muted-foreground py-4 text-center">لا توجد بيانات</div>
            ) : topPeople.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 md:py-3 border-b last:border-0">
                <span className="text-sm md:text-base font-medium">{p.name}</span>
                <span className={`font-bold text-sm md:text-base ${p.net >= 0 ? "text-success" : "text-danger"}`}>
                  {p.net >= 0 ? "+" : ""}{fmtMoney(p.net)}
                </span>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-2 gap-2 md:gap-3 md:max-w-md">
        <Button onClick={exportCSV} variant="outline" className="h-9 md:h-11 text-xs md:text-sm"><FileText className="size-4 md:size-5" /> تصدير CSV</Button>
        <Button onClick={exportPDF} className="h-9 md:h-11 text-xs md:text-sm bg-gradient-primary text-primary-foreground"><Download className="size-4 md:size-5" /> تصدير PDF</Button>
      </div>
    </div>
  );
}