import { useState } from "react";
import { MoreVertical, Pencil, Archive, Trash2 } from "lucide-react";
import type { PersonSummary, PersonRowActions } from "../types";

interface Props extends PersonRowActions {
  person: PersonSummary;
}

/**
 * Inline dropdown actions menu (edit / archive / delete) used inside
 * PersonRowV2. Self-contained toggle state, stops propagation on open.
 */
export function PersonRowActionsMenu({ person, onEdit, onArchive, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  if (!onEdit && !onArchive && !onDelete) return null;

  const run = (fn?: (p: PersonSummary) => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn?.(person);
    setOpen(false);
  };

  return (
    <div className="mt-0.5" onClick={(e) => e.preventDefault()}>
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!open);
          }}
          className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="خيارات إضافية"
        >
          <MoreVertical className="size-4" />
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border/60 rounded-xl shadow-elevated p-1.5 min-w-[140px] animate-scale-in origin-top-left">
            {onEdit && (
              <button
                onClick={run(onEdit)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <Pencil className="size-3.5" />
                تعديل
              </button>
            )}
            {onArchive && (
              <button
                onClick={run(onArchive)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <Archive className="size-3.5" />
                أرشفة
              </button>
            )}
            {onDelete && (
              <button
                onClick={run(onDelete)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-danger hover:bg-danger/10 transition-colors"
              >
                <Trash2 className="size-3.5" />
                حذف
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
