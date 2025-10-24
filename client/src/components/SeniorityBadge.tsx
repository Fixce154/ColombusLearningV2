import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";

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
    <Badge className="bg-secondary text-secondary-foreground font-medium text-xs px-3 py-1.5 gap-1.5" data-testid={`badge-seniority-${seniority}`}>
      <GraduationCap className="w-3.5 h-3.5" />
      {getLabel()}
    </Badge>
  );
}
