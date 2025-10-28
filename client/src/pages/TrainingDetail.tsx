import { useEffect, useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import ModalityBadge from "@/components/ModalityBadge";
import SeniorityBadge from "@/components/SeniorityBadge";
import SessionCard from "@/components/SessionCard";
import PrioritySelector from "@/components/PrioritySelector";
import RatingStars from "@/components/RatingStars";
import type { FormationWithRating } from "@/components/TrainingCard";
import {
  ArrowLeft,
  Clock,
  Target,
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  XCircle,
  Trash2,
  Download,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  User,
  Session,
  Registration,
  FormationInterest,
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface TrainingDetailProps {
  currentUser: User;
}

interface FormationMaterialMetadata {
  id: string;
  formationId: string;
  title: string;
  description?: string | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  requiresEnrollment: boolean;
  createdAt: string;
}

type MaterialsQueryError = Error & { status?: number };

type FormationReviewWithUser = {
  id: string;
  formationId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  reviewerName: string;
};

type FormationReviewsResponse = {
  reviewsVisible: boolean;
  reviews: FormationReviewWithUser[];
};

export default function TrainingDetail({ currentUser: _currentUser }: TrainingDetailProps) {
  const [, params] = useRoute("/training/:id");
  const [, setLocation] = useLocation();
  const [selectedPriority, setSelectedPriority] = useState<"P1" | "P2" | "P3">("P3");
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showEnrollmentDialog, setShowEnrollmentDialog] = useState(false);
  const [showCancelInterestDialog, setShowCancelInterestDialog] = useState(false);
  const { toast } = useToast();

  // Fetch current user (to get updated quotas)
  const { data: userData } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });
  const currentUser = userData?.user || _currentUser;

  // Fetch formation
  const { data: formation, isLoading: isLoadingFormation } = useQuery<FormationWithRating>({
    queryKey: ["/api/formations", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/formations/${params?.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Formation not found");
      return res.json();
    },
    enabled: !!params?.id,
  });

  // Fetch sessions for this formation
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/sessions?formationId=${params?.id}&upcoming=true`, { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: !!params?.id,
  });

  // Fetch formation interests for this formation
  const { data: interests = [] } = useQuery<FormationInterest[]>({
    queryKey: ["/api/interests"],
  });

  // Fetch all registrations to count enrolled students per session
  const { data: allRegistrations = [] } = useQuery<Registration[]>({
    queryKey: ["/api/admin/registrations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/registrations", { credentials: "include" });
      if (!res.ok) {
        // If not RH, try to fetch user's own registrations
        const userRes = await fetch("/api/registrations", { credentials: "include" });
        if (!userRes.ok) return [];
        return userRes.json();
      }
      return res.json();
    },
  });

  const {
    data: reviewData,
    isLoading: isLoadingReviews,
  } = useQuery<FormationReviewsResponse>({
    queryKey: ["/api/formations", params?.id, "reviews"],
    enabled: Boolean(params?.id),
    queryFn: async () => {
      const res = await fetch(`/api/formations/${params?.id}/reviews`, {
        credentials: "include",
      });
      if (res.status === 404) {
        return { reviewsVisible: true, reviews: [] } satisfies FormationReviewsResponse;
      }
      if (!res.ok) {
        throw new Error("Impossible de charger les avis");
      }
      return res.json();
    },
  });

  const reviews = reviewData?.reviews ?? [];
  const reviewsVisible = reviewData?.reviewsVisible ?? true;
  const hasReviews = reviews.length > 0;

  const reviewsGrid = (
    <div className="grid gap-4 md:grid-cols-2">
      {reviews.map((review) => (
        <Card
          key={review.id}
          className="rounded-3xl border border-border/60 bg-background/95 p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {review.reviewerName}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <RatingStars value={review.rating} size="sm" />
          </div>
          <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {review.comment ? (
              <p>{review.comment}</p>
            ) : (
              <p className="italic text-muted-foreground/80">
                Le participant n'a pas laissé de commentaire détaillé.
              </p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );

  const userReview = useMemo(
    () => reviews.find((review) => review.userId === currentUser.id),
    [reviews, currentUser.id]
  );

  const [ratingValue, setRatingValue] = useState<number>(0);
  const [commentValue, setCommentValue] = useState<string>("");

  useEffect(() => {
    if (userReview) {
      setRatingValue(userReview.rating);
      setCommentValue(userReview.comment ?? "");
    } else {
      setRatingValue(0);
      setCommentValue("");
    }
  }, [userReview?.id, userReview?.updatedAt]);

  const {
    data: materials = [],
    isLoading: isLoadingMaterials,
    error: materialsError,
  } = useQuery<FormationMaterialMetadata[], MaterialsQueryError>({
    queryKey: ["/api/formations", params?.id, "materials"],
    enabled: Boolean(params?.id),
    queryFn: async () => {
      const res = await fetch(`/api/formations/${params?.id}/materials`, {
        credentials: "include",
      });
      if (res.status === 403) {
        const error = new Error("Accès réservé aux participants") as MaterialsQueryError;
        error.status = 403;
        throw error;
      }
      if (res.status === 404) {
        return [];
      }
      if (!res.ok) {
        throw new Error("Impossible de charger les ressources");
      }
      return res.json();
    },
  });

  const handleMaterialDownload = async (material: FormationMaterialMetadata) => {
    try {
      const res = await fetch(
        `/api/formations/${material.formationId}/materials/${material.id}/download`,
        {
          credentials: "include",
        }
      );
      if (!res.ok) {
        throw new Error("Téléchargement impossible");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = material.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download material", error);
    }
  };

  // Express interest mutation
  const expressInterestMutation = useMutation({
    mutationFn: async (data: { formationId: string; priority: string }) => {
      return apiRequest("/api/interests", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Intérêt manifesté !",
        description: "Votre intérêt pour cette formation a été enregistré avec priorité " + selectedPriority + ". Les RH vont organiser les sessions en conséquence.",
      });
      setShowInterestDialog(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de manifester votre intérêt",
      });
    },
  });

  // Session enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: async (data: { sessionId: string; formationId: string; priority: string; interestId: string }) => {
      const registration = await apiRequest("/api/registrations", "POST", {
        sessionId: data.sessionId,
        formationId: data.formationId,
        priority: data.priority,
      });
      
      await apiRequest(`/api/interests/${data.interestId}`, "PATCH", {
        status: "converted",
      });
      
      return registration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
      toast({
        title: "Inscription confirmée !",
        description: "Vous êtes maintenant inscrit à cette session. Votre demande sera validée par les RH.",
      });
      setShowEnrollmentDialog(false);
      setSelectedSession(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de s'inscrire à cette session",
      });
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
      setShowCancelInterestDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'annuler l'intention de formation",
        variant: "destructive",
      });
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (payload: { rating: number; comment?: string }) => {
      return apiRequest(`/api/formations/${params?.id}/reviews`, "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formations"] });
      if (params?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/formations", params.id] });
        queryClient.invalidateQueries({
          queryKey: ["/api/formations", params.id, "reviews"],
        });
      }
      toast({
        title: userReview ? "Avis mis à jour" : "Merci pour votre avis !",
        description: userReview
          ? "Votre retour a été actualisé."
          : "Votre avis a bien été enregistré et aidera les autres collaborateurs.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          error.message || "Impossible d'enregistrer votre avis pour le moment",
      });
    },
  });

  if (isLoadingFormation || isLoadingSessions) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement de la formation...</p>
        </div>
      </div>
    );
  }

  if (!formation) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-12 text-center shadow-lg max-w-md">
          <div className="bg-muted p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold text-primary mb-2">Formation non trouvée</h2>
          <p className="text-muted-foreground mb-6">La formation que vous recherchez n'existe pas ou a été supprimée.</p>
          <Button onClick={() => setLocation("/catalog")}>
            Retour au catalogue
          </Button>
        </Card>
      </div>
    );
  }

  const seniorityLevels = ["junior", "confirme", "senior", "expert"];
  const userSeniorityLevel = seniorityLevels.indexOf(currentUser.seniority || "junior");
  const requiredSeniorityLevel = seniorityLevels.indexOf(formation.seniorityRequired || "junior");
  const isSeniorityMismatch = userSeniorityLevel < requiredSeniorityLevel;

  const confirmExpressInterest = () => {
    if (!formation) return;
    
    expressInterestMutation.mutate({
      formationId: formation.id,
      priority: selectedPriority,
    });
  };

  const handleSessionSelect = (session: Session) => {
    if (!existingInterest || existingInterest.status !== "approved") return;
    setSelectedSession(session);
    setShowEnrollmentDialog(true);
  };

  const confirmEnrollment = () => {
    if (!selectedSession || !formation || !existingInterest) return;

    enrollMutation.mutate({
      sessionId: selectedSession.id,
      formationId: formation.id,
      priority: existingInterest.priority,
      interestId: existingInterest.id,
    });
  };

  const handleSubmitReview = () => {
    if (!formation || !params?.id) return;

    if (ratingValue < 1) {
      toast({
        variant: "destructive",
        title: "Note requise",
        description: "Merci de sélectionner une note avant de publier votre avis.",
      });
      return;
    }

    const trimmedComment = commentValue.trim();

    submitReviewMutation.mutate({
      rating: ratingValue,
      comment: trimmedComment.length > 0 ? trimmedComment : undefined,
    });
  };

  const p1Available = (currentUser.p1Used || 0) < 1;
  const p2Available = (currentUser.p2Used || 0) < 1;

  // Check if user has already expressed interest for this formation
  const existingInterest = interests.find(i => i.formationId === formation.id && i.status !== "withdrawn");
  const isMaterialsForbidden = (materialsError as MaterialsQueryError | undefined)?.status === 403;

  const userHasCompletedFormation = useMemo(() => {
    if (!formation) return false;
    return allRegistrations.some(
      (registration) =>
        registration.userId === currentUser.id &&
        registration.formationId === formation.id &&
        registration.status === "completed"
    );
  }, [allRegistrations, currentUser.id, formation.id]);

  const canLeaveReview = userHasCompletedFormation;

  return (
    <div className="space-y-10">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => setLocation("/catalog")} className="gap-2" data-testid="button-back-to-catalog">
        <ArrowLeft className="w-4 h-4" />
        Retour au catalogue
      </Button>

      {/* Existing Interest Alert */}
      {existingInterest && (
        <>
          {existingInterest.status === "pending" && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <AlertDescription className="text-foreground">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <p className="font-semibold">Intérêt manifesté avec priorité {existingInterest.priority}</p>
                    <p>
                      Les RH ont été informés de votre intérêt pour cette formation. Ils vont organiser les sessions en fonction de la demande. 
                      Vous serez notifié dès qu'une session sera disponible.
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowCancelInterestDialog(true)}
                    data-testid="button-cancel-interest"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {existingInterest.status === "approved" && (
            <Alert className="border-accent/50 bg-accent/10">
              <CheckCircle className="w-5 h-5 text-accent" />
              <AlertDescription className="text-foreground">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    Votre intérêt a été <strong>validé par les RH</strong>. Des sessions vont être organisées prochainement.
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowCancelInterestDialog(true)}
                    data-testid="button-cancel-interest"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {existingInterest.status === "converted" && (
            <Alert className="border-accent/50 bg-accent/10">
              <CheckCircle className="w-5 h-5 text-accent" />
              <AlertDescription className="text-foreground">
                Vous êtes inscrit à une session de cette formation.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Header */}
      <Card className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-background via-background to-primary/10 shadow-lg">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="relative p-8 space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                {formation.seniorityRequired && <SeniorityBadge seniority={formation.seniorityRequired} />}
                <ModalityBadge modality={formation.modality as "presentiel" | "distanciel" | "hybride"} />
                <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5 gap-1.5 border font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {formation.duration}
                </Badge>
                <Badge className="bg-secondary text-secondary-foreground px-3 py-1.5 font-medium">
                  {formation.theme}
                </Badge>
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl font-bold text-primary tracking-tight" data-testid="text-training-title">
                  {formation.title}
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
                  {formation.description}
                </p>
              </div>
              {reviewsVisible && (formation.reviewCount ?? 0) > 0 && (
                <div className="inline-flex items-center gap-3 rounded-full bg-white/80 px-5 py-2 text-sm font-medium text-muted-foreground shadow-sm ring-1 ring-black/5 backdrop-blur">
                  <RatingStars value={formation.averageRating ?? 0} size="sm" />
                  <span className="text-base font-semibold text-foreground">
                    {formation.averageRating?.toFixed(1)}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {formation.reviewCount} avis
                  </span>
                </div>
              )}
            </div>

            {!existingInterest && (
              <Button
                size="lg"
                className="self-start shadow-md"
                onClick={() => setShowInterestDialog(true)}
                data-testid="button-express-interest"
                disabled={isSeniorityMismatch}
              >
                Je suis intéressé
              </Button>
            )}
          </div>

          {isSeniorityMismatch && !existingInterest && (
            <p className="text-sm text-muted-foreground">
              Cette formation nécessite un niveau de séniorité {formation.seniorityRequired}
            </p>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="description" className="w-full">
        <TabsList className="h-12 bg-muted p-1 shadow-sm rounded-2xl">
          <TabsTrigger value="description" className="px-6 font-medium">Description</TabsTrigger>
          <TabsTrigger value="content" className="px-6 font-medium">Contenu</TabsTrigger>
          <TabsTrigger value="sessions" className="px-6 font-medium gap-2">
            <Calendar className="w-4 h-4" />
            Sessions ({sessions.length})
          </TabsTrigger>
          <TabsTrigger value="resources" className="px-6 font-medium">Ressources</TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="space-y-6 mt-8">
          <Card className="p-8 shadow-md rounded-3xl border border-border/60 bg-background/95">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-accent/10 p-2.5 rounded-lg">
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
              <h2 className="text-2xl font-semibold text-primary">Description détaillée</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed text-base">{formation.description}</p>
          </Card>

          <Card className="p-8 shadow-md rounded-3xl border border-border/60 bg-background/95">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-primary">Objectifs pédagogiques</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed text-base">{formation.objectives}</p>
          </Card>

          {formation.prerequisites && (
            <Card className="p-8 shadow-md rounded-3xl border border-border/60 bg-background/95">
              <h2 className="text-xl font-semibold text-primary mb-4">Prérequis</h2>
              <p className="text-muted-foreground leading-relaxed text-base">{formation.prerequisites}</p>
            </Card>
          )}

          {formation.tags && formation.tags.length > 0 && (
            <Card className="p-8 shadow-md rounded-3xl border border-border/60 bg-background/95">
              <h2 className="text-xl font-semibold text-primary mb-4">Mots-clés</h2>
              <div className="flex flex-wrap gap-3">
                {formation.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-sm px-4 py-2">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="content" className="mt-8">
          <Card className="p-8 shadow-md rounded-3xl border border-border/60 bg-background/95">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-500/10 p-2.5 rounded-lg">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-2xl font-semibold text-primary">Programme détaillé</h2>
            </div>
            {formation.content ? (
              <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-base">
                {formation.content}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Le formateur complétera prochainement le contenu de cette formation.
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="mt-8 space-y-4">
          {isMaterialsForbidden ? (
            <Card className="p-8 shadow-md rounded-3xl border border-border/60 bg-background/95">
              <p className="text-sm text-muted-foreground">
                Les ressources sont réservées aux collaborateurs inscrits à une session.
              </p>
            </Card>
          ) : isLoadingMaterials ? (
            <Card className="p-8 shadow-md rounded-3xl border border-border/60 bg-background/95">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement des documents...
              </div>
            </Card>
          ) : materials.length === 0 ? (
            <Card className="p-8 shadow-md rounded-3xl border border-border/60 bg-background/95">
              <p className="text-sm text-muted-foreground">
                Aucun document n'est disponible pour le moment.
              </p>
            </Card>
          ) : (
            materials.map((material) => (
              <Card
                key={material.id}
                className="p-6 shadow-md rounded-3xl border border-border/60 bg-background/95 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <h3 className="text-lg font-semibold">{material.title}</h3>
                  {material.description && (
                    <p className="text-sm text-muted-foreground mt-1">{material.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(material.createdAt).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" • "}
                    {(material.fileSize / 1024).toFixed(1)} Ko
                  </p>
                </div>
                <Button onClick={() => handleMaterialDownload(material)} variant="secondary" className="self-start">
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6 mt-8">
          {sessions.length > 0 ? (
            <>
              {/* Info banner based on interest status */}
              {!existingInterest && (
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-primary mb-2">Sessions planifiées</h3>
                  <p className="text-sm text-muted-foreground">
                    Consultez les sessions disponibles. Pour vous inscrire à une session, manifestez d'abord votre intérêt pour cette formation.
                  </p>
                </div>
              )}
              {existingInterest?.status === "pending" && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-primary mb-2">Sessions planifiées</h3>
                  <p className="text-sm text-muted-foreground">
                    Vous avez manifesté votre intérêt pour cette formation. Les RH vont analyser la demande et organiser les sessions en conséquence.
                  </p>
                </div>
              )}
              {existingInterest?.status === "approved" && (
                <div className="bg-accent/10 border border-accent/30 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-primary mb-2">Prêt à vous inscrire !</h3>
                  <p className="text-sm text-muted-foreground">
                    Votre intérêt a été validé par les RH. Sélectionnez une session ci-dessous pour finaliser votre inscription.
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                {sessions.map((session) => {
                  // Count actual enrolled students for this session
                  const enrolledCount = Array.isArray(allRegistrations) 
                    ? allRegistrations.filter(r => r.sessionId === session.id && r.status === "validated").length 
                    : 0;
                  const isFull = enrolledCount >= session.capacity;
                  const isClickable = existingInterest?.status === "approved" && !isFull;
                  
                  return (
                    <SessionCard
                      key={session.id}
                      session={session}
                      instructorName="Pierre Bernard"
                      enrolledCount={enrolledCount}
                      isSelected={selectedSession?.id === session.id}
                      isFull={isFull}
                      onClick={isClickable ? () => handleSessionSelect(session) : undefined}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <Card className="p-16 text-center shadow-md rounded-3xl border border-dashed border-border/60 bg-background/95">
              <div className="bg-muted p-5 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Calendar className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold text-primary mb-3">Aucune session planifiée</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Manifestez votre intérêt pour cette formation. Les RH organiseront les sessions en fonction de la demande.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Reviews Section */}
      <section className="space-y-6" id="formation-reviews">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold text-primary">Avis des participants</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Partagez votre expérience et découvrez les retours des autres collaborateurs ayant suivi cette formation.
            </p>
          </div>
          {reviewsVisible && (formation.reviewCount ?? 0) > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/95 px-4 py-2 shadow-sm">
              <RatingStars value={formation.averageRating ?? 0} />
              <div className="leading-none">
                <p className="text-2xl font-semibold text-foreground">
                  {formation.averageRating?.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formation.reviewCount} avis publiés
                </p>
              </div>
            </div>
          )}
        </div>

        {canLeaveReview && (
          <Card className="rounded-3xl border border-border/60 bg-background/95 p-6 shadow-md">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-primary">
                    {userReview ? "Mettre à jour votre avis" : "Donner votre avis"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Notez la formation sur 5 étoiles et partagez un retour pour aider vos collègues.
                  </p>
                </div>
                <RatingStars
                  value={ratingValue}
                  onChange={setRatingValue}
                  readOnly={false}
                  size="lg"
                />
              </div>

              <Textarea
                value={commentValue}
                onChange={(event) => setCommentValue(event.target.value)}
                placeholder="Qu'avez-vous pensé de cette formation ? Mentionnez l'impact, l'animation, les points forts..."
                rows={4}
              />

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                {userReview ? (
                  <p className="text-xs text-muted-foreground">
                    Dernière mise à jour le {new Date(userReview.updatedAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Votre avis sera visible par l'ensemble des collaborateurs une fois validé par les RH.
                  </p>
                )}
                <Button
                  onClick={handleSubmitReview}
                  disabled={submitReviewMutation.isPending}
                  className="md:w-auto"
                >
                  {submitReviewMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : userReview ? (
                    "Mettre à jour mon avis"
                  ) : (
                    "Publier mon avis"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!canLeaveReview && (
          <Card className="rounded-3xl border border-dashed border-border/60 bg-background/95 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Avis disponible après la formation</h3>
                <p className="text-sm text-muted-foreground">
                  Terminez la formation pour pouvoir partager votre retour d'expérience.
                </p>
              </div>
            </div>
          </Card>
        )}

        {isLoadingReviews ? (
          <Card className="rounded-3xl border border-border/60 bg-background/95 p-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des avis...
            </div>
          </Card>
        ) : reviewsVisible ? (
          hasReviews ? (
            reviewsGrid
          ) : (
            <Card className="rounded-3xl border border-border/60 bg-background/95 p-8 text-center text-sm text-muted-foreground">
              Aucun avis n'a encore été publié pour cette formation.
            </Card>
          )
        ) : (
          <div className="space-y-4">
            <Alert className="border border-border/80 bg-background/90">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Les avis sont actuellement masqués par l'équipe RH. Ils resteront accessibles dès qu'ils seront réactivés.
              </AlertDescription>
            </Alert>
            {hasReviews && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Vous pouvez toujours consulter et modifier votre propre avis.
                </p>
                {reviewsGrid}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Express Interest Dialog */}
      <Dialog open={showInterestDialog} onOpenChange={setShowInterestDialog}>
        <DialogContent className="max-w-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">Manifester votre intérêt</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Sélectionnez votre niveau de priorité pour cette formation. Les RH seront informés et organiseront 
              les sessions en fonction de la demande. <strong>Vous serez notifié dès qu'une session sera disponible.</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <PrioritySelector
              value={selectedPriority}
              onChange={setSelectedPriority}
              p1Available={p1Available}
              p2Available={p2Available}
            />
          </div>

          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowInterestDialog(false)} 
              data-testid="button-cancel-interest"
              disabled={expressInterestMutation.isPending}
            >
              Annuler
            </Button>
            <Button 
              onClick={confirmExpressInterest} 
              className="shadow-md" 
              data-testid="button-confirm-interest"
              disabled={expressInterestMutation.isPending}
            >
              {expressInterestMutation.isPending ? "Envoi en cours..." : "Confirmer mon intérêt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Enrollment Dialog */}
      <Dialog open={showEnrollmentDialog} onOpenChange={setShowEnrollmentDialog}>
        <DialogContent className="max-w-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">Confirmer votre inscription</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Vous êtes sur le point de vous inscrire à cette session. Votre demande sera soumise à validation par les RH.
            </DialogDescription>
          </DialogHeader>

          {selectedSession && (
            <Card className="p-6 border-accent/30">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-accent" />
                  <span className="font-medium">
                    {new Date(selectedSession.startDate).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {selectedSession.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{selectedSession.location}</span>
                  </div>
                )}
                {existingInterest && (
                  <Badge variant={existingInterest.priority === "P1" ? "destructive" : existingInterest.priority === "P2" ? "default" : "secondary"}>
                    Priorité {existingInterest.priority}
                  </Badge>
                )}
              </div>
            </Card>
          )}

          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEnrollmentDialog(false);
                setSelectedSession(null);
              }}
              data-testid="button-cancel-enrollment"
              disabled={enrollMutation.isPending}
            >
              Annuler
            </Button>
            <Button 
              onClick={confirmEnrollment} 
              className="shadow-md" 
              data-testid="button-confirm-enrollment"
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending ? "Inscription en cours..." : "Confirmer l'inscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Interest Confirmation Dialog */}
      <Dialog open={showCancelInterestDialog} onOpenChange={setShowCancelInterestDialog}>
        <DialogContent data-testid="dialog-confirm-cancel-interest">
          <DialogHeader>
            <DialogTitle className="text-destructive">Annuler votre intention de formation ?</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Êtes-vous sûr de vouloir annuler votre intention de formation pour "{formation.title}" ?
              {existingInterest && (existingInterest.priority === "P1" || existingInterest.priority === "P2") && (
                <strong className="block mt-2">
                  Votre quota {existingInterest.priority} vous sera remboursé.
                </strong>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowCancelInterestDialog(false)}
              disabled={deleteInterestMutation.isPending}
              data-testid="button-cancel-cancel-interest"
            >
              Non, garder
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => existingInterest && deleteInterestMutation.mutate(existingInterest.id)}
              disabled={deleteInterestMutation.isPending}
              data-testid="button-confirm-cancel-interest"
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
    </div>
  );
}
