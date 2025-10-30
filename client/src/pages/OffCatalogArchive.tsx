import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SearchBar from "@/components/SearchBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PriorityBadge from "@/components/PriorityBadge";
import RatingStars from "@/components/RatingStars";
import {
  CalendarCheck,
  ExternalLink,
  Hash,
  Loader2,
  MessageSquareQuote,
  PiggyBank,
  UserCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { AdminInterestsResponse } from "@/types/admin";
import type { FormationInterest, User } from "@shared/schema";

const formatKeyDate = (interest: FormationInterest) => {
  const keyDate = interest.completedAt || interest.customPlannedDate || interest.expressedAt;
  if (!keyDate) {
    return null;
  }

  try {
    return format(new Date(keyDate), "dd MMMM yyyy", { locale: fr });
  } catch (error) {
    return null;
  }
};

const getSearchableText = (interest: FormationInterest, consultant: User | undefined) => {
  const parts = [
    interest.customTitle,
    interest.customDescription,
    interest.customMissionManager,
    interest.customPrice,
    interest.customFitnetNumber,
    interest.customLink,
    consultant?.name,
    consultant?.businessUnit,
    consultant?.seniority,
    consultant?.grade,
  ];

  return parts
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join(" ")
    .toLowerCase();
};

export default function OffCatalogArchive() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: interestsData, isLoading: isLoadingInterests } = useQuery<AdminInterestsResponse>({
    queryKey: ["/api/admin/interests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/interests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch interests");
      return res.json();
    },
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const interests = interestsData?.interests ?? [];

  const offCatalogCompleted = useMemo(() => {
    return interests
      .filter((interest) => !interest.formationId && interest.status === "converted")
      .sort((a, b) => {
        const dateA = new Date(
          a.completedAt || a.customPlannedDate || a.expressedAt || new Date(0)
        ).getTime();
        const dateB = new Date(
          b.completedAt || b.customPlannedDate || b.expressedAt || new Date(0)
        ).getTime();
        return dateB - dateA;
      });
  }, [interests]);

  const getConsultant = (userId: string) => users.find((user) => user.id === userId);

  const filteredResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return offCatalogCompleted;
    }

    return offCatalogCompleted.filter((interest) => {
      const consultant = getConsultant(interest.userId);
      const searchableText = getSearchableText(interest, consultant);
      return searchableText.includes(normalizedQuery);
    });
  }, [searchQuery, offCatalogCompleted, users]);

  const totalCollaborators = useMemo(() => {
    return new Set(offCatalogCompleted.map((interest) => interest.userId)).size;
  }, [offCatalogCompleted]);

  const ratings = useMemo(() => {
    return offCatalogCompleted
      .map((interest) => interest.customReviewRating)
      .filter((rating): rating is number => typeof rating === "number");
  }, [offCatalogCompleted]);

  const averageRating = ratings.length > 0
    ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
    : null;

  const isLoading = isLoadingInterests || isLoadingUsers;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement de l'historique hors catalogue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section className="surface-elevated relative overflow-hidden rounded-[2rem] px-12 py-14">
        <div className="pointer-events-none absolute inset-y-10 right-0 hidden w-80 rounded-l-[40px] bg-[radial-gradient(circle_at_center,rgba(0,158,203,0.12),transparent_65%)] md:block" />
        <div className="relative z-10 flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="eyebrow text-muted-foreground">Suivi RH</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Formations hors catalogue réalisées
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Retrouvez l'ensemble des demandes personnalisées validées, les dates effectives et les retours des collaborateurs.
            </p>
          </div>
          <div className="rounded-3xl bg-white/70 p-6 shadow-lg ring-1 ring-black/5">
            <p className="text-sm text-muted-foreground">Formations réalisées</p>
            <p className="mt-2 text-4xl font-semibold text-foreground">{offCatalogCompleted.length}</p>
            <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
              depuis le lancement du dispositif
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="surface-soft flex h-full flex-col justify-between rounded-2xl border-none p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Collaborateurs impliqués</p>
            <p className="text-3xl font-semibold text-foreground">{totalCollaborators}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserCircle className="h-5 w-5 text-primary" />
            <span>Profil unique par formation suivie</span>
          </div>
        </Card>
        <Card className="surface-soft flex h-full flex-col justify-between rounded-2xl border-none p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Avis collectés</p>
            <p className="text-3xl font-semibold text-foreground">{ratings.length}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquareQuote className="h-5 w-5 text-primary" />
            <span>Avis fournis par les collaborateurs</span>
          </div>
        </Card>
        <Card className="surface-soft flex h-full flex-col justify-between rounded-2xl border-none p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Satisfaction moyenne</p>
            <p className="text-3xl font-semibold text-foreground">
              {averageRating ? `${averageRating}/5` : "-"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarCheck className="h-5 w-5 text-primary" />
            <span>Basée sur les avis publiés</span>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher par collaborateur, intitulé ou mot-clé..."
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filteredResults.length} formation{filteredResults.length > 1 ? "s" : ""} hors catalogue réalisée{filteredResults.length > 1 ? "s" : ""}
          </span>
          {searchQuery && (
            <span>
              Résultats pour « <span className="font-medium text-foreground">{searchQuery}</span> »
            </span>
          )}
        </div>
      </div>

      {filteredResults.length === 0 ? (
        <Card className="rounded-[1.75rem] border border-dashed border-border/60 bg-muted/30 p-12 text-center shadow-none">
          <p className="text-lg font-semibold text-foreground">Aucune formation trouvée</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Aucun enregistrement ne correspond à votre recherche. Essayez d'autres mots-clés ou effacez le filtre.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredResults.map((interest) => {
            const consultant = getConsultant(interest.userId);
            const formattedDate = formatKeyDate(interest);
            const hasReview = typeof interest.customReviewRating === "number";

            return (
              <Card key={interest.id} className="rounded-[1.75rem] border border-border/60 p-6 shadow-sm">
                <div className="flex flex-col gap-6 md:flex-row md:justify-between">
                  <div className="space-y-5 md:max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge
                        variant="secondary"
                        className="bg-green-500/10 text-green-700 border-green-500/20"
                      >
                        Réalisée
                      </Badge>
                      <PriorityBadge priority={interest.priority as "P1" | "P2" | "P3"} />
                      {consultant && (
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {consultant.name}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        {interest.customTitle || "Formation hors catalogue"}
                      </h2>
                      {interest.customDescription && (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {interest.customDescription}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <UserCircle className="mt-1 h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">
                            {consultant?.name || "Consultant inconnu"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[consultant?.businessUnit, consultant?.seniority]
                              .filter(Boolean)
                              .join(" • ") || "Profil non renseigné"}
                          </p>
                        </div>
                      </div>
                      {interest.customMissionManager && (
                        <div className="flex items-start gap-3">
                          <UserCircle className="mt-1 h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">Responsable de mission</p>
                            <p>{interest.customMissionManager}</p>
                          </div>
                        </div>
                      )}
                      {interest.customPrice && (
                        <div className="flex items-start gap-3">
                          <PiggyBank className="mt-1 h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">Budget indicatif</p>
                            <p>{interest.customPrice}</p>
                          </div>
                        </div>
                      )}
                      {interest.customFitnetNumber && (
                        <div className="flex items-start gap-3">
                          <Hash className="mt-1 h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">Affaire Fitnet</p>
                            <p>{interest.customFitnetNumber}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 md:items-end">
                    <div className="flex flex-col items-start gap-1 rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground md:items-end">
                      <span className="font-semibold text-foreground">Date de réalisation</span>
                      <span>{formattedDate ?? "Non renseignée"}</span>
                    </div>
                    {interest.customLink && (
                      <Button asChild variant="outline" className="flex items-center gap-2">
                        <a href={interest.customLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          Consulter la formation
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-border/50 bg-muted/20 p-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <MessageSquareQuote className="h-5 w-5 text-primary" />
                      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Avis du collaborateur
                      </p>
                    </div>
                    {hasReview ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <RatingStars value={interest.customReviewRating ?? 0} />
                          <span className="text-sm font-medium text-muted-foreground">
                            {interest.customReviewRating}/5
                          </span>
                        </div>
                        {interest.customReviewComment && (
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {interest.customReviewComment}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        Aucun avis n'a encore été renseigné pour cette formation.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
