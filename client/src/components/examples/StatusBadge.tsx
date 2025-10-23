import StatusBadge from "../StatusBadge";

export default function StatusBadgeExample() {
  return (
    <div className="flex gap-2">
      <StatusBadge status="validated" />
      <StatusBadge status="pending" />
      <StatusBadge status="completed" />
      <StatusBadge status="cancelled" />
      <StatusBadge status="open" />
      <StatusBadge status="full" />
    </div>
  );
}
