import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Home, BookOpen, Calendar, Users, BarChart, GraduationCap, Heart, Plus, Minus } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { User } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { formatRoles, isInstructor } from "@shared/roles";

interface AppSidebarProps {
  currentUser: User;
}

interface MenuSection {
  label?: string;
  items: Array<{ title: string; url: string; icon: any }>;
}

export default function AppSidebar({ currentUser }: AppSidebarProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const [showResignDialog, setShowResignDialog] = useState(false);

  const becomeInstructorMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/users/become-instructor", "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Formateur activé",
        description: "Vous êtes maintenant formateur. Les nouvelles options apparaissent dans le menu.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de devenir formateur",
      });
    },
  });

  const resignInstructorMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/users/resign-instructor", "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setShowResignDialog(false);
      toast({
        title: "Rôle formateur retiré",
        description: "Vous n'êtes plus formateur.",
      });
    },
    onError: (error: any) => {
      setShowResignDialog(false);
      toast({
        variant: "destructive",
        title: "Impossible de retirer le rôle",
        description: error.message || "Des sessions vous sont assignées.",
      });
    },
  });

  const getMenuSections = (): MenuSection[] => {
    const sections: MenuSection[] = [];
    const roles = currentUser.roles;

    // Section "Mes formations" pour tous les consultants
    // Un RH est forcément consultant, donc on affiche aussi pour les RH
    if (roles.includes("consultant") || roles.includes("rh")) {
      sections.push({
        label: roles.includes("rh") || isInstructor(roles) ? "Mes formations" : undefined,
        items: [
          { title: "Tableau de bord", url: "/", icon: Home },
          { title: "Catalogue", url: "/catalog", icon: BookOpen },
        ],
      });
    }

    // Section "Formation" pour les formateurs
    if (isInstructor(roles)) {
      sections.push({
        label: "Formation",
        items: [
          { title: "Mes formations", url: "/instructor-formations", icon: BookOpen },
          { title: "Mes disponibilités", url: "/instructor-availability", icon: Calendar },
          { title: "Mes sessions", url: "/instructor-sessions", icon: Users },
        ],
      });
    }

    // Section "Administration RH" pour RH
    if (roles.includes("rh")) {
      sections.push({
        label: "Administration RH",
        items: [
          { title: "Formations", url: "/formations", icon: BookOpen },
          { title: "Sessions", url: "/sessions", icon: Calendar },
          { title: "Intentions", url: "/interests", icon: Heart },
          { title: "Consultants", url: "/consultants", icon: Users },
          { title: "Data visualisation", url: "/data-visualisation", icon: BarChart },
        ],
      });
    }

    // Section manager
    if (roles.includes("manager")) {
      sections.push({
        label: "Management",
        items: [
          { title: "Mon équipe", url: "/team", icon: Home },
          { title: "Suivi formations", url: "/team-trainings", icon: BarChart },
        ],
      });
    }

    return sections;
  };

  const menuSections = getMenuSections();

  return (
    <Sidebar className="border-r-0 bg-gradient-to-b from-[#031824] via-[#042a3a] to-[#021018] text-white/90 shadow-[0_20px_60px_-35px_rgba(3,24,36,0.9)]">
      <SidebarHeader className="border-b border-white/10 px-6 py-8">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-accent/30 via-accent to-accent/60 p-3 shadow-[0_15px_35px_-20px_rgba(0,158,203,0.75)]">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="text-sm uppercase tracking-[0.4em] text-white/60">Colombus</div>
            <div className="text-xl font-semibold text-white">Learning Suite</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4 py-8">
        {menuSections.map((section, index) => (
          <SidebarGroup key={index} className={index > 0 ? "mt-8" : ""}>
            {section.label && (
              <SidebarGroupLabel className="mb-3 px-4 text-[0.7rem] uppercase tracking-[0.35em] text-white/50">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {section.items.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="h-12 px-4 rounded-2xl border border-white/5 bg-white/0 text-white/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 hover:text-white data-[active=true]:border-white/25 data-[active=true]:bg-white/15 data-[active=true]:text-white"
                      >
                        <Link href={item.url} data-testid={`link-${item.url.slice(1) || "home"}`}>
                          <item.icon className="h-5 w-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        
        {!isInstructor(currentUser.roles) && (
          <SidebarGroup className="mt-8">
            <SidebarGroupLabel className="mb-3 px-4 text-[0.7rem] uppercase tracking-[0.35em] text-white/50">
              Devenir formateur
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => becomeInstructorMutation.mutate()}
                    disabled={becomeInstructorMutation.isPending}
                    className="h-12 px-4 rounded-2xl border border-white/10 bg-white/5 text-white hover:-translate-y-0.5 hover:border-white/20 hover:bg-accent/20 hover:text-white"
                    data-testid="button-become-instructor"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">
                      {becomeInstructorMutation.isPending ? "Activation..." : "Activer"}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isInstructor(currentUser.roles) && (
          <SidebarGroup className="mt-8">
            <SidebarGroupLabel className="mb-3 px-4 text-[0.7rem] uppercase tracking-[0.35em] text-white/50">
              Gérer mon rôle
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setShowResignDialog(true)}
                    className="h-12 px-4 rounded-2xl border border-white/10 bg-white/5 text-white hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/15 hover:text-white"
                    data-testid="button-resign-instructor"
                  >
                    <Minus className="w-5 h-5" />
                    <span className="font-medium">Ne plus être formateur</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-white/10 px-6 py-8">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-accent/40 text-white font-semibold text-sm">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-semibold text-white">{currentUser.name}</div>
            <div className="truncate text-xs text-white/70">
              {formatRoles(currentUser.roles)}
            </div>
          </div>
        </div>
      </SidebarFooter>

      <AlertDialog open={showResignDialog} onOpenChange={setShowResignDialog}>
        <AlertDialogContent className="glass-panel border-white/30 bg-[#041522]/90 text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Ne plus être formateur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer votre rôle de formateur ?
              <br /><br />
              Cette action n'est possible que si aucune session ne vous est assignée.
              Si des sessions vous sont assignées, vous devrez d'abord les réassigner à un autre formateur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-resign">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resignInstructorMutation.mutate()}
              disabled={resignInstructorMutation.isPending}
              data-testid="button-confirm-resign"
            >
              {resignInstructorMutation.isPending ? "Retrait..." : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
