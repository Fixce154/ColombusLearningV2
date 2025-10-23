import SeniorityBadge from "../SeniorityBadge";

export default function SeniorityBadgeExample() {
  return (
    <div className="flex gap-2">
      <SeniorityBadge seniority="junior" />
      <SeniorityBadge seniority="confirme" />
      <SeniorityBadge seniority="senior" />
      <SeniorityBadge seniority="expert" />
    </div>
  );
}
