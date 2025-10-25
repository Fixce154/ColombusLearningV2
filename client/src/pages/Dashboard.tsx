import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardStats from "@/components/DashboardStats";
import TrainingListItem from "@/components/TrainingListItem";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Calendar, XCircle, Loader2, Heart, AlertCircle, CheckCircle, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Registration, Formation, Session, FormationInterest } from "@shared/schema";

interface DashboardProps {
  currentUser: User;
}

export default function Dashboard({ currentUser: _currentUser }: DashboardProps) {
  const { toast } = useToast();
  const [deleteInterestId, setDeleteInterestId] = useState<string | null>(null);
  const [deleteRegistrationId, setDeleteRegistrationId] = useState<string | null>(null);

  // Fetch current user (to get updated quotas)
  const { data: userData } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });
  const currentUser = userData?.user || _currentUser;

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

  // Delete interest mutation
  const deleteInterestMutation = useMutation({
    mutationFn: async (interestId: string) => {
      await apiRequest(`/api/interests/${interestId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Intention annulée",
        description: "Votre intention de formation a été annulée avec succès. Vos quotas ont été remboursés.",
      });
      setDeleteInterestId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'annuler l'intention de formation",
        variant: "destructive",
      });
    },
  });

  // Delete registration mutation
  const deleteRegistrationMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      await apiRequest(`/api/registrations/${registrationId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Inscription annulée",
        description: "Votre inscription a été annulée avec succès.",
      });
      setDeleteRegistrationId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'annuler l'inscription",
        variant: "destructive",
      });
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

  const firstName = currentUser.name.split(" ")[0] || currentUser.name;
  const remainingP1 = Math.max(0, 1 - (currentUser.p1Used || 0));
  const remainingP2 = Math.max(0, 1 - (currentUser.p2Used || 0));
  const totalPriorityRemaining = Math.max(0, 2 - ((currentUser.p1Used || 0) + (currentUser.p2Used || 0)));

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="glass-panel relative overflow-hidden rounded-[2.5rem] border-white/40 px-10 py-12 shadow-[0_45px_120px_-70px_rgba(15,28,34,0.6)]">
        <div className="pointer-events-none absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-gradient-to-br from-accent/40 via-accent/20 to-transparent blur-3xl" />
        <div className="relative z-10 flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-5">
            <p className="section-subtle-title text-primary/70">Tableau de bord</p>
            <h1 className="text-4xl font-semibold tracking-tight text-primary md:text-5xl">
              Bienvenue, <span className="luxury-gradient-text">{firstName}</span>
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground/90">
              Suivez vos parcours d'apprentissage, confirmez vos intentions prioritaires et visualisez vos prochaines sessions en un coup d'œil.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/catalog">
                <Button
                  size="lg"
                  className="group gap-2 rounded-full border-0 bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold shadow-[0_20px_40px_-22px_rgba(0,49,63,0.6)] transition-all hover:shadow-[0_26px_60px_-28px_rgba(0,49,63,0.65)]"
                  data-testid="button-browse-catalog"
                >
                  <Plus className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  Parcourir le catalogue
                </Button>
              </Link>
              <span className="text-sm text-muted-foreground/80">
                Plus de 120 programmes premium disponibles cette saison.
              </span>
            </div>
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-3 rounded-3xl border border-white/40 bg-white/40 p-6 text-center text-primary shadow-[0_35px_80px_-60px_rgba(0,49,63,0.5)]">
            <div className="rounded-2xl border border-white/50 bg-white/60 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary/60">P1 restant</p>
              <p className="mt-2 text-2xl font-semibold">{remainingP1}</p>
            </div>
            <div className="rounded-2xl border border-white/50 bg-white/60 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary/60">P2 restante</p>
              <p className="mt-2 text-2xl font-semibold">{remainingP2}</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary/60">Sessions validées</p>
              <p className="mt-2 text-2xl font-semibold">{upcomingTrainings.length}</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary/60">Priorités dispo.</p>
              <p className="mt-2 text-2xl font-semibold">{totalPriorityRemaining}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <DashboardStats
        upcomingCount={upcomingTrainings.length}
        completedCount={completedTrainings.length}
        p1Used={currentUser.p1Used || 0}
        p2Used={currentUser.p2Used || 0}
      />

      {/* Formation Interests Section */}
      {interests.length > 0 && (
        <section className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/15 p-3 text-primary shadow-[0_20px_45px_-25px_rgba(0,49,63,0.45)]">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <p className="section-subtle-title text-primary/60">Intentions prioritaires</p>
                <h2 className="text-2xl font-semibold text-primary">Mes intentions de formation</h2>
              </div>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground/80">
              Priorisez vos envies pour que les équipes formation puissent planifier les sessions adaptées.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {interests.map((interest) => {
              const formation = formations.find(f => f.id === interest.formationId);
              if (!formation) return null;

              const isRejected = interest.status === "rejected";

              return (
                <Card
                  key={interest.id}
                  className={`glass-panel relative overflow-hidden rounded-2xl border-white/40 p-6 transition-transform duration-300 ${isRejected ? 'opacity-60 bg-white/60' : 'hover:-translate-y-1 hover:bg-white/85'}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className={`flex-1 font-semibold tracking-tight line-clamp-2 ${isRejected ? 'text-muted-foreground' : 'text-primary'}`}>
                        {formation.title}
                      </h3>
                      <Badge variant={interest.priority === "P1" ? "destructive" : interest.priority === "P2" ? "default" : "secondary"}>
                        {interest.priority}
                      </Badge>
                    </div>

                    <p className="text-sm leading-relaxed text-muted-foreground/90 line-clamp-3">
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
                    {interest.status === "approved" && (() => {
                      const availableSessions = sessions.filter(s => s.formationId === interest.formationId);
                      const hasAvailableSessions = availableSessions.length > 0;
                      
                      return (
                        <>
                          <CheckCircle className="w-4 h-4 text-accent" />
                          <span className="text-accent">
                            {hasAvailableSessions ? "Inscrivez-vous" : "Sessions en cours d'organisation"}
                          </span>
                        </>
                      );
                    })()}
                    {interest.status === "converted" && (
                      <>
                        <CheckCircle className="w-4 h-4 text-accent" />
                        <span className="text-accent">Inscrit à une session</span>
                      </>
                    )}
                    {interest.status === "rejected" && (
                      <>
                        <XCircle className="w-4 h-4 text-destructive" />
                        <span className="text-destructive font-medium">La demande a été rejetée</span>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!isRejected && (
                      <Link href={`/training/${formation.id}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-white/40 bg-white/20 text-primary hover:border-white/60 hover:bg-white/40"
                          data-testid={`button-view-interest-${interest.id}`}
                        >
                          Voir les détails
                        </Button>
                      </Link>
                    )}
                    {interest.status !== "converted" && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => setDeleteInterestId(interest.id)}
                        data-testid={`button-cancel-interest-${interest.id}`}
                        className={isRejected ? 'w-full' : ''}
                      >
                        <Trash2 className="w-4 h-4" />
                        {isRejected && <span className="ml-2">Supprimer</span>}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Trainings */}
      <section className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-accent/30 bg-accent/15 p-3 text-accent shadow-[0_18px_40px_-25px_rgba(0,158,203,0.55)]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="section-subtle-title text-accent/60">Sessions validées</p>
              <h2 className="text-2xl font-semibold text-primary">Formations à venir</h2>
            </div>
          </div>
          {upcomingTrainings.length > 0 && (
            <p className="text-sm text-muted-foreground/80">
              {upcomingTrainings.length} session{upcomingTrainings.length > 1 ? 's' : ''} planifiée{upcomingTrainings.length > 1 ? 's' : ''} sur votre calendrier.
            </p>
          )}
        </div>

        {upcomingTrainings.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {upcomingTrainings.map((reg) => (
              <Card key={reg.id} className="glass-panel rounded-2xl border-white/40 p-5 transition-transform duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <h3 className="text-lg font-semibold tracking-tight text-primary">{getFormationTitle(reg.formationId)}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground/90">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(getSessionDate(reg.sessionId)).toLocaleDateString('fr-FR')}</span>
                      </div>
                      {getSessionLocation(reg.sessionId) && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-2 w-2 rounded-full bg-accent" />
                          <span>{getSessionLocation(reg.sessionId)}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant={reg.priority === "P1" ? "destructive" : reg.priority === "P2" ? "default" : "secondary"}>
                      {reg.priority}
                    </Badge>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteRegistrationId(reg.id)}
                    data-testid={`button-cancel-registration-${reg.id}`}
                    className="rounded-full"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="glass-panel rounded-[1.75rem] border-white/40 p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full border border-white/50 bg-white/60 p-5 text-muted-foreground">
                <Calendar className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <p className="font-medium text-primary">Aucune formation à venir</p>
                <p className="text-sm text-muted-foreground/90">
                  Explorez notre catalogue pour découvrir de nouvelles opportunités.
                </p>
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* Cancelled Trainings (if any) */}
      {cancelledTrainings.length > 0 && (
        <section className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-destructive/30 bg-destructive/15 p-3 text-destructive shadow-[0_18px_35px_-25px_rgba(255,130,0,0.45)]">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="section-subtle-title text-destructive/70">Suivi des refus</p>
                <h2 className="text-2xl font-semibold text-primary">Inscriptions refusées</h2>
              </div>
            </div>
            <p className="text-sm text-muted-foreground/80">
              Identifiez les parcours à reprogrammer ou à re-soumettre à votre manager.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
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
        </section>
      )}

      {/* Delete Interest Confirmation Dialog */}
      <Dialog open={deleteInterestId !== null} onOpenChange={() => setDeleteInterestId(null)}>
        <DialogContent className="glass-panel rounded-3xl border-white/40 bg-white/80" data-testid="dialog-confirm-delete-interest">
          <DialogHeader>
            <DialogTitle className="text-destructive">Annuler votre intention de formation ?</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Êtes-vous sûr de vouloir annuler cette intention de formation ? 
              {deleteInterestId && (() => {
                const interest = interests.find(i => i.id === deleteInterestId);
                if (interest && (interest.priority === "P1" || interest.priority === "P2")) {
                  return (
                    <strong className="block mt-2">
                      Votre quota {interest.priority} vous sera remboursé.
                    </strong>
                  );
                }
                return null;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setDeleteInterestId(null)}
              disabled={deleteInterestMutation.isPending}
              data-testid="button-cancel-delete-interest"
            >
              Non, garder
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteInterestId && deleteInterestMutation.mutate(deleteInterestId)}
              disabled={deleteInterestMutation.isPending}
              data-testid="button-confirm-delete-interest"
            >
              {deleteInterestMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Annulation...
                </>
              ) : (
                "Oui, annuler"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Registration Confirmation Dialog */}
      <Dialog open={deleteRegistrationId !== null} onOpenChange={() => setDeleteRegistrationId(null)}>
        <DialogContent className="glass-panel rounded-3xl border-white/40 bg-white/80" data-testid="dialog-confirm-delete-registration">
          <DialogHeader>
            <DialogTitle className="text-destructive">Annuler votre inscription ?</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Êtes-vous sûr de vouloir annuler votre inscription à cette session ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setDeleteRegistrationId(null)}
              disabled={deleteRegistrationMutation.isPending}
              data-testid="button-cancel-delete-registration"
            >
              Non, garder
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteRegistrationId && deleteRegistrationMutation.mutate(deleteRegistrationId)}
              disabled={deleteRegistrationMutation.isPending}
              data-testid="button-confirm-delete-registration"
            >
              {deleteRegistrationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Annulation...
                </>
              ) : (
                "Oui, annuler"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
