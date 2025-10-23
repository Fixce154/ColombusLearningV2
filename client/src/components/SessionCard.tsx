import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, User } from "lucide-react";
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

  return (
    <Card
      className={`p-4 cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${isFull ? "opacity-50 cursor-not-allowed" : "hover-elevate"}`}
      onClick={!isFull ? onClick : undefined}
      data-testid={`card-session-${session.id}`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-sm flex-1">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <div className="font-medium">
                {session.startDate.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {session.startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} -{" "}
                {session.endDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
          {isFull && <Badge variant="secondary">Complet</Badge>}
        </div>

        {session.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span>{session.location}</span>
          </div>
        )}

        {instructorName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4 flex-shrink-0" />
            <span>{instructorName}</span>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>
                {enrolledCount} / {session.capacity} inscrits
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{Math.round(capacityPercentage)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
