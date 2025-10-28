import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import type { Session, Formation, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  QrCode,
  RefreshCcw,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import QRCodeCanvas from "@/components/QRCodeCanvas";

interface SessionAttendee {
  registrationId: string;
  userId: string;
  status: string;
  attended: boolean;
  attendanceSignedAt?: string | null;
  registeredAt: string;
  priority: string;
  user: {
    id: string;
    name: string;
    email: string;
    roles: string[];
  } | null;
}

interface AttendanceTokenResponse {
  token: string;
  expiresAt: string;
  sessionId: string;
}

export default function InstructorSessions() {
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tokenData, setTokenData] = useState<AttendanceTokenResponse | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: currentUser } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: formations = [] } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
  });

  const attendeesQuery = useQuery<SessionAttendee[]>({
    queryKey: ["/api/sessions", selectedSession?.id, "attendees"],
    enabled: Boolean(isDialogOpen && selectedSession?.id),
    queryFn: async () => {
      if (!selectedSession?.id) return [];
      const res = await fetch(`/api/sessions/${selectedSession.id}/attendees`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Impossible de récupérer les participants");
      }
      return res.json();
    },
  });

  const generateTokenMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      setTokenError(null);
      return apiRequest(`/api/sessions/${sessionId}/attendance-token`, "POST", {});
    },
    onSuccess: (response: AttendanceTokenResponse) => {
      setTokenData(response);
      setTokenError(null);
      toast({
        title: "QR Code généré",
        description: "Partagez ce code avec vos stagiaires pour enregistrer leur présence.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Impossible de générer le QR Code";
      setTokenError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const attendees = attendeesQuery.data ?? [];
  const attendedCount = useMemo(
    () => attendees.filter((attendee) => attendee.attended).length,
    [attendees]
  );

  const qrLink = useMemo(() => {
    if (!tokenData) return "";

    const buildUrl = (origin: string | undefined) => {
      if (!origin) return "";
      try {
        return new URL(`/a/${tokenData.token}`, origin).toString();
      } catch {
        return "";
      }
    };

    const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const fromBrowser = buildUrl(browserOrigin);
    if (fromBrowser) {
      return fromBrowser;
    }

    const envOrigin = import.meta.env?.VITE_PUBLIC_APP_URL as string | undefined;
    const fromEnv = buildUrl(envOrigin);
    if (fromEnv) {
      return fromEnv;
    }

    return `/a/${tokenData.token}`;
  }, [tokenData]);

  const qrValue = qrLink || tokenData?.token || "";

  const handleCopyLink = async () => {
    if (!qrLink) return;
    try {
      await navigator.clipboard.writeText(qrLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({
        title: "Lien copié",
        description: "Le lien de présence a été copié dans le presse-papiers.",
      });
    } catch (error) {
      console.error("Unable to copy attendance link", error);
      toast({
        title: "Impossible de copier",
        description: "Copiez manuellement le lien affiché ci-dessous.",
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = (session: Session) => {
    setSelectedSession(session);
    setIsDialogOpen(true);
    setTokenData(null);
    setTokenError(null);
    setLinkCopied(false);
    generateTokenMutation.mutate(session.id);
  };

  const handleTokenRefresh = (sessionId: string) => {
    setLinkCopied(false);
    generateTokenMutation.mutate(sessionId);
  };

  // Filter sessions where I'm the instructor
  const mySessions = sessions.filter(
    (session) => session.instructorId === currentUser?.user?.id
  );

  const getFormationTitle = (formationId: string) => {
    const formation = formations.find((f) => f.id === formationId);
    return formation?.title || "Formation inconnue";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      open: "default",
      full: "secondary",
      completed: "secondary",
      cancelled: "destructive",
    };
    
    const labels: Record<string, string> = {
      open: "Ouverte",
      full: "Complète",
      completed: "Terminée",
      cancelled: "Annulée",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section className="surface-elevated relative overflow-hidden rounded-[2rem] px-12 py-14">
        <div className="pointer-events-none absolute inset-y-8 right-0 hidden w-72 rounded-l-[32px] bg-[radial-gradient(circle_at_center,rgba(10,132,255,0.12),transparent_60%)] md:block" />
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-5">
            <p className="eyebrow text-muted-foreground">Espace formateur</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">Vos sessions de formation</h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Retrouvez vos prochaines sessions, leurs participants et les informations essentielles pour les animer sereinement.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Mes sessions planifiées</h2>
          <p className="text-muted-foreground">Les sessions de formation que vous animez</p>
        </div>

      {mySessions.length === 0 ? (
        <Card className="surface-tonal rounded-[1.75rem] border-none">
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Aucune session planifiée pour le moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {mySessions.map((session) => (
            <Card key={session.id} className="hover-elevate" data-testid={`card-session-${session.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold mb-2">
                      {getFormationTitle(session.formationId)}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(session.startDate), "d MMMM yyyy", { locale: fr })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(new Date(session.startDate), "HH:mm", { locale: fr })} -{" "}
                          {format(new Date(session.endDate), "HH:mm", { locale: fr })}
                        </span>
                      </div>
                      {session.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span>{session.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(session.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>Capacité: {session.capacity} participants</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => handleOpenDialog(session)}
                    data-testid={`button-session-qrcode-${session.id}`}
                  >
                    <QrCode className="w-4 h-4" />
                    Présence via QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </section>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedSession(null);
            setTokenData(null);
            setTokenError(null);
            setLinkCopied(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Signature de présence
            </DialogTitle>
            <DialogDescription>
              Partagez ce QR Code avec les stagiaires pour enregistrer automatiquement leur présence.
            </DialogDescription>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-8">
              <div className="grid gap-6 md:grid-cols-[280px,1fr]">
                <div className="flex flex-col items-center gap-4 rounded-xl border bg-muted/30 p-6">
                  {tokenData ? (
                    <>
                      <QRCodeCanvas value={qrValue} size={220} />
                      <div className="space-y-3 text-center text-sm">
                        <div className="space-y-1">
                          <p className="font-medium">Lien direct</p>
                          <a
                            href={qrLink}
                            target="_blank"
                            rel="noreferrer"
                            className="block font-mono text-xs text-primary break-all hover:underline"
                          >
                            {qrLink}
                          </a>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={handleCopyLink}
                          disabled={!qrLink}
                        >
                          {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {linkCopied ? "Lien copié" : "Copier le lien"}
                        </Button>
                        <div>
                          <p className="font-medium">Code manuel</p>
                          <p className="font-mono text-xs text-muted-foreground break-all">{tokenData.token}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Expire le {format(new Date(tokenData.expiresAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </>
                  ) : tokenError ? (
                    <div className="flex h-[220px] w-full flex-col items-center justify-center gap-4 p-4">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <AlertCircle className="w-12 h-12 text-destructive" />
                        <p className="text-sm font-medium text-destructive">Impossible de générer le QR Code</p>
                        <p className="text-xs text-muted-foreground">{tokenError}</p>
                      </div>
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => selectedSession && handleTokenRefresh(selectedSession.id)}
                        disabled={generateTokenMutation.isPending}
                      >
                        <RefreshCcw className="w-4 h-4" />
                        Réessayer
                      </Button>
                    </div>
                  ) : (
                    <div className="flex h-[220px] w-full items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {tokenData && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => selectedSession && handleTokenRefresh(selectedSession.id)}
                      disabled={generateTokenMutation.isPending}
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Régénérer
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border bg-background p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-foreground">
                      {getFormationTitle(selectedSession.formationId)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedSession.startDate), "d MMMM yyyy", { locale: fr })} • {format(new Date(selectedSession.startDate), "HH:mm", { locale: fr })} - {format(new Date(selectedSession.endDate), "HH:mm", { locale: fr })}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <Badge variant="outline">Capacité {selectedSession.capacity}</Badge>
                      <Badge variant="outline">Présents {attendedCount}/{attendees.length}</Badge>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-semibold text-foreground mb-2">Participants inscrits</h4>
                    {attendeesQuery.isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement des participants...
                      </div>
                    ) : attendees.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aucun participant inscrit pour le moment.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {attendees.map((attendee) => (
                          <div
                            key={attendee.registrationId}
                            className="flex items-center justify-between rounded-lg border bg-muted/40 p-3"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {attendee.user?.name || "Participant"}
                              </p>
                              {attendee.user?.email && (
                                <p className="text-xs text-muted-foreground">{attendee.user.email}</p>
                              )}
                            </div>
                            <Badge variant={attendee.attended ? "default" : "outline"}>
                              {attendee.attended ? "Présent" : "En attente"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
