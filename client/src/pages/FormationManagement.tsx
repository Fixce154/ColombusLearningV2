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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2, Loader2, BookOpen } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Formation } from "@shared/schema";
import { insertFormationSchema } from "@shared/schema";
import { z } from "zod";

const formationFormSchema = insertFormationSchema.extend({
  tags: z.string().optional(),
  content: z.string().optional(),
});

type FormationFormData = z.infer<typeof formationFormSchema>;

export default function FormationManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFormation, setEditingFormation] = useState<Formation | null>(null);
  const [deleteFormation, setDeleteFormation] = useState<Formation | null>(null);
  const { toast } = useToast();

  const { data: formations = [], isLoading } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
    queryFn: async () => {
      const res = await fetch("/api/formations?active=false", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch formations");
      return res.json();
    },
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const form = useForm<FormationFormData>({
    resolver: zodResolver(formationFormSchema),
    defaultValues: {
      title: "",
      description: "",
      objectives: "",
      prerequisites: "",
      content: "",
      duration: "",
      modality: "presentiel",
      seniorityRequired: undefined,
      theme: "",
      tags: "",
      active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormationFormData) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        content: data.content || "",
      };
      return apiRequest("/api/formations", "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formations"] });
      toast({
        title: "Formation créée",
        description: "La formation a été ajoutée au catalogue avec succès",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de créer la formation",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormationFormData }) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        content: data.content || "",
      };
      return apiRequest(`/api/formations/${id}`, "PATCH", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formations"] });
      toast({
        title: "Formation mise à jour",
        description: "Les modifications ont été enregistrées avec succès",
      });
      setIsDialogOpen(false);
      setEditingFormation(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la formation",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/formations/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formations"] });
      toast({
        title: "Formation supprimée",
        description: "La formation a été retirée du catalogue",
      });
      setDeleteFormation(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de supprimer la formation",
      });
    },
  });

  const handleCreate = () => {
    setEditingFormation(null);
    form.reset({
      title: "",
      description: "",
      objectives: "",
      prerequisites: "",
      content: "",
      duration: "",
      modality: "presentiel",
      seniorityRequired: undefined,
      theme: "",
      tags: "",
      active: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (formation: Formation) => {
    setEditingFormation(formation);
    form.reset({
      title: formation.title,
      description: formation.description,
      objectives: formation.objectives,
      prerequisites: formation.prerequisites || "",
      content: formation.content || "",
      duration: formation.duration,
      modality: formation.modality,
      seniorityRequired: formation.seniorityRequired || undefined,
      theme: formation.theme,
      tags: formation.tags?.join(", ") || "",
      active: formation.active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: FormationFormData) => {
    if (editingFormation) {
      updateMutation.mutate({ id: editingFormation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-12">
      <section className="surface-elevated relative overflow-hidden rounded-[2rem] px-12 py-14">
        <div className="pointer-events-none absolute inset-y-8 right-0 hidden w-72 rounded-l-[32px] bg-[radial-gradient(circle_at_center,rgba(10,132,255,0.12),transparent_60%)] md:block" />
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-5">
            <p className="eyebrow text-muted-foreground">Administration RH</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">Gestion du catalogue</h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Créez, mettez à jour et publiez les formations accessibles à vos consultants.
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-4">
            <div className="rounded-2xl border border-white/40 bg-white/80 p-5 text-[#00313F] shadow-sm backdrop-blur">
              <p className="text-sm font-semibold">Formations répertoriées</p>
              <p className="text-3xl font-bold">{formations.length}</p>
              <p className="text-xs text-[#00313F]/70">Inclut les parcours actifs et en préparation</p>
            </div>
            <Button
              className="h-12 rounded-xl text-sm font-semibold"
              onClick={handleCreate}
              data-testid="button-create-formation"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle formation
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <Card className="rounded-[1.75rem] border border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Catalogue des formations</span>
              <Badge variant="secondary" data-testid="count-formations">
                {formations.length} formation{formations.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : formations.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BookOpen className="h-8 w-8" />
                </div>
                <p className="font-medium">Aucune formation dans le catalogue</p>
                <p className="mt-2 text-sm">Créez votre première formation pour commencer</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Thème</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Modalité</TableHead>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formations.map((formation) => (
                    <TableRow key={formation.id} data-testid={`row-formation-${formation.id}`}>
                      <TableCell className="font-medium">{formation.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{formation.theme}</Badge>
                      </TableCell>
                      <TableCell>{formation.duration}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            formation.modality === "presentiel"
                              ? "default"
                              : formation.modality === "distanciel"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {formation.modality === "presentiel"
                            ? "Présentiel"
                            : formation.modality === "distanciel"
                            ? "Distanciel"
                            : "Hybride"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formation.seniorityRequired || <span className="text-muted-foreground">Tous niveaux</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={formation.active ? "default" : "secondary"}>
                          {formation.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(formation)}
                            data-testid={`button-edit-${formation.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteFormation(formation)}
                            data-testid={`button-delete-${formation.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFormation ? "Modifier la formation" : "Créer une nouvelle formation"}
            </DialogTitle>
            <DialogDescription>
              {editingFormation
                ? "Modifiez les détails de la formation existante"
                : "Ajoutez une nouvelle formation au catalogue"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-formation-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thème *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ex: Développement, Management, Data..." data-testid="input-formation-theme" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durée *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ex: 2 jours, 3h30" data-testid="input-formation-duration" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="modality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modalité *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-formation-modality">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="presentiel">Présentiel</SelectItem>
                            <SelectItem value="distanciel">Distanciel</SelectItem>
                            <SelectItem value="hybride">Hybride</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="seniorityRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Niveau requis</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "__NONE__" ? undefined : value)} 
                        value={field.value ?? "__NONE__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-formation-seniority">
                            <SelectValue placeholder="Tous niveaux" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__NONE__">Tous niveaux</SelectItem>
                          <SelectItem value="junior">Junior</SelectItem>
                          <SelectItem value="confirme">Confirmé</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="textarea-formation-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="objectives"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objectifs pédagogiques *</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="textarea-formation-objectives" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prerequisites"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prérequis</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} rows={2} data-testid="textarea-formation-prerequisites" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contenu détaillé</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={6}
                          placeholder="Décrivez le programme, les activités, les points clés..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (séparés par des virgules)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ex: React, Frontend, JavaScript" data-testid="input-formation-tags" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Formation active</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Désactivez pour retirer du catalogue sans supprimer
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                          data-testid="switch-formation-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isPending}
                    data-testid="button-cancel-formation"
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isPending} data-testid="button-save-formation">
                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingFormation ? "Enregistrer" : "Créer"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFormation} onOpenChange={() => setDeleteFormation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>Êtes-vous sûr de vouloir supprimer la formation :</p>
                <p className="mt-2 font-semibold">{deleteFormation?.title}</p>
                <p className="mt-2 text-destructive">
                  Cette action est irréversible et supprimera également toutes les sessions associées.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFormation && deleteMutation.mutate(deleteFormation.id)}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
