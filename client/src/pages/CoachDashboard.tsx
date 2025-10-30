import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, CheckCircle, XCircle, Clock, Users, Calendar } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PriorityBadge from "@/components/PriorityBadge";
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

interface CoachOverviewResponse {
  assignments: CoachAssignment[];
  coachees: User[];
  interests: FormationInterest[];
  registrations: Registration[];
  settings: {
    coachValidationOnly: boolean;
  };
}

interface CoachDashboardProps {
  currentUser: User;
}

export default function CoachDashboard({ currentUser }: CoachDashboardProps) {
  const { toast } = useToast();

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
  const coachValidationOnly = overview?.settings.coachValidationOnly ?? false;

  const coacheeMap = useMemo(() => {
    const map = new Map<string, User>();
    coachees.forEach((coachee) => map.set(coachee.id, coachee));
    return map;
  }, [coachees]);

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

  const pendingCoach = interests.filter(
    (interest) => interest.status === "pending" && interest.coachStatus === "pending"
  );
  const awaitingRh = interests.filter(
    (interest) => interest.status === "pending" && interest.coachStatus === "approved"
  );
  const approvedInterests = interests.filter((interest) => interest.status === "approved");

  const completedRegistrations = registrations.filter(
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
              Suivi de mes coachés
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Visualisez les intentions de formation de vos coachés et accompagnez-les dans leurs démarches.
            </p>
          </div>
          <div className="rounded-2xl border border-white/40 bg-white/80 p-5 text-[#00313F] shadow-sm backdrop-blur">
            <p className="text-sm font-semibold">Coach</p>
            <p className="text-2xl font-bold">{currentUser.name}</p>
            <p className="text-xs text-[#00313F]/70">{coachees.length} coaché(s) suivis</p>
          </div>
        </div>
      </section>

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
              {coachees.length} coaché{coachees.length > 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coaché</TableHead>
                  <TableHead>Business Unit</TableHead>
                  <TableHead>Séniorité</TableHead>
                  <TableHead>Rôle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coachees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      Aucun coaché ne vous est encore assigné.
                    </TableCell>
                  </TableRow>
                ) : (
                  coachees.map((coachee) => (
                    <TableRow key={coachee.id}>
                      <TableCell>
                        <div className="font-medium">{coachee.name}</div>
                        <div className="text-xs text-muted-foreground">{coachee.email}</div>
                      </TableCell>
                      <TableCell>{coachee.businessUnit || "-"}</TableCell>
                      <TableCell>{coachee.seniority || "-"}</TableCell>
                      <TableCell>{coachee.jobRole || "-"}</TableCell>
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
            <p className="text-3xl font-semibold text-foreground">{coachees.length}</p>
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
                  Validez ou refusez les demandes de vos coachés. {coachValidationOnly ? "Votre validation suffit pour finaliser l'intention." : "Une fois validée, l'intention sera transmise aux RH."}
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
                    const formation = formationMap.get(interest.formationId);
                    return (
                      <TableRow key={interest.id}>
                        <TableCell>
                          <div className="font-medium">{coachee?.name ?? "Consultant inconnu"}</div>
                          <div className="text-xs text-muted-foreground">{coachee?.businessUnit || ""}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formation?.title ?? "Formation inconnue"}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{formation?.description}</div>
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
                      const formation = formationMap.get(interest.formationId);
                      return (
                        <TableRow key={interest.id}>
                          <TableCell>{coachee?.name ?? "Consultant inconnu"}</TableCell>
                          <TableCell>{formation?.title ?? "Formation inconnue"}</TableCell>
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
                    const formation = formationMap.get(interest.formationId);
                    return (
                      <TableRow key={interest.id}>
                        <TableCell>{coachee?.name ?? "Consultant inconnu"}</TableCell>
                        <TableCell>{formation?.title ?? "Formation inconnue"}</TableCell>
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
                {registrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      Aucune formation suivie pour l'instant.
                    </TableCell>
                  </TableRow>
                ) : (
                  registrations.map((registration) => {
                    const coachee = coacheeMap.get(registration.userId);
                    const session = sessionMap.get(registration.sessionId);
                    const formation = formationMap.get(registration.formationId);
                    return (
                      <TableRow key={registration.id}>
                        <TableCell>{coachee?.name ?? "Consultant inconnu"}</TableCell>
                        <TableCell>{formation?.title ?? "Formation inconnue"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {session ? `${formatDate(session.startDate)} • ${session.location || "Lieu à venir"}` : "-"}
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
    </div>
  );
}
