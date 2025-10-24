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
import { Plus, Calendar, Clock, XCircle, Loader2, Heart, AlertCircle, CheckCircle, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Registration, Formation, Session, FormationInterest } from "@shared/schema";

interface DashboardProps {
  currentUser: User;
}

export default function Dashboard({ currentUser }: DashboardProps) {
  const { toast } = useToast();
  const [deleteInterestId, setDeleteInterestId] = useState<string | null>(null);
  const [deleteRegistrationId, setDeleteRegistrationId] = useState<string | null>(null);

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
                  
                  <div className="flex gap-2">
                    <Link href={`/training/${formation.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-interest-${interest.id}`}>
                        Voir les détails
                      </Button>
                    </Link>
                    {interest.status !== "converted" && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => setDeleteInterestId(interest.id)}
                        data-testid={`button-cancel-interest-${interest.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
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
                <Card key={reg.id} className="p-4 shadow-md hover-elevate">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-primary">{getFormationTitle(reg.formationId)}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(getSessionDate(reg.sessionId)).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {getSessionLocation(reg.sessionId) && (
                          <span>{getSessionLocation(reg.sessionId)}</span>
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
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
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
                <Card key={reg.id} className="p-4 shadow-md hover-elevate">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-primary">{getFormationTitle(reg.formationId)}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(getSessionDate(reg.sessionId)).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {getSessionLocation(reg.sessionId) && (
                          <span>{getSessionLocation(reg.sessionId)}</span>
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
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
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

      {/* Delete Interest Confirmation Dialog */}
      <Dialog open={deleteInterestId !== null} onOpenChange={() => setDeleteInterestId(null)}>
        <DialogContent data-testid="dialog-confirm-delete-interest">
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
        <DialogContent data-testid="dialog-confirm-delete-registration">
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
