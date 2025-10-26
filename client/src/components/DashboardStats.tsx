import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle, AlertCircle } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  iconClass?: string;
}

function StatCard({ title, value, icon, description, iconClass = "" }: StatCardProps) {
  return (
    <Card className="surface-soft relative flex h-full items-center justify-between gap-6 rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1">
      <div className="flex-1 space-y-4">
        <div>
          <p className="eyebrow text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        {icon}
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
  const p1Remaining = Math.max(0, 1 - p1Used);
  const p2Remaining = Math.max(0, 1 - p2Used);
  const prioritiesRemaining = Math.max(0, 2 - (p1Used + p2Used));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="dashboard-stats">
      <StatCard
        title="Formations à venir"
        value={upcomingCount}
        icon={<Calendar className="h-5 w-5" />}
        iconClass="bg-primary/10 text-primary"
        data-testid="stat-upcoming"
      />
      <StatCard
        title="Formations réalisées"
        value={completedCount}
        icon={<CheckCircle className="h-5 w-5" />}
        iconClass="bg-secondary text-foreground"
        data-testid="stat-completed"
      />
      <StatCard
        title="Priorités restantes"
        value={prioritiesRemaining}
        icon={<AlertCircle className="h-5 w-5" />}
        iconClass="bg-destructive/10 text-destructive"
        description={`P1 restantes: ${p1Remaining} • P2 restantes: ${p2Remaining}`}
        data-testid="stat-priorities"
      />
    </div>
  );
}
