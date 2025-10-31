import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RatingStars from "@/components/RatingStars";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle,
  XCircle,
  Clock,
  Heart,
  Loader2,
  TrendingUp,
  RefreshCw,
  Undo2,
  Settings,
  UserX,
  Megaphone,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { FormationInterest, Formation, User, CoachAssignment } from "@shared/schema";
import type { AdminInterestsResponse } from "@/types/admin";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PriorityBadge from "@/components/PriorityBadge";
import { useRouteNotifications, useMarkNotificationsRead } from "@/hooks/use-notifications";

export default function InterestManagement() {
  const [selectedInterest, setSelectedInterest] = useState<FormationInterest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [cancelInterestTarget, setCancelInterestTarget] = useState<FormationInterest | null>(null);
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch all interests (RH access)
  const { data: interestsData, isLoading: isLoadingInterests, isFetching, refetch } = useQuery<AdminInterestsResponse>({
    queryKey: ["/api/admin/interests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/interests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch interests");
      return res.json();
    },
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const interests = interestsData?.interests || [];
  const aggregated = interestsData?.aggregated || [];

  const { data: validationSettings } = useQuery<{ coachValidationOnly: boolean; rhValidationOnly: boolean }>({
    queryKey: ["/api/admin/settings/coach-validation"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/coach-validation", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch validation settings");
      return res.json();
    },
  });

  const { data: coachAssignments = [] } = useQuery<CoachAssignment[]>({
    queryKey: ["/api/admin/coach-assignments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/coach-assignments", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch coach assignments");
      return res.json();
    },
  });

  const coachValidationOnly = validationSettings?.coachValidationOnly ?? false;
  const rhValidationOnly = validationSettings?.rhValidationOnly ?? false;
  const canSkipCoachApproval = rhValidationOnly;

  const coacheesWithCoach = useMemo(
    () => new Set(coachAssignments.map((assignment) => assignment.coacheeId)),
    [coachAssignments]
  );

  const hasAssignedCoach = (interest: FormationInterest) => coacheesWithCoach.has(interest.userId);

  // Fetch formations
  const { data: formations = [] } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
  });

  // Fetch all users to show names
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    retry: false,
  });

  const interestNotificationsQuery = useRouteNotifications("/interests");
  const interestNotifications = interestNotificationsQuery.notifications ?? [];
  const interestUnread = interestNotificationsQuery.unreadCount ?? 0;
  const unreadInterestNotifications = useMemo(
    () => interestNotifications.filter((notification) => !notification.read),
    [interestNotifications]
  );
  const markInterestNotificationsRead = useMarkNotificationsRead();
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

  // Update interest status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, action }: { id: string; status: string; action: "approve" | "reject" }) => {
      return apiRequest(`/api/interests/${id}`, "PATCH", { status }).then(() => action);
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/interests"] });
      toast({
        title: "Statut mis à jour",
        description: action === "approve"
          ? "L'intention a été approuvée avec succès"
          : "L'intention a été refusée",
      });
      setSelectedInterest(null);
      setActionType(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le statut",
      });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => apiRequest(`/api/interests/${id}`, "PATCH", { status: "approved" })));
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/interests"] });
      toast({
        title: "Intentions approuvées",
        description:
          count > 1
            ? `${count} intentions ont été approuvées avec succès`
            : "L'intention sélectionnée a été approuvée avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible d'approuver les intentions",
      });
    },
  });

  const updateCoachValidationMutation = useMutation({
    mutationFn: async (value: boolean) => {
      return apiRequest("/api/admin/settings/coach-validation", "PATCH", {
        coachValidationOnly: value,
      });
    },
    onSuccess: (_, value) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/coach-validation"] });
      toast({
        title: "Préférence mise à jour",
        description: value
          ? "Les validations coach suffisent désormais."
          : "La validation RH reste requise après le coach.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la préférence",
      });
    },
  });

  const updateRhValidationMutation = useMutation({
    mutationFn: async (value: boolean) => {
      return apiRequest("/api/admin/settings/coach-validation", "PATCH", {
        rhValidationOnly: value,
      });
    },
    onSuccess: (_, value) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/coach-validation"] });
      toast({
        title: "Préférence mise à jour",
        description: value
          ? "Les validations RH finalisent désormais l'intention sans étape manager."
          : "La validation manager reste requise après l'étape RH.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la préférence",
      });
    },
  });

  // Delete interest mutation
  const deleteInterestMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/interests/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/interests"] });
      toast({
        title: "Intention supprimée",
        description: "L'intention a été supprimée avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'intention",
      });
    },
  });

  const cancelInterestMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/interests/${id}`, "PATCH", { status: "withdrawn" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/interests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/registrations"] });
      toast({
        title: "Intention annulée",
        description: "L'intention a été annulée et les inscriptions associées ont été retirées",
      });
      setCancelInterestTarget(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible d'annuler l'intention",
      });
    },
  });

  // Delete all rejected interests mutation
  const deleteAllRejectedMutation = useMutation({
    mutationFn: async () => {
      const rejectedIds = interests.filter(i => i.status === "rejected").map(i => i.id);
      return Promise.all(rejectedIds.map(id => apiRequest(`/api/admin/interests/${id}`, "DELETE")));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/interests"] });
      toast({
        title: "Intentions supprimées",
        description: "Toutes les intentions refusées ont été supprimées",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de supprimer les intentions",
      });
    },
  });

  const handleAction = (interest: FormationInterest, action: "approve" | "reject") => {
    setSelectedInterest(interest);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedInterest || !actionType) return;
    const newStatus = actionType === "approve" ? "approved" : "rejected";
    updateStatusMutation.mutate({ id: selectedInterest.id, status: newStatus, action: actionType });
  };

  const handleCancelInterest = (interest: FormationInterest) => {
    setCancelInterestTarget(interest);
  };

  const confirmCancelInterest = () => {
    if (!cancelInterestTarget) return;
    cancelInterestMutation.mutate(cancelInterestTarget.id);
  };

  const handleCoachValidationToggle = (checked: boolean | "indeterminate") => {
    const value = checked === true;
    updateCoachValidationMutation.mutate(value);
  };

  const handleRhValidationToggle = (checked: boolean | "indeterminate") => {
    const value = checked === true;
    updateRhValidationMutation.mutate(value);
  };

  const getFormation = (id: string) => formations.find(f => f.id === id);
  const getUser = (id: string) => users.find(u => u.id === id);

  const pendingInterests = interests.filter(i => i.status === "pending");
  const approvedInterests = interests.filter(i => i.status === "approved");
  const convertedInterests = interests.filter(i => i.status === "converted");
  const rejectedInterests = interests.filter(i => i.status === "rejected");
  const withdrawnInterests = interests.filter(i => i.status === "withdrawn");
  const offCatalogInterestsOnly = interests.filter(i => !i.formationId);
  const offCatalogCompleted = offCatalogInterestsOnly.filter(i => i.status === "converted");
  const pendingCoachValidation = pendingInterests.filter(
    (interest) => interest.coachStatus !== "approved" && hasAssignedCoach(interest)
  );
  const pendingRhValidation = pendingInterests.filter((interest) => {
    if (coachValidationOnly) {
      return false;
    }

    if (canSkipCoachApproval) {
      return true;
    }

    if (!hasAssignedCoach(interest)) {
      return true;
    }

    return interest.coachStatus === "approved";
  });
  const pendingRhWithoutCoachValidation = pendingInterests.filter((interest) => {
    if (coachValidationOnly || canSkipCoachApproval) {
      return false;
    }

    if (!hasAssignedCoach(interest)) {
      return false;
    }

    return interest.coachStatus !== "approved";
  });
  const approvablePendingInterests = coachValidationOnly
    ? []
    : pendingInterests.filter(
        (interest) =>
          canSkipCoachApproval || interest.coachStatus === "approved" || !hasAssignedCoach(interest)
      );

  if (isLoadingInterests) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement des intentions de formation...</p>
        </div>
      </div>
    );
  }

  const InterestTable = ({
    data,
    showActions = false,
    showDeleteAction = false,
    showCancelAction = false,
  }: {
    data: FormationInterest[];
    showActions?: boolean;
    showDeleteAction?: boolean;
    showCancelAction?: boolean;
  }) => {
    const hasActions = showActions || showDeleteAction || showCancelAction;

    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Consultant</TableHead>
              <TableHead>Formation</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Date d'expression</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Validation coach</TableHead>
              {hasActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasActions ? 7 : 6} className="text-center py-12 text-muted-foreground">
                  Aucune intention à afficher
                </TableCell>
              </TableRow>
            ) : (
              data.map((interest) => {
                const formation = interest.formationId ? getFormation(interest.formationId) : undefined;
                const user = getUser(interest.userId);
                const coachAssigned = hasAssignedCoach(interest);
                const coachValidationBypassed =
                  coachAssigned &&
                  interest.coachStatus !== "approved" &&
                  (interest.status === "approved" || interest.status === "converted");
                const coachValidationPending = coachAssigned && interest.coachStatus !== "approved";
                const canApprove = !coachValidationOnly;
                const approveDisabledReason = coachValidationOnly
                  ? "La validation du coach suffit"
                  : undefined;
                const approveTooltip = approveDisabledReason
                  ? approveDisabledReason
                  : coachValidationPending
                    ? "Le coach n'a pas encore validé cette intention. Validez-la uniquement si nécessaire."
                    : undefined;
                const canCancel = interest.status === "approved" || interest.status === "converted";
                const isOffCatalog = !interest.formationId;
                const formationTitle = isOffCatalog
                  ? interest.customTitle ?? "Formation hors catalogue"
                  : formation?.title ?? "Formation inconnue";
                const formationDescription = isOffCatalog
                  ? interest.customDescription ?? ""
                  : formation?.description ?? "";
                const extraDetails = [
                  interest.customPrice ? `Budget : ${interest.customPrice}` : null,
                  interest.customFitnetNumber ? `Fitnet : ${interest.customFitnetNumber}` : null,
                  interest.customMissionManager ? `Resp. mission : ${interest.customMissionManager}` : null,
                ].filter(Boolean);

                return (
                  <TableRow key={interest.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{user?.name || "Utilisateur inconnu"}</div>
                        <div className="text-xs text-muted-foreground">
                          {user?.businessUnit || ""} {user?.seniority ? `• ${user.seniority}` : ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{formationTitle}</div>
                          {isOffCatalog ? (
                            <Badge variant="outline" className="border-dashed text-xs">
                              Hors catalogue
                            </Badge>
                          ) : null}
                        </div>
                        {formationDescription && (
                          <div className="text-sm text-muted-foreground line-clamp-1">{formationDescription}</div>
                        )}
                        {isOffCatalog && extraDetails.length > 0 && (
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {extraDetails.join(" • ")}
                          </div>
                        )}
                        {isOffCatalog && interest.customLink && (
                          <a
                            href={interest.customLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Consulter le lien externe
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={interest.priority as "P1" | "P2" | "P3"} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {interest.expressedAt ? format(new Date(interest.expressedAt), "dd MMM yyyy", { locale: fr }) : "-"}
                    </TableCell>
                    <TableCell>
                      {interest.status === "pending" && (
                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                          <Clock className="w-3 h-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                      {interest.status === "approved" && (
                        <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approuvé
                        </Badge>
                      )}
                      {interest.status === "converted" && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Inscrit
                        </Badge>
                      )}
                      {interest.status === "rejected" && (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Refusée
                        </Badge>
                      )}
                      {interest.status === "withdrawn" && (
                        <Badge variant="outline" className="border-dashed text-muted-foreground">
                          <Undo2 className="w-3 h-3 mr-1" />
                          Annulée
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!coachAssigned ? (
                        <Badge variant="outline" className="border-dashed text-muted-foreground">
                          <UserX className="w-3 h-3 mr-1" />
                          Aucun coach
                        </Badge>
                      ) : null}
                      {coachAssigned && interest.coachStatus === "approved" && (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Validée
                        </Badge>
                      )}
                      {coachValidationBypassed && (
                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 border-orange-500/20">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Validée sans coach
                        </Badge>
                      )}
                      {coachAssigned && interest.coachStatus === "rejected" && (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Refusée
                        </Badge>
                      )}
                      {coachAssigned && interest.coachStatus === "pending" && !coachValidationBypassed && (
                        <Badge variant="outline" className="text-muted-foreground border-dashed">
                          <Clock className="w-3 h-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                    </TableCell>
                    {hasActions && (
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {showActions && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleAction(interest, "approve")}
                                data-testid={`button-approve-interest-${interest.id}`}
                                disabled={!canApprove || updateStatusMutation.isPending}
                                title={approveTooltip}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approuver
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction(interest, "reject")}
                                data-testid={`button-reject-interest-${interest.id}`}
                                disabled={updateStatusMutation.isPending}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Refuser
                              </Button>
                            </>
                          )}
                          {showCancelAction && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleCancelInterest(interest)}
                              data-testid={`button-cancel-interest-${interest.id}`}
                              disabled={!canCancel || cancelInterestMutation.isPending}
                              title={!canCancel ? "Seules les intentions validées ou converties peuvent être annulées" : undefined}
                            >
                              <Undo2 className="w-4 h-4 mr-1" />
                              Annuler
                            </Button>
                          )}
                          {showDeleteAction && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteInterestMutation.mutate(interest.id)}
                              disabled={deleteInterestMutation.isPending}
                              data-testid={`button-delete-interest-${interest.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Supprimer
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    );
  };
  return (
    <div className="space-y-12">
      <section className="surface-elevated relative overflow-hidden rounded-[2rem] px-12 py-14">
        <div className="pointer-events-none absolute inset-y-8 right-0 hidden w-72 rounded-l-[32px] bg-[radial-gradient(circle_at_center,rgba(10,132,255,0.12),transparent_60%)] md:block" />
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-5">
            <p className="eyebrow text-muted-foreground">Administration RH</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                Pilotage des intentions de formation
              </h1>
              {interestUnread > 0 ? (
                <Badge variant="destructive" className="rounded-full px-3 py-1 text-xs">
                  {interestUnread} nouveauté{interestUnread > 1 ? "s" : ""}
                </Badge>
              ) : null}
            </div>
            <p className="text-base leading-relaxed text-muted-foreground">
              Priorisez les demandes des consultants, approuvez les parcours pertinents et suivez la conversion en inscriptions.
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-4">
            <div className="rounded-2xl border border-white/40 bg-white/80 p-5 text-[#00313F] shadow-sm backdrop-blur">
              <p className="text-sm font-semibold">Intentions à traiter</p>
              <p className="text-3xl font-bold">{pendingInterests.length}</p>
              <p className="text-xs text-[#00313F]/70">
                {interestUnread > 0
                  ? `${interestUnread} notification${interestUnread > 1 ? "s" : ""} en attente`
                  : "Données à jour"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="h-12 flex-1 rounded-xl text-sm font-semibold"
                onClick={() => refetch()}
                disabled={isFetching}
                data-testid="button-refresh-interests"
              >
                {isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Rafraîchir
              </Button>
              <Dialog open={isValidationDialogOpen} onOpenChange={setIsValidationDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-xl"
                    aria-label="Configurer les règles de validation"
                    data-testid="button-open-validation-settings"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Règles de validation</DialogTitle>
                    <DialogDescription>
                      Définissez l'enchaînement des validations pour accélérer le traitement des intentions de formation.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="flex items-start gap-3 rounded-2xl border border-border/50 p-4">
                      <Checkbox
                        id="coach-validation-toggle"
                        checked={coachValidationOnly}
                        onCheckedChange={handleCoachValidationToggle}
                        disabled={updateCoachValidationMutation.isPending}
                      />
                      <label htmlFor="coach-validation-toggle" className="space-y-1 text-sm">
                        <span className="block font-medium text-foreground">La validation du coach suffit</span>
                        <span className="block text-muted-foreground">
                          {coachValidationOnly
                            ? "Une intention validée par un coach passe automatiquement en statut approuvé."
                            : "Une validation RH reste nécessaire après celle du coach."}
                        </span>
                      </label>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-border/50 p-4">
                      <Checkbox
                        id="rh-validation-toggle"
                        checked={rhValidationOnly}
                        onCheckedChange={handleRhValidationToggle}
                        disabled={updateRhValidationMutation.isPending}
                      />
                      <label htmlFor="rh-validation-toggle" className="space-y-1 text-sm">
                        <span className="block font-medium text-foreground">La validation RH suffit</span>
                        <span className="block text-muted-foreground">
                          {rhValidationOnly
                            ? "Une intention validée par les RH est finalisée sans validation manager."
                            : "Une validation manager n'est pas nécessaire après l'approbation RH."}
                        </span>
                      </label>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Fermer</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        {unreadInterestNotifications.length > 0 ? (
          <Card className="rounded-[1.75rem] border border-primary/20 shadow-sm">
            <div className="space-y-3 p-6 text-[#00313F]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Nouveautés à traiter</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs text-[#00313F]"
                  onClick={() => markInterestNotificationsRead.mutate({ route: "/interests" })}
                  disabled={markInterestNotificationsRead.isPending || interestUnread === 0}
                >
                  {markInterestNotificationsRead.isPending ? "Traitement..." : "Marquer comme lues"}
                </Button>
              </div>
              <ul className="space-y-2">
                {unreadInterestNotifications.slice(0, 5).map((notification) => (
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
              {unreadInterestNotifications.length > 5 ? (
                <p className="text-xs text-[#00313F]/60">
                  {unreadInterestNotifications.length - 5} notification(s) supplémentaires en attente.
                </p>
              ) : null}
            </div>
          </Card>
        ) : null}

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-3xl font-semibold text-foreground">{pendingInterests.length}</p>
            </div>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600">
              <Clock className="h-6 w-6" />
            </div>
          </Card>

          <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Approuvées</p>
              <p className="text-3xl font-semibold text-foreground">{approvedInterests.length}</p>
            </div>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <CheckCircle className="h-6 w-6" />
            </div>
          </Card>

          <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Converties</p>
              <p className="text-3xl font-semibold text-foreground">{convertedInterests.length}</p>
            </div>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-700">
              <TrendingUp className="h-6 w-6" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-6">
            <TabsTrigger value="pending" data-testid="tab-pending-interests">
              En attente ({pendingInterests.length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved-interests">
              Approuvées ({approvedInterests.length})
            </TabsTrigger>
            <TabsTrigger value="converted" data-testid="tab-converted-interests">
              Converties ({convertedInterests.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected-interests">
              Refusées ({rejectedInterests.length})
            </TabsTrigger>
            <TabsTrigger value="withdrawn" data-testid="tab-withdrawn-interests">
              Annulées ({withdrawnInterests.length})
            </TabsTrigger>
            <TabsTrigger value="off-catalog" data-testid="tab-off-catalog-interests">
              Hors catalogue ({offCatalogInterestsOnly.length})
            </TabsTrigger>
          </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <h2 className="text-xl font-semibold text-primary">Intentions en attente de validation</h2>
                </div>
                {approvablePendingInterests.length > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      bulkApproveMutation.mutate(approvablePendingInterests.map((interest) => interest.id))
                    }
                    disabled={bulkApproveMutation.isPending}
                    data-testid="button-approve-all-interests"
                  >
                    {bulkApproveMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Validation...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Tout valider
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {!canSkipCoachApproval && (
                  <Badge variant="outline" className="border-dashed">
                    À valider par le coach: {pendingCoachValidation.length}
                  </Badge>
                )}
                {!coachValidationOnly && (
                  <>
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                      {canSkipCoachApproval
                        ? `Validations RH possibles: ${pendingRhValidation.length}`
                        : `Prêtes pour les RH: ${pendingRhValidation.length}`}
                    </Badge>
                    {pendingRhWithoutCoachValidation.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="border border-orange-200 bg-orange-50 text-orange-700"
                      >
                        Sans validation coach: {pendingRhWithoutCoachValidation.length}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <InterestTable data={pendingInterests} showActions={true} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-semibold text-primary">Intentions approuvées</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Ces intentions ont été approuvées. Les consultants peuvent maintenant s'inscrire aux sessions disponibles.
              </p>
              <InterestTable data={approvedInterests} showCancelAction />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="converted" className="space-y-4">
          <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-700" />
                <h2 className="text-xl font-semibold text-primary">Intentions converties en inscriptions</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Ces consultants se sont inscrits à une session suite à l'approbation de leur intention.
              </p>
              <InterestTable data={convertedInterests} showCancelAction />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawn" className="space-y-4">
          <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Undo2 className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-primary">Intentions annulées</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Ces intentions ont été annulées par les RH. Les consultants pourront formuler une nouvelle demande si
                nécessaire.
              </p>
              <InterestTable data={withdrawnInterests} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <h2 className="text-xl font-semibold text-primary">Intentions refusées</h2>
                </div>
                {rejectedInterests.length > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => deleteAllRejectedMutation.mutate()}
                    disabled={deleteAllRejectedMutation.isPending}
                    data-testid="button-delete-all-rejected"
                  >
                    {deleteAllRejectedMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Suppression...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Supprimer toutes les demandes
                      </>
                    )}
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Ces intentions ont été refusées. Vous pouvez les supprimer individuellement ou toutes à la fois.
              </p>
              <InterestTable data={rejectedInterests} showActions={false} showDeleteAction={true} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="off-catalog" className="space-y-4">
          <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-primary">Demandes hors catalogue</h2>
                </div>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Suivez les demandes personnalisées : statut, date prévue et retours des collaborateurs.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Consultant</TableHead>
                      <TableHead>Formation</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date clé</TableHead>
                      <TableHead>Avis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offCatalogInterestsOnly.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          Aucune demande hors catalogue pour le moment.
                        </TableCell>
                      </TableRow>
                    ) : (
                      offCatalogInterestsOnly.map((interest) => {
                        const consultant = getUser(interest.userId);
                        const status = interest.status;
                        const statusLabel = {
                          pending: "En attente",
                          approved: "Validée",
                          converted: "Réalisée",
                          rejected: "Refusée",
                          withdrawn: "Annulée",
                        } as const;
                        const statusVariant = {
                          pending: "secondary",
                          approved: "default",
                          converted: "default",
                          rejected: "destructive",
                          withdrawn: "outline",
                        } as const;
                        const statusKey = (Object.prototype.hasOwnProperty.call(statusLabel, status)
                          ? (status as keyof typeof statusLabel)
                          : "pending") as keyof typeof statusLabel;
                        const badgeVariant = statusVariant[statusKey];
                        const keyDate =
                          interest.completedAt || interest.customPlannedDate || interest.expressedAt || null;
                        const formattedDate = keyDate ? format(new Date(keyDate), "dd MMM yyyy", { locale: fr }) : "-";
                        const formationTitle = interest.customTitle ?? "Formation hors catalogue";
                        const extraDetails = [
                          interest.customPrice ? `Budget : ${interest.customPrice}` : null,
                          interest.customMissionManager ? `Resp. mission : ${interest.customMissionManager}` : null,
                          interest.customFitnetNumber ? `Fitnet : ${interest.customFitnetNumber}` : null,
                        ].filter(Boolean);

                        return (
                          <TableRow key={interest.id}>
                            <TableCell>
                              <div className="font-medium">{consultant?.name ?? "Consultant inconnu"}</div>
                              <div className="text-xs text-muted-foreground">
                                {consultant?.businessUnit || ""}
                                {consultant?.seniority ? ` • ${consultant.seniority}` : ""}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{formationTitle}</div>
                                {interest.customDescription && (
                                  <div className="text-xs text-muted-foreground line-clamp-2">
                                    {interest.customDescription}
                                  </div>
                                )}
                                {extraDetails.length > 0 && (
                                  <div className="text-xs text-muted-foreground">{extraDetails.join(" • ")}</div>
                                )}
                                {interest.customLink && (
                                  <a
                                    href={interest.customLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                  >
                                    Voir la formation
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={badgeVariant}
                                className={
                                  statusKey === "converted"
                                    ? "bg-green-500/10 text-green-700 border-green-500/20"
                                    : statusKey === "pending"
                                    ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"
                                    : undefined
                                }
                              >
                                {statusLabel[statusKey]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formattedDate}</TableCell>
                            <TableCell>
                              {interest.customReviewRating && statusKey === "converted" ? (
                                <div className="flex flex-col gap-1">
                                  <RatingStars value={interest.customReviewRating} size="sm" />
                                  {interest.customReviewComment && (
                                    <span className="text-xs text-muted-foreground line-clamp-2">
                                      {interest.customReviewComment}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {statusKey === "converted" ? "Avis en attente" : "-"}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

        {/* Aggregated View by Formation */}
        {aggregated.length > 0 && (
          <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-primary">Vue agrégée par formation</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Nombre d'intentions par formation pour planifier l'organisation des sessions
              </p>
              <div className="overflow-hidden rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Formation</TableHead>
                      <TableHead className="text-center">En attente</TableHead>
                      <TableHead className="text-center">Approuvées</TableHead>
                      <TableHead className="text-center">Converties</TableHead>
                      <TableHead className="text-center">Annulées</TableHead>
                      <TableHead className="text-center">P1</TableHead>
                      <TableHead className="text-center">P2</TableHead>
                      <TableHead className="text-center">P3</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregated.map((agg) => {
                      if (!agg.formationId) {
                        return null;
                      }
                      const formation = getFormation(agg.formationId);
                      const total = agg.pending + agg.approved + agg.converted;
                      return (
                        <TableRow key={agg.formationId}>
                          <TableCell className="font-medium">
                            {formation?.title || "Formation inconnue"}
                          </TableCell>
                          <TableCell className="text-center">
                            {agg.pending > 0 && (
                              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">
                                {agg.pending}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {agg.approved > 0 && (
                              <Badge variant="secondary" className="bg-accent/10 text-accent">
                                {agg.approved}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {agg.converted > 0 && (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                                {agg.converted}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {agg.withdrawn > 0 && (
                              <Badge variant="outline" className="border-dashed text-muted-foreground">
                                {agg.withdrawn}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive" className="text-xs">{agg.p1Count}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default" className="text-xs">{agg.p2Count}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-xs">{agg.p3Count}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{total}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* Confirmation Dialog */}
      <AlertDialog open={selectedInterest !== null && actionType !== null} onOpenChange={() => {
        setSelectedInterest(null);
        setActionType(null);
      }}>
        <AlertDialogContent data-testid="dialog-confirm-interest-action">
          <AlertDialogHeader>
            <AlertDialogTitle className={actionType === "approve" ? "text-accent" : "text-destructive"}>
              {actionType === "approve" ? "Approuver l'intention ?" : "Refuser l'intention ?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-base pt-2 space-y-2">
                {selectedInterest && (
                  <>
                    <p>
                      <strong>Consultant :</strong> {getUser(selectedInterest.userId)?.name}
                    </p>
                    <p>
                      <strong>Formation :</strong>{" "}
                      {selectedInterest.formationId
                        ? getFormation(selectedInterest.formationId)?.title
                        : selectedInterest.customTitle || "Formation hors catalogue"}
                    </p>
                    <p>
                      <strong>Priorité :</strong> {selectedInterest.priority}
                    </p>
                    {actionType === "approve" && (
                      <p className="mt-4 text-accent font-medium">
                        Le consultant pourra s'inscrire aux sessions disponibles pour cette formation.
                      </p>
                    )}
                    {actionType === "reject" && (
                      <p className="mt-4 text-destructive font-medium">
                        Le quota {selectedInterest.priority} du consultant sera remboursé si applicable.
                      </p>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatusMutation.isPending} data-testid="button-cancel-action">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={updateStatusMutation.isPending}
              className={actionType === "approve" ? "bg-accent hover:bg-accent/90" : ""}
              data-testid="button-confirm-action"
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                actionType === "approve" ? "Approuver" : "Refuser"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelInterestTarget !== null} onOpenChange={() => setCancelInterestTarget(null)}>
        <AlertDialogContent data-testid="dialog-cancel-interest">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-muted-foreground">
              Annuler l'intention validée ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-base pt-2 space-y-2">
                {cancelInterestTarget && (
                  <>
                    <p>
                      <strong>Consultant :</strong> {getUser(cancelInterestTarget.userId)?.name}
                    </p>
                    <p>
                      <strong>Formation :</strong>{" "}
                      {cancelInterestTarget.formationId
                        ? getFormation(cancelInterestTarget.formationId)?.title
                        : cancelInterestTarget.customTitle || "Formation hors catalogue"}
                    </p>
                    <p className="mt-4 text-muted-foreground">
                      Les inscriptions à venir pour cette formation seront supprimées pour ce consultant.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setCancelInterestTarget(null)}
              disabled={cancelInterestMutation.isPending}
              data-testid="button-cancel-cancel"
            >
              Retour
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelInterest}
              disabled={cancelInterestMutation.isPending}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              data-testid="button-confirm-cancel"
            >
              {cancelInterestMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Annulation...
                </>
              ) : (
                "Annuler l'intention"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
