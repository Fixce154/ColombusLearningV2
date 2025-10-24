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
import { Heart, CheckCircle, XCircle, Clock, Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FormationInterest, Formation, User } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PriorityBadge from "@/components/PriorityBadge";

interface AdminInterestsResponse {
  interests: FormationInterest[];
  aggregated: {
    formationId: string;
    pending: number;
    approved: number;
    converted: number;
    withdrawn: number;
    p1Count: number;
    p2Count: number;
    p3Count: number;
  }[];
}

export default function InterestManagement() {
  const [selectedInterest, setSelectedInterest] = useState<FormationInterest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const { toast } = useToast();

  // Fetch all interests (RH access)
  const { data: interestsData, isLoading: isLoadingInterests, isFetching, refetch } = useQuery<AdminInterestsResponse>({
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

  const interests = interestsData?.interests || [];
  const aggregated = interestsData?.aggregated || [];

  // Fetch formations
  const { data: formations = [] } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
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

  // Update interest status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, action }: { id: string; status: string; action: "approve" | "reject" }) => {
      return apiRequest(`/api/interests/${id}`, "PATCH", { status }).then(() => action);
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/interests"] });
      toast({
        title: "Statut mis à jour",
        description: action === "approve" 
          ? "L'intention a été approuvée avec succès" 
          : "L'intention a été refusée",
      });
      setSelectedInterest(null);
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

  // Delete interest mutation
  const deleteInterestMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/interests/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/interests"] });
      toast({
        title: "Intention supprimée",
        description: "L'intention a été supprimée avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'intention",
      });
    },
  });

  // Delete all rejected interests mutation
  const deleteAllRejectedMutation = useMutation({
    mutationFn: async () => {
      const rejectedIds = interests.filter(i => i.status === "rejected").map(i => i.id);
      return Promise.all(rejectedIds.map(id => apiRequest(`/api/admin/interests/${id}`, "DELETE")));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/interests"] });
      toast({
        title: "Intentions supprimées",
        description: "Toutes les intentions refusées ont été supprimées",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de supprimer les intentions",
      });
    },
  });

  const handleAction = (interest: FormationInterest, action: "approve" | "reject") => {
    setSelectedInterest(interest);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedInterest || !actionType) return;
    const newStatus = actionType === "approve" ? "approved" : "rejected";
    updateStatusMutation.mutate({ id: selectedInterest.id, status: newStatus, action: actionType });
  };

  const getFormation = (id: string) => formations.find(f => f.id === id);
  const getUser = (id: string) => users.find(u => u.id === id);

  const pendingInterests = interests.filter(i => i.status === "pending");
  const approvedInterests = interests.filter(i => i.status === "approved");
  const convertedInterests = interests.filter(i => i.status === "converted");
  const rejectedInterests = interests.filter(i => i.status === "rejected");

  if (isLoadingInterests) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement des intentions de formation...</p>
        </div>
      </div>
    );
  }

  const InterestTable = ({ data, showActions = false, showDeleteAction = false }: { data: FormationInterest[]; showActions?: boolean; showDeleteAction?: boolean }) => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Consultant</TableHead>
            <TableHead>Formation</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Date d'expression</TableHead>
            <TableHead>Statut</TableHead>
            {(showActions || showDeleteAction) && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={(showActions || showDeleteAction) ? 6 : 5} className="text-center py-12 text-muted-foreground">
                Aucune intention à afficher
              </TableCell>
            </TableRow>
          ) : (
            data.map((interest) => {
              const formation = getFormation(interest.formationId);
              const user = getUser(interest.userId);

              return (
                <TableRow key={interest.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{user?.name || "Utilisateur inconnu"}</div>
                      <div className="text-xs text-muted-foreground">
                        {user?.businessUnit || ""} {user?.seniority ? `• ${user.seniority}` : ""}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      <div className="font-medium">{formation?.title || "Formation inconnue"}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">{formation?.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={interest.priority as "P1" | "P2" | "P3"} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {interest.expressedAt ? format(new Date(interest.expressedAt), "dd MMM yyyy", { locale: fr }) : "-"}
                  </TableCell>
                  <TableCell>
                    {interest.status === "pending" && (
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                        <Clock className="w-3 h-3 mr-1" />
                        En attente
                      </Badge>
                    )}
                    {interest.status === "approved" && (
                      <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approuvé
                      </Badge>
                    )}
                    {interest.status === "converted" && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Inscrit
                      </Badge>
                    )}
                    {interest.status === "rejected" && (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Refusée
                      </Badge>
                    )}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleAction(interest, "approve")}
                          data-testid={`button-approve-interest-${interest.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(interest, "reject")}
                          data-testid={`button-reject-interest-${interest.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Refuser
                        </Button>
                      </div>
                    </TableCell>
                  )}
                  {showDeleteAction && (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteInterestMutation.mutate(interest.id)}
                        disabled={deleteInterestMutation.isPending}
                        data-testid={`button-delete-interest-${interest.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Supprimer
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
    <div className="container mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Heart className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Gestion des intentions de formation</h1>
              <p className="text-muted-foreground">Approuvez ou refusez les demandes d'intérêt des consultants</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="default"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh-interests"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-3xl font-bold text-primary">{pendingInterests.length}</p>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Approuvées</p>
              <p className="text-3xl font-bold text-accent">{approvedInterests.length}</p>
            </div>
            <div className="bg-accent/10 p-3 rounded-full">
              <CheckCircle className="w-6 h-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Converties (inscrites)</p>
              <p className="text-3xl font-bold text-green-700">{convertedInterests.length}</p>
            </div>
            <div className="bg-green-500/10 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs for different statuses */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="pending" data-testid="tab-pending-interests">
            En attente ({pendingInterests.length})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved-interests">
            Approuvées ({approvedInterests.length})
          </TabsTrigger>
          <TabsTrigger value="converted" data-testid="tab-converted-interests">
            Converties ({convertedInterests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected-interests">
            Refusées ({rejectedInterests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card className="p-6 shadow-md">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <h2 className="text-xl font-semibold text-primary">Intentions en attente de validation</h2>
              </div>
              <InterestTable data={pendingInterests} showActions={true} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <Card className="p-6 shadow-md">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-semibold text-primary">Intentions approuvées</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Ces intentions ont été approuvées. Les consultants peuvent maintenant s'inscrire aux sessions disponibles.
              </p>
              <InterestTable data={approvedInterests} showActions={false} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="converted" className="space-y-4">
          <Card className="p-6 shadow-md">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-700" />
                <h2 className="text-xl font-semibold text-primary">Intentions converties en inscriptions</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Ces consultants se sont inscrits à une session suite à l'approbation de leur intention.
              </p>
              <InterestTable data={convertedInterests} showActions={false} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <Card className="p-6 shadow-md">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <h2 className="text-xl font-semibold text-primary">Intentions refusées</h2>
                </div>
                {rejectedInterests.length > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => deleteAllRejectedMutation.mutate()}
                    disabled={deleteAllRejectedMutation.isPending}
                    data-testid="button-delete-all-rejected"
                  >
                    {deleteAllRejectedMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Suppression...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Supprimer toutes les demandes
                      </>
                    )}
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Ces intentions ont été refusées. Vous pouvez les supprimer individuellement ou toutes à la fois.
              </p>
              <InterestTable data={rejectedInterests} showActions={false} showDeleteAction={true} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Aggregated View by Formation */}
      {aggregated.length > 0 && (
        <Card className="p-6 shadow-md">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-primary">Vue agrégée par formation</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Nombre d'intentions par formation pour planifier l'organisation des sessions
            </p>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Formation</TableHead>
                    <TableHead className="text-center">En attente</TableHead>
                    <TableHead className="text-center">Approuvées</TableHead>
                    <TableHead className="text-center">Converties</TableHead>
                    <TableHead className="text-center">P1</TableHead>
                    <TableHead className="text-center">P2</TableHead>
                    <TableHead className="text-center">P3</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregated.map((agg) => {
                    const formation = getFormation(agg.formationId);
                    const total = agg.pending + agg.approved + agg.converted;
                    return (
                      <TableRow key={agg.formationId}>
                        <TableCell className="font-medium">
                          {formation?.title || "Formation inconnue"}
                        </TableCell>
                        <TableCell className="text-center">
                          {agg.pending > 0 && (
                            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">
                              {agg.pending}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {agg.approved > 0 && (
                            <Badge variant="secondary" className="bg-accent/10 text-accent">
                              {agg.approved}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {agg.converted > 0 && (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                              {agg.converted}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive" className="text-xs">{agg.p1Count}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="text-xs">{agg.p2Count}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs">{agg.p3Count}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{total}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={selectedInterest !== null && actionType !== null} onOpenChange={() => {
        setSelectedInterest(null);
        setActionType(null);
      }}>
        <AlertDialogContent data-testid="dialog-confirm-interest-action">
          <AlertDialogHeader>
            <AlertDialogTitle className={actionType === "approve" ? "text-accent" : "text-destructive"}>
              {actionType === "approve" ? "Approuver l'intention ?" : "Refuser l'intention ?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-base pt-2 space-y-2">
                {selectedInterest && (
                  <>
                    <p>
                      <strong>Consultant :</strong> {getUser(selectedInterest.userId)?.name}
                    </p>
                    <p>
                      <strong>Formation :</strong> {getFormation(selectedInterest.formationId)?.title}
                    </p>
                    <p>
                      <strong>Priorité :</strong> {selectedInterest.priority}
                    </p>
                    {actionType === "approve" && (
                      <p className="mt-4 text-accent font-medium">
                        Le consultant pourra s'inscrire aux sessions disponibles pour cette formation.
                      </p>
                    )}
                    {actionType === "reject" && (
                      <p className="mt-4 text-destructive font-medium">
                        Le quota {selectedInterest.priority} du consultant sera remboursé si applicable.
                      </p>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatusMutation.isPending} data-testid="button-cancel-action">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={updateStatusMutation.isPending}
              className={actionType === "approve" ? "bg-accent hover:bg-accent/90" : ""}
              data-testid="button-confirm-action"
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                actionType === "approve" ? "Approuver" : "Refuser"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
