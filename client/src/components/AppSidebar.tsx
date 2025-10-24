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
import { Home, BookOpen, Calendar, Users, BarChart, GraduationCap, Heart, Settings, Plus, Minus } from "lucide-react";
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
        label: roles.includes("rh") || roles.includes("formateur") ? "Mes formations" : undefined,
        items: [
          { title: "Tableau de bord", url: "/", icon: Home },
          { title: "Catalogue", url: "/catalog", icon: BookOpen },
        ],
      });
    }

    // Section "Formation" pour les formateurs
    if (roles.includes("formateur")) {
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "consultant":
        return "Consultant";
      case "rh":
        return "Ressources Humaines";
      case "formateur":
        return "Formateur";
      case "manager":
        return "Manager";
      default:
        return role;
    }
  };

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="bg-accent p-2.5 rounded-xl">
            <GraduationCap className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <div className="font-bold text-lg text-sidebar-foreground">Colombus</div>
            <div className="text-xs text-sidebar-foreground/70">Learning Platform</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4 py-6">
        {menuSections.map((section, index) => (
          <SidebarGroup key={index} className={index > 0 ? "mt-6" : ""}>
            {section.label && (
              <SidebarGroupLabel className="text-sidebar-foreground/70 uppercase tracking-wider text-xs mb-2 px-3">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} className="h-12 px-4">
                        <Link href={item.url} data-testid={`link-${item.url.slice(1) || "home"}`}>
                          <item.icon className="w-5 h-5" />
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
        
        {!currentUser.roles.includes("formateur") && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="text-sidebar-foreground/70 uppercase tracking-wider text-xs mb-2 px-3">
              Devenir formateur
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => becomeInstructorMutation.mutate()}
                    disabled={becomeInstructorMutation.isPending}
                    className="h-12 px-4"
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

        {currentUser.roles.includes("formateur") && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="text-sidebar-foreground/70 uppercase tracking-wider text-xs mb-2 px-3">
              Gérer mon rôle
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setShowResignDialog(true)}
                    className="h-12 px-4"
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
      <SidebarFooter className="border-t border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <div className="bg-accent text-accent-foreground w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-sidebar-foreground truncate">{currentUser.name}</div>
            <div className="text-xs text-sidebar-foreground/70 truncate">
              {currentUser.roles.map(getRoleLabel).join(" • ")}
            </div>
          </div>
        </div>
      </SidebarFooter>

      <AlertDialog open={showResignDialog} onOpenChange={setShowResignDialog}>
        <AlertDialogContent>
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
