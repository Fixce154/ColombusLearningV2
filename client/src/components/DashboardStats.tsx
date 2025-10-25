import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle, AlertCircle } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  accentClass?: string;
}

function StatCard({ title, value, icon, description, accentClass = "" }: StatCardProps) {
  return (
    <Card className="glass-panel group relative overflow-hidden rounded-2xl border-white/40 p-8 transition-transform duration-300 hover:-translate-y-1">
      <div className="pointer-events-none absolute inset-x-6 -bottom-10 h-32 rounded-full bg-gradient-to-b from-white/80 to-transparent blur-2xl" />
      <div className="relative z-10 flex items-start justify-between gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <p className="section-subtle-title text-muted-foreground/70">{title}</p>
            <p className="text-4xl font-semibold tracking-tight text-primary">{value}</p>
          </div>
          {description && <p className="text-xs text-muted-foreground/80">{description}</p>}
        </div>
        <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accentClass}`}>
          <div className="text-lg">{icon}</div>
        </div>
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
        icon={<Calendar className="h-6 w-6" />}
        accentClass="from-accent/20 via-accent/40 to-accent/70 text-accent"
        data-testid="stat-upcoming"
      />
      <StatCard
        title="Complétées"
        value={completedCount}
        icon={<CheckCircle className="h-6 w-6" />}
        accentClass="from-primary/20 via-primary/40 to-primary/70 text-primary"
        data-testid="stat-completed"
      />
      <StatCard
        title="Priorités"
        value={`${p1Used + p2Used}/2`}
        icon={<AlertCircle className="h-6 w-6" />}
        accentClass="from-destructive/20 via-destructive/40 to-destructive/70 text-destructive"
        description={`P1: ${p1Used}/1 • P2: ${p2Used}/1`}
        data-testid="stat-priorities"
      />
    </div>
  );
}
