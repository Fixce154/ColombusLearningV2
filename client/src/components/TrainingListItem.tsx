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
    <Card className="glass-panel flex cursor-pointer items-center justify-between gap-6 rounded-2xl border-white/40 p-6 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/85" onClick={onViewDetails} data-testid="item-training-list">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={status} />
            {priority && <PriorityBadge priority={priority} />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="mb-2 truncate text-base font-semibold tracking-tight text-primary">{title}</h4>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground/90">
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">
                  {date.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
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
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 rounded-full border border-white/50 bg-white/20 text-primary transition-all hover:border-white/70 hover:bg-white/40"
          onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
          data-testid="button-view-training"
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </Card>
  );
}
