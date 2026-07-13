import { tokens } from "@/lib/design-tokens";

interface Props {
    variant?: "card" | "row" | "circle" | "text" | "chart";
    width?: string;
    height?: string;
    count?: number;
    className?: string;
}

/**
 * SkeletonLoader - مكون تحميل متحرك احترافي
 * يستخدم لتحسين تجربة المستخدم أثناء تحميل البيانات
 */
export function SkeletonLoader({
    variant = "text",
    width,
    height,
    count = 1,
    className = "",
}: Props) {
    const baseClass = "skeleton rounded-lg";

    const variants: Record<string, string> = {
        card: `${baseClass} h-32 md:h-40 w-full rounded-2xl`,
        row: `${baseClass} h-16 md:h-20 w-full rounded-xl`,
        circle: `${baseClass} rounded-full`,
        text: `${baseClass} h-4 w-full`,
        chart: `${baseClass} h-48 w-full rounded-2xl`,
    };

    if (count === 1) {
        const style: React.CSSProperties = {};
        if (width) style.width = width;
        if (height) style.height = height;

        if (variant === "circle") {
            const size = width || "40px";
            return (
                <div
                    className={`${variants[variant]} ${className}`}
                    style={{ width: size, height: size, ...style }}
                    aria-hidden="true"
                />
            );
        }

        return (
            <div
                className={`${variants[variant]} ${className}`}
                style={style}
                aria-hidden="true"
            />
        );
    }

    return (
        <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => {
                const style: React.CSSProperties = {};
                if (width) style.width = width;
                if (height) style.height = height;
                // Randomize width for text variants to look more natural
                if (variant === "text") {
                    const randomWidth = 60 + Math.random() * 40;
                    style.width = `${randomWidth}%`;
                }

                return (
                    <div
                        key={i}
                        className={`${variants[variant]} ${className}`}
                        style={style}
                    />
                );
            })}
        </div>
    );
}

/**
 * PersonRowSkeleton - Skeleton مخصص لبطاقات الأشخاص
 */
export function PersonRowSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="block rounded-xl md:rounded-2xl border border-border/50 bg-card p-3 md:p-4 animate-pulse"
                    style={{ animationDelay: `${i * 100}ms` }}
                >
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="size-11 md:size-13 rounded-xl md:rounded-2xl skeleton shrink-0" />
                        <div className="flex-1 space-y-2 pt-1">
                            <div className="skeleton h-4 w-32 md:w-40 rounded-md" />
                            <div className="skeleton h-3 w-24 md:w-28 rounded-md" />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="skeleton h-5 w-20 rounded-md" />
                            <div className="skeleton h-3 w-16 rounded-md" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * DashboardSkeleton - Skeleton مخصص للوحة التحكم
 */
export function DashboardSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-border/50 bg-card p-3 md:p-4 space-y-2"
                        style={{ animationDelay: `${i * 80}ms` }}
                    >
                        <div className="skeleton h-3 w-16 rounded-md" />
                        <div className="skeleton h-6 w-24 rounded-md" />
                        <div className="skeleton h-2 w-full rounded-md" />
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="rounded-2xl border border-border/50 bg-card p-4">
                <div className="skeleton h-6 w-32 rounded-md mb-4" />
                <div className="skeleton h-48 w-full rounded-xl" />
            </div>

            {/* Table */}
            <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-xl border border-border/50 bg-card p-3 flex items-center gap-3"
                        style={{ animationDelay: `${i * 60}ms` }}
                    >
                        <div className="size-10 rounded-xl skeleton shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <div className="skeleton h-3.5 w-28 rounded-md" />
                            <div className="skeleton h-3 w-20 rounded-md" />
                        </div>
                        <div className="skeleton h-4 w-16 rounded-md" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SkeletonLoader;