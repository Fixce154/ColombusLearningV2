import { Card } from "@/components/ui/card";
import { Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
          <p className="text-3xl font-semibold">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
        </div>
        <div className="text-primary">{icon}</div>
      </div>
    </Card>
  );
}

interface DashboardStatsProps {
  upcomingCount: number;
  pendingCount: number;
  completedCount: number;
  p1Used: number;
  p2Used: number;
}

export default function DashboardStats({
  upcomingCount,
  pendingCount,
  completedCount,
  p1Used,
  p2Used,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dashboard-stats">
      <StatCard
        title="Formations à venir"
        value={upcomingCount}
        icon={<Calendar className="w-6 h-6" />}
        data-testid="stat-upcoming"
      />
      <StatCard
        title="En attente de validation"
        value={pendingCount}
        icon={<Clock className="w-6 h-6" />}
        data-testid="stat-pending"
      />
      <StatCard
        title="Formations complétées"
        value={completedCount}
        icon={<CheckCircle className="w-6 h-6" />}
        data-testid="stat-completed"
      />
      <StatCard
        title="Priorités utilisées"
        value={`P1: ${p1Used}/1  P2: ${p2Used}/1`}
        icon={<AlertCircle className="w-6 h-6" />}
        description="Quotas annuels"
        data-testid="stat-priorities"
      />
    </div>
  );
}
