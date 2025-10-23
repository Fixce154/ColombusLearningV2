import { Badge } from "@/components/ui/badge";
import { Monitor, Users, Laptop } from "lucide-react";

interface ModalityBadgeProps {
  modality: "presentiel" | "distanciel" | "hybride";
}

export default function ModalityBadge({ modality }: ModalityBadgeProps) {
  const getConfig = () => {
    switch (modality) {
      case "presentiel":
        return { label: "Présentiel", icon: Users };
      case "distanciel":
        return { label: "Distanciel", icon: Monitor };
      case "hybride":
        return { label: "Hybride", icon: Laptop };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Badge variant="outline" data-testid={`badge-modality-${modality}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
