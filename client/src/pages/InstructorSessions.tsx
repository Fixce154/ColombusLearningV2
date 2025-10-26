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
    <div className="space-y-12">
      <section className="surface-elevated relative overflow-hidden rounded-[2rem] px-12 py-14">
        <div className="pointer-events-none absolute inset-y-8 right-0 hidden w-72 rounded-l-[32px] bg-[radial-gradient(circle_at_center,rgba(10,132,255,0.12),transparent_60%)] md:block" />
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-5">
            <p className="eyebrow text-muted-foreground">Espace formateur</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">Vos sessions de formation</h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Retrouvez vos prochaines sessions, leurs participants et les informations essentielles pour les animer sereinement.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Mes sessions planifiées</h2>
          <p className="text-muted-foreground">Les sessions de formation que vous animez</p>
        </div>

      {mySessions.length === 0 ? (
        <Card className="surface-tonal rounded-[1.75rem] border-none">
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
      </section>
    </div>
  );
}
