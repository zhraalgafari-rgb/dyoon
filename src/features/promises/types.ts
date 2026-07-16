export interface PaymentPromise {
    id: string;
    user_id: string;
    person_id: string;
    amount: number;
    promise_date: string;
    notes: string | null;
    status: "pending" | "fulfilled" | "broken" | "cancelled";
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CreatePromiseInput {
    person_id: string;
    amount: number;
    promise_date: string;
    notes?: string;
}

export interface PromiseFormData {
    amount: number;
    promise_date: string;
    notes: string;
}

export const PROMISE_STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    pending: {
        label: "قيد الانتظار",
        color: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
        icon: "clock",
    },
    fulfilled: {
        label: "تم الوفاء",
        color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
        icon: "check-circle",
    },
    broken: {
        label: "مكسور",
        color: "text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300",
        icon: "x-circle",
    },
    cancelled: {
        label: "ملغى",
        color: "text-gray-700 bg-gray-50 dark:bg-gray-950/40 dark:text-gray-300",
        icon: "slash",
    },
};