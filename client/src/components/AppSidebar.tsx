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
    <Sidebar className="border-r border-black/5 bg-white/85 text-foreground backdrop-blur-sm">
      <SidebarHeader className="border-b border-black/5 px-6 py-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="eyebrow text-muted-foreground">Colombus</p>
            <p className="text-lg font-semibold tracking-tight">Learning Suite</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-5 py-8">
        {menuSections.map((section, index) => (
          <SidebarGroup key={index} className={index > 0 ? "mt-8" : ""}>
            {section.label && (
              <SidebarGroupLabel className="eyebrow mb-3 px-3 text-muted-foreground">
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
                        className="h-12 rounded-2xl border border-transparent px-4 text-sm font-medium text-muted-foreground transition data-[active=true]:border-primary/10 data-[active=true]:bg-primary/10 data-[active=true]:text-primary hover:border-primary/10 hover:bg-primary/5 hover:text-primary"
                      >
                        <Link href={item.url} data-testid={`link-${item.url.slice(1) || "home"}`}>
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
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
            <SidebarGroupLabel className="eyebrow mb-3 px-3 text-muted-foreground">
              Devenir formateur
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => becomeInstructorMutation.mutate()}
                    disabled={becomeInstructorMutation.isPending}
                    className="h-12 rounded-2xl border border-primary/10 bg-primary/5 px-4 text-sm font-medium text-primary transition hover:bg-primary/10"
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
            <SidebarGroupLabel className="eyebrow mb-3 px-3 text-muted-foreground">
              Gérer mon rôle
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setShowResignDialog(true)}
                    className="h-12 rounded-2xl border border-black/5 bg-white px-4 text-sm font-medium text-muted-foreground transition hover:border-primary/10 hover:bg-primary/5 hover:text-primary"
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
      <SidebarFooter className="border-t border-black/5 px-6 py-8">
        <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-semibold text-sm">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{currentUser.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {formatRoles(currentUser.roles)}
            </div>
          </div>
        </div>
      </SidebarFooter>

      <AlertDialog open={showResignDialog} onOpenChange={setShowResignDialog}>
        <AlertDialogContent className="surface-soft border-black/5 bg-white text-foreground">
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
