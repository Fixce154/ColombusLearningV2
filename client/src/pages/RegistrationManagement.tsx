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
    <div className="border rounded-lg">
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
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-xl">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-primary tracking-tight">Gestion des inscriptions</h1>
            <p className="text-lg text-muted-foreground mt-1">
              Validez ou refusez les demandes d'inscription des consultants
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-3xl font-bold text-primary">{pendingRegistrations.length}</p>
            </div>
            <div className="bg-destructive/10 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-destructive" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Validées</p>
              <p className="text-3xl font-bold text-primary">{validatedRegistrations.length}</p>
            </div>
            <div className="bg-accent/10 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Refusées</p>
              <p className="text-3xl font-bold text-primary">{cancelledRegistrations.length}</p>
            </div>
            <div className="bg-destructive/10 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="h-12 bg-muted p-1 shadow-sm">
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

        <TabsContent value="pending" className="mt-6">
          <RegistrationTable data={pendingRegistrations} showActions={true} />
        </TabsContent>

        <TabsContent value="validated" className="mt-6">
          <RegistrationTable data={validatedRegistrations} />
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6">
          <RegistrationTable data={cancelledRegistrations} />
        </TabsContent>
      </Tabs>

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
