import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User, ChevronDown } from "lucide-react";
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
        <Button variant="outline" className="gap-2" data-testid="button-role-switcher">
          <User className="w-4 h-4" />
          <span>{currentUser.name}</span>
          <span className="text-xs text-muted-foreground">({getRoleLabel(currentUser.role)})</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        {mockUsers.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => onUserChange(user)}
            className={currentUser.id === user.id ? "bg-accent" : ""}
            data-testid={`menu-item-user-${user.role}`}
          >
            <div className="flex flex-col gap-1">
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-muted-foreground">
                {getRoleLabel(user.role)} • {user.email}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
