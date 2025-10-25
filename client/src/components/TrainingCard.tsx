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
      className="glass-panel group flex h-full cursor-pointer flex-col justify-between rounded-2xl border-white/40 p-6 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/85"
      onClick={onViewDetails}
      data-testid={`card-training-${formation.id}`}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
          {formation.seniorityRequired && <SeniorityBadge seniority={formation.seniorityRequired} />}
          <ModalityBadge modality={formation.modality as "presentiel" | "distanciel" | "hybride"} />
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-semibold tracking-tight text-primary" data-testid={`text-training-title-${formation.id}`}>
            {formation.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground/90 line-clamp-3">{formation.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground/90">
          <div className="flex items-center gap-2 font-medium">
            <Clock className="h-4 w-4" />
            <span>{formation.duration}</span>
          </div>
          {nextSessionDate && (
            <div className="flex items-center gap-2 font-medium">
              <Calendar className="h-4 w-4" />
              <span>
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
              <Badge key={tag} variant="outline" className="border-white/40 bg-white/20 text-xs font-normal text-muted-foreground/90">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Button
          variant="default"
          className="group w-full rounded-full border-0 bg-gradient-to-r from-primary to-accent py-5 text-sm font-semibold shadow-[0_20px_40px_-22px_rgba(0,49,63,0.6)] transition-all hover:shadow-[0_26px_60px_-28px_rgba(0,49,63,0.65)]"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          data-testid={`button-view-details-${formation.id}`}
        >
          <span>Voir les détails</span>
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </Card>
  );
}
