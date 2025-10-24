import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, User, Check } from "lucide-react";
import type { Session } from "@shared/schema";

interface SessionCardProps {
  session: Session;
  instructorName?: string;
  enrolledCount: number;
  isSelected?: boolean;
  isFull?: boolean;
  onClick?: () => void;
}

export default function SessionCard({
  session,
  instructorName,
  enrolledCount,
  isSelected,
  isFull,
  onClick,
}: SessionCardProps) {
  const capacityPercentage = (enrolledCount / session.capacity) * 100;
  
  // Convert string dates to Date objects
  const startDate = new Date(session.startDate);
  const endDate = new Date(session.endDate);

  return (
    <Card
      className={`p-6 cursor-pointer transition-all duration-200 ${
        isSelected 
          ? "ring-2 ring-accent border-accent shadow-lg" 
          : "shadow-md hover:shadow-lg border-border"
      } ${isFull ? "opacity-50 cursor-not-allowed" : "hover:border-accent/50"}`}
      onClick={!isFull ? onClick : undefined}
      data-testid={`card-session-${session.id}`}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 text-sm flex-1">
            <div className="bg-accent/10 p-2.5 rounded-lg flex-shrink-0">
              <Calendar className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-primary">
                {startDate.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} -{" "}
                {endDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
          {isSelected && (
            <div className="bg-accent text-accent-foreground p-1.5 rounded-full flex-shrink-0">
              <Check className="w-4 h-4" />
            </div>
          )}
          {isFull && <Badge className="bg-muted text-muted-foreground">Complet</Badge>}
        </div>

        {session.location && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{session.location}</span>
          </div>
        )}

        {instructorName && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{instructorName}</span>
          </div>
        )}

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="font-medium">
                {enrolledCount} / {session.capacity} inscrits
              </span>
            </div>
            <span className="text-xs font-semibold text-accent">{Math.round(capacityPercentage)}%</span>
          </div>
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
