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
    <Card className="p-6 shadow-md" data-testid="filter-panel">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Filter className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-primary">Filtres</h3>
            {totalFilters > 0 && (
              <p className="text-xs text-muted-foreground">{totalFilters} filtre{totalFilters > 1 ? 's' : ''} actif{totalFilters > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        {totalFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-2" data-testid="button-reset-filters">
            <X className="w-4 h-4" />
            <span className="text-xs">Réinitialiser</span>
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-sm font-semibold mb-4 block text-primary uppercase tracking-wide">Thème</Label>
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
                <label htmlFor={`theme-${theme}`} className="text-sm cursor-pointer hover:text-primary transition-colors flex-1">
                  {theme}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-6">
          <Label className="text-sm font-semibold mb-4 block text-primary uppercase tracking-wide">Modalité</Label>
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
                <label htmlFor={`modality-${modality}`} className="text-sm cursor-pointer hover:text-primary transition-colors flex-1">
                  {modality === "presentiel" ? "Présentiel" : modality === "distanciel" ? "Distanciel" : "Hybride"}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-6">
          <Label className="text-sm font-semibold mb-4 block text-primary uppercase tracking-wide">Niveau</Label>
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
                <label htmlFor={`seniority-${level}`} className="text-sm cursor-pointer hover:text-primary transition-colors flex-1">
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
