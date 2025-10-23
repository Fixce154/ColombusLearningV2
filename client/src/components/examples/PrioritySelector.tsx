import { useState } from "react";
import PrioritySelector from "../PrioritySelector";

export default function PrioritySelectorExample() {
  const [priority, setPriority] = useState<"P1" | "P2" | "P3">("P3");

  return (
    <div className="max-w-2xl">
      <PrioritySelector
        value={priority}
        onChange={setPriority}
        p1Available={true}
        p2Available={false}
      />
      <p className="mt-4 text-sm text-muted-foreground">Selected: {priority}</p>
    </div>
  );
}
