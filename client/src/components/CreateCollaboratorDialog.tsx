import { useEffect, useMemo } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SENIORITY_LEVELS, type SeniorityLevel } from "@shared/schema";

const createCollaboratorSchema = z
  .object({
    accountType: z.enum(["collaborateur", "formateur_externe"]),
    lastName: z.string().min(1, "Le nom est requis"),
    firstName: z.string().min(1, "Le prénom est requis"),
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    confirmPassword: z.string().min(6, "Veuillez confirmer le mot de passe"),
    employeeId: z.string().optional(),
    hireDate: z.string().optional(),
    role: z.enum(["consultant", "rh"]).optional(),
    seniority: z.enum(SENIORITY_LEVELS).optional(),
    businessUnit: z.string().optional(),
    additionalAccess: z.array(z.enum(["rh", "coach"])).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas",
  })
  .superRefine((data, ctx) => {
    if (data.accountType === "collaborateur" && !data.role) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["role"],
        message: "Veuillez sélectionner un rôle",
      });
    }

    if (data.accountType === "collaborateur" && !data.seniority) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seniority"],
        message: "Veuillez sélectionner une séniorité",
      });
    }

    if (data.accountType !== "collaborateur" && (data.seniority || data.role)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: data.seniority ? ["seniority"] : ["role"],
        message: data.seniority
          ? "La séniorité ne s'applique qu'aux collaborateurs"
          : "Le rôle est réservé aux collaborateurs",
      });
    }
  });

export type CreateCollaboratorFormData = z.infer<typeof createCollaboratorSchema>;

interface CreateCollaboratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCOUNT_TYPES_LABELS: Record<CreateCollaboratorFormData["accountType"], string> = {
  collaborateur: "Collaborateur",
  formateur_externe: "Formateur externe",
};

type AdditionalAccess = "rh" | "coach";

const ACCESS_LABELS: Record<AdditionalAccess, string> = {
  rh: "Accès RH",
  coach: "Coach",
};

export default function CreateCollaboratorDialog({ open, onOpenChange }: CreateCollaboratorDialogProps) {
  const { toast } = useToast();
  const form = useForm<CreateCollaboratorFormData>({
    resolver: zodResolver(createCollaboratorSchema),
    defaultValues: {
      accountType: "collaborateur",
      lastName: "",
      firstName: "",
      email: "",
      password: "",
      confirmPassword: "",
      employeeId: "",
      hireDate: "",
      role: "consultant",
      seniority: SENIORITY_LEVELS[0],
      businessUnit: "",
      additionalAccess: [],
    },
  });

  const accountType = form.watch("accountType");
  const seniority = form.watch("seniority");
  const selectedRole = form.watch("role");
  const isCollaborator = accountType === "collaborateur";

  const mutation = useMutation({
    mutationFn: async (data: CreateCollaboratorFormData) => {
      const accessSet = new Set<string>();

      if (data.accountType === "collaborateur") {
        if (data.role === "rh") {
          accessSet.add("rh");
        }
        accessSet.add("consultant");
      }

      if (data.accountType === "formateur_externe") {
        accessSet.add("formateur_externe");
      }

      (data.additionalAccess || []).forEach((access) => {
        if (access === "rh") {
          accessSet.add("rh");
          accessSet.add("consultant");
        }
        if (access === "coach") {
          accessSet.add("coach");
          accessSet.add("consultant");
        }
      });

      if (accessSet.size === 0) {
        accessSet.add("consultant");
      }

      const hireDateValue = data.hireDate?.trim()
        ? new Date(data.hireDate.trim()).toISOString()
        : undefined;

      return apiRequest("/api/admin/users", "POST", {
        name: `${data.firstName.trim()} ${data.lastName.trim()}`.trim(),
        email: data.email,
        password: data.password,
        roles: Array.from(accessSet),
        employeeId: data.employeeId?.trim() ? data.employeeId.trim() : undefined,
        hireDate: hireDateValue,
        seniority: data.seniority ?? undefined,
        businessUnit: data.businessUnit?.trim() ? data.businessUnit.trim() : undefined,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: `${ACCOUNT_TYPES_LABELS[variables.accountType]} créé(e)`,
        description: `Le profil ${ACCOUNT_TYPES_LABELS[variables.accountType].toLowerCase()} a été enregistré avec succès.`,
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Création impossible",
        description: error?.message || "Une erreur est survenue lors de la création du profil.",
      });
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  useEffect(() => {
    if (!isCollaborator) {
      form.setValue("employeeId", "");
      form.setValue("hireDate", "");
      form.setValue("seniority", undefined);
      form.setValue("role", undefined);
      form.setValue("additionalAccess", []);
    } else {
      const role = form.getValues("role");
      if (!role) {
        form.setValue("role", "consultant");
      }

      if (role === "consultant" && !seniority) {
        form.setValue("seniority", SENIORITY_LEVELS[0]);
      }

      if (role && role !== "consultant") {
        form.setValue("seniority", undefined);
      }
    }
  }, [form, isCollaborator, seniority, selectedRole]);

  const accessOptions = useMemo<AdditionalAccess[]>(() => (isCollaborator ? ["rh", "coach"] : []), [isCollaborator]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouveau collaborateur</DialogTitle>
          <DialogDescription>
            Choisissez le type de profil à créer puis renseignez les informations nécessaires. Un mot de passe initial pourra
            être communiqué à la personne concernée.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de profil</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as CreateCollaboratorFormData["accountType"])}
                      disabled={mutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="collaborateur">Collaborateur</SelectItem>
                        <SelectItem value="formateur_externe">Formateur externe</SelectItem>
                      </SelectContent>
                    </Select>
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
                        placeholder="prenom.nom@colombus.fr"
                        disabled={mutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Dupont" disabled={mutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Marie" disabled={mutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isCollaborator ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matricule</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="C12345" disabled={mutation.isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'entrée</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" disabled={mutation.isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seniority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Séniorité</FormLabel>
                      <Select
                        value={field.value ?? undefined}
                      onValueChange={(value) => field.onChange(value as SeniorityLevel)}
                        disabled={
                          mutation.isPending || selectedRole !== "consultant"
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une séniorité" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SENIORITY_LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rôle</FormLabel>
                      <Select
                        value={field.value ?? undefined}
                        onValueChange={(value) => field.onChange(value as CreateCollaboratorFormData["role"])}
                        disabled={mutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un rôle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="consultant">Consultant</SelectItem>
                          <SelectItem value="rh">Fonction transverse</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="businessUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Structure / Organisation</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Partenaire externe" disabled={mutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isCollaborator && accessOptions.length > 0 ? (
              <FormField
                control={form.control}
                name="additionalAccess"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accès supplémentaires</FormLabel>
                    <div className="flex flex-wrap gap-4 pt-1">
                      {accessOptions.map((option) => (
                        <label key={option} className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Checkbox
                            checked={field.value?.includes(option) || false}
                            onCheckedChange={(checked) => {
                              const value = field.value || [];
                              if (checked) {
                                field.onChange([...value, option]);
                              } else {
                                field.onChange(value.filter((item) => item !== option));
                              }
                            }}
                            disabled={mutation.isPending}
                          />
                          {ACCESS_LABELS[option]}
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

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
                {mutation.isPending ? "Création en cours..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
