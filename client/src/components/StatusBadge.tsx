import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "validated":
      case "completed":
      case "open":
        return { label: status === "validated" ? "Validé" : status === "completed" ? "Complété" : "Ouvert", variant: "default" as const };
      case "pending":
        return { label: "En attente", variant: "secondary" as const };
      case "cancelled":
        return { label: "Annulé", variant: "outline" as const };
      case "full":
        return { label: "Complet", variant: "secondary" as const };
      default:
        return { label: status, variant: "outline" as const };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}
