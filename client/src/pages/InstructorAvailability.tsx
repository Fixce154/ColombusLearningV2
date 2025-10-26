import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Trash2, Save, X, Clock, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Formation, InstructorAvailability, AvailabilitySlot } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Helper to extract number of days from duration string like "2 jours", "3 jours", "1 jour"
function extractDaysFromDuration(duration: string): number {
  const match = duration.match(/(\d+)\s*jour/i);
  return match ? parseInt(match[1], 10) : 0;
}

// Time slot labels
const TIME_SLOT_LABELS: Record<string, string> = {
  full_day: "Journée complète",
  morning: "Matin",
  afternoon: "Après-midi",
};

export default function InstructorAvailability() {
  const { toast } = useToast();
  const [selectedFormationId, setSelectedFormationId] = useState<string>("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
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
    mutationFn: async (data: { formationId: string; slots: AvailabilitySlot[] }) => {
      return apiRequest("/api/instructor/availabilities", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/availabilities"] });
      toast({
        title: "Disponibilités enregistrées",
        description: "Vos disponibilités ont été mises à jour avec succès",
      });
      // useEffect will reload the data automatically
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
      // useEffect will reload the data automatically
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer les disponibilités",
        variant: "destructive",
      });
    },
  });

  // Synchronize slots and dates when existingAvailability changes
  useEffect(() => {
    if (selectedFormationId && existingAvailability && existingAvailability.slots && Array.isArray(existingAvailability.slots)) {
      const availSlots = existingAvailability.slots as AvailabilitySlot[];
      setSlots(availSlots);
      setSelectedDates(availSlots.map((s: AvailabilitySlot) => new Date(s.date)));
      setIsEditing(false);
    } else if (selectedFormationId && !existingAvailability) {
      // No existing availability for this formation
      setSlots([]);
      setSelectedDates([]);
      setIsEditing(false);
    }
  }, [selectedFormationId, existingAvailability]);

  const handleFormationSelect = (formationId: string) => {
    setSelectedFormationId(formationId);
    // Data will be loaded by useEffect
  };

  // Handle calendar date selection (multiple mode)
  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) {
      setSelectedDates([]);
      setSlots([]);
      return;
    }

    setSelectedDates(dates);
    setIsEditing(true);

    // Update slots: keep existing timeSlot for dates that were already selected, 
    // add new dates with default timeSlot 'full_day'
    const newSlots: AvailabilitySlot[] = dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const existingSlot = slots.find(s => s.date === dateStr);
      return existingSlot || { date: dateStr, timeSlot: 'full_day' };
    });

    setSlots(newSlots);
  };

  const handleTimeSlotChange = (dateStr: string, timeSlot: 'full_day' | 'morning' | 'afternoon') => {
    setSlots(prevSlots => 
      prevSlots.map(slot => 
        slot.date === dateStr ? { ...slot, timeSlot } : slot
      )
    );
    setIsEditing(true);
  };

  const handleRemoveSlot = (dateStr: string) => {
    setSlots(prevSlots => prevSlots.filter(slot => slot.date !== dateStr));
    setSelectedDates(prevDates => prevDates.filter(date => format(date, 'yyyy-MM-dd') !== dateStr));
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

    if (slots.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir au moins une disponibilité",
        variant: "destructive",
      });
      return;
    }

    // Check for past dates
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const hasPastDates = slots.some(slot => {
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);
      return slotDate < now;
    });

    if (hasPastDates) {
      toast({
        title: "Dates invalides",
        description: "Vous ne pouvez pas sélectionner des dates dans le passé",
        variant: "destructive",
      });
      return;
    }

    // Check for weekends
    const hasWeekends = slots.some(slot => {
      const slotDate = new Date(slot.date);
      const dayOfWeek = slotDate.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
    });

    if (hasWeekends) {
      toast({
        title: "Dates invalides",
        description: "Les disponibilités ne peuvent être saisies que du lundi au vendredi",
        variant: "destructive",
      });
      return;
    }

    // Sort slots by date before saving
    const sortedSlots = [...slots].sort((a, b) => a.date.localeCompare(b.date));

    saveMutation.mutate({
      formationId: selectedFormationId,
      slots: sortedSlots,
    });
  };

  const handleDelete = (formationId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ces disponibilités ?")) {
      deleteMutation.mutate(formationId);
    }
  };

  const handleCancel = () => {
    // Reload existing slots
    const existing = validAvailabilities.find(a => a.formationId === selectedFormationId);
    if (existing && existing.slots && Array.isArray(existing.slots)) {
      setSlots(existing.slots as AvailabilitySlot[]);
      setSelectedDates(existing.slots.map((s: AvailabilitySlot) => new Date(s.date)));
    } else {
      setSlots([]);
      setSelectedDates([]);
    }
    setIsEditing(false);
  };

  // Helper to check if a date is disabled (past date or weekend)
  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Disable past dates
    if (checkDate < today) return true;

    // Disable weekends (Sunday = 0, Saturday = 6)
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  // Count unique dates (days) from slots
  const uniqueDaysCount = slots.length;

  return (
    <div className="space-y-12">
      <section className="surface-elevated relative overflow-hidden rounded-[2rem] px-12 py-14">
        <div className="pointer-events-none absolute inset-y-8 right-0 hidden w-72 rounded-l-[32px] bg-[radial-gradient(circle_at_center,rgba(10,132,255,0.12),transparent_60%)] md:block" />
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-5">
            <p className="eyebrow text-muted-foreground">Espace formateur</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Partagez vos disponibilités
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Indiquez vos créneaux pour organiser vos futures sessions et permettre aux équipes de planifier rapidement.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground" data-testid="heading-availabilities">
            Mes disponibilités
          </h2>
          <p className="text-muted-foreground">
            Indiquez vos disponibilités pour les formations que vous enseignez
          </p>
        </div>

        {myFormations.length === 0 && (
          <Alert>
            <AlertDescription>
              Vous n'êtes affecté à aucune formation. Veuillez vous affecter à des formations depuis la page "Mes formations".
            </AlertDescription>
          </Alert>
        )}

        {myFormations.length > 0 && (
          <Card className="rounded-[1.5rem]">
            <CardHeader>
              <CardTitle>Sélectionnez une formation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedFormationId}
                onValueChange={handleFormationSelect}
                data-testid="select-formation"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une formation" />
                </SelectTrigger>
                <SelectContent>
                  {myFormations.map((formation) => (
                    <SelectItem key={formation.id} value={formation.id}>
                      {formation.title} ({formation.duration})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sélectionnez une formation pour consulter ou mettre à jour vos créneaux.
              </p>
            </CardContent>
          </Card>
        )}

        {selectedFormationId && (
          <Card className="rounded-[1.5rem]">
            <CardHeader>
              <CardTitle>
                Disponibilités pour {selectedFormation?.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Durée de la formation : {selectedFormation?.duration}
                {requiredDays > 0 && ` (${requiredDays} jour${requiredDays > 1 ? 's' : ''})`}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  <CalendarIcon className="w-4 h-4 inline mr-2" />
                  Sélectionnez vos dates disponibles
                </label>
                <div className="inline-block rounded-xl border bg-card p-4">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={handleDateSelect}
                    disabled={isDateDisabled}
                    locale={fr}
                    className="rounded-md"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ℹ️ Seuls les jours de semaine (lundi-vendredi) peuvent être sélectionnés
                </p>
              </div>

              {slots.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium block">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Vos disponibilités ({uniqueDaysCount} jour{uniqueDaysCount > 1 ? 's' : ''})
                  </label>
                  <div className="space-y-2">
                    {[...slots]
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((slot, index) => {
                        const date = new Date(slot.date);
                        return (
                          <div
                            key={slot.date}
                            className="flex flex-col gap-3 rounded-xl border bg-card/60 p-4 sm:flex-row sm:items-center"
                            data-testid={`slot-item-${index}`}
                          >
                            <span className="text-sm font-medium sm:min-w-[200px]">
                              {format(date, "EEEE d MMMM yyyy", { locale: fr })}
                            </span>
                            <Select
                              value={slot.timeSlot}
                              onValueChange={(value) =>
                                handleTimeSlotChange(slot.date, value as 'full_day' | 'morning' | 'afternoon')
                              }
                              data-testid={`select-timeslot-${index}`}
                            >
                              <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full_day">Journée complète</SelectItem>
                                <SelectItem value="morning">Matin</SelectItem>
                                <SelectItem value="afternoon">Après-midi</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveSlot(slot.date)}
                              data-testid={`button-remove-slot-${index}`}
                              className="self-start"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                  </div>

                  {requiredDays > 0 && uniqueDaysCount < requiredDays && (
                    <Alert className="mt-3">
                      <AlertDescription>
                        ⚠️ Il manque {requiredDays - uniqueDaysCount} jour{requiredDays - uniqueDaysCount > 1 ? 's' : ''} par rapport à la durée de la formation ({requiredDays} jour{requiredDays > 1 ? 's' : ''}). Vous pouvez quand même enregistrer si d'autres formateurs complètent les jours manquants.
                      </AlertDescription>
                    </Alert>
                  )}

                  {uniqueDaysCount > requiredDays && (
                    <Alert className="mt-3">
                      <AlertDescription>
                        ℹ️ Vous avez sélectionné {uniqueDaysCount - requiredDays} jour{uniqueDaysCount - requiredDays > 1 ? 's' : ''} de plus que la durée de la formation ({requiredDays} jour{requiredDays > 1 ? 's' : ''}).
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || slots.length === 0}
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

        {validAvailabilities.length > 0 && (
          <Card className="rounded-[1.5rem]">
            <CardHeader>
              <CardTitle>Récapitulatif de vos disponibilités</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {validAvailabilities.map((availability) => {
                  const formation = allFormations.find(f => f.id === availability.formationId);
                  if (!formation) return null;

                  const availSlots = Array.isArray(availability.slots)
                    ? (availability.slots as AvailabilitySlot[]).sort((a, b) => a.date.localeCompare(b.date))
                    : [];

                  return (
                    <div
                      key={availability.id}
                      className="rounded-xl border bg-card/60 p-4"
                      data-testid={`availability-${availability.formationId}`}
                    >
                      <div className="mb-3 font-medium">{formation.title}</div>
                      <div className="space-y-1">
                        {availSlots.map((slot, i) => {
                          const date = new Date(slot.date);
                          return (
                            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="font-medium">•</span>
                              <span>{format(date, "EEEE d MMMM yyyy", { locale: fr })}</span>
                              <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                                {TIME_SLOT_LABELS[slot.timeSlot]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
