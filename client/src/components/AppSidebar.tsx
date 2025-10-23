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
import { Home, BookOpen, Calendar, Users, BarChart, Settings, GraduationCap } from "lucide-react";
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

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-6">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" />
          <div>
            <div className="font-semibold text-lg">Colombus</div>
            <div className="text-xs text-muted-foreground">Formation LMS</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-${item.url.slice(1) || "home"}`}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          Connecté en tant que<br />
          <span className="font-medium text-foreground">{currentUser.name}</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
