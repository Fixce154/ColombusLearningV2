import { Card } from "@/components/ui/card";
import { Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  iconBg?: string;
}

function StatCard({ title, value, icon, description, iconBg = "bg-accent" }: StatCardProps) {
  return (
    <Card className="p-8 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">{title}</p>
          <p className="text-4xl font-bold text-primary mb-2">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-3">{description}</p>}
        </div>
        <div className={`${iconBg} p-4 rounded-xl text-white flex-shrink-0`}>{icon}</div>
      </div>
    </Card>
  );
}

interface DashboardStatsProps {
  upcomingCount: number;
  completedCount: number;
  p1Used: number;
  p2Used: number;
}

export default function DashboardStats({
  upcomingCount,
  completedCount,
  p1Used,
  p2Used,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="dashboard-stats">
      <StatCard
        title="Formations à venir"
        value={upcomingCount}
        icon={<Calendar className="w-6 h-6" />}
        iconBg="bg-accent"
        data-testid="stat-upcoming"
      />
      <StatCard
        title="Complétées"
        value={completedCount}
        icon={<CheckCircle className="w-6 h-6" />}
        iconBg="bg-primary"
        data-testid="stat-completed"
      />
      <StatCard
        title="Priorités"
        value={`${p1Used + p2Used}/2`}
        icon={<AlertCircle className="w-6 h-6" />}
        iconBg="bg-destructive"
        description={`P1: ${p1Used}/1 • P2: ${p2Used}/1`}
        data-testid="stat-priorities"
      />
    </div>
  );
}
