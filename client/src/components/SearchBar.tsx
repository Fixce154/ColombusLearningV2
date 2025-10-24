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
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
        <Search className="w-5 h-5" />
      </div>
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-12 pr-12 h-14 text-base shadow-md border-border focus:border-accent focus:ring-accent/20 rounded-xl"
        data-testid="input-search"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 hover:bg-accent/10"
          onClick={() => onChange("")}
          data-testid="button-clear-search"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
