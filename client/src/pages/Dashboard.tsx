import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardStats from "@/components/DashboardStats";
import TrainingListItem from "@/components/TrainingListItem";
import DashboardInformationCard from "@/components/DashboardInformationCard";
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
import {
  Calendar,
  XCircle,
  Loader2,
  Heart,
  AlertCircle,
  CheckCircle,
  Trash2,
  UserCircle,
} from "lucide-react";
import { Link } from "wouter";
import { useMemo, useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRouteNotifications, useMarkNotificationsRead } from "@/hooks/use-notifications";
import type {
  User,
  Registration,
  Formation,
  Session,
  FormationInterest,
  DashboardInformationSettings,
} from "@shared/schema";
import { DEFAULT_DASHBOARD_INFORMATION } from "@shared/schema";
import type { AuthMeResponse, SanitizedUser } from "@/types/api";

type CoachInfo = Omit<User, "password">;

interface DashboardProps {
  currentUser: User;
  initialCoach?: SanitizedUser | null;
}

export default function Dashboard({ currentUser: _currentUser, initialCoach = null }: DashboardProps) {
  const { toast } = useToast();
  const [deleteInterestId, setDeleteInterestId] = useState<string | null>(null);
  const [deleteRegistrationId, setDeleteRegistrationId] = useState<string | null>(null);

  const { data: userData } = useQuery<AuthMeResponse>({
    queryKey: ["/api/auth/me"],
  });
  const currentUser = userData?.user || _currentUser;
  const primaryCoach = userData?.coach ?? userData?.coaches?.[0] ?? initialCoach;

  const { data: interests = [], isLoading: isLoadingInterests } = useQuery<FormationInterest[]>({
    queryKey: ["/api/interests"],
  });

  const { data: registrations = [], isLoading: isLoadingRegistrations } = useQuery<Registration[]>({
    queryKey: ["/api/registrations"],
  });

  const { data: formations = [] } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
  });

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const res = await fetch("/api/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  const { data: dashboardInformationSettings } = useQuery<DashboardInformationSettings>({
    queryKey: ["/api/settings/dashboard-information"],
  });

  const dashboardNotificationsQuery = useRouteNotifications("/");
  const dashboardNotifications = dashboardNotificationsQuery.notifications ?? [];
  const dashboardUnread = dashboardNotificationsQuery.unreadCount ?? 0;
  const unreadDashboardNotifications = useMemo(
    () => dashboardNotifications.filter((notification) => !notification.read),
    [dashboardNotifications]
  );
  const markDashboardNotificationsRead = useMarkNotificationsRead();
  const notificationDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );
  const formatNotificationDate = (isoDate: string) =>
    notificationDateFormatter.format(new Date(isoDate));

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

  if (isLoadingRegistrations || isLoadingInterests) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
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
    return formations.find((f) => f.id === formationId)?.title || "Formation inconnue";
  };

  const getSessionDate = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    return session ? new Date(session.startDate) : new Date();
  };

  const getSessionLocation = (sessionId: string) => {
    return sessions.find((s) => s.id === sessionId)?.location || "";
  };

  const firstName = currentUser.name.split(" ")[0] || currentUser.name;
  const dashboardInformation =
    dashboardInformationSettings ?? DEFAULT_DASHBOARD_INFORMATION;
  const showDashboardInformation =
    dashboardInformation.enabled &&
    dashboardInformation.title.trim().length > 0 &&
    dashboardInformation.body.trim().length > 0;

  return (
    <div className="space-y-12">
      <section className="surface-elevated relative overflow-hidden rounded-[2rem] px-12 py-14">
        <div className="pointer-events-none absolute inset-y-8 right-0 hidden w-72 rounded-l-[32px] bg-[radial-gradient(circle_at_center,rgba(10,132,255,0.12),transparent_60%)] md:block" />
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow text-muted-foreground">Tableau de bord</p>
              {dashboardUnread > 0 ? (
                <Badge variant="destructive" className="rounded-full px-3 py-1 text-[0.7rem]">
                  {dashboardUnread} nouveauté{dashboardUnread > 1 ? "s" : ""}
                </Badge>
              ) : null}
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">Bonjour {firstName}</h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              L'outil "Made in Colombus" pour gérer votre parcours de formation
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/40 bg-white/80 px-5 py-4 text-[#00313F] shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#00313F]/70">
                      Coach référent
                    </p>
                    <p className="text-base font-semibold text-[#00313F]">
                      {primaryCoach ? primaryCoach.name : "En attente d'assignation"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex w-full max-w-md flex-col gap-5">
            {showDashboardInformation ? (
              <DashboardInformationCard settings={dashboardInformation} />
            ) : null}
            {unreadDashboardNotifications.length > 0 ? (
              <div className="rounded-2xl border border-primary/10 bg-white/80 p-5 text-[#00313F] shadow-sm backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Nouveautés pour vous</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs text-[#00313F]"
                    onClick={() => markDashboardNotificationsRead.mutate({ route: "/" })}
                    disabled={markDashboardNotificationsRead.isPending || dashboardUnread === 0}
                  >
                    {markDashboardNotificationsRead.isPending ? "Traitement..." : "Marquer comme lues"}
                  </Button>
                </div>
                <ul className="mt-4 space-y-2">
                  {unreadDashboardNotifications.slice(0, 3).map((notification) => (
                    <li key={notification.id} className="flex items-start gap-3 text-sm">
                      <span className="mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium text-[#00313F]">{notification.title}</p>
                        {notification.message ? (
                          <p className="text-sm text-[#00313F]/75">{notification.message}</p>
                        ) : null}
                        <p className="text-xs text-[#00313F]/60">
                          {formatNotificationDate(notification.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                {unreadDashboardNotifications.length > 3 ? (
                  <p className="mt-3 text-xs text-[#00313F]/60">
                    {unreadDashboardNotifications.length - 3} notification(s) supplémentaires en attente.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <DashboardStats
        upcomingCount={upcomingTrainings.length}
        completedCount={completedTrainings.length}
        p1Used={currentUser.p1Used || 0}
        p2Used={currentUser.p2Used || 0}
      />

      {interests.length > 0 && (
        <section className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <p className="eyebrow text-muted-foreground">Intentions prioritaires</p>
                <h2 className="text-2xl font-semibold text-foreground">Mes intentions de formation</h2>
              </div>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Priorisez vos envies pour que les équipes formation puissent planifier les sessions adaptées.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {interests.map((interest) => {
              const formation = formations.find((f) => f.id === interest.formationId);
              if (!formation) return null;

              const isRejected = interest.status === "rejected";

              return (
                <Card
                  key={interest.id}
                  className={`surface-soft flex h-full flex-col rounded-2xl p-6 transition-transform duration-300 ${isRejected ? 'opacity-70' : 'hover:-translate-y-1'}`}
                >
                  <div className="flex flex-1 flex-col space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3
                        title={formation.title}
                        className={`flex-1 text-base font-semibold tracking-tight leading-snug line-clamp-2 min-h-[3.25rem] ${isRejected ? 'text-muted-foreground' : 'text-foreground'}`}
                      >
                        {formation.title}
                      </h3>
                      <Badge variant={interest.priority === "P1" ? "destructive" : interest.priority === "P2" ? "default" : "secondary"}>
                        {interest.priority}
                      </Badge>
                    </div>

                    <p
                      title={formation.description}
                      className="text-sm leading-relaxed text-muted-foreground line-clamp-2 min-h-[3.3rem]"
                    >
                      {formation.description}
                    </p>

                    <div className="flex min-h-[1.5rem] items-center gap-2 text-sm">
                      {interest.status === "pending" && (
                        <>
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          <span className="text-amber-600">En attente d'organisation</span>
                        </>
                      )}
                      {interest.status === "approved" && (() => {
                        const availableSessions = sessions.filter((s) => s.formationId === interest.formationId);
                        const hasAvailableSessions = availableSessions.length > 0;

                        return (
                          <>
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span className="text-primary">
                              {hasAvailableSessions ? "Inscrivez-vous" : "Sessions en cours d'organisation"}
                            </span>
                          </>
                        );
                      })()}
                      {interest.status === "converted" && (
                        <>
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span className="text-primary">Inscrit à une session</span>
                        </>
                      )}
                      {interest.status === "rejected" && (
                        <>
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-destructive">La demande a été rejetée</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    {!isRejected && (
                      <Link href={`/training/${formation.id}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-lg border border-black/10 bg-white text-sm font-medium text-foreground hover:border-primary/20 hover:text-primary"
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
                        className={`rounded-lg${isRejected ? ' w-full' : ''}`}
                      >
                        <Trash2 className="h-4 w-4" />
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

      <section className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-foreground">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="eyebrow text-muted-foreground">Sessions validées</p>
              <h2 className="text-2xl font-semibold text-foreground">Formations à venir</h2>
            </div>
          </div>
          {upcomingTrainings.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {upcomingTrainings.length} session{upcomingTrainings.length > 1 ? "s" : ""} planifiée{upcomingTrainings.length > 1 ? "s" : ""} sur votre calendrier.
            </p>
          )}
        </div>

        {upcomingTrainings.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {upcomingTrainings.map((reg) => (
              <Card key={reg.id} className="surface-soft rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{getFormationTitle(reg.formationId)}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(getSessionDate(reg.sessionId)).toLocaleDateString("fr-FR")}</span>
                      </div>
                      {getSessionLocation(reg.sessionId) && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
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
                    className="rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="surface-tonal rounded-2xl p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-muted-foreground shadow-sm">
                <Calendar className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <p className="font-medium text-foreground">Aucune formation à venir</p>
                <p className="text-sm text-muted-foreground">
                  Explorez notre catalogue pour découvrir de nouvelles opportunités.
                </p>
              </div>
            </div>
          </Card>
        )}
      </section>

      {cancelledTrainings.length > 0 && (
        <section className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="eyebrow text-muted-foreground">Suivi des refus</p>
                <h2 className="text-2xl font-semibold text-foreground">Inscriptions refusées</h2>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
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

      <Dialog open={deleteInterestId !== null} onOpenChange={() => setDeleteInterestId(null)}>
        <DialogContent className="surface-soft rounded-2xl border-black/5 bg-white" data-testid="dialog-confirm-delete-interest">
          <DialogHeader>
            <DialogTitle className="text-destructive">Annuler votre intention de formation ?</DialogTitle>
            <DialogDescription className="pt-2 text-base">
              Êtes-vous sûr de vouloir annuler cette intention de formation ?
              {deleteInterestId && (() => {
                const interest = interests.find((i) => i.id === deleteInterestId);
                if (interest && (interest.priority === "P1" || interest.priority === "P2")) {
                  return (
                    <strong className="mt-2 block">
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Annulation...
                </>
              ) : (
                "Oui, annuler"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteRegistrationId !== null} onOpenChange={() => setDeleteRegistrationId(null)}>
        <DialogContent className="surface-soft rounded-2xl border-black/5 bg-white" data-testid="dialog-confirm-delete-registration">
          <DialogHeader>
            <DialogTitle className="text-destructive">Annuler votre inscription ?</DialogTitle>
            <DialogDescription className="pt-2 text-base">
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
