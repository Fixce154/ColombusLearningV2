import { useRoute, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, QrCode, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface AttendanceResponse {
  message: string;
  sessionId: string;
  attendanceSignedAt: string;
}

export default function AttendanceSign() {
  const [, fullRouteParams] = useRoute("/attendance/:token");
  const [, shortRouteParams] = useRoute("/a/:token");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [success, setSuccess] = useState<AttendanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = fullRouteParams?.token ?? shortRouteParams?.token ?? "";

  const signMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const response = await apiRequest("/api/attendance/sign", "POST", { token });
      return response as AttendanceResponse;
    },
    onSuccess: (response) => {
      setSuccess(response);
      toast({
        title: "Présence enregistrée",
        description: "Merci d'avoir confirmé votre participation",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Impossible d'enregistrer la présence";
      setError(message);
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="max-w-xl mx-auto py-16 space-y-8">
      <Button variant="ghost" className="gap-2" onClick={() => navigate("/dashboard")}>
        <ArrowLeft className="w-4 h-4" />
        Retour à l'accueil
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Signature de présence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Validez votre présence en confirmant le QR Code présenté par votre formateur.
          </p>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success ? (
            <Alert className="border-accent/40 bg-accent/10 text-accent-foreground">
              <CheckCircle className="w-5 h-5 mr-2" />
              <AlertDescription>
                Présence enregistrée pour la session #{success.sessionId}.
              </AlertDescription>
            </Alert>
          ) : (
            <Button
              size="lg"
              className="w-full"
              onClick={() => signMutation.mutate()}
              disabled={signMutation.isPending || !token}
            >
              {signMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span className="ml-2">Je confirme ma présence</span>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
