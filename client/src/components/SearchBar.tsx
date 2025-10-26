import { Input } from "@/components/ui/input";
import { Search, X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onToggleFilters?: () => void;
  filtersOpen?: boolean;
  activeFiltersCount?: number;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Rechercher une formation par mots-clés...",
  onToggleFilters,
  filtersOpen = false,
  activeFiltersCount = 0,
}: SearchBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search className="h-5 w-5" />
        </div>
        <Input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-14 rounded-[18px] border border-black/10 bg-white pl-14 pr-14 text-base shadow-sm transition placeholder:text-muted-foreground focus:border-primary/30 focus:ring-primary/20"
          data-testid="input-search"
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-xl border border-black/10 bg-white text-muted-foreground transition hover:border-primary/20 hover:text-primary"
            onClick={() => onChange("")}
            data-testid="button-clear-search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {onToggleFilters && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleFilters}
          className={cn(
            "relative h-14 w-14 flex-shrink-0 rounded-[18px] border border-black/10 bg-white text-muted-foreground transition hover:border-primary/20 hover:text-primary",
            filtersOpen && "border-primary/30 text-primary"
          )}
          aria-label={filtersOpen ? "Masquer les filtres" : "Afficher les filtres"}
          data-testid="button-toggle-filters"
        >
          {filtersOpen ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {activeFiltersCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-white">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      )}
    </div>
  );
}
