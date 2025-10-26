import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  selectedThemes: string[];
  selectedModalities: string[];
  selectedSeniority: string[];
  onThemeChange: (themes: string[]) => void;
  onModalityChange: (modalities: string[]) => void;
  onSeniorityChange: (seniority: string[]) => void;
  onReset: () => void;
  layout?: "sidebar" | "inline";
}

export default function FilterPanel({
  selectedThemes,
  selectedModalities,
  selectedSeniority,
  onThemeChange,
  onModalityChange,
  onSeniorityChange,
  onReset,
  layout = "sidebar",
}: FilterPanelProps) {
  const themes = ["Gestion de projet", "Management", "Technique", "Soft Skills", "Stratégie"];
  const modalities = ["presentiel", "distanciel", "hybride"];
  const seniority = ["junior", "confirme", "senior", "expert"];

  const totalFilters = selectedThemes.length + selectedModalities.length + selectedSeniority.length;

  const isInline = layout === "inline";

  const handleCheckboxChange = (checked: boolean, value: string, current: string[], onChange: (values: string[]) => void) => {
    if (checked) {
      onChange([...current, value]);
    } else {
      onChange(current.filter((v) => v !== value));
    }
  };

  return (
    <Card
      className={cn(
        "surface-soft rounded-3xl",
        isInline ? "space-y-6 p-6" : "space-y-6 p-8"
      )}
      data-testid="filter-panel"
    >
      <div
        className={cn(
          "flex items-center justify-between",
          isInline && "flex-col gap-4 md:flex-row md:items-start"
        )}
      >
        <div
          className={cn("flex items-center gap-4", isInline && "w-full justify-between md:w-auto md:justify-start")}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <p className="eyebrow text-muted-foreground">Affiner le catalogue</p>
            <h3 className="text-lg font-semibold text-foreground">Filtres</h3>
            {totalFilters > 0 && (
              <p className="text-xs text-muted-foreground">{totalFilters} filtre{totalFilters > 1 ? "s" : ""} actif{totalFilters > 1 ? "s" : ""}</p>
            )}
          </div>
        </div>
        {totalFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/20 hover:text-primary"
            data-testid="button-reset-filters"
          >
            <X className="h-4 w-4" />
            <span>Réinitialiser</span>
          </Button>
        )}
      </div>

      <div
        className={cn(
          "space-y-6",
          isInline && "grid gap-6 md:grid-cols-3 md:items-start"
        )}
      >
        <div className={cn("space-y-3", isInline && "md:pr-6")}>
          <Label className="eyebrow mb-4 block text-muted-foreground">Thème</Label>
          <div className="space-y-3">
            {themes.map((theme) => (
              <div key={theme} className="flex items-center gap-3">
                <Checkbox
                  id={`theme-${theme}`}
                  checked={selectedThemes.includes(theme)}
                  onCheckedChange={(checked) => handleCheckboxChange(checked as boolean, theme, selectedThemes, onThemeChange)}
                  data-testid={`checkbox-theme-${theme}`}
                />
                <label
                  htmlFor={`theme-${theme}`}
                  className="flex-1 cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {theme}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "space-y-3",
            isInline ? "md:border-l md:border-black/5 md:pl-6" : "border-t border-black/5 pt-6"
          )}
        >
          <Label className="eyebrow mb-4 block text-muted-foreground">Modalité</Label>
          <div className="space-y-3">
            {modalities.map((modality) => (
              <div key={modality} className="flex items-center gap-3">
                <Checkbox
                  id={`modality-${modality}`}
                  checked={selectedModalities.includes(modality)}
                  onCheckedChange={(checked) => handleCheckboxChange(checked as boolean, modality, selectedModalities, onModalityChange)}
                  data-testid={`checkbox-modality-${modality}`}
                />
                <label
                  htmlFor={`modality-${modality}`}
                  className="flex-1 cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {modality === "presentiel" ? "Présentiel" : modality === "distanciel" ? "Distanciel" : "Hybride"}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "space-y-3",
            isInline ? "md:border-l md:border-black/5 md:pl-6" : "border-t border-black/5 pt-6"
          )}
        >
          <Label className="eyebrow mb-4 block text-muted-foreground">Niveau</Label>
          <div className="space-y-3">
            {seniority.map((level) => (
              <div key={level} className="flex items-center gap-3">
                <Checkbox
                  id={`seniority-${level}`}
                  checked={selectedSeniority.includes(level)}
                  onCheckedChange={(checked) => handleCheckboxChange(checked as boolean, level, selectedSeniority, onSeniorityChange)}
                  data-testid={`checkbox-seniority-${level}`}
                />
                <label
                  htmlFor={`seniority-${level}`}
                  className="flex-1 cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {level === "junior" ? "Junior" : level === "confirme" ? "Confirmé" : level === "senior" ? "Senior" : "Expert"}
                </label>
              </div>
            ))}
          </div>
        </div>

        {totalFilters > 0 && (
          <div
            className={cn(
              "flex flex-wrap gap-2",
              isInline ? "md:col-span-3" : "pt-4"
            )}
          >
            {selectedThemes.map((theme) => (
              <Badge
                key={theme}
                variant="outline"
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {theme}
              </Badge>
            ))}
            {selectedModalities.map((modality) => (
              <Badge
                key={modality}
                variant="outline"
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {modality === "presentiel" ? "Présentiel" : modality === "distanciel" ? "Distanciel" : "Hybride"}
              </Badge>
            ))}
            {selectedSeniority.map((level) => (
              <Badge
                key={level}
                variant="outline"
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {level === "junior" ? "Junior" : level === "confirme" ? "Confirmé" : level === "senior" ? "Senior" : "Expert"}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
