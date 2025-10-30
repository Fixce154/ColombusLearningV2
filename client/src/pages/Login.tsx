import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SENIORITY_LEVELS, type SeniorityLevel, type User } from "@shared/schema";
import logoWhite from "@/assets/logo-white.png";
import logoBlue from "@/assets/logo-blue.png";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

const registerSchema = z
  .object({
    firstName: z.string().min(1, "Le prénom est requis"),
    lastName: z.string().min(1, "Le nom est requis"),
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    role: z.enum(["consultant", "rh"]),
    seniority: z.enum(SENIORITY_LEVELS).optional(),
    employeeId: z.string().optional(),
    hireDate: z.string().optional(),
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

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "consultant",
      seniority: SENIORITY_LEVELS[0],
      employeeId: "",
      hireDate: "",
    },
  });

  const selectedRole = registerForm.watch("role");
  const selectedSeniority = registerForm.watch("seniority");

  useEffect(() => {
    if (selectedRole !== "consultant" && selectedSeniority) {
      registerForm.setValue("seniority", undefined);
    }

    if (selectedRole === "consultant" && !selectedSeniority) {
      registerForm.setValue("seniority", SENIORITY_LEVELS[0]);
    }
  }, [registerForm, selectedRole, selectedSeniority]);

  const onLogin = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const response: { user: User } = await apiRequest("/api/auth/login", "POST", data);
      onLoginSuccess(response.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (err: any) {
      setError(err.message || "Échec de la connexion");
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const payload: Record<string, unknown> = {
        email: data.email.trim(),
        password: data.password,
        role: data.role,
        name: `${data.firstName.trim()} ${data.lastName.trim()}`.trim(),
      };

      const employeeId = data.employeeId?.trim();
      if (employeeId) {
        payload.employeeId = employeeId;
      }

      const hireDate = data.hireDate?.trim();
      if (hireDate) {
        const parsedDate = new Date(hireDate);
        if (!Number.isNaN(parsedDate.getTime())) {
          payload.hireDate = parsedDate.toISOString();
        }
      }

      if (data.seniority && data.role === "consultant") {
        payload.seniority = data.seniority;
      }

      const response: { user: User } = await apiRequest("/api/auth/register", "POST", payload);
      onLoginSuccess(response.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (err: any) {
      setError(err.message || "Échec de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { email: "marie.dupont@colombus.fr", role: "Consultant", password: "password" },
    { email: "sophie.martin@colombus.fr", role: "RH", password: "password" },
    { email: "thomas.petit@colombus.fr", role: "Consultant Junior", password: "password" },
    { email: "claire.leroux@colombus.fr", role: "Formateur externe", password: "password" },
    { email: "laure.rousseau@colombus.fr", role: "Coach", password: "password" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="surface-elevated relative w-full max-w-2xl space-y-8 rounded-[2.5rem] px-12 py-14">
        <div className="mx-auto flex items-center justify-center">
          <img 
            src={logoBlue} 
            alt="Colombus Consulting" 
            className="h-20 w-auto dark:hidden"
          />
          <img 
            src={logoWhite} 
            alt="Colombus Consulting" 
            className="hidden h-20 w-auto dark:block"
          />
        </div>
        <div className="space-y-3 text-center">
          <p className="eyebrow text-muted-foreground">Portail sécurisé</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Colombus Learning</h1>
          <p className="text-sm text-muted-foreground">
            Accédez à votre espace de formation et gérez vos parcours en toute simplicité.
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-full bg-secondary p-1">
            <TabsTrigger value="login" data-testid="tab-login" className="rounded-full text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-foreground">
              Connexion
            </TabsTrigger>
            <TabsTrigger value="register" data-testid="tab-register" className="rounded-full text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-foreground">
              Inscription
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-8 space-y-5">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="votre.nom@colombus-consulting.fr"
                          data-testid="input-email"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          data-testid="input-password"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-xl bg-primary py-4 text-sm font-semibold text-white shadow-[0_24px_40px_-28px_rgba(10,132,255,0.65)] hover:bg-primary/90"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </Form>

            <div className="rounded-3xl border border-black/5 bg-secondary p-5">
              <p className="mb-3 text-sm text-muted-foreground text-center">Comptes de démonstration</p>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((account) => (
                  <Button
                    key={account.email}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      loginForm.setValue("email", account.email);
                      loginForm.setValue("password", account.password);
                    }}
                    data-testid={`button-demo-${account.role.toLowerCase()}`}
                    className="rounded-full border border-black/10 bg-white text-xs font-medium text-muted-foreground hover:border-primary/20 hover:text-primary"
                  >
                    {account.role}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="register" className="mt-8 space-y-4">
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={registerForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Dupont"
                            data-testid="input-last-name"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Jean"
                            data-testid="input-first-name"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="jean.dupont@colombus-consulting.fr"
                          data-testid="input-register-email"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          data-testid="input-register-password"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={registerForm.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Matricule (optionnel)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="CLB1234"
                            data-testid="input-employee-id"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date d'entrée (optionnel)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="date"
                            data-testid="input-hire-date"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={registerForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rôle</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="Sélectionnez votre rôle" />
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
                  control={registerForm.control}
                  name="seniority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Séniorité</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value as SeniorityLevel)
                        }
                        value={field.value ?? undefined}
                        disabled={isLoading || selectedRole !== "consultant"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-seniority">
                            <SelectValue placeholder="Sélectionnez votre niveau" />
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


                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-full bg-primary py-4 text-sm font-semibold text-white shadow-[0_24px_40px_-28px_rgba(10,132,255,0.65)] hover:bg-primary/90"
                  disabled={isLoading}
                  data-testid="button-register"
                >
                  {isLoading ? "Inscription..." : "Créer un compte"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
