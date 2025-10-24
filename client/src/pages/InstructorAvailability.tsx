import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Plus, Trash2, Save, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Formation, InstructorAvailability } from "@shared/schema";

// Helper to extract number of days from duration string like "2 jours", "3 jours", "1 jour"
function extractDaysFromDuration(duration: string): number {
  const match = duration.match(/(\d+)\s*jour/i);
  return match ? parseInt(match[1], 10) : 0;
}

export default function InstructorAvailability() {
  const { toast } = useToast();
  const [selectedFormationId, setSelectedFormationId] = useState<string>("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Get all formations
  const { data: allFormations = [] } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
  });

  // Get instructor's formations (IDs)
  const { data: myFormationIds = [] } = useQuery<string[]>({
    queryKey: ["/api/instructor/formations"],
  });

  // Get instructor's availabilities
  const { data: availabilities = [] } = useQuery<InstructorAvailability[]>({
    queryKey: ["/api/instructor/availabilities"],
  });

  // Filter to get formations instructor teaches
  const myFormations = allFormations.filter(f => 
    Array.isArray(myFormationIds) && myFormationIds.includes(f.id)
  );

  // Get selected formation
  const selectedFormation = myFormations.find(f => f.id === selectedFormationId);
  const requiredDays = selectedFormation ? extractDaysFromDuration(selectedFormation.duration) : 0;

  // Get existing availability for selected formation
  const validAvailabilities = Array.isArray(availabilities) ? availabilities : [];
  const existingAvailability = validAvailabilities.find(
    a => a.formationId === selectedFormationId
  );

  // Mutation to save availability
  const saveMutation = useMutation({
    mutationFn: async (data: { formationId: string; dates: string[] }) => {
      return apiRequest("/api/instructor/availabilities", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/availabilities"] });
      toast({
        title: "Disponibilités enregistrées",
        description: "Vos disponibilités ont été mises à jour avec succès",
      });
      setSelectedDates([]);
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer les disponibilités",
        variant: "destructive",
      });
    },
  });

  // Mutation to delete availability
  const deleteMutation = useMutation({
    mutationFn: async (formationId: string) => {
      return apiRequest(`/api/instructor/availabilities/${formationId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/availabilities"] });
      toast({
        title: "Disponibilités supprimées",
        description: "Les disponibilités ont été supprimées avec succès",
      });
      setSelectedDates([]);
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer les disponibilités",
        variant: "destructive",
      });
    },
  });

  const handleFormationSelect = (formationId: string) => {
    setSelectedFormationId(formationId);
    setSelectedDates([]);
    setIsEditing(false);

    // Load existing dates if available
    const existing = validAvailabilities.find(a => a.formationId === formationId);
    if (existing && existing.dates) {
      setSelectedDates(existing.dates.map(d => new Date(d)));
    }
  };

  const handleAddDate = (date: Date | undefined) => {
    if (!date) return;
    
    // Check if date already selected
    const alreadySelected = selectedDates.some(
      d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    
    if (!alreadySelected) {
      setSelectedDates([...selectedDates, date]);
      setIsEditing(true);
    }
  };

  const handleRemoveDate = (index: number) => {
    setSelectedDates(selectedDates.filter((_, i) => i !== index));
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedFormationId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une formation",
        variant: "destructive",
      });
      return;
    }

    if (selectedDates.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir au moins une date",
        variant: "destructive",
      });
      return;
    }

    // Check for past dates
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day for comparison
    const hasPastDates = selectedDates.some(date => {
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      return dateOnly < now;
    });

    if (hasPastDates) {
      toast({
        title: "Dates invalides",
        description: "Vous ne pouvez pas sélectionner des dates dans le passé",
        variant: "destructive",
      });
      return;
    }

    if (selectedDates.length !== requiredDays) {
      let description;
      if (selectedDates.length < requiredDays) {
        const missing = requiredDays - selectedDates.length;
        description = `Il manque ${missing} jour${missing > 1 ? 's' : ''}. Cette formation dure ${requiredDays} jour${requiredDays > 1 ? 's' : ''}.`;
      } else {
        const extra = selectedDates.length - requiredDays;
        description = `Vous avez sélectionné ${extra} jour${extra > 1 ? 's' : ''} de trop. Cette formation dure ${requiredDays} jour${requiredDays > 1 ? 's' : ''}.`;
      }
      toast({
        title: "Durée incorrecte",
        description,
        variant: "destructive",
      });
      return;
    }

    // Sort dates chronologically
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());

    saveMutation.mutate({
      formationId: selectedFormationId,
      dates: sortedDates.map(d => d.toISOString()),
    });
  };

  const handleDelete = (formationId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ces disponibilités ?")) {
      deleteMutation.mutate(formationId);
    }
  };

  const handleCancel = () => {
    // Reload existing dates
    const existing = validAvailabilities.find(a => a.formationId === selectedFormationId);
    if (existing && existing.dates) {
      setSelectedDates(existing.dates.map(d => new Date(d)));
    } else {
      setSelectedDates([]);
    }
    setIsEditing(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Mes Disponibilités</h1>
        <p className="text-muted-foreground">
          Saisissez vos disponibilités pour chaque formation que vous animez
        </p>
      </div>

      {myFormations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">
              Aucune formation assignée
            </p>
            <p className="text-sm text-muted-foreground">
              Sélectionnez d'abord les formations que vous souhaitez animer dans l'onglet "Mes formations"
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Formation Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Sélectionnez une formation</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedFormationId} onValueChange={handleFormationSelect}>
                <SelectTrigger data-testid="select-formation">
                  <SelectValue placeholder="Choisir une formation..." />
                </SelectTrigger>
                <SelectContent>
                  {myFormations.map((formation) => (
                    <SelectItem key={formation.id} value={formation.id}>
                      {formation.title} - {formation.duration}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Date Selection */}
          {selectedFormation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Disponibilités pour {selectedFormation.title}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Durée : {selectedFormation.duration}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Picker */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Ajouter une date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="button-add-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Choisir une date
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={undefined}
                        onSelect={handleAddDate}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Selected Dates List */}
                {selectedDates.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Dates sélectionnées ({selectedDates.length}/{requiredDays})
                    </label>
                    <div className="space-y-2">
                      {selectedDates
                        .sort((a, b) => a.getTime() - b.getTime())
                        .map((date, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-md"
                            data-testid={`date-item-${index}`}
                          >
                            <span className="text-sm">
                              {format(date, "EEEE d MMMM yyyy", { locale: fr })}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveDate(index)}
                              data-testid={`button-remove-date-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                    </div>

                    {/* Validation Message */}
                    {selectedDates.length !== requiredDays && (
                      <p className="text-sm text-destructive mt-2">
                        {selectedDates.length < requiredDays 
                          ? `Il manque ${requiredDays - selectedDates.length} jour${requiredDays - selectedDates.length > 1 ? 's' : ''}`
                          : `Vous avez sélectionné ${selectedDates.length - requiredDays} jour${selectedDates.length - requiredDays > 1 ? 's' : ''} de trop`
                        }
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending || selectedDates.length === 0 || selectedDates.length !== requiredDays}
                    data-testid="button-save-availability"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                  {existingAvailability && (
                    <>
                      {isEditing && (
                        <Button
                          variant="outline"
                          onClick={handleCancel}
                          data-testid="button-cancel"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Annuler
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(selectedFormationId)}
                        disabled={deleteMutation.isPending}
                        data-testid="button-delete-availability"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Availabilities Summary */}
          {validAvailabilities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Récapitulatif de vos disponibilités</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {validAvailabilities.map((availability) => {
                    const formation = allFormations.find(f => f.id === availability.formationId);
                    if (!formation) return null;

                    const dates = Array.isArray(availability.dates) 
                      ? availability.dates.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime())
                      : [];

                    return (
                      <div
                        key={availability.id}
                        className="p-4 border rounded-md"
                        data-testid={`availability-${availability.formationId}`}
                      >
                        <div className="font-medium mb-2">{formation.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {dates.map((date, i) => (
                            <div key={i}>
                              • {format(date, "EEEE d MMMM yyyy", { locale: fr })}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
