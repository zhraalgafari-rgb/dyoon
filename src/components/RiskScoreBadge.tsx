import { Shield, AlertTriangle, TrendingUp } from "lucide-react";
import { CLASSIFICATION_LABELS, type RiskScore } from "@/hooks/useRiskScore";

interface Props {
    score?: number;
    classification?: string;
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
}

export function RiskScoreBadge({ score, classification, size = "md", showLabel = true }: Props) {
    if (score === undefined || classification === undefined) {
        return null;
    }

    const meta = CLASSIFICATION_LABELS[classification] ?? CLASSIFICATION_LABELS.fair;

    const sizeClasses = {
        sm: "text-[10px] px-1.5 py-0.5",
        md: "text-xs px-2 py-1",
        lg: "text-sm px-3 py-1.5",
    };

    const iconSize = {
        sm: "size-3",
        md: "size-3.5",
        lg: "size-4",
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300";
        if (score >= 60) return "text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300";
        if (score >= 40) return "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300";
        if (score >= 20) return "text-orange-700 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-300";
        return "text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300";
    };

    return (
        <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${getScoreColor(score)} ${sizeClasses[size]}`}>
                <Shield className={iconSize[size]} />
                {score}
            </span>
            {showLabel && (
                <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${meta.color} ${meta.bgColor} ${sizeClasses[size]}`}>
                    {meta.label}
                </span>
            )}
        </div>
    );
}

interface RiskScoreCardProps {
    riskScore?: RiskScore | null;
    onRecalculate?: () => void;
    isLoading?: boolean;
}

export function RiskScoreCard({ riskScore, onRecalculate, isLoading }: RiskScoreCardProps) {
    if (isLoading) {
        return (
            <div className="rounded-xl border bg-card p-3 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">تقييم المخاطر</div>
                <div className="skeleton h-16 w-full rounded-lg" />
            </div>
        );
    }

    if (!riskScore) {
        return (
            <div className="rounded-xl border bg-card p-3 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">تقييم المخاطر</div>
                <div className="text-xs text-muted-foreground py-2">
                    لا يوجد تقييم متاح حالياً
                </div>
            </div>
        );
    }

    const meta = CLASSIFICATION_LABELS[riskScore.classification] ?? CLASSIFICATION_LABELS.fair;

    return (
        <div className="rounded-xl border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground">تقييم المخاطر</div>
                {onRecalculate && (
                    <button
                        onClick={onRecalculate}
                        className="text-[10px] font-bold text-primary hover:underline"
                    >
                        إعادة الحساب
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3">
                <div className={`relative size-14 rounded-full grid place-items-center ring-2 ${meta.bgColor.replace('bg-', 'ring-').replace('/40', '')}`}>
                    <div className="text-lg font-bold leading-none">{riskScore.score}</div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.color} ${meta.bgColor}`}>
                        {riskScore.classification === 'excellent' && <TrendingUp className="size-3" />}
                        {riskScore.classification === 'critical' && <AlertTriangle className="size-3" />}
                        {meta.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                        آخر تحديث: {new Date(riskScore.computed_at).toLocaleDateString("ar-SA")}
                    </div>
                </div>
            </div>

            {riskScore.factors && (
                <div className="text-[10px] text-muted-foreground space-y-0.5 pt-1 border-t">
                    {riskScore.factors.overdue_count > 0 && (
                        <div>ديون متأخرة: {riskScore.factors.overdue_count} ({riskScore.factors.overdue_amount?.toLocaleString("ar-SA")})</div>
                    )}
                    {riskScore.factors.broken_promises > 0 && (
                        <div>وعود مكسورة: {riskScore.factors.broken_promises}</div>
                    )}
                    {riskScore.factors.payment_success_ratio < 100 && (
                        <div>نسبة السداد في الوقت: {riskScore.factors.payment_success_ratio?.toFixed(1)}%</div>
                    )}
                </div>
            )}
        </div>
    );
}