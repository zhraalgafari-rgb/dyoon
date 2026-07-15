import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromiseBadge } from "./PromiseBadge";
import type { PaymentPromise } from "./types";
import { usePromises } from "./usePromises";

interface Props {
    promise: PaymentPromise;
    onCancelled?: () => void;
}

export function PromiseCard({ promise, onCancelled }: Props) {
    const { cancelPromise } = usePromises();
    const cancelling = cancelPromise.isPending;

    const handleCancel = async () => {
        const success = await cancelPromise.mutateAsync(promise.id);
        if (success) {
            onCancelled?.();
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
    };

    const isOverdue = promise.status === "pending" && new Date(promise.promise_date) < new Date(new Date().toISOString().split("T")[0]);

    return (
        <div className={`rounded-xl border bg-card p-3 md:p-4 space-y-2 ${isOverdue ? "border-red-200 dark:border-red-900" : ""}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-base md:text-lg font-bold text-foreground">
                            {promise.amount.toLocaleString("ar-SA")}
                        </span>
                        <PromiseBadge status={promise.status} size="sm" />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>تاريخ الوعد: {formatDate(promise.promise_date)}</div>
                        {promise.notes && <div className="line-clamp-2">{promise.notes}</div>}
                    </div>
                </div>

                {promise.status === "pending" && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={handleCancel}
                        disabled={cancelling}
                    >
                        <XCircle className="size-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                )}
            </div>

            {isOverdue && (
                <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                    متأخر عن الموعد المحدد
                </div>
            )}
        </div>
    );
}