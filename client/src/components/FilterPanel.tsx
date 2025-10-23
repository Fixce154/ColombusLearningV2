import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    <Card className="p-6" data-testid="filter-panel">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Filtres</h3>
          {totalFilters > 0 && (
            <Badge variant="secondary" data-testid="badge-filter-count">
              {totalFilters}
            </Badge>
          )}
        </div>
        {totalFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} data-testid="button-reset-filters">
            Réinitialiser
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-sm font-semibold mb-3 block">Thème</Label>
          <div className="space-y-2">
            {themes.map((theme) => (
              <div key={theme} className="flex items-center gap-2">
                <Checkbox
                  id={`theme-${theme}`}
                  checked={selectedThemes.includes(theme)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(checked as boolean, theme, selectedThemes, onThemeChange)
                  }
                  data-testid={`checkbox-theme-${theme}`}
                />
                <label htmlFor={`theme-${theme}`} className="text-sm cursor-pointer">
                  {theme}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-3 block">Modalité</Label>
          <div className="space-y-2">
            {modalities.map((modality) => (
              <div key={modality} className="flex items-center gap-2">
                <Checkbox
                  id={`modality-${modality}`}
                  checked={selectedModalities.includes(modality)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(checked as boolean, modality, selectedModalities, onModalityChange)
                  }
                  data-testid={`checkbox-modality-${modality}`}
                />
                <label htmlFor={`modality-${modality}`} className="text-sm cursor-pointer">
                  {modality === "presentiel" ? "Présentiel" : modality === "distanciel" ? "Distanciel" : "Hybride"}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-3 block">Niveau</Label>
          <div className="space-y-2">
            {seniority.map((level) => (
              <div key={level} className="flex items-center gap-2">
                <Checkbox
                  id={`seniority-${level}`}
                  checked={selectedSeniority.includes(level)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(checked as boolean, level, selectedSeniority, onSeniorityChange)
                  }
                  data-testid={`checkbox-seniority-${level}`}
                />
                <label htmlFor={`seniority-${level}`} className="text-sm cursor-pointer">
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
