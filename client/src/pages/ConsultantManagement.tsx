import { useState, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Loader2, ChevronDown, ChevronRight, Heart, UserCheck, Calendar, Award, Archive, Trash2, UserPlus } from "lucide-react";
import type { User, FormationInterest, Registration, Formation, Session } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PriorityBadge from "@/components/PriorityBadge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CreateExternalInstructorDialog from "@/components/CreateExternalInstructorDialog";

export default function ConsultantManagement() {
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [expandedConsultant, setExpandedConsultant] = useState<string | null>(null);
  const [selectedConsultant, setSelectedConsultant] = useState<User | null>(null);
  const [archiveDialogUser, setArchiveDialogUser] = useState<User | null>(null);
  const [deleteDialogUser, setDeleteDialogUser] = useState<User | null>(null);
  const [showCreateExternalInstructor, setShowCreateExternalInstructor] = useState(false);
  const { toast } = useToast();

  const { data: activeUsers = [], isLoading: isLoadingActiveUsers } = useQuery<User[]>({
    queryKey: ["/api/users", { archived: false }],
    queryFn: async () => {
      const res = await fetch("/api/users?archived=false", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: archivedUsers = [], isLoading: isLoadingArchivedUsers } = useQuery<User[]>({
    queryKey: ["/api/users", { archived: true }],
    queryFn: async () => {
      const res = await fetch("/api/users?archived=true", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: allInterests = [] } = useQuery<FormationInterest[]>({
    queryKey: ["/api/admin/interests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/interests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch interests");
      const data = await res.json();
      return Array.isArray(data.interests) ? data.interests : [];
    },
  });

  const { data: allRegistrations = [] } = useQuery<Registration[]>({
    queryKey: ["/api/admin/registrations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/registrations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch registrations");
      return res.json();
    },
  });

  const { data: formations = [] } = useQuery<Formation[]>({
    queryKey: ["/api/formations"],
  });

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const archiveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/users/${userId}/archive`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Consultant archivé",
        description: "Le consultant a été archivé avec succès. Ses intentions et inscriptions en cours ont été supprimées.",
      });
      setArchiveDialogUser(null);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'archivage",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/users/${userId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Consultant supprimé",
        description: "Le consultant a été définitivement supprimé avec toutes ses données.",
      });
      setDeleteDialogUser(null);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression",
        variant: "destructive",
      });
    },
  });

  const users = activeTab === "active" ? activeUsers : archivedUsers;
  const consultants = users.filter(u => u.roles.includes("consultant"));
  const isLoadingUsers = activeTab === "active" ? isLoadingActiveUsers : isLoadingArchivedUsers;
  
  const currentYear = new Date().getFullYear();

  const getConsultantStats = (userId: string) => {
    const userInterests = Array.isArray(allInterests) ? allInterests.filter(i => {
      const date = i.expressedAt ? new Date(i.expressedAt) : new Date();
      return i.userId === userId && date.getFullYear() === currentYear;
    }) : [];
    
    const userRegistrations = Array.isArray(allRegistrations) ? allRegistrations.filter(r => {
      return r.userId === userId;
    }) : [];

    return {
      totalInterests: userInterests.length,
      pendingInterests: userInterests.filter(i => i.status === "pending").length,
      approvedInterests: userInterests.filter(i => i.status === "approved").length,
      rejectedInterests: userInterests.filter(i => i.status === "rejected").length,
      convertedInterests: userInterests.filter(i => i.status === "converted").length,
      
      totalRegistrations: userRegistrations.length,
      validatedRegistrations: userRegistrations.filter(r => r.status === "validated").length,
      pendingRegistrations: userRegistrations.filter(r => r.status === "pending").length,
      cancelledRegistrations: userRegistrations.filter(r => r.status === "cancelled").length,
    };
  };

  const getConsultantHistory = (userId: string) => {
    const userInterests = Array.isArray(allInterests) ? allInterests.filter(i => i.userId === userId) : [];
    const userRegistrations = Array.isArray(allRegistrations) ? allRegistrations.filter(r => r.userId === userId) : [];

    return {
      interests: userInterests,
      registrations: userRegistrations,
    };
  };

  const getFormation = (id: string) => formations.find(f => f.id === id);
  const getSession = (id: string) => sessions.find(s => s.id === id);

  const toggleConsultant = (userId: string) => {
    setExpandedConsultant(expandedConsultant === userId ? null : userId);
  };

  const openHistoryDialog = (user: User) => {
    setSelectedConsultant(user);
  };

  if (isLoadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement des consultants...</p>
        </div>
      </div>
    );
  }

  const selectedHistory = selectedConsultant ? getConsultantHistory(selectedConsultant.id) : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-xl">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary">Gestion des Consultants</h1>
                <p className="text-muted-foreground">Vue d'ensemble et historique des formations par consultant</p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="h-11"
            onClick={() => setShowCreateExternalInstructor(true)}
            data-testid="button-create-external-instructor"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Créer un formateur externe
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Consultants</p>
                <p className="text-3xl font-bold text-primary">{consultants.length}</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-full">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Intentions {currentYear}</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {Array.isArray(allInterests) ? allInterests.filter(i => {
                    const date = i.expressedAt ? new Date(i.expressedAt) : new Date();
                    return date.getFullYear() === currentYear;
                  }).length : 0}
                </p>
              </div>
              <div className="bg-yellow-500/10 p-3 rounded-full">
                <Heart className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Inscriptions validées</p>
                <p className="text-3xl font-bold text-accent">
                  {Array.isArray(allRegistrations) ? allRegistrations.filter(r => r.status === "validated").length : 0}
                </p>
              </div>
              <div className="bg-accent/10 p-3 rounded-full">
                <UserCheck className="w-6 h-6 text-accent" />
              </div>
            </div>
          </Card>
        </div>

        {/* Consultants Table */}
        <Card className="p-6 shadow-md">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
              <Users className="w-5 h-5" />
              Liste des consultants
            </h2>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "active" | "archived")}>
              <TabsList>
                <TabsTrigger value="active" data-testid="tab-active-consultants">
                  Actifs ({activeUsers.filter(u => u.roles.includes("consultant")).length})
                </TabsTrigger>
                <TabsTrigger value="archived" data-testid="tab-archived-consultants">
                  Historique ({archivedUsers.filter(u => u.roles.includes("consultant")).length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Unité d'affaires</TableHead>
                      <TableHead>Seniorité</TableHead>
                      <TableHead className="text-center">Intentions {currentYear}</TableHead>
                      <TableHead className="text-center">Inscriptions</TableHead>
                      <TableHead className="text-center">Quota P1/P2</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          Aucun consultant trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      consultants.map((consultant) => {
                        const stats = getConsultantStats(consultant.id);
                        const isExpanded = expandedConsultant === consultant.id;

                        return (
                          <Fragment key={consultant.id}>
                            <TableRow
                              className="cursor-pointer hover-elevate"
                              onClick={() => toggleConsultant(consultant.id)}
                              data-testid={`row-consultant-${consultant.id}`}
                            >
                              <TableCell>
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{consultant.name}</TableCell>
                              <TableCell>{consultant.businessUnit || "-"}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{consultant.seniority || "Non défini"}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Badge variant="outline">{stats.totalInterests}</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Badge variant="default" className="bg-accent/10 text-accent">
                                    {stats.validatedRegistrations}
                                  </Badge>
                                  {stats.pendingRegistrations > 0 && (
                                    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">
                                      +{stats.pendingRegistrations}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-sm text-muted-foreground">
                                    P1: {consultant.p1Used || 0}/1
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    P2: {consultant.p2Used || 0}/1
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openHistoryDialog(consultant)}
                                    data-testid={`button-history-${consultant.id}`}
                                  >
                                    Historique
                                  </Button>
                                  {activeTab === "active" ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setArchiveDialogUser(consultant)}
                                      data-testid={`button-archive-${consultant.id}`}
                                    >
                                      <Archive className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => setDeleteDialogUser(consultant)}
                                      data-testid={`button-delete-${consultant.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={8} className="bg-muted/30 p-4">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    {/* Intentions Stats */}
                                    <div className="space-y-2">
                                      <h4 className="font-semibold text-sm flex items-center gap-2">
                                        <Heart className="w-4 h-4" />
                                        Intentions {currentYear}
                                      </h4>
                                      <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">En attente:</span>
                                          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">
                                            {stats.pendingInterests}
                                          </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Approuvées:</span>
                                          <Badge variant="secondary" className="bg-accent/10 text-accent">
                                            {stats.approvedInterests}
                                          </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Converties:</span>
                                          <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                                            {stats.convertedInterests}
                                          </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Refusées:</span>
                                          <Badge variant="destructive">
                                            {stats.rejectedInterests}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Registrations Stats */}
                                    <div className="space-y-2">
                                      <h4 className="font-semibold text-sm flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Inscriptions
                                      </h4>
                                      <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Validées:</span>
                                          <Badge variant="default" className="bg-accent/10 text-accent">
                                            {stats.validatedRegistrations}
                                          </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">En attente:</span>
                                          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">
                                            {stats.pendingRegistrations}
                                          </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Annulées:</span>
                                          <Badge variant="outline">
                                            {stats.cancelledRegistrations}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </div>
        </Card>

        {/* Archive Confirmation Dialog */}
        <AlertDialog open={!!archiveDialogUser} onOpenChange={() => setArchiveDialogUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archiver ce consultant ?</AlertDialogTitle>
              <AlertDialogDescription>
                L'archivage du consultant <strong>{archiveDialogUser?.name}</strong> aura les conséquences suivantes :
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Suppression de toutes les intentions en attente ou approuvées</li>
                  <li>Suppression de toutes les inscriptions en attente ou validées</li>
                  <li>Remboursement automatique des quotas P1/P2 utilisés</li>
                  <li>Conservation de l'historique complet des formations</li>
                </ul>
                <p className="mt-2 text-yellow-600">
                  Le consultant archivé sera accessible dans l'onglet "Historique".
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-archive">Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => archiveDialogUser && archiveMutation.mutate(archiveDialogUser.id)}
                disabled={archiveMutation.isPending}
                data-testid="button-confirm-archive"
              >
                {archiveMutation.isPending ? "Archivage..." : "Archiver"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <CreateExternalInstructorDialog
          open={showCreateExternalInstructor}
          onOpenChange={setShowCreateExternalInstructor}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteDialogUser} onOpenChange={() => setDeleteDialogUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer définitivement ce consultant ?</AlertDialogTitle>
              <AlertDialogDescription>
                La suppression du consultant <strong>{deleteDialogUser?.name}</strong> est <strong>irréversible</strong> et aura les conséquences suivantes :
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Suppression définitive du compte consultant</li>
                  <li>Suppression de toutes les intentions de formation</li>
                  <li>Suppression de toutes les inscriptions</li>
                  <li>Perte complète de l'historique de formation</li>
                </ul>
                <p className="mt-2 text-destructive font-semibold">
                  Cette action ne peut pas être annulée.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDialogUser && deleteMutation.mutate(deleteDialogUser.id)}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? "Suppression..." : "Supprimer définitivement"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* History Dialog */}
        <Dialog open={!!selectedConsultant} onOpenChange={() => setSelectedConsultant(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Historique de formation - {selectedConsultant?.name}
              </DialogTitle>
              <DialogDescription>
                Vue complète de toutes les intentions et inscriptions
              </DialogDescription>
            </DialogHeader>

            {selectedHistory && (
              <div className="space-y-6">
                {/* Intentions Section */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Intentions de formation ({selectedHistory.interests.length})
                  </h3>
                  {selectedHistory.interests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune intention exprimée</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedHistory.interests.map((interest) => {
                        const formation = getFormation(interest.formationId);
                        return (
                          <div key={interest.id} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium">{formation?.title || "Formation inconnue"}</div>
                                <div className="text-xs text-muted-foreground">
                                  Exprimée le {interest.expressedAt ? format(new Date(interest.expressedAt), "dd MMM yyyy", { locale: fr }) : "-"}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <PriorityBadge priority={interest.priority as "P1" | "P2" | "P3"} />
                                <Badge variant={
                                  interest.status === "pending" ? "secondary" :
                                  interest.status === "approved" ? "default" :
                                  interest.status === "converted" ? "default" :
                                  "destructive"
                                }
                                className={
                                  interest.status === "pending" ? "bg-yellow-500/10 text-yellow-700" :
                                  interest.status === "approved" ? "bg-accent/10 text-accent" :
                                  interest.status === "converted" ? "bg-green-500/10 text-green-700" :
                                  ""
                                }>
                                  {interest.status === "pending" ? "En attente" :
                                   interest.status === "approved" ? "Approuvée" :
                                   interest.status === "converted" ? "Convertie" :
                                   interest.status === "rejected" ? "Refusée" : interest.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Registrations Section */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Inscriptions ({selectedHistory.registrations.length})
                  </h3>
                  {selectedHistory.registrations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune inscription</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedHistory.registrations.map((registration) => {
                        const session = getSession(registration.sessionId);
                        const formation = session ? getFormation(session.formationId) : null;
                        return (
                          <div key={registration.id} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium">{formation?.title || "Formation inconnue"}</div>
                                {session && (
                                  <div className="text-xs text-muted-foreground">
                                    Session: {format(new Date(session.startDate), "dd MMM yyyy", { locale: fr })} - {session.location || "Lieu non défini"}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <PriorityBadge priority={registration.priority as "P1" | "P2" | "P3"} />
                                <Badge variant={
                                  registration.status === "pending" ? "secondary" :
                                  registration.status === "validated" ? "default" :
                                  "outline"
                                }
                                className={
                                  registration.status === "pending" ? "bg-yellow-500/10 text-yellow-700" :
                                  registration.status === "validated" ? "bg-accent/10 text-accent" :
                                  ""
                                }>
                                  {registration.status === "pending" ? "En attente" :
                                   registration.status === "validated" ? "Validée" :
                                   registration.status === "cancelled" ? "Annulée" :
                                   registration.status === "completed" ? "Terminée" : registration.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
