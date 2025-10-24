import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ModalityBadge from "./ModalityBadge";
import SeniorityBadge from "./SeniorityBadge";
import { Clock, Calendar, ArrowRight } from "lucide-react";
import type { Formation } from "@shared/schema";

interface TrainingCardProps {
  formation: Formation;
  nextSessionDate?: Date;
  onViewDetails: () => void;
}

export default function TrainingCard({ formation, nextSessionDate, onViewDetails }: TrainingCardProps) {
  return (
    <Card 
      className="p-6 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer border-border hover:border-accent/50" 
      onClick={onViewDetails} 
      data-testid={`card-training-${formation.id}`}
    >
      <div className="space-y-6">
        <div className="flex items-start gap-2 flex-wrap">
          {formation.seniorityRequired && <SeniorityBadge seniority={formation.seniorityRequired} />}
          <ModalityBadge modality={formation.modality as "presentiel" | "distanciel" | "hybride"} />
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-primary leading-tight" data-testid={`text-training-title-${formation.id}`}>
            {formation.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{formation.description}</p>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{formation.duration}</span>
          </div>
          {nextSessionDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">
                {nextSessionDate.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          )}
        </div>

        {formation.tags && formation.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formation.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Button
          variant="default"
          className="w-full group shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          data-testid={`button-view-details-${formation.id}`}
        >
          <span>Voir les détails</span>
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </Card>
  );
}
