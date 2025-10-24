import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import RoleSwitcher from "@/components/RoleSwitcher";
import Dashboard from "@/pages/Dashboard";
import Catalog from "@/pages/Catalog";
import TrainingDetail from "@/pages/TrainingDetail";
import NotFound from "@/pages/not-found";
import { mockUsers } from "@/lib/mockData";
import type { User } from "@shared/schema";

function Router({ currentUser }: { currentUser: User }) {
  return (
    <Switch>
      <Route path="/" component={() => <Dashboard currentUser={currentUser} />} />
      <Route path="/catalog" component={Catalog} />
      <Route path="/training/:id" component={() => <TrainingDetail currentUser={currentUser} />} />
      <Route path="/my-trainings" component={() => <Dashboard currentUser={currentUser} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // TODO: remove mock functionality - Start with first consultant user
  const [currentUser, setCurrentUser] = useState<User>(mockUsers[0]);

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full bg-background">
            <AppSidebar currentUser={currentUser} />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center justify-between gap-6 px-6 py-5 border-b bg-card shadow-sm">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <RoleSwitcher currentUser={currentUser} onUserChange={setCurrentUser} />
              </header>
              <main className="flex-1 overflow-auto">
                <div className="container max-w-7xl mx-auto px-6 py-8">
                  <Router currentUser={currentUser} />
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
