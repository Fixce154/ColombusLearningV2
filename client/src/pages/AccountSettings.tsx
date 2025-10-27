import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Shield } from "lucide-react";

const optionalTextField = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().optional(),
);

const optionalPasswordField = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() || undefined : value),
  z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères")
    .optional(),
);

const profileSchema = z
  .object({
    firstName: z.string().min(1, "Le prénom est requis"),
    lastName: z.string().min(1, "Le nom est requis"),
    email: z.string().email("Email invalide"),
    employeeId: optionalTextField,
    hireDate: optionalTextField,
    grade: optionalTextField,
    jobRole: optionalTextField,
    businessUnit: optionalTextField,
    currentPassword: optionalTextField,
    newPassword: optionalPasswordField,
    confirmPassword: optionalTextField,
  })
  .superRefine((data, ctx) => {
    if (data.newPassword) {
      if (!data.currentPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le mot de passe actuel est requis",
          path: ["currentPassword"],
        });
      }

      if (!data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Veuillez confirmer le nouveau mot de passe",
          path: ["confirmPassword"],
        });
      } else if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Les mots de passe ne correspondent pas",
          path: ["confirmPassword"],
        });
      }
    }
  });

export type ProfileFormData = z.infer<typeof profileSchema>;

interface AccountSettingsProps {
  currentUser: User;
}

const extractNameParts = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

export default function AccountSettings({ currentUser }: AccountSettingsProps) {
  const { toast } = useToast();
  const nameParts = useMemo(() => extractNameParts(currentUser.name), [currentUser.name]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      email: currentUser.email,
      employeeId: currentUser.employeeId ?? "",
      hireDate: currentUser.hireDate ? format(new Date(currentUser.hireDate), "yyyy-MM-dd") : "",
      grade: currentUser.grade ?? "",
      jobRole: currentUser.jobRole ?? "",
      businessUnit: currentUser.businessUnit ?? "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    form.reset({
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      email: currentUser.email,
      employeeId: currentUser.employeeId ?? "",
      hireDate: currentUser.hireDate ? format(new Date(currentUser.hireDate), "yyyy-MM-dd") : "",
      grade: currentUser.grade ?? "",
      jobRole: currentUser.jobRole ?? "",
      businessUnit: currentUser.businessUnit ?? "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }, [currentUser, form, nameParts.firstName, nameParts.lastName]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const payload: Record<string, unknown> = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        employeeId: data.employeeId ?? "",
        hireDate: data.hireDate ?? "",
        grade: data.grade ?? "",
        jobRole: data.jobRole ?? "",
        businessUnit: data.businessUnit ?? "",
      };

      if (data.newPassword) {
        payload.currentPassword = data.currentPassword ?? "";
        payload.newPassword = data.newPassword;
      }

      return apiRequest("/api/users/me", "PATCH", payload);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profil mis à jour",
        description: "Vos informations personnelles ont été enregistrées.",
      });

      const updatedUser: User | undefined = response?.user;
      if (updatedUser) {
        const parts = extractNameParts(updatedUser.name);
        form.reset({
          firstName: parts.firstName,
          lastName: parts.lastName,
          email: updatedUser.email,
          employeeId: updatedUser.employeeId ?? "",
          hireDate: updatedUser.hireDate ? format(new Date(updatedUser.hireDate), "yyyy-MM-dd") : "",
          grade: updatedUser.grade ?? "",
          jobRole: updatedUser.jobRole ?? "",
          businessUnit: updatedUser.businessUnit ?? "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        form.reset({
          ...form.getValues(),
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Mise à jour impossible",
        description: error?.message || "Une erreur est survenue lors de la mise à jour de votre profil.",
      });
    },
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Mes informations</h1>
        <p className="text-muted-foreground">
          Consultez et mettez à jour vos informations personnelles ainsi que votre mot de passe.
        </p>
      </div>

      <Form {...form}>
        <form
          className="grid gap-6 md:grid-cols-2"
          onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))}
        >
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>
                Ces informations sont utilisées pour vous identifier dans Colombus Learning.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="Jean" {...field} disabled={updateProfileMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Dupont" {...field} disabled={updateProfileMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Email professionnel</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="prenom.nom@colombus.fr"
                        {...field}
                        disabled={updateProfileMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matricule</FormLabel>
                    <FormControl>
                      <Input placeholder="CLB1234" {...field} disabled={updateProfileMutation.isPending} />
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
                      <Input type="date" {...field} disabled={updateProfileMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade</FormLabel>
                    <FormControl>
                      <Input placeholder="Consultant confirmé" {...field} disabled={updateProfileMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <FormControl>
                      <Input placeholder="Product Owner" {...field} disabled={updateProfileMutation.isPending} />
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
                    <FormLabel>Unité d'affaires</FormLabel>
                    <FormControl>
                      <Input placeholder="Digital Factory" {...field} disabled={updateProfileMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Mot de passe</CardTitle>
                  <CardDescription>
                    Saisissez votre mot de passe actuel pour en définir un nouveau.
                  </CardDescription>
                </div>
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe actuel</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} disabled={updateProfileMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouveau mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} disabled={updateProfileMutation.isPending} />
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
                      <Input type="password" autoComplete="new-password" {...field} disabled={updateProfileMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
