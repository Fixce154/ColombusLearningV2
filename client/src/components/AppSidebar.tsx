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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const menuSections = getMenuSections();
  useEffect(() => {
    if (menuSections.length === 0) {
      setActiveSectionIndex(null);
      setIsSectionDialogOpen(false);
      return;
    }

    if (
      activeSectionIndex === null ||
      activeSectionIndex < 0 ||
      activeSectionIndex >= menuSections.length
    ) {
      setActiveSectionIndex(menuSections.length > 0 ? 0 : null);
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
    <Sidebar className="border-none bg-transparent p-0 text-white">
      <div className="flex h-full w-20 flex-col items-center bg-[#00313F] px-4 py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
          <GraduationCap className="h-6 w-6" />
        </div>

        <div className="mt-12 flex flex-1 flex-col items-center gap-5">
          {menuSections.map((section, index) => (
            <Tooltip key={index} delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSectionIndex(index);
                    setIsSectionDialogOpen(true);
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
              </TooltipTrigger>
              <TooltipContent side="right" className="text-sm font-medium">
                {getSectionTitle(section)}
              </TooltipContent>
            </Tooltip>
          ))}
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

      <Dialog
        open={isSectionDialogOpen && Boolean(activeSection)}
        onOpenChange={(open) => {
          setIsSectionDialogOpen(open);
          if (!open) {
            setActiveSectionIndex(null);
          }
        }}
      >
        <DialogContent className="w-[400px] max-w-[90vw]">
          {activeSection && activeSection.items.length > 0 ? (
            <Tabs
              key={`${activeSectionIndex}-${activeSection.items[0]?.title ?? ""}`}
              defaultValue={activeSection.items[0]?.title ?? ""}
              className="w-full"
            >
              <DialogHeader>
                <DialogTitle>{getSectionTitle(activeSection)}</DialogTitle>
                {activeSection.label && (
                  <DialogDescription>
                    Sélectionnez un onglet pour accéder rapidement à la rubrique souhaitée.
                  </DialogDescription>
                )}
              </DialogHeader>
              <TabsList className="mt-4 flex flex-wrap justify-start gap-2">
                {activeSection.items.map((item) => (
                  <TabsTrigger key={item.title} value={item.title} className="whitespace-nowrap">
                    {item.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {activeSection.items.map((item) => {
                const isActive = item.url ? location === item.url : false;
                return (
                  <TabsContent key={item.title} value={item.title} className="mt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00313F]/10 text-[#00313F]">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-base font-semibold text-foreground">{item.title}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        {item.url ? (
                          <Button
                            asChild
                            className="w-full justify-start gap-2"
                            variant={isActive ? "default" : "secondary"}
                          >
                            <Link
                              href={item.url}
                              data-testid={`link-${item.url.slice(1) || "home"}`}
                              onClick={() => setIsSectionDialogOpen(false)}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>Ouvrir</span>
                            </Link>
                          </Button>
                        ) : null}
                        {item.action === "becomeInstructor" && (
                          <Button
                            onClick={() => becomeInstructorMutation.mutate()}
                            disabled={becomeInstructorMutation.isPending}
                            className="w-full justify-center gap-2"
                            variant="default"
                            data-testid="button-become-instructor"
                          >
                            <Plus className="h-4 w-4" />
                            {becomeInstructorMutation.isPending ? "Activation..." : "Activer le rôle"}
                          </Button>
                        )}
                        {item.action === "resignInstructor" && (
                          <Button
                            onClick={() => setShowResignDialog(true)}
                            className="w-full justify-center gap-2"
                            variant="destructive"
                            data-testid="button-resign-instructor"
                          >
                            <Minus className="h-4 w-4" />
                            Ne plus être formateur
                          </Button>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Aucun contenu disponible pour cette rubrique.
            </div>
          )}
        </DialogContent>
      </Dialog>

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
