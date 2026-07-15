import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface RiskScore {
    person_id: string;
    score: number;
    classification: string;
    factors: {
        outstanding_debt: number;
        overdue_amount: number;
        overdue_count: number;
        broken_promises: number;
        avg_delay_days: number;
        payment_success_ratio: number;
        last_payment_date: string | null;
        total_transactions: number;
        paid_on_time: number;
        paid_late: number;
    };
    computed_at: string;
}

const CLASSIFICATION_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
    excellent: { label: "ممتاز", color: "text-emerald-700", bgColor: "bg-emerald-50 dark:bg-emerald-950/40" },
    good: { label: "جيد", color: "text-blue-700", bgColor: "bg-blue-50 dark:bg-blue-950/40" },
    fair: { label: "متوسط", color: "text-amber-700", bgColor: "bg-amber-50 dark:bg-amber-950/40" },
    high_risk: { label: "مرتفع المخاطر", color: "text-orange-700", bgColor: "bg-orange-50 dark:bg-orange-950/40" },
    critical: { label: "حرج", color: "text-red-700", bgColor: "bg-red-50 dark:bg-red-950/40" },
};

export function useRiskScore(personId?: string) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ["riskScore", personId],
        queryFn: async () => {
            if (!personId || !user?.id) return null;

            const { data, error } = await (supabase as any)
                .from("customer_risk_scores")
                .select("*")
                .eq("person_id", personId)
                .eq("user_id", user.id)
                .maybeSingle();

            if (error) {
                console.error("Error fetching risk score:", error);
                throw error;
            }

            if (!data) return null;

            return {
                person_id: data.person_id,
                score: data.score,
                classification: data.classification,
                factors: data.factors || {},
                computed_at: data.computed_at,
            } as RiskScore;
        },
        enabled: !!personId && !!user?.id,
    });

    const recalculate = async () => {
        if (!personId || !user?.id) return;
        const { error } = await (supabase.rpc as any)("rpc_calculate_risk_score", {
            p_person_id: personId,
        });
        if (error) {
            console.error("Error recalculating risk score:", error);
            throw error;
        }
        await queryClient.invalidateQueries({ queryKey: ["riskScore"] });
    };

    return {
        riskScore: query.data,
        isLoading: query.isLoading,
        error: query.error,
        recalculate,
        refetch: query.refetch,
    };
}

export function useHighRiskCustomers() {
    const { user } = useAuth();

    const query = useQuery({
        queryKey: ["highRiskCustomers"],
        queryFn: async () => {
            if (!user?.id) return [];

            const { data, error } = await (supabase.rpc as any)("rpc_get_high_risk_customers", {
                p_user_id: user.id,
                p_limit: 20,
            });

            if (error) {
                console.error("Error fetching high risk customers:", error);
                throw error;
            }

            return (data ?? []) as Array<{
                person_id: string;
                person_name: string;
                score: number;
                classification: string;
                outstanding_debt: number;
                overdue_count: number;
                broken_promises: number;
            }>;
        },
        enabled: !!user?.id,
    });

    return {
        highRiskCustomers: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}

export { CLASSIFICATION_LABELS };