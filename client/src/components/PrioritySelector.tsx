import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PrioritySelectorProps {
  value: "P1" | "P2" | "P3";
  onChange: (value: "P1" | "P2" | "P3") => void;
  p1Available: boolean;
  p2Available: boolean;
}

export default function PrioritySelector({ value, onChange, p1Available, p2Available }: PrioritySelectorProps) {
  return (
    <div className="space-y-6" data-testid="priority-selector">
      <div>
        <Label className="text-lg font-semibold mb-3 block text-primary">Sélectionnez votre priorité</Label>
        <Alert className="bg-accent/10 border-accent/20">
          <Info className="h-5 w-5 text-accent" />
          <AlertDescription className="text-sm text-primary">
            Vous disposez de 1 priorité P1 et 1 priorité P2 par an. Les priorités P1 sont traitées en premier, suivies
            des P2, puis des P3.
          </AlertDescription>
        </Alert>
      </div>

      <RadioGroup value={value} onValueChange={(v) => onChange(v as "P1" | "P2" | "P3")}>
        <div className="space-y-4">
          <Card className={`p-6 border-2 transition-all ${
            value === "P1" ? "border-destructive bg-destructive/5 shadow-md" : "border-border"
          } ${!p1Available ? "opacity-50" : "cursor-pointer hover:border-destructive/50"}`}>
            <div className="flex items-start gap-4">
              <RadioGroupItem value="P1" id="p1" disabled={!p1Available} className="mt-1" data-testid="radio-priority-p1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <Label htmlFor="p1" className={`font-semibold text-base ${!p1Available ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    Priorité 1 (P1) - Formation stratégique
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Limitée à 1 par an. Traitement prioritaire et validation garantie sous 48h.
                </p>
                {!p1Available && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mt-3">
                    <p className="text-xs font-medium text-destructive">⚠️ Quota P1 déjà utilisé cette année</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className={`p-6 border-2 transition-all ${
            value === "P2" ? "border-accent bg-accent/5 shadow-md" : "border-border"
          } ${!p2Available ? "opacity-50" : "cursor-pointer hover:border-accent/50"}`}>
            <div className="flex items-start gap-4">
              <RadioGroupItem value="P2" id="p2" disabled={!p2Available} className="mt-1" data-testid="radio-priority-p2" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Circle className="w-5 h-5 text-accent fill-accent" />
                  <Label htmlFor="p2" className={`font-semibold text-base ${!p2Available ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    Priorité 2 (P2) - Formation importante
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Limitée à 1 par an. Traitement après les P1, validation sous 5 jours.
                </p>
                {!p2Available && (
                  <div className="bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 mt-3">
                    <p className="text-xs font-medium text-accent">⚠️ Quota P2 déjà utilisé cette année</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className={`p-6 border-2 transition-all cursor-pointer ${
            value === "P3" ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50"
          }`}>
            <div className="flex items-start gap-4">
              <RadioGroupItem value="P3" id="p3" className="mt-1" data-testid="radio-priority-p3" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Circle className="w-5 h-5 text-muted-foreground" />
                  <Label htmlFor="p3" className="font-semibold text-base cursor-pointer">
                    Priorité 3 (P3) - Formation complémentaire
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Illimitée. Traitement après les P1 et P2, validation selon disponibilités.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </RadioGroup>
    </div>
  );
}
