import SeniorityBadge from "../SeniorityBadge";

export default function SeniorityBadgeExample() {
  return (
    <div className="flex gap-2">
      <SeniorityBadge seniority="Alternant" />
      <SeniorityBadge seniority="Senior" />
      <SeniorityBadge seniority="Senior Manager" />
    </div>
  );
}
