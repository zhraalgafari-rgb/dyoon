import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "ابحث..." }: Props) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 size-3.5 md:size-4 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="ps-8 pe-8 h-9 md:h-10 text-[12px] md:text-[13px]" />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="مسح"
          className="absolute end-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <X className="size-3.5 md:size-4" />
        </button>
      )}
    </div>
  );
}