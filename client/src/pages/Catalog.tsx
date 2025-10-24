import { useState, useMemo } from "react";
import SearchBar from "@/components/SearchBar";
import FilterPanel from "@/components/FilterPanel";
import TrainingCard from "@/components/TrainingCard";
import { BookOpen } from "lucide-react";
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
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-xl">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-primary tracking-tight">Catalogue des formations</h1>
            <p className="text-lg text-muted-foreground mt-1">
              Explorez notre catalogue et développez vos compétences
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
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
        </div>

        {/* Training Grid */}
        <div className="lg:col-span-3 space-y-6">
          {filteredFormations.length > 0 ? (
            <>
              <div className="flex items-baseline gap-3">
                <p className="text-sm font-semibold text-primary">
                  {filteredFormations.length} formation{filteredFormations.length > 1 ? "s" : ""} trouvée
                  {filteredFormations.length > 1 ? "s" : ""}
                </p>
                {(searchQuery || selectedThemes.length > 0 || selectedModalities.length > 0 || selectedSeniority.length > 0) && (
                  <p className="text-sm text-muted-foreground">sur {mockFormations.filter(f => f.active).length} au total</p>
                )}
              </div>
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
            <div className="text-center py-20">
              <div className="bg-muted/50 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-primary mb-2">Aucune formation trouvée</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Essayez de modifier vos filtres ou votre recherche pour découvrir d'autres formations
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
