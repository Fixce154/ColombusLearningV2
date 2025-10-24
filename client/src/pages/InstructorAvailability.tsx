import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function InstructorAvailability() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Mes Disponibilités</h1>
        <p className="text-muted-foreground">
          Gérez vos disponibilités pour animer des sessions de formation
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendrier de Disponibilités
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">
            Fonctionnalité en cours de développement
          </p>
          <p className="text-sm text-muted-foreground">
            Vous pourrez bientôt indiquer vos créneaux de disponibilité pour les sessions de formation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
