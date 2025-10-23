import TrainingCard from "../TrainingCard";

export default function TrainingCardExample() {
  const formation = {
    id: "f1",
    title: "Méthodologie Agile Scrum",
    description: "Découvrez les principes fondamentaux de la méthodologie Agile et du framework Scrum pour gérer vos projets de manière itérative et collaborative.",
    objectives: "Comprendre les valeurs Agile",
    prerequisites: "Aucun",
    duration: "2 jours",
    modality: "presentiel",
    seniorityRequired: "junior",
    theme: "Gestion de projet",
    tags: ["agile", "scrum", "gestion projet"],
    active: true,
  };

  return (
    <div className="max-w-sm">
      <TrainingCard
        formation={formation}
        nextSessionDate={new Date("2025-11-15")}
        onViewDetails={() => console.log("View details clicked")}
      />
    </div>
  );
}
