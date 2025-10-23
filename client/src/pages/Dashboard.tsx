import { useState } from "react";
import DashboardStats from "@/components/DashboardStats";
import TrainingListItem from "@/components/TrainingListItem";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Bienvenue, {currentUser.name}</h1>
          <p className="text-muted-foreground mt-1">Gérez vos formations et suivez votre progression</p>
        </div>
        <Link href="/catalog">
          <Button data-testid="button-browse-catalog">
            <Plus className="w-4 h-4 mr-2" />
            Parcourir le catalogue
          </Button>
        </Link>
      </div>

      <DashboardStats
        upcomingCount={upcomingTrainings.length}
        pendingCount={pendingTrainings.length}
        completedCount={completedTrainings.length}
        p1Used={currentUser.p1Used || 0}
        p2Used={currentUser.p2Used || 0}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Formations à venir</h2>
          {upcomingTrainings.length > 0 ? (
            <div className="space-y-3">
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
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucune formation à venir</p>
              <Link href="/catalog">
                <Button variant="ghost" className="mt-2">
                  Parcourir le catalogue
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">En attente de validation</h2>
          {pendingTrainings.length > 0 ? (
            <div className="space-y-3">
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
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucune demande en attente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
