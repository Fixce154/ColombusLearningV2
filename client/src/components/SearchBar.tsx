import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = "Rechercher une formation par mots-clés..." }: SearchBarProps) {
  return (
    <div className="relative">
      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground">
        <Search className="h-5 w-5" />
      </div>
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-14 rounded-full border border-black/10 bg-white pl-14 pr-14 text-base shadow-sm transition placeholder:text-muted-foreground focus:border-primary/30 focus:ring-primary/20"
        data-testid="input-search"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border border-black/10 bg-white text-muted-foreground transition hover:border-primary/20 hover:text-primary"
          onClick={() => onChange("")}
          data-testid="button-clear-search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
