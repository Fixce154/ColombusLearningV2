import { Badge } from "@/components/ui/badge";

interface SeniorityBadgeProps {
  seniority: string;
}

export default function SeniorityBadge({ seniority }: SeniorityBadgeProps) {
  const getLabel = () => {
    switch (seniority) {
      case "junior":
        return "Junior";
      case "confirme":
        return "Confirmé";
      case "senior":
        return "Senior";
      case "expert":
        return "Expert";
      default:
        return seniority;
    }
  };

  return (
    <Badge variant="secondary" data-testid={`badge-seniority-${seniority}`}>
      {getLabel()}
    </Badge>
  );
}
