import { Sidebar } from "@/components/ui/sidebar";
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
  Settings,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { User } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMarkNotificationsRead, useNotifications } from "@/hooks/use-notifications";
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
import { useEffect, useMemo, useRef, useState } from "react";
import { formatRoles, isInstructor } from "@shared/roles";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  currentUser: User;
}

interface MenuSection {
  label?: string;
  icon: LucideIcon;
  items: MenuItem[];
}

interface MenuItem {
  title: string;
  icon: LucideIcon;
  url?: string;
  description?: string;
  action?: "becomeInstructor" | "resignInstructor";
}

export default function AppSidebar({ currentUser }: AppSidebarProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const { data: notificationsData } = useNotifications();
  const markNotificationsRead = useMarkNotificationsRead();
  const unreadCounts = notificationsData?.unreadCounts ?? {};

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
          { title: "Collaborateurs", url: "/consultants", icon: Users },
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

    if (roles.includes("coach")) {
      sections.push({
        label: "Coaching",
        icon: UserCheck,
        items: [
          { title: "Mes coachés", url: "/coach", icon: Users },
        ],
      });
    }

    sections.push({
      label: "Gérer mon rôle",
      icon: Settings,
      items: isInstructor(roles)
        ? [
            {
              title: "Ne plus être formateur",
              icon: Minus,
              action: "resignInstructor",
              description: "Retirer l'accès formateur",
            },
          ]
        : [
            {
              title: "Devenir formateur",
              icon: Plus,
              action: "becomeInstructor",
              description: "Accéder aux fonctionnalités formateur",
            },
          ],
    });

    return sections;
  };

  const menuSections = useMemo(() => getMenuSections(), [
    JSON.stringify(currentUser.roles ?? []),
  ]);

  useEffect(() => {
    if (
      activeSectionIndex !== null &&
      (activeSectionIndex < 0 || activeSectionIndex >= menuSections.length)
    ) {
      setActiveSectionIndex(null);
      setIsSectionDialogOpen(false);
    }
  }, [menuSections, activeSectionIndex]);

  const updatePanelPosition = (index: number) => {
    const targetButton = buttonRefs.current[index];
    if (!targetButton) return;
    const rect = targetButton.getBoundingClientRect();
    setPanelPosition({
      top: rect.top + rect.height / 2 + window.scrollY,
      left: rect.right + 6 + window.scrollX,
    });
  };

  useEffect(() => {
    if (!isSectionDialogOpen || activeSectionIndex === null) return;

    const handleReposition = () => updatePanelPosition(activeSectionIndex);
    handleReposition();

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isSectionDialogOpen, activeSectionIndex]);

  useEffect(() => {
    if (!isSectionDialogOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;

      const isClickOnButton = buttonRefs.current.some((button) =>
        button ? button.contains(target as Node) : false,
      );

      if (!isClickOnButton) {
        setIsSectionDialogOpen(false);
        setActiveSectionIndex(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSectionDialogOpen(false);
        setActiveSectionIndex(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSectionDialogOpen]);

  const activeSection =
    activeSectionIndex !== null ? menuSections[activeSectionIndex] : undefined;

  const getSectionTitle = (section?: MenuSection) => {
    if (!section) return "Navigation";
    if (section.label) return section.label;
    return section.items[0]?.title ?? "Navigation";
  };

  return (
    <Sidebar className="border-none bg-transparent p-0 text-white !w-[7rem]">
      <div className="flex h-full w-full flex-col items-center bg-[#00313F] px-4 py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
          <GraduationCap className="h-6 w-6" />
        </div>

        <div className="mt-12 flex flex-1 flex-col items-center gap-5">
          {menuSections.map((section, index) => {
            const sectionUnread = section.items.reduce((total, item) => {
              if (!item.url) return total;
              return total + (unreadCounts[item.url] ?? 0);
            }, 0);

            return (
              <Tooltip key={index} delayDuration={100}>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <button
                      type="button"
                      ref={(button) => {
                        buttonRefs.current[index] = button;
                      }}
                      onClick={() => {
                        if (isSectionDialogOpen && activeSectionIndex === index) {
                          setIsSectionDialogOpen(false);
                          setActiveSectionIndex(null);
                          return;
                        }

                        setActiveSectionIndex(index);
                        setIsSectionDialogOpen(true);
                        updatePanelPosition(index);
                      }}
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                        activeSectionIndex === index && isSectionDialogOpen
                          ? "bg-white text-[#00313F]"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                      aria-label={getSectionTitle(section)}
                    >
                      <section.icon className="h-5 w-5" />
                    </button>
                    {sectionUnread > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-destructive-foreground shadow-sm">
                        !
                      </span>
                    ) : null}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-sm font-medium">
                  {getSectionTitle(section)}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <div className="mt-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
              {currentUser.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs text-sm">
            <p className="font-semibold">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground opacity-80">{formatRoles(currentUser.roles)}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {isSectionDialogOpen && activeSection ? (
        <div
          ref={panelRef}
          className="fixed z-50 w-[320px] max-w-[calc(100vw-5rem)] -translate-y-1/2 transform text-[#00313F]"
          style={{
            top: panelPosition?.top ?? 0,
            left: panelPosition?.left ?? 0,
          }}
        >
          <div className="relative overflow-hidden rounded-lg border border-white/40 bg-white/95 shadow-lg backdrop-blur">
            <span className="absolute inset-y-0 left-0 w-1.5 bg-[#00313F]" aria-hidden="true" />
            <div className="space-y-3 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00313F]/70">
                {getSectionTitle(activeSection)}
              </p>
              {activeSection.items.length === 0 ? (
                <p className="text-sm text-[#00313F]/70">
                  Aucun contenu disponible pour cette rubrique.
                </p>
              ) : (
                <nav className="flex flex-col gap-1">
                  {activeSection.items.map((item) => {
                    if (item.url) {
                      const isCurrentLocation = location === item.url;
                      const itemUnread = unreadCounts[item.url] ?? 0;
                      return (
                        <Link
                          key={item.title}
                          href={item.url}
                          data-testid={`link-${item.url.slice(1) || "home"}`}
                          onClick={() => {
                            if (itemUnread > 0) {
                              markNotificationsRead.mutate({ route: item.url });
                            }
                            setIsSectionDialogOpen(false);
                          }}
                          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            isCurrentLocation
                              ? "bg-[#00313F]/10 text-[#00313F]"
                              : "text-[#00313F]/85 hover:bg-[#00313F]/5 hover:text-[#00313F]"
                          }`}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00313F]/8 text-[#00313F]">
                            <item.icon className="h-4 w-4" />
                          </span>
                          <span className="flex-1 text-left">{item.title}</span>
                          {itemUnread > 0 ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-destructive px-2 py-0.5 text-[0.65rem] font-semibold text-destructive-foreground">
                              {itemUnread > 9 ? "9+" : itemUnread}
                            </span>
                          ) : null}
                        </Link>
                      );
                    }

                    if (item.action === "becomeInstructor") {
                      return (
                        <Button
                          key={item.title}
                          onClick={() => becomeInstructorMutation.mutate()}
                          disabled={becomeInstructorMutation.isPending}
                          className="flex w-full items-center justify-center gap-2 rounded-md bg-[#00313F] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#00313F]/90"
                          data-testid="button-become-instructor"
                        >
                          <Plus className="h-4 w-4" />
                          {becomeInstructorMutation.isPending ? "Activation..." : item.title}
                        </Button>
                      );
                    }

                    if (item.action === "resignInstructor") {
                      return (
                        <Button
                          key={item.title}
                          onClick={() => setShowResignDialog(true)}
                          className="flex w-full items-center justify-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground shadow-sm hover:bg-destructive/90"
                          data-testid="button-resign-instructor"
                        >
                          <Minus className="h-4 w-4" />
                          {item.title}
                        </Button>
                      );
                    }

                    return null;
                  })}
                </nav>
              )}
            </div>
          </div>
        </div>
      ) : null}

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
