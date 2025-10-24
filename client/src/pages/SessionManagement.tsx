import { useState } from "react";
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
import { Plus, Pencil, Trash2, Loader2, CalendarDays, MapPin, Users as UsersIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Session, Formation, User } from "@shared/schema";
import { insertSessionSchema } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { z } from "zod";

const sessionFormSchema = insertSessionSchema.extend({
  startDate: z.string(),
  endDate: z.string(),
});

type SessionFormData = z.infer<typeof sessionFormSchema>;

export default function SessionManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [deleteSession, setDeleteSession] = useState<Session | null>(null);
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
      const res = await fetch("/api/formations?activeOnly=false", { credentials: "include" });
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
      return users.filter((u: User) => u.role === "formateur");
    },
    retry: false,
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

  const isPending = createMutation.isPending || updateMutation.isPending;

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
                    <TableHead>Formation</TableHead>
                    <TableHead>Date de début</TableHead>
                    <TableHead>Date de fin</TableHead>
                    <TableHead>Lieu</TableHead>
                    <TableHead>Formateur</TableHead>
                    <TableHead>Capacité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => {
                    const formation = getFormation(session.formationId);
                    const instructor = getInstructor(session.instructorId);
                    return (
                      <TableRow key={session.id} data-testid={`row-session-${session.id}`}>
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
                            {session.capacity}
                          </div>
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
                        <TableCell className="text-right">
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de début *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} data-testid="input-session-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de fin *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} data-testid="input-session-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-session-instructor">
                            <SelectValue placeholder="Non assigné" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Non assigné</SelectItem>
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
