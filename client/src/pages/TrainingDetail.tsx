import { useState } from "react";
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
import { ArrowLeft, Clock, Target, BookOpen, Calendar, AlertCircle, CheckCircle, Loader2, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Formation, Session, Registration, FormationInterest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface TrainingDetailProps {
  currentUser: User;
}

export default function TrainingDetail({ currentUser }: TrainingDetailProps) {
  const [, params] = useRoute("/training/:id");
  const [, setLocation] = useLocation();
  const [selectedPriority, setSelectedPriority] = useState<"P1" | "P2" | "P3">("P3");
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const { toast } = useToast();

  // Fetch formation
  const { data: formation, isLoading: isLoadingFormation } = useQuery<Formation>({
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

  const p1Available = (currentUser.p1Used || 0) < 1;
  const p2Available = (currentUser.p2Used || 0) < 1;

  // Check if user has already expressed interest for this formation
  const existingInterest = interests.find(i => i.formationId === formation.id && i.status !== "withdrawn");

  return (
    <div className="space-y-8">
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
                <div className="space-y-2">
                  <p className="font-semibold">Intérêt manifesté avec priorité {existingInterest.priority}</p>
                  <p>
                    Les RH ont été informés de votre intérêt pour cette formation. Ils vont organiser les sessions en fonction de la demande. 
                    Vous serez notifié dès qu'une session sera disponible.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {existingInterest.status === "approved" && (
            <Alert className="border-accent/50 bg-accent/10">
              <CheckCircle className="w-5 h-5 text-accent" />
              <AlertDescription className="text-foreground">
                Votre intérêt a été <strong>validé par les RH</strong>. Des sessions vont être organisées prochainement.
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
      <div className="space-y-6">
        <div className="flex items-start gap-3 flex-wrap">
          {formation.seniorityRequired && <SeniorityBadge seniority={formation.seniorityRequired} />}
          <ModalityBadge modality={formation.modality as "presentiel" | "distanciel" | "hybride"} />
          <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5 gap-1.5 border font-medium">
            <Clock className="w-3.5 h-3.5" />
            {formation.duration}
          </Badge>
          <Badge className="bg-secondary text-secondary-foreground px-3 py-1.5 font-medium">{formation.theme}</Badge>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-primary tracking-tight mb-2" data-testid="text-training-title">
            {formation.title}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">{formation.description}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="description" className="w-full">
        <TabsList className="h-12 bg-muted p-1 shadow-sm">
          <TabsTrigger value="description" className="px-6 font-medium">Description</TabsTrigger>
          <TabsTrigger value="sessions" className="px-6 font-medium gap-2">
            <Calendar className="w-4 h-4" />
            Sessions ({sessions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="space-y-6 mt-8">
          <Card className="p-8 shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-accent/10 p-2.5 rounded-lg">
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
              <h2 className="text-2xl font-semibold text-primary">Description détaillée</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed text-base">{formation.description}</p>
          </Card>

          <Card className="p-8 shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-primary">Objectifs pédagogiques</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed text-base">{formation.objectives}</p>
          </Card>

          {formation.prerequisites && (
            <Card className="p-8 shadow-md">
              <h2 className="text-xl font-semibold text-primary mb-4">Prérequis</h2>
              <p className="text-muted-foreground leading-relaxed text-base">{formation.prerequisites}</p>
            </Card>
          )}

          {formation.tags && formation.tags.length > 0 && (
            <Card className="p-8 shadow-md">
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

        <TabsContent value="sessions" className="space-y-6 mt-8">
          {sessions.length > 0 ? (
            <>
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-primary mb-2">Sessions disponibles</h3>
                <p className="text-sm text-muted-foreground">
                  Sélectionnez une session pour vous inscrire. Les places sont limitées.
                </p>
              </div>
              
              {existingRegistration && existingRegistration.status !== "cancelled" && (
                <Alert className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <AlertDescription className="text-foreground">
                    Une place vous est <strong>réservée</strong> pour cette formation pendant la validation de votre inscription.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-4">
                {sessions.map((session) => {
                  // For demo, using a simple calculation - in real app this would come from registration count
                  const enrolledCount = Math.floor(Math.random() * (session.capacity - 2)) + 2;
                  const isFull = enrolledCount >= session.capacity;
                  const isUserRegistered = registrations.some(r => r.sessionId === session.id);
                  
                  return (
                    <SessionCard
                      key={session.id}
                      session={session}
                      instructorName="Pierre Bernard"
                      enrolledCount={enrolledCount}
                      isSelected={selectedSession === session.id}
                      isFull={isFull || isUserRegistered}
                      onClick={() => !isFull && !isUserRegistered && setSelectedSession(session.id)}
                    />
                  );
                })}
              </div>

              {selectedSession && !existingRegistration && (
                <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t shadow-lg pt-6 -mx-6 px-6 pb-6">
                  <Button 
                    size="lg" 
                    className="w-full shadow-md" 
                    onClick={handleEnroll} 
                    data-testid="button-enroll"
                    disabled={enrollMutation.isPending}
                  >
                    {enrollMutation.isPending ? "Inscription en cours..." : "S'inscrire à cette session"}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card className="p-16 text-center shadow-md">
              <div className="bg-muted p-5 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Calendar className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold text-primary mb-3">Aucune session planifiée</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Les prochaines sessions seront bientôt disponibles. Vous serez notifié dès qu'une date sera confirmée.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Seniority Alert Dialog */}
      <AlertDialog open={showSeniorityAlert} onOpenChange={setShowSeniorityAlert}>
        <AlertDialogContent className="shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl text-primary">Niveau de séniorité requis</AlertDialogTitle>
            <AlertDialogDescription className="text-base leading-relaxed pt-2">
              Cette formation est recommandée pour les profils <strong>{formation.seniorityRequired}</strong>. Votre niveau actuel est{" "}
              <strong>{currentUser.seniority}</strong>. Souhaitez-vous tout de même soumettre votre demande d'inscription ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-seniority">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => setShowEnrollDialog(true)} data-testid="button-confirm-seniority">
              Continuer l'inscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="max-w-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">Inscription à la formation</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Sélectionnez votre niveau de priorité pour cette formation. Votre demande sera soumise au service RH pour
              validation. <strong>Une place vous sera réservée pendant l'examen de votre demande.</strong>
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
              onClick={() => setShowEnrollDialog(false)} 
              data-testid="button-cancel-enroll"
              disabled={enrollMutation.isPending}
            >
              Annuler
            </Button>
            <Button 
              onClick={confirmEnroll} 
              className="shadow-md" 
              data-testid="button-confirm-enroll"
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending ? "Inscription..." : "Confirmer l'inscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
