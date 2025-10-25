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
import {
  Home,
  BookOpen,
  Calendar,
  Users,
  BarChart,
  GraduationCap,
  Heart,
  Plus,
  Minus,
  type LucideIcon,
} from "lucide-react";
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
import { useEffect, useState } from "react";
import { formatRoles, isInstructor } from "@shared/roles";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";

interface AppSidebarProps {
  currentUser: User;
}

interface MenuSection {
  label?: string;
  icon: LucideIcon;
  items: Array<{ title: string; url: string; icon: LucideIcon }>;
}

export default function AppSidebar({ currentUser }: AppSidebarProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const [showResignDialog, setShowResignDialog] = useState(false);
  const { state } = useSidebar();

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

    if (roles.includes("consultant") || roles.includes("rh")) {
      sections.push({
        label: roles.includes("rh") || isInstructor(roles) ? "Mes formations" : undefined,
        icon: Home,
        items: [
          { title: "Tableau de bord", url: "/", icon: Home },
          { title: "Catalogue", url: "/catalog", icon: BookOpen },
        ],
      });
    }

    if (isInstructor(roles)) {
      sections.push({
        label: "Formation",
        icon: GraduationCap,
        items: [
          { title: "Mes formations", url: "/instructor-formations", icon: BookOpen },
          { title: "Mes disponibilités", url: "/instructor-availability", icon: Calendar },
          { title: "Mes sessions", url: "/instructor-sessions", icon: Users },
        ],
      });
    }

    if (roles.includes("rh")) {
      sections.push({
        label: "Administration RH",
        icon: Users,
        items: [
          { title: "Formations", url: "/formations", icon: BookOpen },
          { title: "Sessions", url: "/sessions", icon: Calendar },
          { title: "Intentions", url: "/interests", icon: Heart },
          { title: "Consultants", url: "/consultants", icon: Users },
          { title: "Data visualisation", url: "/data-visualisation", icon: BarChart },
        ],
      });
    }

    if (roles.includes("manager")) {
      sections.push({
        label: "Management",
        icon: BarChart,
        items: [
          { title: "Mon équipe", url: "/team", icon: Home },
          { title: "Suivi formations", url: "/team-trainings", icon: BarChart },
        ],
      });
    }

    return sections;
  };

  const menuSections = getMenuSections();
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(
    menuSections.length > 0 ? 0 : null,
  );

  useEffect(() => {
    if (menuSections.length === 0) {
      setActiveSectionIndex(null);
      return;
    }

    if (activeSectionIndex === null || activeSectionIndex >= menuSections.length) {
      setActiveSectionIndex(0);
    }
  }, [menuSections, activeSectionIndex]);

  const activeSection =
    activeSectionIndex !== null ? menuSections[activeSectionIndex] : undefined;

  const getSectionTitle = (section?: MenuSection) => {
    if (!section) return "Navigation";
    if (section.label) return section.label;
    return section.items[0]?.title ?? "Navigation";
  };

  return (
    <Sidebar className="border-r border-black/5 bg-transparent p-0 text-foreground">
      <div className="flex h-full w-full">
        <nav className="flex w-20 flex-col items-center gap-6 bg-[#00313F] px-4 py-8 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex flex-1 flex-col items-center gap-4">
            {menuSections.map((section, index) => (
              <Tooltip key={index} delayDuration={100}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setActiveSectionIndex(index)}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      activeSectionIndex === index ? "bg-white text-[#00313F]" : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                    aria-pressed={activeSectionIndex === index}
                    aria-label={getSectionTitle(section)}
                  >
                    <section.icon className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-sm font-medium">
                  {getSectionTitle(section)}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </nav>

        {state !== "collapsed" && (
          <div className="flex min-w-0 flex-1 flex-col bg-white">
            <SidebarHeader className="border-b border-black/5 px-6 py-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00313F]/10 text-[#00313F]">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <p className="eyebrow text-muted-foreground">Colombus</p>
                  <p className="text-lg font-semibold tracking-tight">Learning Suite</p>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="flex-1 space-y-8 overflow-auto px-6 py-8">
              {activeSection ? (
                <SidebarGroup>
                  <SidebarGroupLabel className="eyebrow mb-3 px-3 text-muted-foreground">
                    {getSectionTitle(activeSection)}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="space-y-2">
                      {activeSection.items.map((item) => {
                        const isActive = location === item.url;
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              className="h-12 rounded-2xl border border-transparent px-4 text-sm font-medium text-muted-foreground transition data-[active=true]:border-[#00313F]/20 data-[active=true]:bg-[#00313F]/10 data-[active=true]:text-[#00313F] hover:border-[#00313F]/20 hover:bg-[#00313F]/10 hover:text-[#00313F]"
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
              ) : (
                <div className="rounded-2xl border border-dashed border-black/10 bg-slate-50/80 px-6 py-10 text-center text-sm text-muted-foreground">
                  Aucun menu disponible pour votre profil.
                </div>
              )}

              {!isInstructor(currentUser.roles) && (
                <SidebarGroup>
                  <SidebarGroupLabel className="eyebrow mb-3 px-3 text-muted-foreground">
                    Devenir formateur
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => becomeInstructorMutation.mutate()}
                          disabled={becomeInstructorMutation.isPending}
                          className="h-12 rounded-2xl border border-[#00313F]/20 bg-[#00313F]/10 px-4 text-sm font-medium text-[#00313F] transition hover:bg-[#00313F]/20 disabled:opacity-60"
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
                <SidebarGroup>
                  <SidebarGroupLabel className="eyebrow mb-3 px-3 text-muted-foreground">
                    Gérer mon rôle
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => setShowResignDialog(true)}
                          className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-sm font-medium text-muted-foreground transition hover:border-[#00313F]/20 hover:bg-[#00313F]/10 hover:text-[#00313F]"
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
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#00313F]/10 text-[#00313F] font-semibold text-sm">
                  {currentUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{currentUser.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {formatRoles(currentUser.roles)}
                  </div>
                </div>
              </div>
            </SidebarFooter>
          </div>
        )}
      </div>

      <AlertDialog open={showResignDialog} onOpenChange={setShowResignDialog}>
        <AlertDialogContent className="surface-soft border-black/5 bg-white text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Ne plus être formateur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer votre rôle de formateur ?
              <br />
              <br />
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
