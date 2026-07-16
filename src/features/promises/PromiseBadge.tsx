import { CheckCircle, XCircle, Clock, Slash } from "lucide-react";
import type { PaymentPromise } from "./types";

const STATUS_CONFIG: Record<string, { label: string; className: string; Icon: typeof Clock }> = {
    pending: {
        label: "قيد الانتظار",
        className: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
        Icon: Clock,
    },
    fulfilled: {
        label: "تم الوفاء",
        className: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
        Icon: CheckCircle,
    },
    broken: {
        label: "مكسور",
        className: "text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300",
        Icon: XCircle,
    },
    cancelled: {
        label: "ملغى",
        className: "text-gray-700 bg-gray-50 dark:bg-gray-950/40 dark:text-gray-300",
        Icon: Slash,
    },
};

interface Props {
    status: PaymentPromise["status"];
    size?: "sm" | "md";
}

export function PromiseBadge({ status, size = "md" }: Props) {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    const Icon = config.Icon;

    const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";

    return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${config.className} ${sizeClasses}`}>
            <Icon className={size === "sm" ? "size-3" : "size-3.5"} />
            {config.label}
        </span>
    );
}