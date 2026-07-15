import { Sparkles, UserPlus } from "lucide-react";
import { FabButton } from "@/components/common/FabButton";

interface Props {
  onOpenAiChat: () => void;
  onOpenNewPerson: () => void;
  onOpenAdd: () => void;
}

export function MobileDashboardActions({ onOpenAiChat, onOpenNewPerson, onOpenAdd }: Props) {
  return (
    <div className="md:hidden">
      <button
        onClick={onOpenAiChat}
        aria-label="المساعد الذكي"
        className="fixed bottom-36 left-4 z-20 size-12 rounded-full shadow-glow flex items-center justify-center hover:scale-110 active:scale-95 transition-transform overflow-hidden"
        style={{ background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)" }}
      >
        <Sparkles className="size-5 text-white" />
      </button>

      <button
        onClick={onOpenNewPerson}
        aria-label="إضافة عميل جديد"
        className="fixed bottom-52 left-4 z-20 size-11 rounded-full bg-card border-2 border-success text-success shadow-elevated flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <UserPlus className="size-4" />
      </button>

      <FabButton onClick={onOpenAdd} label="إضافة معاملة" />
    </div>
  );
}
