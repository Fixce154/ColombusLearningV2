import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import { Calendar, MapPin, ArrowRight } from "lucide-react";

interface TrainingListItemProps {
  title: string;
  status: string;
  priority?: "P1" | "P2" | "P3";
  date: Date;
  location?: string;
  onViewDetails: () => void;
}

export default function TrainingListItem({
  title,
  status,
  priority,
  date,
  location,
  onViewDetails,
}: TrainingListItemProps) {
  return (
    <Card
      className="surface-soft flex cursor-pointer items-center justify-between gap-6 rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1"
      onClick={onViewDetails}
      data-testid="item-training-list"
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {priority && <PriorityBadge priority={priority} />}
          </div>
          <div className="min-w-0">
            <h4 className="mb-2 truncate text-base font-semibold tracking-tight text-foreground">{title}</h4>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar className="h-4 w-4" />
                <span>{date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              {location && (
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate font-medium">{location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0 rounded-full border border-black/10 bg-white text-muted-foreground transition hover:border-primary/20 hover:text-primary"
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails();
        }}
        data-testid="button-view-training"
      >
        <ArrowRight className="h-5 w-5" />
      </Button>
    </Card>
  );
}
