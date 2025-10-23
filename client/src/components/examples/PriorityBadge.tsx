import PriorityBadge from "../PriorityBadge";

export default function PriorityBadgeExample() {
  return (
    <div className="flex gap-2">
      <PriorityBadge priority="P1" />
      <PriorityBadge priority="P2" />
      <PriorityBadge priority="P3" />
    </div>
  );
}
