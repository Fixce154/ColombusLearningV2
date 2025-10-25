import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
import { Plus, Pencil, Trash2, Loader2, CalendarDays, MapPin, Users as UsersIcon, ChevronDown, ChevronRight, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Session, Formation, User, Registration } from "@shared/schema";
import { insertSessionSchema } from "@shared/schema";
import { isInstructor } from "@shared/roles";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { z } from "zod";
import PriorityBadge from "@/components/PriorityBadge";

const sessionFormSchema = insertSessionSchema.extend({
  startDate: z.string(),
  endDate: z.string(),
});

type SessionFormData = z.infer<typeof sessionFormSchema>;

export default function SessionManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [deleteSession, setDeleteSession] = useState<Session | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Array<{date: string, timeSlot: string, instructorId: string}>>([]);
  const { toast } = useToast();

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: formations = [] } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
    queryFn: async () => {
      const res = await fetch("/api/formations?active=false", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch formations");
      return res.json();
    },
  });

  const { data: instructors = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error("Failed to fetch users");
      const users = await res.json();
      return users.filter((u: User) => isInstructor(u.roles));
    },
    retry: false,
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/all"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    retry: false,
  });

  const { data: registrations = [] } = useQuery<Registration[]>({
    queryKey: ["/api/admin/registrations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/registrations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch registrations");
      return res.json();
    },
  });

  const { data: instructorFormations = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/instructor-formations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/instructor-formations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch instructor formations");
      return res.json();
    },
  });

  const { data: allAvailabilities = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/availabilities"],
    queryFn: async () => {
      const res = await fetch("/api/admin/availabilities", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch availabilities");
      return res.json();
    },
  });

  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      formationId: "",
      startDate: "",
      endDate: "",
      location: "",
      capacity: 10,
      instructorId: undefined,
      status: "open",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SessionFormData) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      };
      return apiRequest("/api/sessions", "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Session créée",
        description: "La session a été ajoutée avec succès",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de créer la session",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SessionFormData }) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      };
      return apiRequest(`/api/sessions/${id}`, "PATCH", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Session mise à jour",
        description: "Les modifications ont été enregistrées avec succès",
      });
      setIsDialogOpen(false);
      setEditingSession(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la session",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/sessions/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Session supprimée",
        description: "La session a été retirée du planning",
      });
      setDeleteSession(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de supprimer la session",
      });
    },
  });

  const handleCreate = () => {
    setEditingSession(null);
    setSelectedSlots([]);
    form.reset({
      formationId: "",
      startDate: "",
      endDate: "",
      location: "",
      capacity: 10,
      instructorId: undefined,
      status: "open",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    setSelectedSlots([]);
    form.reset({
      formationId: session.formationId,
      startDate: format(new Date(session.startDate), "yyyy-MM-dd'T'HH:mm"),
      endDate: format(new Date(session.endDate), "yyyy-MM-dd'T'HH:mm"),
      location: session.location || "",
      capacity: session.capacity,
      instructorId: session.instructorId || undefined,
      status: session.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: SessionFormData) => {
    if (editingSession) {
      updateMutation.mutate({ id: editingSession.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getFormation = (id: string) => formations.find(f => f.id === id);
  const getInstructor = (id: string | null | undefined) => id ? instructors.find(u => u.id === id) : null;
  const getUser = (id: string) => allUsers.find(u => u.id === id);
  
  const getSessionRegistrations = (sessionId: string) => {
    return registrations.filter(r => r.sessionId === sessionId && r.status === "validated");
  };

  const getRemainingSeats = (sessionId: string, capacity: number) => {
    const enrolledCount = getSessionRegistrations(sessionId).length;
    return capacity - enrolledCount;
  };

  const toggleSession = (sessionId: string) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  // Helper to get instructors and their availabilities for a specific formation
  const getFormationInstructorsWithAvailabilities = (formationId: string) => {
    // Get instructor IDs for this formation
    const instructorIds = instructorFormations
      .filter((inf: any) => inf.formationId === formationId)
      .map((inf: any) => inf.instructorId);

    // Get instructor details and their availabilities
    return instructorIds.map((instructorId: string) => {
      const instructor = instructors.find((i: User) => i.id === instructorId);
      const availability = allAvailabilities.find(
        (av: any) => av.instructorId === instructorId && av.formationId === formationId
      );
      return {
        instructor,
        availability,
      };
    }).filter((item: any) => item.instructor); // Filter out if instructor not found
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Reset selected slots and dates when formation changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "formationId") {
        setSelectedSlots([]);
        form.setValue("startDate", "");
        form.setValue("endDate", "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Sync selectedSlots to form dates
  useEffect(() => {
    if (selectedSlots.length === 0) {
      form.setValue("startDate", "");
      form.setValue("endDate", "");
      return;
    }

    // Sort slots by date
    const sortedSlots = [...selectedSlots].sort((a, b) => a.date.localeCompare(b.date));
    const firstSlot = sortedSlots[0];
    const lastSlot = sortedSlots[sortedSlots.length - 1];

    // Calculate start date/time based on first slot's timeSlot
    const startDate = new Date(firstSlot.date);
    if (firstSlot.timeSlot === 'morning') {
      startDate.setHours(9, 0, 0, 0);
    } else if (firstSlot.timeSlot === 'afternoon') {
      startDate.setHours(14, 0, 0, 0);
    } else {
      startDate.setHours(9, 0, 0, 0);
    }

    // Calculate end date/time based on last slot's timeSlot
    const endDate = new Date(lastSlot.date);
    if (lastSlot.timeSlot === 'morning') {
      endDate.setHours(12, 0, 0, 0);
    } else if (lastSlot.timeSlot === 'afternoon') {
      endDate.setHours(18, 0, 0, 0);
    } else {
      endDate.setHours(18, 0, 0, 0);
    }

    // Format for datetime-local input
    const formatForInput = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    form.setValue("startDate", formatForInput(startDate));
    form.setValue("endDate", formatForInput(endDate));
  }, [selectedSlots, form]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold flex items-center gap-3">
              <CalendarDays className="w-8 h-8 text-primary" />
              Gestion des Sessions
            </h1>
            <p className="text-muted-foreground mt-2">
              Planifiez et gérez les sessions de formation
            </p>
          </div>
          <Button
            onClick={handleCreate}
            data-testid="button-create-session"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Session
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Planning des Sessions</span>
              <Badge variant="secondary" data-testid="count-sessions">
                {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune session planifiée</p>
                <p className="text-sm mt-2">Créez votre première session pour commencer</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Formation</TableHead>
                    <TableHead>Date de début</TableHead>
                    <TableHead>Date de fin</TableHead>
                    <TableHead>Lieu</TableHead>
                    <TableHead>Formateur</TableHead>
                    <TableHead>Inscrits / Capacité</TableHead>
                    <TableHead>Places restantes</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => {
                    const formation = getFormation(session.formationId);
                    const instructor = getInstructor(session.instructorId);
                    const sessionRegs = getSessionRegistrations(session.id);
                    const remainingSeats = getRemainingSeats(session.id, session.capacity);
                    const isExpanded = expandedSession === session.id;
                    
                    return (
                      <React.Fragment key={`session-fragment-${session.id}`}>
                        <TableRow 
                          key={session.id} 
                          data-testid={`row-session-${session.id}`}
                          className="cursor-pointer hover-elevate"
                          onClick={() => toggleSession(session.id)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formation?.title || "Formation inconnue"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(session.startDate), "dd MMM yyyy HH:mm", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {format(new Date(session.endDate), "dd MMM yyyy HH:mm", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              {session.location || <span className="text-muted-foreground">Non défini</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {instructor?.name || <span className="text-muted-foreground">Non assigné</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UsersIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold">{sessionRegs.length}</span> / {session.capacity}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={remainingSeats > 0 ? "default" : "destructive"}>
                              {remainingSeats} {remainingSeats > 1 ? "places" : "place"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              session.status === "open" ? "default" :
                              session.status === "full" ? "secondary" :
                              session.status === "completed" ? "outline" : "destructive"
                            }>
                              {session.status === "open" ? "Ouvert" :
                               session.status === "full" ? "Complet" :
                               session.status === "completed" ? "Terminé" : "Annulé"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEdit(session)}
                                data-testid={`button-edit-${session.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteSession(session)}
                                data-testid={`button-delete-${session.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={10} className="bg-muted/30 p-4">
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                  <UsersIcon className="w-4 h-4" />
                                  Liste des inscrits ({sessionRegs.length})
                                </h4>
                                {sessionRegs.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Aucun inscrit pour le moment</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {sessionRegs.map((reg) => {
                                      const user = getUser(reg.userId);
                                      return (
                                        <div key={reg.id} className="flex items-center gap-2 text-sm bg-background p-2 rounded-md border">
                                          <div className="flex-1">
                                            <div className="font-medium">{user?.name || "Utilisateur inconnu"}</div>
                                            <div className="text-xs text-muted-foreground">
                                              {user?.businessUnit || ""} {user?.seniority ? `• ${user.seniority}` : ""}
                                            </div>
                                          </div>
                                          <PriorityBadge priority={reg.priority as "P1" | "P2" | "P3"} />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSession ? "Modifier la session" : "Créer une nouvelle session"}
              </DialogTitle>
              <DialogDescription>
                {editingSession 
                  ? "Modifiez les détails de la session existante"
                  : "Planifiez une nouvelle session de formation"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="formationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formation *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-session-formation">
                            <SelectValue placeholder="Sélectionnez une formation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {formations.filter(f => f.active).map((formation) => (
                            <SelectItem key={formation.id} value={formation.id}>
                              {formation.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Display instructors and their availabilities for the selected formation */}
                {form.watch("formationId") && (
                  <div className="space-y-3">
                    {/* Warning/Success Badges */}
                    {(() => {
                      const instructorsWithAvail = getFormationInstructorsWithAvailabilities(form.watch("formationId"));
                      const hasInstructors = instructorsWithAvail.length > 0;
                      const hasAvailabilities = instructorsWithAvail.some(({ availability }: any) => 
                        availability && availability.slots && Array.isArray(availability.slots) && availability.slots.length > 0
                      );

                      return (
                        <div className="flex flex-wrap gap-2">
                          {!hasInstructors && (
                            <Badge variant="destructive" className="flex items-center gap-1" data-testid="badge-no-instructor">
                              <AlertCircle className="w-3 h-3" />
                              Aucun formateur assigné
                            </Badge>
                          )}
                          {hasInstructors && !hasAvailabilities && (
                            <Badge variant="destructive" className="flex items-center gap-1" data-testid="badge-no-availability">
                              <AlertCircle className="w-3 h-3" />
                              Aucune disponibilité déclarée
                            </Badge>
                          )}
                          {hasInstructors && hasAvailabilities && (
                            <Badge variant="default" className="flex items-center gap-1 bg-green-600 hover:bg-green-700" data-testid="badge-ready">
                              <CheckCircle className="w-3 h-3" />
                              Formateurs et disponibilités OK
                            </Badge>
                          )}
                        </div>
                      );
                    })()}

                    {/* Instructor details */}
                    <div className="p-4 bg-muted/30 rounded-md border space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <UsersIcon className="w-4 h-4" />
                        Formateurs et disponibilités pour cette formation
                      </h4>
                      {(() => {
                        const instructorsWithAvail = getFormationInstructorsWithAvailabilities(form.watch("formationId"));
                        
                        if (instructorsWithAvail.length === 0) {
                          return (
                            <p className="text-sm text-muted-foreground">
                              Aucun formateur assigné à cette formation
                            </p>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {instructorsWithAvail.map(({ instructor, availability }: any) => (
                              <div key={instructor.id} className="bg-background p-3 rounded-md border space-y-2">
                                <div className="font-medium text-sm">{instructor.name}</div>
                                {availability && availability.slots && Array.isArray(availability.slots) && availability.slots.length > 0 ? (
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      Disponibilités :
                                    </div>
                                    <div className="grid grid-cols-1 gap-1">
                                      {[...availability.slots]
                                        .sort((a: any, b: any) => a.date.localeCompare(b.date))
                                        .map((slot: any, idx: number) => {
                                          const slotDate = new Date(slot.date);
                                          const timeSlotLabel = slot.timeSlot === 'full_day' ? 'Journée complète' :
                                                               slot.timeSlot === 'morning' ? 'Matin' : 'Après-midi';
                                          return (
                                            <div key={idx} className="text-xs flex items-center gap-2">
                                              <span className="font-mono">
                                                {format(slotDate, "EEE dd MMM yyyy", { locale: fr })}
                                              </span>
                                              <Badge variant="secondary" className="text-xs">
                                                {timeSlotLabel}
                                              </Badge>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    Aucune disponibilité saisie
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Slot Selection */}
                {form.watch("formationId") && (() => {
                  const instructorsWithAvail = getFormationInstructorsWithAvailabilities(form.watch("formationId"));
                  const allSlots: Array<{date: string, timeSlot: string, instructorId: string, instructorName: string}> = [];
                  
                  instructorsWithAvail.forEach(({ instructor, availability }: any) => {
                    if (availability && availability.slots && Array.isArray(availability.slots)) {
                      availability.slots.forEach((slot: any) => {
                        allSlots.push({
                          date: slot.date,
                          timeSlot: slot.timeSlot,
                          instructorId: instructor.id,
                          instructorName: instructor.name,
                        });
                      });
                    }
                  });

                  // Sort slots by date
                  allSlots.sort((a, b) => a.date.localeCompare(b.date));

                  const toggleSlot = (slot: {date: string, timeSlot: string, instructorId: string}) => {
                    const isSelected = selectedSlots.some(
                      s => s.date === slot.date && s.timeSlot === slot.timeSlot && s.instructorId === slot.instructorId
                    );
                    
                    if (isSelected) {
                      const newSlots = selectedSlots.filter(
                        s => !(s.date === slot.date && s.timeSlot === slot.timeSlot && s.instructorId === slot.instructorId)
                      );
                      setSelectedSlots(newSlots);
                    } else {
                      const newSlots = [...selectedSlots, slot];
                      setSelectedSlots(newSlots);
                    }
                  };

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <FormLabel>Créneaux de disponibilité *</FormLabel>
                        {selectedSlots.length > 0 && (
                          <Badge variant="secondary" data-testid="badge-selected-slots">
                            {selectedSlots.length} créneau{selectedSlots.length > 1 ? 'x' : ''} sélectionné{selectedSlots.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      
                      {allSlots.length === 0 ? (
                        <div className="p-4 bg-muted/30 rounded-md border text-sm text-muted-foreground text-center">
                          Aucun créneau de disponibilité déclaré pour cette formation
                        </div>
                      ) : (
                        <div className="p-4 bg-muted/30 rounded-md border space-y-2 max-h-60 overflow-y-auto">
                          {allSlots.map((slot, idx) => {
                            const isSelected = selectedSlots.some(
                              s => s.date === slot.date && s.timeSlot === slot.timeSlot && s.instructorId === slot.instructorId
                            );
                            const slotDate = new Date(slot.date);
                            const timeSlotLabel = slot.timeSlot === 'full_day' ? 'Journée complète' :
                                                 slot.timeSlot === 'morning' ? 'Matin' : 'Après-midi';
                            
                            return (
                              <div
                                key={`${slot.date}-${slot.timeSlot}-${slot.instructorId}`}
                                onClick={() => toggleSlot({ date: slot.date, timeSlot: slot.timeSlot, instructorId: slot.instructorId })}
                                className={`
                                  p-3 rounded-md border cursor-pointer transition-all
                                  ${isSelected 
                                    ? 'bg-primary/10 border-primary hover-elevate' 
                                    : 'bg-background hover-elevate active-elevate-2'
                                  }
                                `}
                                data-testid={`slot-${idx}`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">
                                      {format(slotDate, "EEEE dd MMMM yyyy", { locale: fr })}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Formateur: {slot.instructorName}
                                    </div>
                                  </div>
                                  <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                                    {timeSlotLabel}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {selectedSlots.length > 0 && form.getValues("startDate") && form.getValues("endDate") && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Période: {format(new Date(form.getValues("startDate")), "dd/MM/yyyy HH:mm", { locale: fr })} → {format(new Date(form.getValues("endDate")), "dd/MM/yyyy HH:mm", { locale: fr })}</div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lieu</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder="ex: Salle A, Visio Teams" data-testid="input-session-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacité *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-session-capacity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statut *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-session-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="open">Ouvert</SelectItem>
                            <SelectItem value="full">Complet</SelectItem>
                            <SelectItem value="completed">Terminé</SelectItem>
                            <SelectItem value="cancelled">Annulé</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="instructorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formateur</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "__NONE__" ? undefined : value)} 
                        value={field.value ?? "__NONE__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-session-instructor">
                            <SelectValue placeholder="Non assigné" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__NONE__">Non assigné</SelectItem>
                          {instructors.map((instructor) => (
                            <SelectItem key={instructor.id} value={instructor.id}>
                              {instructor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isPending}
                    data-testid="button-cancel-session"
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isPending} data-testid="button-save-session">
                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingSession ? "Enregistrer" : "Créer"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteSession} onOpenChange={() => setDeleteSession(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  <p>Êtes-vous sûr de vouloir supprimer cette session ?</p>
                  {deleteSession && (
                    <p className="font-semibold mt-2">
                      {getFormation(deleteSession.formationId)?.title} - {format(new Date(deleteSession.startDate), "dd MMM yyyy", { locale: fr })}
                    </p>
                  )}
                  <p className="mt-2 text-destructive">
                    Cette action est irréversible et annulera toutes les inscriptions associées.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteSession && deleteMutation.mutate(deleteSession.id)}
                data-testid="button-confirm-delete"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
