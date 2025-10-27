import { useState } from "react";
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
import { GraduationCap, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  role: z.enum(["consultant", "rh", "formateur", "manager"]),
  seniority: z.enum(["junior", "confirme", "senior", "expert"]).optional(),
  businessUnit: z.string().optional(),
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
      email: "",
      password: "",
      name: "",
      role: "consultant",
      seniority: "junior",
      businessUnit: "",
    },
  });

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
      const response: { user: User } = await apiRequest("/api/auth/register", "POST", data);
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
    { email: "formateur.externe@formateur.com", role: "Formateur externe", password: "Formator" },
    { email: "laure.rousseau@colombus.fr", role: "Coach", password: "password" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="surface-elevated relative w-full max-w-2xl space-y-8 rounded-[2.5rem] px-12 py-14">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <GraduationCap className="h-8 w-8" />
        </div>
        <div className="space-y-3 text-center">
          <p className="eyebrow text-muted-foreground">Portail sécurisé</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Colombus Learning</h1>
          <p className="text-sm text-muted-foreground">
            Accédez à votre espace de formation personnalisée et gérez vos parcours en toute simplicité.
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
                          placeholder="votre.nom@colombus.fr"
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
                  className="w-full rounded-full bg-primary py-4 text-sm font-semibold text-white shadow-[0_24px_40px_-28px_rgba(10,132,255,0.65)] hover:bg-primary/90"
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
                <FormField
                  control={registerForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Jean Dupont"
                          data-testid="input-name"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          placeholder="jean.dupont@colombus.fr"
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
                          <SelectItem value="rh">Ressources Humaines</SelectItem>
                          <SelectItem value="formateur">Formateur interne</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-seniority">
                            <SelectValue placeholder="Sélectionnez votre niveau" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                  control={registerForm.control}
                  name="businessUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unité métier (optionnel)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Digital, Finance, RH..."
                          data-testid="input-business-unit"
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
