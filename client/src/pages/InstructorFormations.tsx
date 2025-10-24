import { useQuery, useMutation } from "@tanstack/react-query";
import type { Formation } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, MapPin, Plus, X } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function InstructorFormations() {
  const { toast } = useToast();

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

  const isLoading = isLoadingFormations || isLoadingMyFormations;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  // Filter formations into two lists
  const validMyFormationIds = Array.isArray(myFormationIds) ? myFormationIds : [];
  const myFormations = allFormations.filter(f => validMyFormationIds.includes(f.id));
  const availableFormations = allFormations.filter(f => !validMyFormationIds.includes(f.id));

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
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      {/* My Formations Section */}
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Mes Formations</h1>
          <p className="text-muted-foreground">
            Les formations que vous animez en tant que formateur
          </p>
        </div>

        {myFormations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Vous n'animez aucune formation pour le moment.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Sélectionnez des formations dans le catalogue ci-dessous.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myFormations.map((formation) => (
              <FormationCard
                key={formation.id}
                formation={formation}
                isSelected={true}
                onRemove={(id) => removeFormationMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Catalog Section */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">Catalogue des formations</h2>
          <p className="text-muted-foreground">
            Sélectionnez les formations que vous souhaitez animer
          </p>
        </div>

        {availableFormations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Toutes les formations disponibles ont été ajoutées à votre liste.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </div>
    </div>
  );
}
