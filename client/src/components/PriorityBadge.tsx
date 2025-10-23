import { Badge } from "@/components/ui/badge";

interface PriorityBadgeProps {
  priority: "P1" | "P2" | "P3";
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const getVariant = () => {
    if (priority === "P1") return "default" as const;
    if (priority === "P2") return "secondary" as const;
    return "outline" as const;
  };

  return (
    <Badge variant={getVariant()} data-testid={`badge-priority-${priority}`}>
      {priority}
    </Badge>
  );
}
