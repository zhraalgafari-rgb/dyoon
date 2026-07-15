import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { SearchBar } from "@/components/common/SearchBar";
import type { ViewMode, Sort, Filter } from "@/hooks/useDashboardFilter";

interface Props {
  q: string;
  onQChange: (v: string) => void;
  sort: Sort;
  onSortChange: (v: Sort) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  filter: Filter;
  onFilterChange: (v: Filter) => void;
}

export function DashboardFilterBar({
  q,
  onQChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  filter,
  onFilterChange,
}: Props) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <div className="flex-1">
          <SearchBar value={q} onChange={onQChange} placeholder="ابحث عن شخص..." />
        </div>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as Sort)}
          className="h-9 rounded-lg border bg-card px-2 text-[11px] font-semibold text-foreground"
          aria-label="فرز"
        >
          <option value="active">الأكثر نشاطاً</option>
          <option value="recent">الأحدث</option>
          <option value="name">أبجدي</option>
        </select>
        <div
          className="inline-flex h-9 rounded-lg border bg-card overflow-hidden"
          role="group"
          aria-label="طريقة العرض"
        >
          <button
            onClick={() => onViewChange("cards")}
            className={`px-2 flex items-center justify-center transition-colors ${view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="بطاقات"
            aria-pressed={view === "cards"}
          >
            <LayoutGrid className="size-3.5" />
          </button>
          <button
            onClick={() => onViewChange("table")}
            className={`px-2 flex items-center justify-center transition-colors border-r ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="جدول"
            aria-pressed={view === "table"}
          >
            <TableIcon className="size-3.5" />
          </button>
        </div>
      </div>

      {filter !== "all" && (
        <div className="flex items-center justify-between text-xs px-1 animate-in slide-in-from-top-2 duration-200">
          <span className="text-muted-foreground">
            تصفية: {filter === "credit" ? "له فقط" : "عليه فقط"}
          </span>
          <button onClick={() => onFilterChange("all")} className="text-primary font-semibold">
            إلغاء التصفية
          </button>
        </div>
      )}
    </>
  );
}
