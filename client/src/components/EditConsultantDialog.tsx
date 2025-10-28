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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { SENIORITY_LEVELS, type SeniorityLevel, type User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const editConsultantSchema = z
  .object({
    firstName: z.string().min(1, "Le prénom est requis"),
    lastName: z.string().min(1, "Le nom est requis"),
    email: z.string().email("Email invalide"),
    employeeId: z.string().optional(),
    hireDate: z.string().optional(),
    role: z.enum(["consultant", "rh"]),
    seniority: z.enum(SENIORITY_LEVELS).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "consultant" && !data.seniority) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seniority"],
        message: "La séniorité est requise pour les consultants",
      });
    }

    if (data.role !== "consultant" && data.seniority) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seniority"],
        message: "La séniorité ne concerne que les consultants",
      });
    }
  });

export type EditConsultantFormData = z.infer<typeof editConsultantSchema>;

interface EditConsultantDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const splitName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

const derivePrimaryRole = (roles: string[]): "consultant" | "rh" => {
  return roles.includes("rh") ? "rh" : "consultant";
};

const resolveSeniority = (value: string | null | undefined): SeniorityLevel | undefined => {
  return value && SENIORITY_LEVELS.includes(value as SeniorityLevel)
    ? (value as SeniorityLevel)
    : undefined;
};

const computeRoles = (roles: string[], selectedRole: "consultant" | "rh") => {
  const normalized = new Set(roles);
  if (selectedRole === "rh") {
    normalized.add("rh");
    normalized.add("consultant");
  } else {
    normalized.delete("rh");
    normalized.add("consultant");
  }
  return Array.from(normalized);
};

export default function EditConsultantDialog({ user, open, onOpenChange }: EditConsultantDialogProps) {
  const { toast } = useToast();

  const form = useForm<EditConsultantFormData>({
    resolver: zodResolver(editConsultantSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      employeeId: "",
      hireDate: "",
      role: "consultant",
      seniority: SENIORITY_LEVELS[0],
    },
  });

  const selectedRole = form.watch("role");

  const defaultSeniority = useMemo(() => {
    if (!user) return SENIORITY_LEVELS[0];
    const resolved = resolveSeniority(user.seniority);
    if (resolved) {
      return resolved;
    }
    const baseRole = derivePrimaryRole(user.roles);
    return baseRole === "consultant" ? SENIORITY_LEVELS[0] : undefined;
  }, [user]);

  useEffect(() => {
    if (selectedRole !== "consultant") {
      form.setValue("seniority", undefined);
    } else {
      const currentSeniority = form.getValues("seniority");
      if (!currentSeniority) {
        form.setValue("seniority", defaultSeniority ?? SENIORITY_LEVELS[0]);
      }
    }
  }, [selectedRole, form, defaultSeniority]);

  useEffect(() => {
    if (open && user) {
      const nameParts = splitName(user.name);
      const primaryRole = derivePrimaryRole(user.roles);
      const seniorityValue = resolveSeniority(user.seniority);
      form.reset({
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        email: user.email,
        employeeId: user.employeeId ?? "",
        hireDate: user.hireDate ? new Date(user.hireDate).toISOString().slice(0, 10) : "",
        role: primaryRole,
        seniority: seniorityValue ?? (primaryRole === "consultant" ? SENIORITY_LEVELS[0] : undefined),
      });
    }

    if (!open) {
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        employeeId: "",
        hireDate: "",
        role: "consultant",
        seniority: SENIORITY_LEVELS[0],
      });
    }
  }, [open, user, form]);

  const mutation = useMutation({
    mutationFn: async (data: EditConsultantFormData) => {
      if (!user) {
        throw new Error("Collaborateur introuvable");
      }

      const payload: Record<string, unknown> = {
        name: `${data.firstName.trim()} ${data.lastName.trim()}`.trim(),
        email: data.email.trim(),
        roles: computeRoles(user.roles, data.role),
      };

      const employeeId = data.employeeId?.trim();
      payload.employeeId = employeeId && employeeId.length > 0 ? employeeId : null;

      if (data.role === "consultant") {
        payload.seniority = data.seniority ?? null;
      } else {
        payload.seniority = null;
      }

      if (data.hireDate?.trim()) {
        const parsedDate = new Date(data.hireDate);
        if (!Number.isNaN(parsedDate.getTime())) {
          payload.hireDate = parsedDate.toISOString();
        } else {
          payload.hireDate = null;
        }
      } else {
        payload.hireDate = null;
      }

      return apiRequest(`/api/admin/users/${user.id}`, "PATCH", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Profil mis à jour",
        description: "Les informations du collaborateur ont été enregistrées.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Mise à jour impossible",
        description: error?.message || "Une erreur est survenue lors de la mise à jour du collaborateur.",
      });
    },
  });

  const handleSubmit = (data: EditConsultantFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Modifier le collaborateur</DialogTitle>
          <DialogDescription>
            Actualisez les informations personnelles et le rôle du collaborateur sélectionné.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                      <Input {...field} placeholder="Jean" disabled={mutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email professionnel</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="prenom.nom@colombus.fr" disabled={mutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matricule</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="CLB1234" disabled={mutation.isPending} />
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as EditConsultantFormData["role"])}
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

              <FormField
                control={form.control}
                name="seniority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Séniorité</FormLabel>
                    <Select
                      value={field.value ?? undefined}
                      onValueChange={(value) => field.onChange(value as SeniorityLevel)}
                      disabled={mutation.isPending || selectedRole !== "consultant"}
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
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                Annuler
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
