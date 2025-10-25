import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Formation } from "@shared/schema";

const createExternalInstructorSchema = z
  .object({
    name: z.string().min(1, "Le nom est requis"),
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    confirmPassword: z.string().min(6, "Veuillez confirmer le mot de passe"),
    businessUnit: z.string().optional(),
    formationIds: z.array(z.string()).min(1, "Sélectionnez au moins une formation"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas",
  });

export type CreateExternalInstructorFormData = z.infer<typeof createExternalInstructorSchema>;

interface CreateExternalInstructorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateExternalInstructorDialog({
  open,
  onOpenChange,
}: CreateExternalInstructorDialogProps) {
  const { toast } = useToast();
  const form = useForm<CreateExternalInstructorFormData>({
    resolver: zodResolver(createExternalInstructorSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      businessUnit: "",
      formationIds: [],
    },
  });

  const { data: formations = [], isLoading: isLoadingFormations } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateExternalInstructorFormData) => {
      return apiRequest("/api/admin/users", "POST", {
        name: data.name,
        email: data.email,
        password: data.password,
        businessUnit: data.businessUnit?.trim() ? data.businessUnit.trim() : undefined,
        roles: ["formateur_externe"],
        formationIds: data.formationIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/instructor-formations"] });
      toast({
        title: "Formateur externe créé",
        description: "Le compte formateur externe a été créé avec succès.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Création impossible",
        description: error?.message || "Une erreur est survenue lors de la création du compte.",
      });
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un formateur externe</DialogTitle>
          <DialogDescription>
            Renseignez les informations du formateur externe. Un email et un mot de passe temporaires lui seront communiqués.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Claire Leroux" disabled={mutation.isPending} />
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
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="businessUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Structure / Organisation (optionnel)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Partenaire externe" disabled={mutation.isPending} />
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
                    <FormLabel>Mot de passe initial</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••" disabled={mutation.isPending} />
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
                    <FormLabel>Confirmation du mot de passe</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••" disabled={mutation.isPending} />
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
                const selected = field.value || [];
                return (
                  <FormItem>
                    <FormLabel>Formations animées</FormLabel>
                    <FormDescription>
                      Sélectionnez les formations que ce formateur externe pourra animer.
                    </FormDescription>
                    <div className="border rounded-md">
                      <ScrollArea className="h-48">
                        <div className="p-3 space-y-2">
                          {isLoadingFormations ? (
                            <p className="text-sm text-muted-foreground">Chargement des formations...</p>
                          ) : formations.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Aucune formation active n'est disponible pour le moment.
                            </p>
                          ) : (
                            formations.map((formation) => {
                              const isChecked = selected.includes(formation.id);
                              return (
                                <Label
                                  key={formation.id}
                                  className="flex items-start gap-3 rounded-md border border-border/60 p-3 text-sm hover:bg-muted"
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      if (checked === true) {
                                        field.onChange(Array.from(new Set([...selected, formation.id])));
                                      } else {
                                        field.onChange(selected.filter((id) => id !== formation.id));
                                      }
                                    }}
                                    disabled={mutation.isPending}
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
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
