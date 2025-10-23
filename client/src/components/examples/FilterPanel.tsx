import { useState } from "react";
import FilterPanel from "../FilterPanel";

export default function FilterPanelExample() {
  const [themes, setThemes] = useState<string[]>(["Technique"]);
  const [modalities, setModalities] = useState<string[]>([]);
  const [seniority, setSeniority] = useState<string[]>(["confirme"]);

  return (
    <div className="max-w-xs">
      <FilterPanel
        selectedThemes={themes}
        selectedModalities={modalities}
        selectedSeniority={seniority}
        onThemeChange={setThemes}
        onModalityChange={setModalities}
        onSeniorityChange={setSeniority}
        onReset={() => {
          setThemes([]);
          setModalities([]);
          setSeniority([]);
        }}
      />
    </div>
  );
}
