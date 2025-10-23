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
    <Card className="p-4 hover-elevate cursor-pointer" onClick={onViewDetails} data-testid="item-training-list">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <StatusBadge status={status} />
          {priority && <PriorityBadge priority={priority} />}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{title}</h4>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span className="text-xs">
                  {date.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="text-xs truncate">{location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onViewDetails(); }} data-testid="button-view-training">
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
