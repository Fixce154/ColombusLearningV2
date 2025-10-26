import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Registration, Formation, Session, User } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PriorityBadge from "@/components/PriorityBadge";
import StatusBadge from "@/components/StatusBadge";

export default function RegistrationManagement() {
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [actionType, setActionType] = useState<"validate" | "reject" | null>(null);
  const { toast } = useToast();

  // Fetch all registrations (RH access)
  const { data: registrations = [], isLoading: isLoadingRegistrations } = useQuery<Registration[]>({
    queryKey: ["/api/admin/registrations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/registrations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch registrations");
      return res.json();
    },
  });

  // Fetch formations
  const { data: formations = [] } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
  });

  // Fetch sessions
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const res = await fetch("/api/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  // Fetch all users to show names
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    retry: false,
  });

  // Update registration status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, action }: { id: string; status: string; action: "validate" | "reject" }) => {
      return apiRequest(`/api/registrations/${id}`, "PATCH", { status }).then(() => action);
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/registrations"] });
      toast({
        title: "Statut mis à jour",
        description: action === "validate" 
          ? "L'inscription a été validée avec succès" 
          : "L'inscription a été refusée",
      });
      setSelectedRegistration(null);
      setActionType(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le statut",
      });
    },
  });

  const handleAction = (registration: Registration, action: "validate" | "reject") => {
    setSelectedRegistration(registration);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedRegistration || !actionType) return;
    const newStatus = actionType === "validate" ? "validated" : "cancelled";
    updateStatusMutation.mutate({ id: selectedRegistration.id, status: newStatus, action: actionType });
  };

  const getFormation = (id: string) => formations.find(f => f.id === id);
  const getSession = (id: string) => sessions.find(s => s.id === id);
  const getUser = (id: string) => users.find(u => u.id === id);

  const pendingRegistrations = registrations.filter(r => r.status === "pending");
  const validatedRegistrations = registrations.filter(r => r.status === "validated");
  const cancelledRegistrations = registrations.filter(r => r.status === "cancelled");

  if (isLoadingRegistrations) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement des inscriptions...</p>
        </div>
      </div>
    );
  }

  const RegistrationTable = ({ data, showActions = false }: { data: Registration[]; showActions?: boolean }) => (
    <div className="overflow-hidden rounded-2xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Consultant</TableHead>
            <TableHead>Formation</TableHead>
            <TableHead>Session</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Date d'inscription</TableHead>
            <TableHead>Statut</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 6} className="text-center py-12 text-muted-foreground">
                Aucune inscription à afficher
              </TableCell>
            </TableRow>
          ) : (
            data.map((registration) => {
              const formation = getFormation(registration.formationId);
              const session = getSession(registration.sessionId);
              const user = getUser(registration.userId);

              return (
                <TableRow key={registration.id}>
                  <TableCell className="font-medium">{user?.name || "Utilisateur inconnu"}</TableCell>
                  <TableCell>{formation?.title || "Formation inconnue"}</TableCell>
                  <TableCell>
                    {session ? (
                      <div className="text-sm">
                        <div>{format(new Date(session.startDate), "dd MMM yyyy", { locale: fr })}</div>
                        <div className="text-muted-foreground">{session.location}</div>
                      </div>
                    ) : (
                      "Session inconnue"
                    )}
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={registration.priority as "P1" | "P2" | "P3"} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(registration.registeredAt || new Date()), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={registration.status as "pending" | "validated" | "completed" | "cancelled"} />
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAction(registration, "validate")}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-validate-${registration.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Valider
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(registration, "reject")}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-reject-${registration.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Refuser
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-12">
      <section className="surface-elevated relative overflow-hidden rounded-[2rem] px-12 py-14">
        <div className="pointer-events-none absolute inset-y-8 right-0 hidden w-72 rounded-l-[32px] bg-[radial-gradient(circle_at_center,rgba(10,132,255,0.12),transparent_60%)] md:block" />
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-5">
            <p className="eyebrow text-muted-foreground">Administration RH</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">Pilotage des inscriptions</h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Validez les demandes des consultants, libérez des places et gardez une visibilité claire sur les sessions en cours.
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-4">
            <div className="rounded-2xl border border-white/40 bg-white/80 p-5 text-[#00313F] shadow-sm backdrop-blur">
              <p className="text-sm font-semibold">Inscriptions en attente</p>
              <p className="text-3xl font-bold">{pendingRegistrations.length}</p>
              <p className="text-xs text-[#00313F]/70">
                {validatedRegistrations.length} validée{validatedRegistrations.length > 1 ? "s" : ""} • {cancelledRegistrations.length} refusée{cancelledRegistrations.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-3xl font-semibold text-foreground">{pendingRegistrations.length}</p>
            </div>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Clock className="h-6 w-6" />
            </div>
          </Card>

          <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Validées</p>
              <p className="text-3xl font-semibold text-foreground">{validatedRegistrations.length}</p>
            </div>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <CheckCircle className="h-6 w-6" />
            </div>
          </Card>

          <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Refusées</p>
              <p className="text-3xl font-semibold text-foreground">{cancelledRegistrations.length}</p>
            </div>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <XCircle className="h-6 w-6" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full space-y-6">
          <TabsList className="h-12 rounded-full bg-muted p-1 shadow-sm">
            <TabsTrigger value="pending" className="px-6 font-medium">
              En attente ({pendingRegistrations.length})
            </TabsTrigger>
            <TabsTrigger value="validated" className="px-6 font-medium">
              Validées ({validatedRegistrations.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="px-6 font-medium">
              Refusées ({cancelledRegistrations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
              <RegistrationTable data={pendingRegistrations} showActions={true} />
            </Card>
          </TabsContent>

          <TabsContent value="validated">
            <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
              <RegistrationTable data={validatedRegistrations} />
            </Card>
          </TabsContent>

          <TabsContent value="cancelled">
            <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
              <RegistrationTable data={cancelledRegistrations} />
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedRegistration && !!actionType} onOpenChange={() => { setSelectedRegistration(null); setActionType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "validate" ? "Valider l'inscription" : "Refuser l'inscription"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "validate" 
                ? "Êtes-vous sûr de vouloir valider cette inscription ? Le consultant recevra une confirmation."
                : "Êtes-vous sûr de vouloir refuser cette inscription ? Le consultant en sera informé."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatusMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "En cours..." : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
