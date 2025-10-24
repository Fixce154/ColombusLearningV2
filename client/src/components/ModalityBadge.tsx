import { Badge } from "@/components/ui/badge";
import { Monitor, Users, Laptop } from "lucide-react";

interface ModalityBadgeProps {
  modality: "presentiel" | "distanciel" | "hybride";
}

export default function ModalityBadge({ modality }: ModalityBadgeProps) {
  const getConfig = () => {
    switch (modality) {
      case "presentiel":
        return { label: "Présentiel", icon: Users, className: "bg-primary/10 text-primary border-primary/20" };
      case "distanciel":
        return { label: "Distanciel", icon: Monitor, className: "bg-accent/10 text-accent border-accent/20" };
      case "hybride":
        return { label: "Hybride", icon: Laptop, className: "bg-muted text-muted-foreground border-muted-foreground/20" };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} font-medium text-xs px-3 py-1.5 gap-1.5 border`} data-testid={`badge-modality-${modality}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  );
}
