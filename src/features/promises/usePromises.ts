import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import type { PaymentPromise, CreatePromiseInput } from "./types";

export function usePromises(personId?: string) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const promisesQuery = useQuery({
        queryKey: ["promises", personId],
        queryFn: async () => {
            if (!personId || !user?.id) return [];

            const { data, error } = await (supabase as any)
                .from("payment_promises")
                .select("*")
                .eq("person_id", personId)
                .eq("user_id", user.id)
                .order("promise_date", { ascending: false });

            if (error) {
                console.error("Error fetching promises:", error);
                throw error;
            }

            return (data ?? []) as PaymentPromise[];
        },
        enabled: !!personId && !!user?.id,
    });

    const createPromise = useMutation({
        mutationFn: async (input: CreatePromiseInput) => {
            if (!user?.id) throw new Error("المستخدم غير مصادق");

            const { data, error } = await (supabase.rpc as any)("rpc_create_promise", {
                p_user_id: user.id,
                p_person_id: input.person_id,
                p_amount: input.amount,
                p_promise_date: input.promise_date,
                p_notes: input.notes || null,
            });

            if (error) {
                console.error("Error creating promise:", error);
                throw error;
            }

            return data as string;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["promises"] });
            toast.success("تم إنشاء وعد السداد بنجاح");
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : "تعذّر إنشاء وعد السداد");
        },
    });

    const cancelPromise = useMutation({
        mutationFn: async (promiseId: string) => {
            const { data, error } = await (supabase.rpc as any)("rpc_cancel_promise", {
                p_promise_id: promiseId,
            });

            if (error) {
                console.error("Error cancelling promise:", error);
                throw error;
            }

            return data as boolean;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["promises"] });
            toast.success("تم إلغاء وعد السداد");
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : "تعذّر إلغاء وعد السداد");
        },
    });

    return {
        promises: promisesQuery.data ?? [],
        isLoading: promisesQuery.isLoading,
        error: promisesQuery.error,
        createPromise,
        cancelPromise,
        refetch: promisesQuery.refetch,
    };
}

export function useBrokenPromises() {
    const { user } = useAuth();

    const query = useQuery({
        queryKey: ["broken-promises"],
        queryFn: async () => {
            if (!user?.id) return [];

            const { data, error } = await (supabase.rpc as any)("rpc_get_broken_promises", {
                p_user_id: user.id,
            });

            if (error) {
                console.error("Error fetching broken promises:", error);
                throw error;
            }

            return (data ?? []) as Array<{
                id: string;
                person_id: string;
                person_name: string;
                amount: number;
                promise_date: string;
                created_at: string;
            }>;
        },
        enabled: !!user?.id,
    });

    return {
        brokenPromises: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}
