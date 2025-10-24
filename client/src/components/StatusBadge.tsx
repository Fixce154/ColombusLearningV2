import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "validated":
        return { label: "Validé", className: "bg-primary text-primary-foreground" };
      case "completed":
        return { label: "Complété", className: "bg-muted text-muted-foreground" };
      case "open":
        return { label: "Ouvert", className: "bg-accent text-accent-foreground" };
      case "pending":
        return { label: "En attente", className: "bg-destructive/10 text-destructive border-destructive/20" };
      case "cancelled":
        return { label: "Annulé", className: "bg-muted text-muted-foreground" };
      case "full":
        return { label: "Complet", className: "bg-muted text-muted-foreground" };
      default:
        return { label: status, className: "bg-secondary text-secondary-foreground" };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge className={`${config.className} font-semibold uppercase tracking-wider text-xs px-3 py-1`} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}
