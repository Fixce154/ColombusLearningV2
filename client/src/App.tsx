import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import Dashboard from "@/pages/Dashboard";
import Catalog from "@/pages/Catalog";
import TrainingDetail from "@/pages/TrainingDetail";
import RegistrationManagement from "@/pages/RegistrationManagement";
import InterestManagement from "@/pages/InterestManagement";
import FormationManagement from "@/pages/FormationManagement";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import type { User } from "@shared/schema";
import { Loader2 } from "lucide-react";

function Router({ currentUser }: { currentUser: User }) {
  return (
    <Switch>
      <Route path="/" component={() => <Dashboard currentUser={currentUser} />} />
      <Route path="/dashboard" component={() => <Dashboard currentUser={currentUser} />} />
      <Route path="/catalog" component={Catalog} />
      <Route path="/training/:id" component={() => <TrainingDetail currentUser={currentUser} />} />
      <Route path="/my-trainings" component={() => <Dashboard currentUser={currentUser} />} />
      <Route path="/interests" component={InterestManagement} />
      <Route path="/registrations" component={RegistrationManagement} />
      <Route path="/formations" component={FormationManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar currentUser={user} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-6 px-6 py-5 border-b bg-card shadow-sm">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <button
              onClick={onLogout}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-logout"
            >
              Se déconnecter
            </button>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="container max-w-7xl mx-auto px-6 py-8">
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
