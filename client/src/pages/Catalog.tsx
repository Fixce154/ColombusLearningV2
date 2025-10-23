import { useState, useMemo } from "react";
import SearchBar from "@/components/SearchBar";
import FilterPanel from "@/components/FilterPanel";
import TrainingCard from "@/components/TrainingCard";
import { mockFormations, mockSessions } from "@/lib/mockData";
import { useLocation } from "wouter";

export default function Catalog() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [selectedSeniority, setSelectedSeniority] = useState<string[]>([]);

  const filteredFormations = useMemo(() => {
    return mockFormations.filter((formation) => {
      if (!formation.active) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = `${formation.title} ${formation.description} ${formation.tags?.join(" ")}`.toLowerCase();
        if (!searchableText.includes(query)) return false;
      }

      if (selectedThemes.length > 0 && !selectedThemes.includes(formation.theme)) {
        return false;
      }

      if (selectedModalities.length > 0 && !selectedModalities.includes(formation.modality)) {
        return false;
      }

      if (
        selectedSeniority.length > 0 &&
        formation.seniorityRequired &&
        !selectedSeniority.includes(formation.seniorityRequired)
      ) {
        return false;
      }

      return true;
    });
  }, [searchQuery, selectedThemes, selectedModalities, selectedSeniority]);

  const getNextSession = (formationId: string) => {
    const sessions = mockSessions
      .filter((s) => s.formationId === formationId && s.status === "open" && s.startDate > new Date())
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    return sessions[0]?.startDate;
  };

  const handleReset = () => {
    setSelectedThemes([]);
    setSelectedModalities([]);
    setSelectedSeniority([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Catalogue des formations</h1>
        <p className="text-muted-foreground mt-1">
          Explorez notre catalogue et inscrivez-vous aux formations qui vous intéressent
        </p>
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <FilterPanel
            selectedThemes={selectedThemes}
            selectedModalities={selectedModalities}
            selectedSeniority={selectedSeniority}
            onThemeChange={setSelectedThemes}
            onModalityChange={setSelectedModalities}
            onSeniorityChange={setSelectedSeniority}
            onReset={handleReset}
          />
        </div>

        <div className="lg:col-span-3">
          {filteredFormations.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {filteredFormations.length} formation{filteredFormations.length > 1 ? "s" : ""} trouvée
                {filteredFormations.length > 1 ? "s" : ""}
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                {filteredFormations.map((formation) => (
                  <TrainingCard
                    key={formation.id}
                    formation={formation}
                    nextSessionDate={getNextSession(formation.id)}
                    onViewDetails={() => setLocation(`/training/${formation.id}`)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune formation ne correspond à vos critères</p>
              <p className="text-sm text-muted-foreground mt-2">Essayez de modifier vos filtres ou votre recherche</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
