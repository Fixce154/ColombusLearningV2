import { useQuery, useMutation } from "@tanstack/react-query";
import type { Formation, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, MapPin, Plus, X } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function InstructorFormations() {
  const { toast } = useToast();

  const { data: currentUserData, isLoading: isLoadingCurrentUser } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  // Fetch all formations
  const { data: allFormations = [], isLoading: isLoadingFormations } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
  });

  // Fetch instructor's selected formation IDs
  const { data: myFormationIds = [], isLoading: isLoadingMyFormations } = useQuery<string[]>({
    queryKey: ["/api/instructor/formations"],
  });

  // Add formation mutation
  const addFormationMutation = useMutation({
    mutationFn: async (formationId: string) => {
      return apiRequest(`/api/instructor/formations/${formationId}`, "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/formations"] });
      toast({
        title: "Formation ajoutée",
        description: "La formation a été ajoutée à votre liste",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter la formation",
        variant: "destructive",
      });
    },
  });

  // Remove formation mutation
  const removeFormationMutation = useMutation({
    mutationFn: async (formationId: string) => {
      return apiRequest(`/api/instructor/formations/${formationId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/formations"] });
      toast({
        title: "Formation retirée",
        description: "La formation a été retirée de votre liste",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer la formation",
        variant: "destructive",
      });
    },
  });

  const isLoading = isLoadingFormations || isLoadingMyFormations || isLoadingCurrentUser;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  const isExternalInstructor = currentUserData?.user.roles.includes("formateur_externe") ?? false;
  const allowSelfManagement = currentUserData ? !isExternalInstructor : false;

  // Filter formations into two lists
  const validMyFormationIds = Array.isArray(myFormationIds) ? myFormationIds : [];
  const myFormations = allFormations.filter(f => validMyFormationIds.includes(f.id));
  const availableFormations = allowSelfManagement
    ? allFormations.filter(f => !validMyFormationIds.includes(f.id))
    : [];

  const FormationCard = ({ 
    formation, 
    isSelected, 
    onAdd, 
    onRemove 
  }: { 
    formation: Formation; 
    isSelected: boolean;
    onAdd?: (id: string) => void;
    onRemove?: (id: string) => void;
  }) => (
    <Card className="hover-elevate" data-testid={`card-formation-${formation.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 mb-2">
          <CardTitle className="text-lg font-semibold line-clamp-2">
            {formation.title}
          </CardTitle>
          <Badge variant="outline" className="flex-shrink-0">
            {formation.theme}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {formation.description}
        </p>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{formation.duration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            <span className="capitalize">{formation.modality}</span>
          </div>
        </div>

        {formation.seniorityRequired && (
          <Badge variant="secondary" className="capitalize">
            {formation.seniorityRequired}
          </Badge>
        )}

        {isSelected && onRemove ? (
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => onRemove(formation.id)}
            disabled={removeFormationMutation.isPending}
            data-testid={`button-remove-formation-${formation.id}`}
          >
            <X className="w-4 h-4 mr-2" />
            Retirer
          </Button>
        ) : onAdd ? (
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => onAdd(formation.id)}
            disabled={addFormationMutation.isPending}
            data-testid={`button-add-formation-${formation.id}`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-12">
      <section className="surface-elevated relative overflow-hidden rounded-[2rem] px-12 py-14">
        <div className="pointer-events-none absolute inset-y-8 right-0 hidden w-72 rounded-l-[32px] bg-[radial-gradient(circle_at_center,rgba(10,132,255,0.12),transparent_60%)] md:block" />
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-5">
            <p className="eyebrow text-muted-foreground">Espace formateur</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Pilotez vos formations
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Visualisez les formations que vous animez et complétez votre catalogue personnel en toute autonomie.
            </p>
          </div>
        </div>
      </section>

      {/* My Formations Section */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Mes formations</h2>
          <p className="text-muted-foreground">Les formations que vous animez en tant que formateur</p>
        </div>

        {myFormations.length === 0 ? (
          <Card className="surface-tonal rounded-[1.75rem] border-none">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Vous n'animez aucune formation pour le moment.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {allowSelfManagement
                  ? "Sélectionnez des formations dans le catalogue ci-dessous."
                  : "Contactez l'équipe RH pour mettre à jour vos formations animées."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {myFormations.map((formation) => (
              <FormationCard
                key={formation.id}
                formation={formation}
                isSelected={true}
                onRemove={allowSelfManagement ? (id) => removeFormationMutation.mutate(id) : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {/* Catalog Section */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Catalogue des formations</h2>
          <p className="text-muted-foreground">
            {allowSelfManagement
              ? "Sélectionnez les formations que vous souhaitez animer"
              : "Les formations animées sont assignées par l'équipe RH."}
          </p>
        </div>

        {!allowSelfManagement ? (
          <Alert>
            <AlertDescription>
              Les formateurs externes ne peuvent pas modifier leur catalogue. Veuillez contacter l'équipe RH pour toute
              évolution.
            </AlertDescription>
          </Alert>
        ) : availableFormations.length === 0 ? (
          <Card className="surface-tonal rounded-[1.75rem] border-none">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {myFormations.length === allFormations.length
                  ? "Vous animez déjà toutes les formations disponibles."
                  : "Aucune formation supplémentaire disponible pour le moment."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {availableFormations.map((formation) => (
              <FormationCard
                key={formation.id}
                formation={formation}
                isSelected={false}
                onAdd={(id) => addFormationMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
