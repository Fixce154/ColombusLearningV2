import { useState } from "react";
import SessionCard from "../SessionCard";

export default function SessionCardExample() {
  const [selected, setSelected] = useState<string | null>(null);

  const session1 = {
    id: "s1",
    formationId: "f1",
    startDate: new Date("2025-11-15T09:00:00"),
    endDate: new Date("2025-11-16T17:00:00"),
    location: "Salle Paris - La Défense",
    capacity: 12,
    instructorId: "3",
    status: "open",
  };

  const session2 = {
    id: "s2",
    formationId: "f1",
    startDate: new Date("2025-12-10T09:00:00"),
    endDate: new Date("2025-12-11T17:00:00"),
    location: "Salle Lyon Part-Dieu",
    capacity: 12,
    instructorId: "3",
    status: "full",
  };

  return (
    <div className="space-y-3 max-w-md">
      <SessionCard
        session={session1}
        instructorName="Pierre Bernard"
        enrolledCount={8}
        isSelected={selected === "s1"}
        onClick={() => setSelected("s1")}
      />
      <SessionCard
        session={session2}
        instructorName="Pierre Bernard"
        enrolledCount={12}
        isFull
      />
    </div>
  );
}
