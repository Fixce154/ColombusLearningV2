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
import { Home, BookOpen, Calendar, Users, BarChart, GraduationCap } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { User } from "@shared/schema";

interface AppSidebarProps {
  currentUser: User;
}

export default function AppSidebar({ currentUser }: AppSidebarProps) {
  const [location] = useLocation();

  const getMenuItems = () => {
    switch (currentUser.role) {
      case "consultant":
        return [
          { title: "Tableau de bord", url: "/", icon: Home },
          { title: "Catalogue", url: "/catalog", icon: BookOpen },
          { title: "Mes formations", url: "/my-trainings", icon: Calendar },
        ];
      case "rh":
        return [
          { title: "Tableau de bord RH", url: "/", icon: Home },
          { title: "Catalogue", url: "/catalog", icon: BookOpen },
          { title: "Sessions", url: "/sessions", icon: Calendar },
          { title: "Inscriptions", url: "/registrations", icon: Users },
          { title: "Reporting", url: "/reporting", icon: BarChart },
        ];
      case "formateur":
        return [
          { title: "Mes sessions", url: "/", icon: Home },
          { title: "Disponibilités", url: "/availability", icon: Calendar },
          { title: "Émargement", url: "/attendance", icon: Users },
        ];
      case "manager":
        return [
          { title: "Mon équipe", url: "/", icon: Home },
          { title: "Catalogue", url: "/catalog", icon: BookOpen },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

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
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 uppercase tracking-wider text-xs mb-2 px-3">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
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
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <div className="bg-accent text-accent-foreground w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-sidebar-foreground truncate">{currentUser.name}</div>
            <div className="text-xs text-sidebar-foreground/70 truncate">{getRoleLabel(currentUser.role)}</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
