import DashboardStats from "@/components/DashboardStats";
import TrainingListItem from "@/components/TrainingListItem";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Calendar, Clock } from "lucide-react";
import { Link } from "wouter";
import type { User } from "@shared/schema";
import { mockFormations, mockSessions, mockRegistrations } from "@/lib/mockData";

interface DashboardProps {
  currentUser: User;
}

export default function Dashboard({ currentUser }: DashboardProps) {
  // TODO: remove mock functionality - Get user's registrations
  const userRegistrations = mockRegistrations.filter((r) => r.userId === currentUser.id);

  const upcomingTrainings = userRegistrations.filter((r) => {
    if (r.status !== "validated") return false;
    const session = mockSessions.find((s) => s.id === r.sessionId);
    return session && session.startDate > new Date();
  });

  const pendingTrainings = userRegistrations.filter((r) => r.status === "pending");
  const completedTrainings = userRegistrations.filter((r) => r.status === "completed");

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
              {upcomingTrainings.map((reg) => {
                const session = mockSessions.find((s) => s.id === reg.sessionId);
                const formation = mockFormations.find((f) => f.id === reg.formationId);
                if (!session || !formation) return null;

                return (
                  <TrainingListItem
                    key={reg.id}
                    title={formation.title}
                    status={reg.status}
                    priority={reg.priority as "P1" | "P2" | "P3"}
                    date={session.startDate}
                    location={session.location || ""}
                    onViewDetails={() => console.log("View training", formation.id)}
                  />
                );
              })}
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
              {pendingTrainings.map((reg) => {
                const session = mockSessions.find((s) => s.id === reg.sessionId);
                const formation = mockFormations.find((f) => f.id === reg.formationId);
                if (!session || !formation) return null;

                return (
                  <TrainingListItem
                    key={reg.id}
                    title={formation.title}
                    status={reg.status}
                    priority={reg.priority as "P1" | "P2" | "P3"}
                    date={session.startDate}
                    location={session.location || ""}
                    onViewDetails={() => console.log("View training", formation.id)}
                  />
                );
              })}
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
    </div>
  );
}
