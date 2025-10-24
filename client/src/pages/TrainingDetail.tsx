import { useState } from "react";
import { useRoute, useLocation } from "wouter";
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
import ModalityBadge from "@/components/ModalityBadge";
import SeniorityBadge from "@/components/SeniorityBadge";
import SessionCard from "@/components/SessionCard";
import PrioritySelector from "@/components/PrioritySelector";
import { ArrowLeft, Clock, Target, BookOpen, Calendar } from "lucide-react";
import { mockFormations, mockSessions, mockUsers } from "@/lib/mockData";
import type { User } from "@shared/schema";

interface TrainingDetailProps {
  currentUser: User;
}

export default function TrainingDetail({ currentUser }: TrainingDetailProps) {
  const [, params] = useRoute("/training/:id");
  const [, setLocation] = useLocation();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<"P1" | "P2" | "P3">("P3");
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showSeniorityAlert, setShowSeniorityAlert] = useState(false);

  // TODO: remove mock functionality
  const formation = mockFormations.find((f) => f.id === params?.id);
  const sessions = mockSessions.filter(
    (s) => s.formationId === params?.id && s.startDate > new Date()
  );

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

  const handleEnroll = () => {
    if (!selectedSession) return;

    if (isSeniorityMismatch) {
      setShowSeniorityAlert(true);
    } else {
      setShowEnrollDialog(true);
    }
  };

  const confirmEnroll = () => {
    console.log("Enrolling in session", selectedSession, "with priority", selectedPriority);
    setShowEnrollDialog(false);
    setShowSeniorityAlert(false);
    setLocation("/");
  };

  const p1Available = (currentUser.p1Used || 0) < 1;
  const p2Available = (currentUser.p2Used || 0) < 1;

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => setLocation("/catalog")} className="gap-2" data-testid="button-back-to-catalog">
        <ArrowLeft className="w-4 h-4" />
        Retour au catalogue
      </Button>

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
              
              <div className="space-y-4">
                {sessions.map((session) => {
                  const enrolledCount = Math.floor(Math.random() * 8) + 2;
                  const isFull = enrolledCount >= session.capacity;
                  return (
                    <SessionCard
                      key={session.id}
                      session={session}
                      instructorName="Pierre Bernard"
                      enrolledCount={enrolledCount}
                      isSelected={selectedSession === session.id}
                      isFull={isFull}
                      onClick={() => setSelectedSession(session.id)}
                    />
                  );
                })}
              </div>

              {selectedSession && (
                <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t shadow-lg pt-6 -mx-6 px-6 pb-6">
                  <Button size="lg" className="w-full shadow-md" onClick={handleEnroll} data-testid="button-enroll">
                    S'inscrire à cette session
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
              validation.
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
            <Button variant="outline" onClick={() => setShowEnrollDialog(false)} data-testid="button-cancel-enroll">
              Annuler
            </Button>
            <Button onClick={confirmEnroll} className="shadow-md" data-testid="button-confirm-enroll">
              Confirmer l'inscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
