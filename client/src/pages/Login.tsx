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
    { email: "pierre.bernard@colombus.fr", role: "Formateur interne", password: "password" },
    { email: "formateur.externe@formateur.com", role: "Formateur externe", password: "Formator" },
    { email: "jean.dubois@colombus.fr", role: "Manager", password: "password" },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,158,203,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(0,49,63,0.15),transparent_55%)] opacity-60" />
      <Card className="glass-panel relative w-full max-w-xl space-y-6 overflow-hidden rounded-[2rem] border-white/40 px-10 py-12">
        <div className="relative z-10 space-y-10">
          {/* Header */}
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/40 via-accent to-accent/70 shadow-[0_30px_80px_-40px_rgba(0,158,203,0.75)]">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
            <div className="space-y-2">
              <p className="section-subtle-title text-primary/60">Portail sécurisé</p>
              <h1 className="text-3xl font-semibold tracking-tight text-primary">Colombus Learning</h1>
              <p className="text-sm text-muted-foreground/80">
                Accédez à votre espace de formation personnalisée et gérez vos parcours en toute simplicité.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid h-14 w-full grid-cols-2 rounded-full bg-white/40 p-1">
              <TabsTrigger value="login" data-testid="tab-login" className="rounded-full text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-primary">
                Connexion
              </TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register" className="rounded-full text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-primary">
                Inscription
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-4 mt-6">
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
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full rounded-full bg-gradient-to-r from-primary to-accent py-5 text-sm font-semibold shadow-[0_20px_40px_-22px_rgba(0,49,63,0.6)] hover:shadow-[0_26px_60px_-28px_rgba(0,49,63,0.65)]"
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>
              </Form>

              {/* Demo Accounts */}
              <div className="rounded-2xl border border-white/40 bg-white/40 p-5">
                <p className="mb-3 text-sm text-muted-foreground/80 text-center">
                  Comptes de démonstration
                </p>
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
                      className="rounded-full border-white/50 bg-white/60 text-xs font-medium text-primary hover:border-white/70 hover:bg-white"
                    >
                      {account.role}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register" className="space-y-4 mt-6">
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
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full rounded-full bg-gradient-to-r from-primary to-accent py-5 text-sm font-semibold shadow-[0_20px_40px_-22px_rgba(0,49,63,0.6)] hover:shadow-[0_26px_60px_-28px_rgba(0,49,63,0.65)]"
                    disabled={isLoading}
                    data-testid="button-register"
                  >
                    {isLoading ? "Inscription..." : "Créer un compte"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}
