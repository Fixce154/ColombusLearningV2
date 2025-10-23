import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ModalityBadge from "./ModalityBadge";
import SeniorityBadge from "./SeniorityBadge";
import { Clock, Calendar } from "lucide-react";
import type { Formation } from "@shared/schema";

interface TrainingCardProps {
  formation: Formation;
  nextSessionDate?: Date;
  onViewDetails: () => void;
}

export default function TrainingCard({ formation, nextSessionDate, onViewDetails }: TrainingCardProps) {
  return (
    <Card className="p-6 hover-elevate cursor-pointer" onClick={onViewDetails} data-testid={`card-training-${formation.id}`}>
      <div className="space-y-4">
        <div className="flex items-start gap-2 flex-wrap">
          {formation.seniorityRequired && <SeniorityBadge seniority={formation.seniorityRequired} />}
          <ModalityBadge modality={formation.modality as "presentiel" | "distanciel" | "hybride"} />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2" data-testid={`text-training-title-${formation.id}`}>
            {formation.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{formation.description}</p>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formation.duration}</span>
          </div>
          {nextSessionDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {nextSessionDate.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        {formation.tags && formation.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formation.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Button
          variant="default"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          data-testid={`button-view-details-${formation.id}`}
        >
          Voir les détails
        </Button>
      </div>
    </Card>
  );
}
