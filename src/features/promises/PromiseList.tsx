import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Skeleton";
import { PromiseCard } from "./PromiseCard";
import type { PaymentPromise } from "./types";

interface Props {
    promises: PaymentPromise[];
    isLoading: boolean;
    onCreateClick: () => void;
    onCancelled?: () => void;
}

export function PromiseList({ promises, isLoading, onCreateClick, onCancelled }: Props) {
    if (isLoading) {
        return <ListSkeleton rows={3} />;
    }

    if (promises.length === 0) {
        return (
            <EmptyState
                icon={Plus}
                title="لا توجد وعود سداد"
                description="أضف وعد سداد جديد لتتبع التزامات العميل."
                action={
                    <Button onClick={onCreateClick} className="bg-gradient-primary text-primary-foreground shadow-glow">
                        <Plus className="size-4" /> إضافة وعد
                    </Button>
                }
                variant="compact"
            />
        );
    }

    return (
        <div className="space-y-2">
            {promises.map((promise) => (
                <PromiseCard key={promise.id} promise={promise} onCancelled={onCancelled} />
            ))}
        </div>
    );
}