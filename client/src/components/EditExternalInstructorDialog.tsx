import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Formation, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const editExternalInstructorSchema = z
  .object({
    name: z.string().min(1, "Le nom est requis"),
    email: z.string().email("Email invalide"),
    businessUnit: z.string().optional(),
    password: z.union([z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"), z.literal("")]).optional(),
    confirmPassword: z
      .union([z.string().min(6, "La confirmation doit contenir au moins 6 caractères"), z.literal("")])
      .optional(),
    formationIds: z.array(z.string()).min(1, "Sélectionnez au moins une formation"),
  })
  .refine(
    (data) => {
      if ((data.password && data.password !== "") || (data.confirmPassword && data.confirmPassword !== "")) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      path: ["confirmPassword"],
      message: "Les mots de passe ne correspondent pas",
    }
  );

export type EditExternalInstructorFormData = z.infer<typeof editExternalInstructorSchema>;

interface EditExternalInstructorDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditExternalInstructorDialog({ userId, open, onOpenChange }: EditExternalInstructorDialogProps) {
  const { toast } = useToast();

  const { data: formations = [], isLoading: isLoadingFormations } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
  });

  const instructorQuery = useQuery<{ user: User & { formationIds?: string[] } }>({
    queryKey: ["/api/admin/users", userId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Impossible de charger le formateur");
      }
      return res.json();
    },
    enabled: open && !!userId,
    staleTime: 0,
    retry: false,
  });

  const instructorDetails = instructorQuery.data?.user;
  const isLoadingInstructor = instructorQuery.isLoading;

  useEffect(() => {
    if (instructorQuery.isError) {
      const error = instructorQuery.error as Error;
      toast({
        variant: "destructive",
        title: "Chargement impossible",
        description: error.message || "Une erreur est survenue lors du chargement du formateur.",
      });
    }
  }, [instructorQuery.isError, instructorQuery.error, toast]);

  const form = useForm<EditExternalInstructorFormData>({
    resolver: zodResolver(editExternalInstructorSchema),
    defaultValues: {
      name: "",
      email: "",
      businessUnit: "",
      password: "",
      confirmPassword: "",
      formationIds: [],
    },
  });

  useEffect(() => {
    if (open && instructorDetails) {
      form.reset({
        name: instructorDetails.name,
        email: instructorDetails.email,
        businessUnit: instructorDetails.businessUnit ?? "",
        password: "",
        confirmPassword: "",
        formationIds: instructorDetails.formationIds ?? [],
      });
    }
    if (!open) {
      form.reset({
        name: "",
        email: "",
        businessUnit: "",
        password: "",
        confirmPassword: "",
        formationIds: [],
      });
    }
  }, [open, instructorDetails, form]);

  const mutation = useMutation({
    mutationFn: async (data: EditExternalInstructorFormData) => {
      if (!userId) {
        throw new Error("Identifiant formateur manquant");
      }
      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        roles: instructorDetails?.roles ?? ["formateur_externe"],
        formationIds: data.formationIds,
      };

      const businessUnit = data.businessUnit?.trim();
      if (businessUnit !== undefined) {
        payload.businessUnit = businessUnit.length > 0 ? businessUnit : null;
      }

      const password = data.password && data.password.length > 0 ? data.password : undefined;
      if (password) {
        payload.password = password;
      }

      return apiRequest(`/api/admin/users/${userId}`, "PATCH", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/instructor-formations"] });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users", userId] });
      }
      toast({
        title: "Formateur mis à jour",
        description: "Les informations du formateur externe ont été sauvegardées.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Mise à jour impossible",
        description: error?.message || "Une erreur est survenue lors de la mise à jour.",
      });
    },
  });

  const handleSubmit = (data: EditExternalInstructorFormData) => {
    if (!userId) return;
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier le formateur externe</DialogTitle>
          <DialogDescription>
            Actualisez les informations, les accès et les formations animées par ce formateur externe.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Claire Leroux" disabled={mutation.isPending || isLoadingInstructor} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email professionnel</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="formateur.externe@partenaire.com"
                        disabled={mutation.isPending || isLoadingInstructor}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="businessUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Structure / Organisation</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Partenaire externe"
                      disabled={mutation.isPending || isLoadingInstructor}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouveau mot de passe</FormLabel>
                    <FormDescription>Laissez vide pour conserver le mot de passe actuel.</FormDescription>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        disabled={mutation.isPending || isLoadingInstructor}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmation</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        disabled={mutation.isPending || isLoadingInstructor}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="formationIds"
              render={({ field }) => {
                const currentValue = field.value || [];
                return (
                  <FormItem>
                    <FormLabel>Formations animées</FormLabel>
                    <FormDescription>
                      Cocher les formations qui doivent apparaître dans l'espace formateur de ce profil.
                    </FormDescription>
                    <div className="border rounded-md">
                      <ScrollArea className="h-48">
                        <div className="p-3 space-y-2">
                          {isLoadingFormations || isLoadingInstructor ? (
                            <p className="text-sm text-muted-foreground">Chargement des formations...</p>
                          ) : formations.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Aucune formation active n'est disponible pour le moment.
                            </p>
                          ) : (
                            formations.map((formation) => {
                              const isChecked = currentValue.includes(formation.id);
                              return (
                                <Label
                                  key={formation.id}
                                  className="flex items-start gap-3 rounded-md border border-border/60 p-3 text-sm hover:bg-muted"
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    disabled={mutation.isPending || isLoadingInstructor}
                                    onCheckedChange={(checked) => {
                                      if (checked === true) {
                                        const updated = Array.from(new Set([...currentValue, formation.id]));
                                        field.onChange(updated);
                                      } else {
                                        field.onChange(currentValue.filter((id) => id !== formation.id));
                                      }
                                    }}
                                  />
                                  <div>
                                    <p className="font-medium leading-tight">{formation.title}</p>
                                    <p className="text-xs text-muted-foreground leading-tight">
                                      {formation.duration} • {formation.modality === "distanciel" ? "Distanciel" : formation.modality === "presentiel" ? "Présentiel" : "Hybride"}
                                    </p>
                                  </div>
                                </Label>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={mutation.isPending || isLoadingInstructor}>
                {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
