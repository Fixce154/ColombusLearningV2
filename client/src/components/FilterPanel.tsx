import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";

interface FilterPanelProps {
  selectedThemes: string[];
  selectedModalities: string[];
  selectedSeniority: string[];
  onThemeChange: (themes: string[]) => void;
  onModalityChange: (modalities: string[]) => void;
  onSeniorityChange: (seniority: string[]) => void;
  onReset: () => void;
}

export default function FilterPanel({
  selectedThemes,
  selectedModalities,
  selectedSeniority,
  onThemeChange,
  onModalityChange,
  onSeniorityChange,
  onReset,
}: FilterPanelProps) {
  const themes = ["Gestion de projet", "Management", "Technique", "Soft Skills", "Stratégie"];
  const modalities = ["presentiel", "distanciel", "hybride"];
  const seniority = ["junior", "confirme", "senior", "expert"];

  const totalFilters = selectedThemes.length + selectedModalities.length + selectedSeniority.length;

  const handleCheckboxChange = (checked: boolean, value: string, current: string[], onChange: (values: string[]) => void) => {
    if (checked) {
      onChange([...current, value]);
    } else {
      onChange(current.filter((v) => v !== value));
    }
  };

  return (
    <Card className="glass-panel space-y-6 rounded-3xl border-white/40 p-8" data-testid="filter-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/15 p-3 text-primary shadow-[0_15px_35px_-20px_rgba(0,49,63,0.45)]">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <p className="section-subtle-title text-primary/60">Affiner le catalogue</p>
            <h3 className="text-lg font-semibold text-primary">Filtres</h3>
            {totalFilters > 0 && (
              <p className="text-xs text-muted-foreground/80">{totalFilters} filtre{totalFilters > 1 ? 's' : ''} actif{totalFilters > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        {totalFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs text-primary transition-all hover:border-white/60 hover:bg-white/30"
            data-testid="button-reset-filters"
          >
            <X className="h-4 w-4" />
            <span>Réinitialiser</span>
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <Label className="mb-4 block text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">Thème</Label>
          <div className="space-y-3">
            {themes.map((theme) => (
              <div key={theme} className="flex items-center gap-3">
                <Checkbox
                  id={`theme-${theme}`}
                  checked={selectedThemes.includes(theme)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(checked as boolean, theme, selectedThemes, onThemeChange)
                  }
                  data-testid={`checkbox-theme-${theme}`}
                />
                <label htmlFor={`theme-${theme}`} className="flex-1 cursor-pointer text-sm font-medium text-muted-foreground/90 transition-colors hover:text-primary">
                  {theme}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/40 pt-6">
          <Label className="mb-4 block text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">Modalité</Label>
          <div className="space-y-3">
            {modalities.map((modality) => (
              <div key={modality} className="flex items-center gap-3">
                <Checkbox
                  id={`modality-${modality}`}
                  checked={selectedModalities.includes(modality)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(checked as boolean, modality, selectedModalities, onModalityChange)
                  }
                  data-testid={`checkbox-modality-${modality}`}
                />
                <label htmlFor={`modality-${modality}`} className="flex-1 cursor-pointer text-sm font-medium text-muted-foreground/90 transition-colors hover:text-primary">
                  {modality === "presentiel" ? "Présentiel" : modality === "distanciel" ? "Distanciel" : "Hybride"}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/40 pt-6">
          <Label className="mb-4 block text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">Niveau</Label>
          <div className="space-y-3">
            {seniority.map((level) => (
              <div key={level} className="flex items-center gap-3">
                <Checkbox
                  id={`seniority-${level}`}
                  checked={selectedSeniority.includes(level)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(checked as boolean, level, selectedSeniority, onSeniorityChange)
                  }
                  data-testid={`checkbox-seniority-${level}`}
                />
                <label htmlFor={`seniority-${level}`} className="flex-1 cursor-pointer text-sm font-medium text-muted-foreground/90 transition-colors hover:text-primary">
                  {level === "junior" ? "Junior" : level === "confirme" ? "Confirmé" : level === "senior" ? "Senior" : "Expert"}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
