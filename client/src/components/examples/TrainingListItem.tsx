import TrainingListItem from "../TrainingListItem";

export default function TrainingListItemExample() {
  return (
    <div className="space-y-3 max-w-2xl">
      <TrainingListItem
        title="Leadership et Management d'Équipe"
        status="validated"
        priority="P2"
        date={new Date("2025-11-20")}
        location="Salle Paris + Visio"
        onViewDetails={() => console.log("View details")}
      />
      <TrainingListItem
        title="Data Science avec Python"
        status="pending"
        priority="P3"
        date={new Date("2025-11-25")}
        location="Visio Teams"
        onViewDetails={() => console.log("View details")}
      />
      <TrainingListItem
        title="Méthodologie Agile Scrum"
        status="completed"
        priority="P1"
        date={new Date("2025-09-15")}
        location="Salle Paris"
        onViewDetails={() => console.log("View details")}
      />
    </div>
  );
}
