import { useNavigate } from "@tanstack/react-router";
import { Loader2, AlertTriangle, Clock, Users, TrendingUp, DollarSign, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/format";
import { useHighRiskCustomers } from "@/hooks/useRiskScore";
import { useBrokenPromises } from "@/features/promises/usePromises";

interface WidgetProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    action?: { label: string; to?: string; onClick?: () => void };
    className?: string;
}

function Widget({ title, icon, children, action, className = "" }: WidgetProps) {
    const navigate = useNavigate();

    const handleAction = () => {
        if (action?.onClick) {
            action.onClick();
        } else if (action?.to) {
            navigate({ to: action.to });
        }
    };

    return (
        <div className={`rounded-xl border bg-card shadow-card p-4 space-y-3 ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        {icon}
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{title}</h3>
                </div>
                {action && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-[11px] font-semibold text-primary hover:text-primary"
                        onClick={handleAction}
                    >
                        {action.label} <ArrowRight className="size-3 mr-1" />
                    </Button>
                )}
            </div>
            {children}
        </div>
    );
}

export function DueTodayWidget() {
    return (
        <Widget title="استحقاقات اليوم" icon={<Clock className="size-4" />} action={{ label: "عرض الكل", to: "/app/followup" }}>
            <div className="text-center py-4">
                <div className="text-2xl font-black text-foreground">0</div>
                <div className="text-xs text-muted-foreground mt-1">عملاء</div>
            </div>
        </Widget>
    );
}

export function OverdueDebtsWidget() {
    return (
        <Widget title="ديون متأخرة" icon={<AlertTriangle className="size-4 text-danger" />} action={{ label: "عرض الكل", to: "/app/followup" }}>
            <div className="text-center py-4">
                <div className="text-2xl font-black text-danger">0</div>
                <div className="text-xs text-muted-foreground mt-1">عملاء متأخرون</div>
            </div>
        </Widget>
    );
}

export function HighRiskCustomersWidget() {
    const { highRiskCustomers, isLoading } = useHighRiskCustomers();
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <Widget title="عملاء عاليو المخاطر" icon={<TrendingUp className="size-4 text-danger" />} action={{ label: "عرض الكل", to: "/app/followup" }}>
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
            </Widget>
        );
    }

    return (
        <Widget title="عملاء عاليو المخاطر" icon={<TrendingUp className="size-4 text-danger" />} action={{ label: "عرض الكل", to: "/app/followup" }}>
            <div className="space-y-2">
                {highRiskCustomers.length === 0 ? (
                    <div className="text-center py-3 text-xs text-muted-foreground">
                        لا يوجد عملاء عاليو المخاطر
                    </div>
                ) : (
                    highRiskCustomers.slice(0, 5).map((customer) => (
                        <div
                            key={customer.person_id}
                            onClick={() => navigate({ to: `/app/person/${customer.person_id}` })}
                            className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate">{customer.person_name}</div>
                                <div className="text-[10px] text-muted-foreground">
                                    {customer.overdue_count} متأخر • {customer.broken_promises} وعد مكسور
                                </div>
                            </div>
                            <div className="text-xs font-black text-danger">{customer.score}</div>
                        </div>
                    ))
                )}
            </div>
        </Widget>
    );
}

export function BrokenPromisesWidget() {
    const { brokenPromises, isLoading } = useBrokenPromises();
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <Widget title="وعود مكسورة" icon={<AlertTriangle className="size-4 text-red-600" />} action={{ label: "عرض الكل", to: "/app/followup" }}>
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
            </Widget>
        );
    }

    return (
        <Widget title="وعود مكسورة" icon={<AlertTriangle className="size-4 text-red-600" />} action={{ label: "عرض الكل", to: "/app/followup" }}>
            <div className="space-y-2">
                {brokenPromises.length === 0 ? (
                    <div className="text-center py-3 text-xs text-muted-foreground">
                        لا توجد وعود مكسورة
                    </div>
                ) : (
                    brokenPromises.slice(0, 5).map((promise) => (
                        <div
                            key={promise.id}
                            onClick={() => navigate({ to: `/app/person/${promise.person_id}` })}
                            className="flex items-center justify-between p-2 rounded-lg bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate">{promise.person_name}</div>
                                <div className="text-[10px] text-muted-foreground">
                                    وعد بمبلغ {fmtMoney(promise.amount)} بتاريخ {promise.promise_date}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Widget>
    );
}

export function RecentPaymentsWidget() {
    return (
        <Widget title="مدفوعات حديثة" icon={<DollarSign className="size-4 text-success" />} action={{ label: "عرض الكل", to: "/app" }}>
            <div className="text-center py-4">
                <div className="text-xs text-muted-foreground">لا توجد مدفوعات حديثة</div>
            </div>
        </Widget>
    );
}

export function FollowUpRequiredWidget() {
    return (
        <Widget title="يحتاج متابعة" icon={<Phone className="size-4 text-primary" />} action={{ label: "عرض الكل", to: "/app/followup" }}>
            <div className="text-center py-4">
                <div className="text-xs text-muted-foreground">لا يوجد عملاء يحتاجون متابعة حالياً</div>
            </div>
        </Widget>
    );
}

export function CollectionProgressWidget() {
    return (
        <Widget title="تقدم التحصيل" icon={<TrendingUp className="size-4 text-primary" />}>
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">نسبة التحصيل</span>
                    <span className="font-bold">0%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "0%" }} />
                </div>
            </div>
        </Widget>
    );
}