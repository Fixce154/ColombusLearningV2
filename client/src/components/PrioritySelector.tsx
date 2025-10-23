import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface PrioritySelectorProps {
  value: "P1" | "P2" | "P3";
  onChange: (value: "P1" | "P2" | "P3") => void;
  p1Available: boolean;
  p2Available: boolean;
}

export default function PrioritySelector({ value, onChange, p1Available, p2Available }: PrioritySelectorProps) {
  return (
    <div className="space-y-4" data-testid="priority-selector">
      <div>
        <Label className="text-base font-semibold mb-3 block">Sélectionnez votre priorité</Label>
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Vous disposez de 1 priorité P1 et 1 priorité P2 par an. Les priorités P1 sont traitées en premier, suivies
            des P2, puis des P3.
          </AlertDescription>
        </Alert>
      </div>

      <RadioGroup value={value} onValueChange={(v) => onChange(v as "P1" | "P2" | "P3")}>
        <div className="space-y-3">
          <div className={`flex items-start gap-3 p-4 rounded-md border ${!p1Available ? "opacity-50" : ""}`}>
            <RadioGroupItem value="P1" id="p1" disabled={!p1Available} data-testid="radio-priority-p1" />
            <div className="flex-1">
              <Label htmlFor="p1" className={`font-medium ${!p1Available ? "cursor-not-allowed" : "cursor-pointer"}`}>
                Priorité 1 (P1) - Formation stratégique
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Limitée à 1 par an. Traitement prioritaire et validation garantie.
              </p>
              {!p1Available && <p className="text-xs text-destructive mt-1">Quota P1 déjà utilisé cette année</p>}
            </div>
          </div>

          <div className={`flex items-start gap-3 p-4 rounded-md border ${!p2Available ? "opacity-50" : ""}`}>
            <RadioGroupItem value="P2" id="p2" disabled={!p2Available} data-testid="radio-priority-p2" />
            <div className="flex-1">
              <Label htmlFor="p2" className={`font-medium ${!p2Available ? "cursor-not-allowed" : "cursor-pointer"}`}>
                Priorité 2 (P2) - Formation importante
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Limitée à 1 par an. Traitement après les P1.
              </p>
              {!p2Available && <p className="text-xs text-destructive mt-1">Quota P2 déjà utilisé cette année</p>}
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-md border">
            <RadioGroupItem value="P3" id="p3" data-testid="radio-priority-p3" />
            <div className="flex-1">
              <Label htmlFor="p3" className="font-medium cursor-pointer">
                Priorité 3 (P3) - Formation complémentaire
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Illimitée. Traitement après les P1 et P2.</p>
            </div>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}
