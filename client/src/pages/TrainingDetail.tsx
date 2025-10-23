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
import { ArrowLeft, Clock, Target, BookOpen } from "lucide-react";
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
      <div className="text-center py-12">
        <p className="text-muted-foreground">Formation non trouvée</p>
        <Button variant="ghost" onClick={() => setLocation("/catalog")} className="mt-4">
          Retour au catalogue
        </Button>
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
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/catalog")} data-testid="button-back-to-catalog">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour au catalogue
      </Button>

      <div className="space-y-4">
        <div className="flex items-start gap-3 flex-wrap">
          {formation.seniorityRequired && <SeniorityBadge seniority={formation.seniorityRequired} />}
          <ModalityBadge modality={formation.modality as "presentiel" | "distanciel" | "hybride"} />
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            {formation.duration}
          </Badge>
          <Badge variant="outline">{formation.theme}</Badge>
        </div>

        <h1 className="text-3xl font-bold" data-testid="text-training-title">
          {formation.title}
        </h1>
      </div>

      <Tabs defaultValue="description" className="w-full">
        <TabsList>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="sessions">Sessions disponibles ({sessions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="space-y-6 mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Description
            </h2>
            <p className="text-muted-foreground">{formation.description}</p>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Objectifs pédagogiques
            </h2>
            <p className="text-muted-foreground">{formation.objectives}</p>
          </Card>

          {formation.prerequisites && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-3">Prérequis</h2>
              <p className="text-muted-foreground">{formation.prerequisites}</p>
            </Card>
          )}

          {formation.tags && formation.tags.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {formation.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6 mt-6">
          {sessions.length > 0 ? (
            <>
              <div className="space-y-3">
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
                <div className="sticky bottom-0 bg-background border-t pt-4">
                  <Button size="lg" className="w-full" onClick={handleEnroll} data-testid="button-enroll">
                    S'inscrire à cette session
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Aucune session n'est encore planifiée.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Vous serez notifié dès qu'une date sera disponible.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={showSeniorityAlert} onOpenChange={setShowSeniorityAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Niveau de séniorité requis</AlertDialogTitle>
            <AlertDialogDescription>
              Cette formation est réservée aux profils {formation.seniorityRequired}. Votre niveau actuel est{" "}
              {currentUser.seniority}. Souhaitez-vous tout de même demander votre inscription ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-seniority">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => setShowEnrollDialog(true)} data-testid="button-confirm-seniority">
              Continuer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inscription à la formation</DialogTitle>
            <DialogDescription>
              Sélectionnez votre niveau de priorité pour cette formation. Votre demande sera soumise aux RH pour
              validation.
            </DialogDescription>
          </DialogHeader>

          <PrioritySelector
            value={selectedPriority}
            onChange={setSelectedPriority}
            p1Available={p1Available}
            p2Available={p2Available}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrollDialog(false)} data-testid="button-cancel-enroll">
              Annuler
            </Button>
            <Button onClick={confirmEnroll} data-testid="button-confirm-enroll">
              Confirmer l'inscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
