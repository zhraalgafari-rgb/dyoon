import { Sparkles, UserPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  peopleCount: number;
  hasActiveBalances: boolean;
  activePeople: number;
  onOpenAiChat: () => void;
  onOpenNewPerson: () => void;
  onOpenAdd: () => void;
}

export function DashboardHeader({
  peopleCount,
  hasActiveBalances,
  activePeople,
  onOpenAiChat,
  onOpenNewPerson,
  onOpenAdd,
}: Props) {
  return (
    <div className="hidden md:flex items-center justify-between gap-4">
      <div>
        <h2 className="font-black text-[17px] md:text-[22px] leading-tight">العملاء</h2>
        <p className="text-[11px] md:text-[13px] text-muted-foreground mt-0.5">
          {peopleCount} عميل · {hasActiveBalances ? "لديك أرصدة نشطة" : "لا توجد أرصدة"}
          {activePeople > 0 && (
            <span className="me-2">
              · <span className="text-success font-bold">{activePeople}</span> نشط
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={onOpenAiChat}
          variant="outline"
          size="sm"
          className="h-9 md:h-10 gap-1.5 md:gap-2 text-[12px] md:text-[13px]"
        >
          <Sparkles className="size-4 text-primary" /> المساعد الذكي
        </Button>
        <Button
          onClick={onOpenNewPerson}
          variant="outline"
          size="sm"
          className="h-9 md:h-10 gap-1.5 md:gap-2 text-[12px] md:text-[13px]"
        >
          <UserPlus className="size-4" /> عميل جديد
        </Button>
        <Button
          onClick={onOpenAdd}
          size="sm"
          className="h-9 md:h-10 gap-1.5 md:gap-2 text-[12px] md:text-[13px] bg-gradient-primary text-primary-foreground shadow-glow"
        >
          <Plus className="size-4" /> إضافة معاملة
        </Button>
      </div>
    </div>
  );
}
