import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { User, ChevronDown, Check } from "lucide-react";
import { mockUsers } from "@/lib/mockData";
import type { User as UserType } from "@shared/schema";

interface RoleSwitcherProps {
  currentUser: UserType;
  onUserChange: (user: UserType) => void;
}

export default function RoleSwitcher({ currentUser, onUserChange }: RoleSwitcherProps) {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "consultant":
        return "Consultant";
      case "rh":
        return "RH";
      case "formateur":
        return "Formateur";
      case "manager":
        return "Manager";
      default:
        return role;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-3 px-4 h-12 shadow-sm" data-testid="button-role-switcher">
          <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex flex-col items-start">
            <span className="font-medium text-sm">{currentUser.name}</span>
            <span className="text-xs text-muted-foreground">
              {currentUser.roles.map(getRoleLabel).join(" • ")}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 shadow-lg">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          Changer de profil
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {mockUsers.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => onUserChange(user)}
            className={`p-3 cursor-pointer ${currentUser.id === user.id ? "bg-accent/10" : ""}`}
            data-testid={`menu-item-user-${user.roles[0]}`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-primary text-primary-foreground w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{user.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {user.roles.map(getRoleLabel).join(" • ")} • {user.email}
                </div>
              </div>
              {currentUser.id === user.id && (
                <Check className="w-4 h-4 text-accent flex-shrink-0" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
