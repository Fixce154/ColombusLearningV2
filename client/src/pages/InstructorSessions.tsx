import { useQuery } from "@tanstack/react-query";
import type { Session, Formation, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function InstructorSessions() {
  const { data: currentUser } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: formations = [] } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
  });

  // Filter sessions where I'm the instructor
  const mySessions = sessions.filter(
    (session) => session.instructorId === currentUser?.user?.id
  );

  const getFormationTitle = (formationId: string) => {
    const formation = formations.find((f) => f.id === formationId);
    return formation?.title || "Formation inconnue";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      open: "default",
      full: "secondary",
      completed: "secondary",
      cancelled: "destructive",
    };
    
    const labels: Record<string, string> = {
      open: "Ouverte",
      full: "Complète",
      completed: "Terminée",
      cancelled: "Annulée",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Mes Sessions</h1>
        <p className="text-muted-foreground">
          Les sessions de formation que vous animez
        </p>
      </div>

      {mySessions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Aucune session planifiée pour le moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {mySessions.map((session) => (
            <Card key={session.id} className="hover-elevate" data-testid={`card-session-${session.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold mb-2">
                      {getFormationTitle(session.formationId)}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(session.startDate), "d MMMM yyyy", { locale: fr })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(new Date(session.startDate), "HH:mm", { locale: fr })} -{" "}
                          {format(new Date(session.endDate), "HH:mm", { locale: fr })}
                        </span>
                      </div>
                      {session.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span>{session.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(session.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>Capacité: {session.capacity} participants</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
