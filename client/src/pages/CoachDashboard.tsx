import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Calendar,
  Target,
  GraduationCap,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PriorityBadge from "@/components/PriorityBadge";
import { cn } from "@/lib/utils";
import type {
  User,
  FormationInterest,
  Registration,
  CoachAssignment,
  Formation,
  Session,
} from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type PublicUser = Omit<User, "password">;

interface CoachOverviewResponse {
  assignments: CoachAssignment[];
  coachees: PublicUser[];
  interests: FormationInterest[];
  registrations: Registration[];
  collaborators: PublicUser[];
  collaboratorInterests: FormationInterest[];
  collaboratorRegistrations: Registration[];
  settings: {
    coachValidationOnly: boolean;
  };
}

interface CoachDashboardProps {
  currentUser: User;
}

export default function CoachDashboard({ currentUser }: CoachDashboardProps) {
  const { toast } = useToast();
  const [selectedCoacheeId, setSelectedCoacheeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"coachees" | "collaborators">("coachees");
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);

  const { data: overview, isLoading } = useQuery<CoachOverviewResponse>({
    queryKey: ["/api/coach/overview"],
    queryFn: async () => {
      const res = await fetch("/api/coach/overview", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch coach overview");
      return res.json();
    },
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: formations = [] } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
  });

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const approveMutation = useMutation({
    mutationFn: async (interestId: string) => {
      return apiRequest(`/api/coach/interests/${interestId}/approve`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/overview"] });
      toast({
        title: "Intention validée",
        description: "Votre validation a été enregistrée.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de valider l'intention",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (interestId: string) => {
      return apiRequest(`/api/coach/interests/${interestId}/reject`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/overview"] });
      toast({
        title: "Intention refusée",
        description: "Le consultant a été informé de votre décision.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de refuser l'intention",
      });
    },
  });

  const coachees = overview?.coachees ?? [];
  const interests = useMemo(() => {
    return (overview?.interests ?? []).map((interest) => ({
      ...interest,
      coachStatus: interest.coachStatus ?? "pending",
    }));
  }, [overview?.interests]);
  const registrations = overview?.registrations ?? [];
  const collaborators = overview?.collaborators ?? [];
  const collaboratorInterests = useMemo(() => {
    return (overview?.collaboratorInterests ?? []).map((interest) => ({
      ...interest,
      coachStatus: interest.coachStatus ?? "pending",
    }));
  }, [overview?.collaboratorInterests]);
  const collaboratorRegistrations = overview?.collaboratorRegistrations ?? [];
  const coachValidationOnly = overview?.settings.coachValidationOnly ?? false;

  const filteredCoachees = useMemo(() => {
    if (!selectedCoacheeId) {
      return coachees;
    }
    return coachees.filter((coachee) => coachee.id === selectedCoacheeId);
  }, [coachees, selectedCoacheeId]);

  const coacheeMap = useMemo(() => {
    const map = new Map<string, PublicUser>();
    coachees.forEach((coachee) => map.set(coachee.id, coachee));
    return map;
  }, [coachees]);

  const collaboratorMap = useMemo(() => {
    const map = new Map<string, PublicUser>();
    collaborators.forEach((collaborator) => map.set(collaborator.id, collaborator));
    return map;
  }, [collaborators]);

  const selectedCoachee = selectedCoacheeId ? coacheeMap.get(selectedCoacheeId) ?? null : null;
  const selectedCollaborator = selectedCollaboratorId
    ? collaboratorMap.get(selectedCollaboratorId) ?? null
    : null;

  const filteredInterests = useMemo(() => {
    if (!selectedCoacheeId) {
      return interests;
    }
    return interests.filter((interest) => interest.userId === selectedCoacheeId);
  }, [interests, selectedCoacheeId]);

  const filteredRegistrations = useMemo(() => {
    if (!selectedCoacheeId) {
      return registrations;
    }
    return registrations.filter((registration) => registration.userId === selectedCoacheeId);
  }, [registrations, selectedCoacheeId]);

  const formationMap = useMemo(() => {
    const map = new Map<string, Formation>();
    formations.forEach((formation) => map.set(formation.id, formation));
    return map;
  }, [formations]);

  const sessionMap = useMemo(() => {
    const map = new Map<string, Session>();
    sessions.forEach((session) => map.set(session.id, session));
    return map;
  }, [sessions]);

  const collaboratorInterestMap = useMemo(() => {
    const map = new Map<string, FormationInterest[]>();
    collaboratorInterests.forEach((interest) => {
      const existing = map.get(interest.userId);
      if (existing) {
        existing.push(interest);
      } else {
        map.set(interest.userId, [interest]);
      }
    });
    return map;
  }, [collaboratorInterests]);

  const collaboratorRegistrationMap = useMemo(() => {
    const map = new Map<string, Registration[]>();
    collaboratorRegistrations.forEach((registration) => {
      const existing = map.get(registration.userId);
      if (existing) {
        existing.push(registration);
      } else {
        map.set(registration.userId, [registration]);
      }
    });
    return map;
  }, [collaboratorRegistrations]);

  const selectedCollaboratorInterests = useMemo(() => {
    if (!selectedCollaboratorId) {
      return [];
    }
    return collaboratorInterests.filter((interest) => interest.userId === selectedCollaboratorId);
  }, [collaboratorInterests, selectedCollaboratorId]);

  const selectedCollaboratorRegistrations = useMemo(() => {
    if (!selectedCollaboratorId) {
      return [];
    }
    return collaboratorRegistrations.filter((registration) => registration.userId === selectedCollaboratorId);
  }, [collaboratorRegistrations, selectedCollaboratorId]);

  const selectedCollaboratorMeta = useMemo(() => {
    if (!selectedCollaborator) {
      return "";
    }
    return [selectedCollaborator.email, selectedCollaborator.businessUnit]
      .filter(Boolean)
      .join(" • ");
  }, [selectedCollaborator]);

  const selectedCollaboratorActiveCount = useMemo(() => {
    return selectedCollaboratorInterests.filter(
      (interest) => interest.status !== "rejected" && interest.status !== "withdrawn"
    ).length;
  }, [selectedCollaboratorInterests]);

  const selectedCollaboratorCompletedCount = useMemo(() => {
    return selectedCollaboratorRegistrations.filter((registration) => registration.status === "completed").length;
  }, [selectedCollaboratorRegistrations]);

  const collaboratorSummaries = useMemo(() => {
    const getTimestamp = (registration: Registration) => {
      const session = sessionMap.get(registration.sessionId);
      const sessionDate = session?.startDate ? new Date(session.startDate).getTime() : NaN;
      if (!Number.isNaN(sessionDate)) {
        return sessionDate;
      }
      const registeredDate = registration.registeredAt
        ? new Date(registration.registeredAt).getTime()
        : NaN;
      return Number.isNaN(registeredDate) ? 0 : registeredDate;
    };

    return collaborators.map((collaborator) => {
      const interestsForUser = collaboratorInterestMap.get(collaborator.id) ?? [];
      const activeInterests = interestsForUser.filter(
        (interest) => interest.status !== "rejected" && interest.status !== "withdrawn"
      );
      const registrationsForUser = collaboratorRegistrationMap.get(collaborator.id) ?? [];
      const completedRegistrationsForUser = registrationsForUser.filter(
        (registration) => registration.status === "completed"
      );
      const sortedByActivity = [...registrationsForUser].sort(
        (a, b) => getTimestamp(b) - getTimestamp(a)
      );
      const latestRegistration =
        sortedByActivity.find((registration) => registration.status !== "cancelled") ??
        sortedByActivity[0] ??
        null;
      const latestSession = latestRegistration
        ? sessionMap.get(latestRegistration.sessionId)
        : undefined;
      const latestFormation = latestRegistration
        ? formationMap.get(latestRegistration.formationId)
        : undefined;

      return {
        collaborator,
        activeInterestsCount: activeInterests.length,
        completedCount: completedRegistrationsForUser.length,
        latestRegistration,
        latestSession,
        latestFormation,
      };
    });
  }, [
    collaborators,
    collaboratorInterestMap,
    collaboratorRegistrationMap,
    formationMap,
    sessionMap,
  ]);

  const collaboratorRegistrationsWithContext = useMemo(() => {
    const getTimestamp = (registration: Registration, session?: Session) => {
      const sessionDate = session?.startDate ? new Date(session.startDate).getTime() : NaN;
      if (!Number.isNaN(sessionDate)) {
        return sessionDate;
      }
      const registeredDate = registration.registeredAt
        ? new Date(registration.registeredAt).getTime()
        : NaN;
      return Number.isNaN(registeredDate) ? 0 : registeredDate;
    };

    return collaboratorRegistrations
      .map((registration) => {
        const collaborator = collaboratorMap.get(registration.userId) ?? null;
        const session = sessionMap.get(registration.sessionId);
        const formation = formationMap.get(registration.formationId);
        return { registration, collaborator, session, formation };
      })
      .sort((a, b) => getTimestamp(b.registration, b.session) - getTimestamp(a.registration, a.session));
  }, [
    collaboratorRegistrations,
    collaboratorMap,
    formationMap,
    sessionMap,
  ]);

  const totalCollaboratorActiveInterests = useMemo(() => {
    return collaboratorInterests.filter(
      (interest) => interest.status !== "rejected" && interest.status !== "withdrawn"
    ).length;
  }, [collaboratorInterests]);

  const totalCollaboratorCompletedFormations = useMemo(() => {
    return collaboratorRegistrations.filter((registration) => registration.status === "completed")
      .length;
  }, [collaboratorRegistrations]);

  const pendingCoach = filteredInterests.filter(
    (interest) => interest.status === "pending" && interest.coachStatus === "pending"
  );
  const awaitingRh = filteredInterests.filter(
    (interest) => interest.status === "pending" && interest.coachStatus === "approved"
  );
  const approvedInterests = filteredInterests.filter((interest) => interest.status === "approved");

  const completedRegistrations = filteredRegistrations.filter(
    (registration) => registration.status === "completed"
  );

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate(id);
  };

  const formatDate = (value?: string | Date | null) => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    return format(date, "dd MMM yyyy", { locale: fr });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement de vos coachés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section className="surface-elevated relative overflow-hidden rounded-[2rem] px-12 py-14">
        <div className="pointer-events-none absolute inset-y-8 right-0 hidden w-72 rounded-l-[32px] bg-[radial-gradient(circle_at_center,rgba(10,132,255,0.12),transparent_60%)] md:block" />
        <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="eyebrow text-muted-foreground">Espace coach</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              {activeTab === "collaborators" ? "Collaborateurs par séniorité" : "Suivi de mes coachés"}
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              {activeTab === "collaborators"
                ? "Accédez à l'ensemble des collaborateurs dont la séniorité est inférieure à la vôtre pour suivre leurs parcours de formation."
                : "Visualisez les intentions de formation de vos coachés et accompagnez-les dans leurs démarches."}
            </p>
          </div>
          <div className="rounded-2xl border border-white/40 bg-white/80 p-5 text-[#00313F] shadow-sm backdrop-blur">
            <p className="text-sm font-semibold">Coach</p>
            <p className="text-2xl font-bold">{currentUser.name}</p>
            <p className="text-xs text-[#00313F]/70">
              {activeTab === "collaborators"
                ? selectedCollaborator
                  ? `${selectedCollaborator.name} sélectionné`
                  : `${collaborators.length} collaborateur${collaborators.length > 1 ? "s" : ""} éligible${
                      collaborators.length > 1 ? "s" : ""
                    }`
                : selectedCoachee
                ? `${selectedCoachee.name} sélectionné`
                : `${coachees.length} coaché${coachees.length > 1 ? "s" : ""} suivis`}
            </p>
          </div>
        </div>
      </section>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const nextValue = value as "coachees" | "collaborators";
          setActiveTab(nextValue);
          if (nextValue === "coachees") {
            setSelectedCollaboratorId(null);
          } else {
            setSelectedCoacheeId(null);
          }
        }}
        className="space-y-10"
      >
        <TabsList className="inline-flex h-11 items-center gap-2 rounded-full bg-muted/40 p-1">
          <TabsTrigger
            value="coachees"
            className="rounded-full px-4 py-2 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Mes coachés
          </TabsTrigger>
          <TabsTrigger
            value="collaborators"
            className="rounded-full px-4 py-2 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Collaborateurs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coachees" className="space-y-12 pt-6">
          <section className="space-y-4">
            <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold text-primary">Mes coachés</h2>
                    <p className="text-sm text-muted-foreground">
                      Retrouvez la liste des collaborateurs que vous accompagnez au quotidien.
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="w-fit">
                  {selectedCoachee
                    ? "1 coaché sélectionné"
                    : `${coachees.length} coaché${coachees.length > 1 ? "s" : ""}`}
                </Badge>
              </div>
              {selectedCoachee && (
                <div className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  <span>
                    Affichage des données pour <span className="font-medium text-foreground">{selectedCoachee.name}</span>.
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCoacheeId(null)}>
                    Réinitialiser
                  </Button>
                </div>
              )}
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coaché</TableHead>
                      <TableHead>Séniorité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coachees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                          Aucun coaché ne vous est encore assigné.
                        </TableCell>
                      </TableRow>
                    ) : (
                      coachees.map((coachee) => (
                        <TableRow
                          key={coachee.id}
                          onClick={() =>
                            setSelectedCoacheeId((current) => (current === coachee.id ? null : coachee.id))
                          }
                          className={cn(
                            "cursor-pointer transition-colors",
                            selectedCoacheeId === coachee.id && "bg-primary/5 hover:bg-primary/10",
                            selectedCoacheeId !== coachee.id && "hover:bg-muted/40"
                          )}
                        >
                          <TableCell>
                            <div className="font-medium">{coachee.name}</div>
                            <div className="text-xs text-muted-foreground">{coachee.email}</div>
                          </TableCell>
                          <TableCell>{coachee.seniority || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Coachés actifs</p>
                <p className="text-3xl font-semibold text-foreground">{filteredCoachees.length}</p>
              </div>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
            </Card>

            <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Intentions à valider</p>
                <p className="text-3xl font-semibold text-foreground">{pendingCoach.length}</p>
              </div>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600">
                <Clock className="h-6 w-6" />
              </div>
            </Card>

            <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Formations terminées</p>
                <p className="text-3xl font-semibold text-foreground">{completedRegistrations.length}</p>
              </div>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-700">
                <CheckCircle className="h-6 w-6" />
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-primary">Intentions à valider</h2>
                    <p className="text-sm text-muted-foreground">
                      Validez ou refusez les demandes de vos coachés. {coachValidationOnly
                        ? "Votre validation suffit pour finaliser l'intention."
                        : "Une fois validée, l'intention sera transmise aux RH."}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coaché</TableHead>
                      <TableHead>Formation</TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCoach.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          Aucune intention en attente de votre validation.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingCoach.map((interest) => {
                        const coachee = coacheeMap.get(interest.userId);
                        const formation = interest.formationId
                          ? formationMap.get(interest.formationId)
                          : undefined;
                        const isOffCatalog = !interest.formationId;
                        const formationTitle = isOffCatalog
                          ? interest.customTitle ?? "Formation hors catalogue"
                          : formation?.title ?? "Formation inconnue";
                        const formationDescription = isOffCatalog
                          ? interest.customDescription ?? ""
                          : formation?.description ?? "";
                        return (
                          <TableRow key={interest.id}>
                            <TableCell>
                              <div className="font-medium">{coachee?.name ?? "Consultant inconnu"}</div>
                              <div className="text-xs text-muted-foreground">{coachee?.businessUnit || ""}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{formationTitle}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{formationDescription}</div>
                            </TableCell>
                            <TableCell>
                              <PriorityBadge priority={interest.priority as "P1" | "P2" | "P3"} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(interest.expressedAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApprove(interest.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  Valider
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(interest.id)}
                                  disabled={rejectMutation.isPending}
                                >
                                  <XCircle className="mr-1 h-4 w-4" />
                                  Refuser
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </section>

          {!coachValidationOnly && (
            <section className="space-y-4">
              <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-primary">Intentions en attente RH</h2>
                    <p className="text-sm text-muted-foreground">
                      Ces intentions ont été validées par vous et attendent désormais le traitement RH.
                    </p>
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Coaché</TableHead>
                        <TableHead>Formation</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {awaitingRh.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                            Aucune intention en attente de validation RH.
                          </TableCell>
                        </TableRow>
                      ) : (
                        awaitingRh.map((interest) => {
                          const coachee = coacheeMap.get(interest.userId);
                          const formation = interest.formationId
                            ? formationMap.get(interest.formationId)
                            : undefined;
                          const isOffCatalog = !interest.formationId;
                          const formationTitle = isOffCatalog
                            ? interest.customTitle ?? "Formation hors catalogue"
                            : formation?.title ?? "Formation inconnue";
                          return (
                            <TableRow key={interest.id}>
                              <TableCell>{coachee?.name ?? "Consultant inconnu"}</TableCell>
                              <TableCell>{formationTitle}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{formatDate(interest.expressedAt)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </section>
          )}

          <section className="space-y-4">
            <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <div>
                  <h2 className="text-xl font-semibold text-primary">Intentions validées</h2>
                  <p className="text-sm text-muted-foreground">
                    Historique des intentions déjà approuvées pour vos coachés.
                  </p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coaché</TableHead>
                      <TableHead>Formation</TableHead>
                      <TableHead>Date de validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedInterests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                          Aucune intention validée pour le moment.
                        </TableCell>
                      </TableRow>
                    ) : (
                      approvedInterests.map((interest) => {
                        const coachee = coacheeMap.get(interest.userId);
                        const formation = interest.formationId
                          ? formationMap.get(interest.formationId)
                          : undefined;
                        const isOffCatalog = !interest.formationId;
                        const formationTitle = isOffCatalog
                          ? interest.customTitle ?? "Formation hors catalogue"
                          : formation?.title ?? "Formation inconnue";
                        return (
                          <TableRow key={interest.id}>
                            <TableCell>{coachee?.name ?? "Consultant inconnu"}</TableCell>
                            <TableCell>{formationTitle}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(interest.coachValidatedAt)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold text-primary">Formations suivies</h2>
                  <p className="text-sm text-muted-foreground">
                    Dernières formations suivies par vos coachés.
                  </p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coaché</TableHead>
                      <TableHead>Formation</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistrations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                          Aucune formation suivie pour l'instant.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRegistrations.map((registration) => {
                        const coachee = coacheeMap.get(registration.userId);
                        const session = sessionMap.get(registration.sessionId);
                        const formation = formationMap.get(registration.formationId);
                        return (
                          <TableRow key={registration.id}>
                            <TableCell>{coachee?.name ?? "Consultant inconnu"}</TableCell>
                            <TableCell>{formation?.title ?? "Formation inconnue"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {session
                                ? `${formatDate(session.startDate)} • ${session.location || "Lieu à venir"}`
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={registration.status === "completed" ? "secondary" : "outline"}>
                                {registration.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="collaborators" className="space-y-12 pt-6">
          <section className="grid gap-6 md:grid-cols-3">
            <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Collaborateurs éligibles</p>
                <p className="text-3xl font-semibold text-foreground">{collaborators.length}</p>
              </div>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
            </Card>

            <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Intentions actives</p>
                <p className="text-3xl font-semibold text-foreground">{totalCollaboratorActiveInterests}</p>
              </div>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                <Target className="h-6 w-6" />
              </div>
            </Card>

            <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Formations terminées</p>
                <p className="text-3xl font-semibold text-foreground">{totalCollaboratorCompletedFormations}</p>
              </div>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <GraduationCap className="h-6 w-6" />
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-primary">Collaborateurs à accompagner</h2>
                  <p className="text-sm text-muted-foreground">
                    Ordre de séniorité : Alternant &lt; Junior &lt; Senior &lt; Supervising Senior &lt; Manager &lt; Senior Manager &lt; Directeur &lt; Partner &lt; Senior Partner.
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit">
                  {`${collaborators.length} collaborateur${collaborators.length > 1 ? "s" : ""}`}
                </Badge>
              </div>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collaborateur</TableHead>
                      <TableHead>Séniorité</TableHead>
                      <TableHead>Intentions actives</TableHead>
                      <TableHead>Formations terminées</TableHead>
                      <TableHead>Dernière activité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collaboratorSummaries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                          Aucun collaborateur de séniorité inférieure trouvé.
                        </TableCell>
                      </TableRow>
                    ) : (
                      collaboratorSummaries.map(
                        ({
                          collaborator,
                          activeInterestsCount,
                          completedCount,
                          latestRegistration,
                          latestFormation,
                          latestSession,
                        }) => {
                          const lastActivityDate = latestSession?.startDate ?? latestRegistration?.registeredAt ?? null;
                          const activityLabel = latestSession
                            ? `${formatDate(latestSession.startDate)}${latestSession.location ? " • " + latestSession.location : ""}`
                            : lastActivityDate
                            ? formatDate(lastActivityDate)
                            : "Aucune activité récente";

                          return (
                            <TableRow
                              key={collaborator.id}
                              onClick={() =>
                                setSelectedCollaboratorId((current) =>
                                  current === collaborator.id ? null : collaborator.id
                                )
                              }
                              className={cn(
                                "cursor-pointer transition-colors",
                                selectedCollaboratorId === collaborator.id && "bg-primary/5 hover:bg-primary/10",
                                selectedCollaboratorId !== collaborator.id && "hover:bg-muted/40"
                              )}
                            >
                              <TableCell>
                                <div className="font-medium">{collaborator.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {[collaborator.email, collaborator.businessUnit].filter(Boolean).join(" • ")}
                                </div>
                              </TableCell>
                              <TableCell>{collaborator.seniority ?? "-"}</TableCell>
                              <TableCell>{activeInterestsCount}</TableCell>
                              <TableCell>{completedCount}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="font-medium">
                                    {latestFormation ? latestFormation.title : "Aucune formation suivie"}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span>{activityLabel}</span>
                                    {latestRegistration && (
                                      <Badge
                                        variant={latestRegistration.status === "completed" ? "secondary" : "outline"}
                                        className="capitalize"
                                      >
                                        {latestRegistration.status}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }
                      )
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </section>

          {selectedCollaborator && (
            <section className="space-y-6">
              <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-primary">
                      Suivi de {selectedCollaborator.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Consultez les intentions et l'historique de formation de ce collaborateur.
                    </p>
                    {selectedCollaboratorMeta && (
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{selectedCollaboratorMeta}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <div className="flex flex-wrap gap-2">
                      {selectedCollaborator.seniority && (
                        <Badge variant="outline" className="border-dashed text-xs uppercase tracking-wide">
                          Séniorité : {selectedCollaborator.seniority}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {selectedCollaboratorActiveCount} intention(s) active(s)
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {selectedCollaboratorCompletedCount} formation(s) terminée(s)
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCollaboratorId(null)}
                      className="text-xs"
                    >
                      Réinitialiser la sélection
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold text-primary">Intentions du collaborateur</h3>
                    <p className="text-sm text-muted-foreground">
                      Visibilité sur les intentions exprimées, leur priorité et leur statut.
                    </p>
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Intention</TableHead>
                        <TableHead>Priorité</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Validation coach</TableHead>
                        <TableHead>Dernière mise à jour</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCollaboratorInterests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                            Aucune intention enregistrée pour ce collaborateur.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedCollaboratorInterests.map((interest) => {
                          const formation = interest.formationId
                            ? formationMap.get(interest.formationId)
                            : undefined;
                          const isOffCatalog = !interest.formationId;
                          const formationTitle = isOffCatalog
                            ? interest.customTitle ?? "Formation hors catalogue"
                            : formation?.title ?? "Formation inconnue";
                          const lastUpdate = interest.coachValidatedAt ?? interest.expressedAt;

                          return (
                            <TableRow key={interest.id}>
                              <TableCell>
                                <div className="font-medium">{formationTitle}</div>
                                {isOffCatalog && interest.customDescription && (
                                  <div className="text-xs text-muted-foreground">{interest.customDescription}</div>
                                )}
                              </TableCell>
                              <TableCell>
                                <PriorityBadge priority={interest.priority as "P1" | "P2" | "P3"} />
                              </TableCell>
                              <TableCell>
                                <Badge variant={interest.status === "approved" ? "secondary" : "outline"} className="capitalize">
                                  {interest.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={interest.coachStatus === "approved" ? "secondary" : "outline"}
                                  className="capitalize"
                                >
                                  {interest.coachStatus}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{formatDate(lastUpdate)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold text-primary">Historique des formations</h3>
                    <p className="text-sm text-muted-foreground">
                      Détail des inscriptions et de leur statut pour ce collaborateur.
                    </p>
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Formation</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCollaboratorRegistrations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                            Aucun historique de formation pour ce collaborateur.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedCollaboratorRegistrations.map((registration) => {
                          const session = sessionMap.get(registration.sessionId);
                          const formation = formationMap.get(registration.formationId);
                          return (
                            <TableRow key={registration.id}>
                              <TableCell>{formation?.title ?? "Formation inconnue"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {session
                                  ? `${formatDate(session.startDate)} • ${session.location || "Lieu à venir"}`
                                  : formatDate(registration.registeredAt)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={registration.status === "completed" ? "secondary" : "outline"}>
                                  {registration.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </section>
          )}

          <section className="space-y-4">
            <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold text-primary">Historique des formations</h2>
                  <p className="text-sm text-muted-foreground">
                    Vue consolidée des inscriptions des collaborateurs de séniorité inférieure.
                  </p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collaborateur</TableHead>
                      <TableHead>Formation</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collaboratorRegistrationsWithContext.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                          Aucun historique de formation disponible.
                        </TableCell>
                      </TableRow>
                    ) : (
                      collaboratorRegistrationsWithContext.map(({ registration, collaborator, formation, session }) => (
                        <TableRow key={registration.id}>
                          <TableCell>{collaborator?.name ?? "Collaborateur inconnu"}</TableCell>
                          <TableCell>{formation?.title ?? "Formation inconnue"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {session
                              ? `${formatDate(session.startDate)} • ${session.location || "Lieu à venir"}`
                              : formatDate(registration.registeredAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={registration.status === "completed" ? "secondary" : "outline"}>
                              {registration.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
