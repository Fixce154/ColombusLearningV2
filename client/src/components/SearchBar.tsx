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
      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/70">
        <Search className="h-5 w-5" />
      </div>
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-14 rounded-full border border-white/50 bg-white/80 pl-14 pr-14 text-base shadow-[0_20px_45px_-28px_rgba(15,28,34,0.5)] transition-all placeholder:text-muted-foreground/70 focus:border-accent focus:ring-accent/20"
        data-testid="input-search"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border border-white/60 bg-white/20 text-primary transition-all hover:border-white/80 hover:bg-white/40"
          onClick={() => onChange("")}
          data-testid="button-clear-search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
