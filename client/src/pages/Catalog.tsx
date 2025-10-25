import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import SearchBar from "@/components/SearchBar";
import FilterPanel from "@/components/FilterPanel";
import TrainingCard from "@/components/TrainingCard";
import { BookOpen, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import type { Formation, Session } from "@shared/schema";

export default function Catalog() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [selectedSeniority, setSelectedSeniority] = useState<string[]>([]);

  const { data: formations = [], isLoading: isLoadingFormations } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
  });

  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const res = await fetch("/api/sessions?upcoming=true", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  const filteredFormations = useMemo(() => {
    return formations.filter((formation) => {
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
  }, [formations, searchQuery, selectedThemes, selectedModalities, selectedSeniority]);

  const getNextSession = (formationId: string) => {
    const formationSessions = sessions
      .filter((s) => s.formationId === formationId && s.status === "open")
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return formationSessions[0] ? new Date(formationSessions[0].startDate) : undefined;
  };

  const handleReset = () => {
    setSelectedThemes([]);
    setSelectedModalities([]);
    setSelectedSeniority([]);
  };

  if (isLoadingFormations || isLoadingSessions) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement du catalogue...</p>
        </div>
      </div>
    );
  }

  const activeFormations = formations.filter((f) => f.active).length;
  const openSessionsCount = sessions.filter((s) => s.status === "open").length;

  return (
    <div className="space-y-12">
      <section className="surface-elevated relative overflow-hidden rounded-[2rem] px-12 py-14">
        <div className="pointer-events-none absolute inset-y-8 right-0 hidden w-72 rounded-l-[32px] bg-[radial-gradient(circle_at_center,rgba(10,132,255,0.12),transparent_60%)] md:block" />
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-5">
            <p className="eyebrow text-muted-foreground">Explorer les programmes</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">Catalogue des formations</h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Trouvez la formation qui répond à vos objectifs et accédez à des parcours conçus par les experts Colombus.
            </p>
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-4 text-center text-foreground">
            <div className="rounded-3xl border border-black/5 bg-white px-5 py-4 shadow-sm">
              <p className="eyebrow text-muted-foreground">Formations actives</p>
              <p className="mt-3 text-2xl font-semibold">{activeFormations}</p>
            </div>
            <div className="rounded-3xl border border-black/5 bg-white px-5 py-4 shadow-sm">
              <p className="eyebrow text-muted-foreground">Sessions ouvertes</p>
              <p className="mt-3 text-2xl font-semibold">{openSessionsCount}</p>
            </div>
            <div className="col-span-2 rounded-3xl border border-black/5 bg-secondary px-5 py-4 text-sm text-muted-foreground">
              Des modalités présentielles, distancielles et hybrides pour répondre à toutes vos réalités terrain.
            </div>
          </div>
        </div>
      </section>

      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      <div className="grid gap-8 lg:grid-cols-4">
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

        <div className="lg:col-span-3 space-y-6">
          {filteredFormations.length > 0 ? (
            <>
              <div className="flex items-baseline gap-3">
                <p className="text-sm font-semibold text-foreground">
                  {filteredFormations.length} formation{filteredFormations.length > 1 ? "s" : ""} trouvée{filteredFormations.length > 1 ? "s" : ""}
                </p>
                {(searchQuery || selectedThemes.length > 0 || selectedModalities.length > 0 || selectedSeniority.length > 0) && (
                  <p className="text-sm text-muted-foreground">sur {formations.filter((f) => f.active).length} au total</p>
                )}
              </div>
              <div className="grid gap-6 md:grid-cols-2">
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
            <div className="surface-tonal rounded-[1.75rem] p-16 text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white text-muted-foreground shadow-sm">
                <BookOpen className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Aucune formation trouvée</h3>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Essayez de modifier vos filtres ou votre recherche pour découvrir d'autres formations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
