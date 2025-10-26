import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import Dashboard from "@/pages/Dashboard";
import Catalog from "@/pages/Catalog";
import TrainingDetail from "@/pages/TrainingDetail";
import ConsultantManagement from "@/pages/ConsultantManagement";
import InterestManagement from "@/pages/InterestManagement";
import FormationManagement from "@/pages/FormationManagement";
import SessionManagement from "@/pages/SessionManagement";
import InstructorFormations from "@/pages/InstructorFormations";
import InstructorAvailability from "@/pages/InstructorAvailability";
import InstructorSessions from "@/pages/InstructorSessions";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import DataVisualization from "@/pages/DataVisualization";
import type { User } from "@shared/schema";
import { Loader2, LogOut } from "lucide-react";
import { useEffect } from "react";
import { formatRoles } from "@shared/roles";

function Router({ currentUser }: { currentUser: User }) {
  const [location] = useLocation();

  // Rafraîchir les données quand on change de page
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/interests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/formations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/interests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/registrations"] });
  }, [location]);

  return (
    <Switch>
      <Route path="/" component={() => <Dashboard currentUser={currentUser} />} />
      <Route path="/dashboard" component={() => <Dashboard currentUser={currentUser} />} />
      <Route path="/catalog" component={Catalog} />
      <Route path="/training/:id" component={() => <TrainingDetail currentUser={currentUser} />} />
      <Route path="/my-trainings" component={() => <Dashboard currentUser={currentUser} />} />
      <Route path="/interests" component={InterestManagement} />
      <Route path="/consultants" component={ConsultantManagement} />
      <Route path="/formations" component={FormationManagement} />
      <Route path="/sessions" component={SessionManagement} />
      <Route path="/data-visualisation" component={DataVisualization} />
      <Route path="/instructor-formations" component={InstructorFormations} />
      <Route path="/instructor-availability" component={InstructorAvailability} />
      <Route path="/instructor-sessions" component={InstructorSessions} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  const style = {
    "--sidebar-width": "7rem",
    "--sidebar-width-icon": "7rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar currentUser={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-black/5 bg-white/90 px-8 py-6 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger
                  data-testid="button-sidebar-toggle"
                  className="h-11 w-11 rounded-xl border border-white/50 bg-white text-foreground shadow-sm transition hover:bg-white"
                />
                <div>
                  <p className="eyebrow mb-1 text-muted-foreground">Espace membre</p>
                  <h1 className="text-xl font-semibold text-foreground">Colombus Learning</h1>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{formatRoles(user.roles)}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_32px_-24px_rgba(10,132,255,0.55)] transition hover:bg-primary/90"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto px-8 pb-12">
            <div className="mx-auto max-w-6xl space-y-12 pt-6">
              <Router currentUser={user} />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { data: userData, isLoading, refetch } = useQuery<{ user: User } | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.status === 401) {
          return null;
        }
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return await res.json();
      } catch (error) {
        console.error("Auth check failed:", error);
        return null;
      }
    },
  });

  const handleLogin = (user: User) => {
    refetch();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      queryClient.clear();
      refetch();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!userData?.user) {
    return <Login onLoginSuccess={handleLogin} />;
  }

  return <AuthenticatedApp user={userData.user} onLogout={handleLogout} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
