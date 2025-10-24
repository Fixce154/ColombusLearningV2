import { Badge } from "@/components/ui/badge";
import { AlertCircle, Circle } from "lucide-react";

interface PriorityBadgeProps {
  priority: "P1" | "P2" | "P3";
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const getConfig = () => {
    if (priority === "P1") return { 
      className: "bg-destructive text-destructive-foreground shadow-sm",
      icon: AlertCircle 
    };
    if (priority === "P2") return { 
      className: "bg-accent text-accent-foreground shadow-sm",
      icon: Circle 
    };
    return { 
      className: "bg-muted text-muted-foreground",
      icon: Circle 
    };
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} font-bold uppercase tracking-wider text-xs px-3 py-1 gap-1`} data-testid={`badge-priority-${priority}`}>
      <Icon className="w-3 h-3" />
      {priority}
    </Badge>
  );
}
