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
    <Card className="p-6 shadow-md hover:shadow-lg cursor-pointer transition-all border-border hover:border-accent/50" onClick={onViewDetails} data-testid="item-training-list">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={status} />
            {priority && <PriorityBadge priority={priority} />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-primary text-base truncate mb-2">{title}</h4>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
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
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium truncate">{location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="flex-shrink-0 hover:bg-accent/10 hover:text-accent" 
          onClick={(e) => { e.stopPropagation(); onViewDetails(); }} 
          data-testid="button-view-training"
        >
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </Card>
  );
}
