import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface Props { icon: LucideIcon; label: string; value: string; sub?: string; accent?: string }

export function KpiCard({ icon: Icon, label, value, sub, accent }: Props) {
  return (
    <Card className="p-1.5 md:p-3">
      <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground mb-0.5 truncate">
        <Icon className="size-3 md:size-4 shrink-0" style={accent ? { color: accent } : undefined} />
        <span className="truncate">{label}</span>
      </div>
      <div className="font-bold text-[12px] md:text-base truncate leading-tight">{value}</div>
      {sub && <div className="text-[9px] md:text-xs text-muted-foreground tabular-nums truncate">{sub}</div>}
    </Card>
  );
}