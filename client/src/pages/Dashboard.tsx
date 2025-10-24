import { useQuery } from "@tanstack/react-query";
import DashboardStats from "@/components/DashboardStats";
import TrainingListItem from "@/components/TrainingListItem";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock, XCircle, Loader2, Heart, AlertCircle, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import type { User, Registration, Formation, Session, FormationInterest } from "@shared/schema";

interface DashboardProps {
  currentUser: User;
}

export default function Dashboard({ currentUser }: DashboardProps) {
  // Fetch formation interests
  const { data: interests = [], isLoading: isLoadingInterests } = useQuery<FormationInterest[]>({
    queryKey: ["/api/interests"],
  });

  // Fetch user's registrations
  const { data: registrations = [], isLoading: isLoadingRegistrations } = useQuery<Registration[]>({
    queryKey: ["/api/registrations"],
  });

  // Fetch all formations to display titles
  const { data: formations = [] } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
  });

  // Fetch all sessions to display dates
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const res = await fetch("/api/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  if (isLoadingRegistrations) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  const upcomingTrainings = registrations.filter((r) => {
    if (r.status !== "validated") return false;
    const session = sessions.find((s) => s.id === r.sessionId);
    return session && new Date(session.startDate) > new Date();
  });

  const pendingTrainings = registrations.filter((r) => r.status === "pending");
  const completedTrainings = registrations.filter((r) => r.status === "completed");
  const cancelledTrainings = registrations.filter((r) => r.status === "cancelled");

  const getFormationTitle = (formationId: string) => {
    return formations.find(f => f.id === formationId)?.title || "Formation inconnue";
  };

  const getSessionDate = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    return session ? new Date(session.startDate) : new Date();
  };

  const getSessionLocation = (sessionId: string) => {
    return sessions.find(s => s.id === sessionId)?.location || "";
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary tracking-tight">
            Bienvenue, {currentUser.name.split(' ')[0]}
          </h1>
          <p className="text-lg text-muted-foreground">
            Gérez vos formations et suivez votre progression professionnelle
          </p>
        </div>
        <Link href="/catalog">
          <Button size="lg" className="gap-2 shadow-md" data-testid="button-browse-catalog">
            <Plus className="w-5 h-5" />
            Parcourir le catalogue
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <DashboardStats
        upcomingCount={upcomingTrainings.length}
        pendingCount={pendingTrainings.length}
        completedCount={completedTrainings.length}
        p1Used={currentUser.p1Used || 0}
        p2Used={currentUser.p2Used || 0}
      />

      {/* Formation Interests Section */}
      {interests.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-lg">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-primary">Mes intentions de formation</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {interests.map((interest) => {
              const formation = formations.find(f => f.id === interest.formationId);
              if (!formation) return null;
              
              return (
                <Card key={interest.id} className="p-6 space-y-4 shadow-md hover-elevate">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-primary line-clamp-2 flex-1">
                        {formation.title}
                      </h3>
                      <Badge variant={interest.priority === "P1" ? "destructive" : interest.priority === "P2" ? "default" : "secondary"}>
                        {interest.priority}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {formation.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    {interest.status === "pending" && (
                      <>
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-600">En attente d'organisation</span>
                      </>
                    )}
                    {interest.status === "approved" && (
                      <>
                        <CheckCircle className="w-4 h-4 text-accent" />
                        <span className="text-accent">Sessions en cours d'organisation</span>
                      </>
                    )}
                    {interest.status === "converted" && (
                      <>
                        <CheckCircle className="w-4 h-4 text-accent" />
                        <span className="text-accent">Inscrit à une session</span>
                      </>
                    )}
                  </div>
                  
                  <Link href={`/training/${formation.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      Voir les détails
                    </Button>
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Training Lists */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upcoming Trainings */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-accent/10 p-2.5 rounded-lg">
              <Calendar className="w-5 h-5 text-accent" />
            </div>
            <h2 className="text-2xl font-semibold text-primary">Formations à venir</h2>
          </div>
          
          {upcomingTrainings.length > 0 ? (
            <div className="space-y-4">
              {upcomingTrainings.map((reg) => (
                <TrainingListItem
                  key={reg.id}
                  title={getFormationTitle(reg.formationId)}
                  status={reg.status}
                  priority={reg.priority as "P1" | "P2" | "P3"}
                  date={getSessionDate(reg.sessionId)}
                  location={getSessionLocation(reg.sessionId)}
                  onViewDetails={() => console.log("View training", reg.formationId)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center shadow-md">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-muted p-4 rounded-full">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Aucune formation à venir</p>
                  <p className="text-sm text-muted-foreground">
                    Explorez notre catalogue pour découvrir de nouvelles opportunités
                  </p>
                </div>
                <Link href="/catalog">
                  <Button variant="default" className="mt-2">
                    Parcourir le catalogue
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>

        {/* Pending Trainings */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 p-2.5 rounded-lg">
              <Clock className="w-5 h-5 text-destructive" />
            </div>
            <h2 className="text-2xl font-semibold text-primary">En attente de validation</h2>
          </div>
          
          {pendingTrainings.length > 0 ? (
            <div className="space-y-4">
              {pendingTrainings.map((reg) => (
                <TrainingListItem
                  key={reg.id}
                  title={getFormationTitle(reg.formationId)}
                  status={reg.status}
                  priority={reg.priority as "P1" | "P2" | "P3"}
                  date={getSessionDate(reg.sessionId)}
                  location={getSessionLocation(reg.sessionId)}
                  onViewDetails={() => console.log("View training", reg.formationId)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center shadow-md">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-muted p-4 rounded-full">
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Aucune demande en attente</p>
                  <p className="text-sm text-muted-foreground">
                    Vos inscriptions seront affichées ici
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Cancelled Trainings (if any) */}
      {cancelledTrainings.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 p-2.5 rounded-lg">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <h2 className="text-2xl font-semibold text-primary">Inscriptions refusées</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {cancelledTrainings.map((reg) => (
              <TrainingListItem
                key={reg.id}
                title={getFormationTitle(reg.formationId)}
                status={reg.status}
                priority={reg.priority as "P1" | "P2" | "P3"}
                date={getSessionDate(reg.sessionId)}
                location={getSessionLocation(reg.sessionId)}
                onViewDetails={() => console.log("View training", reg.formationId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
