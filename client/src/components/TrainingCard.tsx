import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ModalityBadge from "./ModalityBadge";
import SeniorityBadge from "./SeniorityBadge";
import { Clock, Calendar, ArrowRight } from "lucide-react";
import type { Formation } from "@shared/schema";
import RatingStars from "./RatingStars";

export type FormationWithRating = Formation & {
  averageRating?: number | null;
  reviewCount?: number;
};

interface TrainingCardProps {
  formation: FormationWithRating;
  nextSessionDate?: Date;
  onViewDetails: () => void;
  reviewsVisible?: boolean;
}

export default function TrainingCard({
  formation,
  nextSessionDate,
  onViewDetails,
  reviewsVisible = true,
}: TrainingCardProps) {
  const hasRatings =
    reviewsVisible &&
    typeof formation.averageRating === "number" &&
    (formation.reviewCount ?? 0) > 0;

  return (
    <Card
      className="surface-soft group flex h-full cursor-pointer flex-col justify-between rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1"
      onClick={onViewDetails}
      data-testid={`card-training-${formation.id}`}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {formation.seniorityRequired && <SeniorityBadge seniority={formation.seniorityRequired} />}
          <ModalityBadge modality={formation.modality as "presentiel" | "distanciel" | "hybride"} />
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-semibold tracking-tight text-foreground" data-testid={`text-training-title-${formation.id}`}>
            {formation.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">{formation.description}</p>
          {hasRatings && (
            <div className="flex items-center gap-2">
              <RatingStars value={formation.averageRating ?? 0} size="sm" />
              <span className="text-xs font-medium text-muted-foreground">
                {formation.averageRating?.toFixed(1)}
                <span className="mx-1 text-muted-foreground/40">•</span>
                {formation.reviewCount} avis
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
              <Badge key={tag} variant="outline" className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-muted-foreground">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Button
        variant="default"
        className="group mt-6 w-full rounded-xl bg-primary py-4 text-sm font-semibold text-white shadow-[0_24px_40px_-28px_rgba(10,132,255,0.65)] transition hover:bg-primary/90"
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails();
        }}
        data-testid={`button-view-details-${formation.id}`}
      >
        <span>Voir les détails</span>
        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Button>
    </Card>
  );
}
