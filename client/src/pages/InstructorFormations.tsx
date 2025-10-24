import { useQuery } from "@tanstack/react-query";
import type { Formation } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, MapPin } from "lucide-react";

export default function InstructorFormations() {
  const { data: formations = [], isLoading } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
  });

  // Filter formations where I'm the instructor (to be implemented with instructor-formation mapping)
  const myFormations = formations;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Mes Formations</h1>
        <p className="text-muted-foreground">
          Les formations que vous animez en tant que formateur
        </p>
      </div>

      {myFormations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Vous n'animez aucune formation pour le moment.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Contactez l'équipe RH pour être assigné à des formations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myFormations.map((formation) => (
            <Card key={formation.id} className="hover-elevate" data-testid={`card-formation-${formation.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <CardTitle className="text-lg font-semibold line-clamp-2">
                    {formation.title}
                  </CardTitle>
                  <Badge variant="outline" className="flex-shrink-0">
                    {formation.theme}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {formation.description}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{formation.duration}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span className="capitalize">{formation.modality}</span>
                  </div>
                </div>

                {formation.seniorityRequired && (
                  <Badge variant="secondary" className="capitalize">
                    {formation.seniorityRequired}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
