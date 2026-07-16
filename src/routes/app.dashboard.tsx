import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ListSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { BellRing, TrendingUp, AlertTriangle, Clock, DollarSign, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    HighRiskCustomersWidget,
    BrokenPromisesWidget,
    DueTodayWidget,
    OverdueDebtsWidget,
    RecentPaymentsWidget,
    FollowUpRequiredWidget,
    CollectionProgressWidget,
} from "@/components/dashboard/DashboardWidgets";

export const Route = createFileRoute("/app/dashboard")({ component: DashboardPage });

function DashboardPage() {
    const { user } = useAuth();
    const { data: dashboard, isLoading: dashLoading } = useDashboardData(user?.id);

    const people = dashboard?.people ?? [];
    const currencies = dashboard?.currencies ?? [];

    // Fetch risk scores for dashboard
    const { data: riskScoresData } = useQuery({
        queryKey: ["dashboardRiskScores", people.map(p => p.id)],
        queryFn: async () => {
            if (!user?.id || people.length === 0) return {};

            const { data, error } = await (supabase as any)
                .from("customer_risk_scores")
                .select("person_id, score, classification")
                .eq("user_id", user.id)
                .in("person_id", people.map(p => p.id));

            if (error) {
                console.error("Error fetching risk scores:", error);
                return {};
            }

            const scores: Record<string, { score: number; classification: string }> = {};
            (data ?? []).forEach((rs: any) => {
                scores[rs.person_id] = {
                    score: rs.score,
                    classification: rs.classification,
                };
            });
            return scores;
        },
        enabled: !!user?.id && people.length > 0,
    });

    const isLoading = dashLoading;

    return (
        <div className="space-y-4 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <PageHeader
                    icon={BellRing}
                    title="لوحة التحكم"
                    subtitle="نظرة عامة على حالة التحصيل والمتابعات المطلوبة"
                />
                <Button
                    onClick={() => window.location.href = "/app/followup"}
                    className="shrink-0 mt-1 bg-gradient-primary text-primary-foreground shadow-sm"
                >
                    <BellRing className="size-4 mr-2" />
                    المتابعة الذكية
                </Button>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-xl border bg-card shadow-card p-4 space-y-3">
                            <div className="skeleton h-6 w-32" />
                            <div className="skeleton h-20 w-full" />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Primary Widgets - Action Oriented */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <HighRiskCustomersWidget />
                        <BrokenPromisesWidget />
                        <DueTodayWidget />
                        <OverdueDebtsWidget />
                        <FollowUpRequiredWidget />
                        <RecentPaymentsWidget />
                    </div>

                    {/* Secondary Widgets - Analytics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <CollectionProgressWidget />
                    </div>

                    {/* Quick Stats Banner */}
                    <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-6 space-y-4">
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <TrendingUp className="size-5 text-primary" />
                            ملخص سريع
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">إجمالي العملاء</div>
                                <div className="text-2xl font-black text-foreground">{people.length}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">العملات</div>
                                <div className="text-2xl font-black text-foreground">{currencies.length}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">آخر تحديث</div>
                                <div className="text-sm font-bold text-foreground">
                                    {new Date().toLocaleDateString("ar-SA", {
                                        day: "numeric",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                    })}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">الحالة</div>
                                <div className="flex items-center gap-1.5">
                                    <div className="size-2 rounded-full bg-success animate-pulse" />
                                    <span className="text-sm font-bold text-success">نشط</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Call to Action */}
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
                        <h3 className="text-base font-bold text-foreground">
                            ماذا تريد أن تفعل اليوم؟
                        </h3>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <Button
                                onClick={() => window.location.href = "/app/followup"}
                                className="bg-gradient-primary text-primary-foreground shadow-sm"
                            >
                                <BellRing className="size-4 mr-2" />
                                مراجعة المتابعات
                            </Button>
                            <Button
                                onClick={() => window.location.href = "/app"}
                                variant="outline"
                            >
                                <Users className="size-4 mr-2" />
                                عرض العملاء
                            </Button>
                            <Button
                                onClick={() => window.location.href = "/app/reports"}
                                variant="outline"
                            >
                                <TrendingUp className="size-4 mr-2" />
                                التقارير
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}