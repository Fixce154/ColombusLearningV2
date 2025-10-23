import DashboardStats from "../DashboardStats";

export default function DashboardStatsExample() {
  return (
    <DashboardStats
      upcomingCount={2}
      pendingCount={1}
      completedCount={5}
      p1Used={0}
      p2Used={1}
    />
  );
}
