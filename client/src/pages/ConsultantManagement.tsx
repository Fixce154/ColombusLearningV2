import { useState, Fragment, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Users,
  Loader2,
  ChevronDown,
  ChevronRight,
  Heart,
  UserCheck,
  Calendar,
  Award,
  Archive,
  Trash2,
  UserPlus,
  XCircle,
  UserCircle,
} from "lucide-react";
import type {
  User,
  FormationInterest,
  Registration,
  Formation,
  Session,
  InstructorFormation,
  CoachAssignment,
} from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PriorityBadge from "@/components/PriorityBadge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CreateCollaboratorDialog from "@/components/CreateCollaboratorDialog";
import EditExternalInstructorDialog from "@/components/EditExternalInstructorDialog";
import EditConsultantDialog from "@/components/EditConsultantDialog";
import { formatRoles } from "@shared/roles";

type BulkUploadResult = {
  createdCount: number;
  skippedCount: number;
  errors: Array<{ row: number; message: string }>;
  createdUsers: Array<{ name: string; email: string; temporaryPassword: string }>;
};

const splitName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

export default function ConsultantManagement() {
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [expandedConsultant, setExpandedConsultant] = useState<string | null>(null);
  const [selectedConsultant, setSelectedConsultant] = useState<User | null>(null);
  const [archiveDialogUser, setArchiveDialogUser] = useState<User | null>(null);
  const [deleteDialogUser, setDeleteDialogUser] = useState<User | null>(null);
  const [showCreateCollaboratorDialog, setShowCreateCollaboratorDialog] = useState(false);
  const [editExternalInstructorId, setEditExternalInstructorId] = useState<string | null>(null);
  const [editConsultant, setEditConsultant] = useState<User | null>(null);
  const [coachToAssign, setCoachToAssign] = useState<User | null>(null);
  const [selectedCoacheeId, setSelectedCoacheeId] = useState<string | null>(null);
  const [coacheeForCoachDialog, setCoacheeForCoachDialog] = useState<User | null>(null);
  const [selectedCoachIdForCoachee, setSelectedCoachIdForCoachee] = useState<string | null>(null);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadResult, setBulkUploadResult] = useState<BulkUploadResult | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
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

  const { data: instructorFormations = [], isLoading: isLoadingAssignments } = useQuery<InstructorFormation[]>({
    queryKey: ["/api/admin/instructor-formations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/instructor-formations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch instructor formations");
      return res.json();
    },
  });

  const { data: coachAssignments = [], isLoading: isLoadingCoachAssignments } = useQuery<CoachAssignment[]>({
    queryKey: ["/api/admin/coach-assignments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/coach-assignments", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch coach assignments");
      return res.json();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/users/${userId}/archive`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coach-assignments"] });
      toast({
        title: "Collaborateur archivé",
        description:
          "Le collaborateur a été archivé avec succès. Ses intentions et inscriptions en cours ont été supprimées.",
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coach-assignments"] });
      toast({
        title: "Collaborateur supprimé",
        description: "Le collaborateur a été définitivement supprimé avec toutes ses données.",
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

  const updateRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: string[] }) => {
      return apiRequest(`/api/admin/users/${userId}`, "PATCH", { roles });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coach-assignments"] });
      toast({
        title: "Rôle mis à jour",
        description: "Le statut coach a été mis à jour.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le rôle",
        variant: "destructive",
      });
    },
  });

  const createCoachAssignmentMutation = useMutation({
    mutationFn: async ({ coachId, coacheeId }: { coachId: string; coacheeId: string }) => {
      return apiRequest("/api/admin/coach-assignments", "POST", { coachId, coacheeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coach-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Coaché assigné",
        description: "Le collaborateur a bien été associé au coach.",
      });
      setCoachToAssign(null);
      setSelectedCoacheeId(null);
      setCoacheeForCoachDialog(null);
      setSelectedCoachIdForCoachee(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'assigner ce coaché",
        variant: "destructive",
      });
    },
  });

  const removeCoachAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return apiRequest(`/api/admin/coach-assignments/${assignmentId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coach-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Coaché retiré",
        description: "L'association coach/coached a été supprimée.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'association",
        variant: "destructive",
      });
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async ({ fileName, fileContent }: { fileName: string; fileContent: string }) => {
      const response = await fetch("/api/admin/users/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fileName, fileContent }),
      });

      if (!response.ok) {
        let message = "Impossible d'importer le fichier";
        try {
          const errorBody = await response.json();
          if (errorBody?.message) {
            message = errorBody.message;
          }
        } catch (error) {
          console.error("Failed to parse bulk upload error", error);
        }
        throw new Error(message);
      }

      return (await response.json()) as BulkUploadResult;
    },
    onSuccess: (data) => {
      setBulkUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Import terminé",
        description: `${data.createdCount} collaborateur${data.createdCount > 1 ? "s" : ""} ajouté${
          data.createdCount > 1 ? "s" : ""
        }`,
      });
      setBulkUploadFile(null);
      setFileInputKey((prev) => prev + 1);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Import impossible",
        description: error?.message || "Une erreur est survenue lors de l'import.",
      });
    },
  });

  const users = activeTab === "active" ? activeUsers : archivedUsers;
  const consultants = users.filter(u => u.roles.includes("consultant"));
  const isLoadingUsers = activeTab === "active" ? isLoadingActiveUsers : isLoadingArchivedUsers;

  const currentYear = new Date().getFullYear();

  const allUsersMap = useMemo(() => {
    const map = new Map<string, User>();
    (Array.isArray(activeUsers) ? activeUsers : []).forEach((user) => map.set(user.id, user));
    (Array.isArray(archivedUsers) ? archivedUsers : []).forEach((user) => map.set(user.id, user));
    return map;
  }, [activeUsers, archivedUsers]);

  const activeExternalInstructors = (activeUsers || []).filter(
    (user) => user.roles.includes("formateur_externe") && !user.archived
  );

  const assignmentsByInstructor = useMemo(() => {
    const map: Record<string, string[]> = {};
    (Array.isArray(instructorFormations) ? instructorFormations : []).forEach((assignment) => {
      if (!map[assignment.instructorId]) {
        map[assignment.instructorId] = [];
      }
      map[assignment.instructorId].push(assignment.formationId);
    });
    return map;
  }, [instructorFormations]);

  const assignmentsByCoach = useMemo(() => {
    const map: Record<string, CoachAssignment[]> = {};
    (Array.isArray(coachAssignments) ? coachAssignments : []).forEach((assignment) => {
      if (!map[assignment.coachId]) {
        map[assignment.coachId] = [];
      }
      map[assignment.coachId].push(assignment);
    });
    return map;
  }, [coachAssignments]);

  const assignmentsByCoachee = useMemo(() => {
    const map = new Map<string, CoachAssignment>();
    (Array.isArray(coachAssignments) ? coachAssignments : []).forEach((assignment) => {
      const existing = map.get(assignment.coacheeId);
      if (!existing) {
        map.set(assignment.coacheeId, assignment);
        return;
      }

      const existingDate = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
      const currentDate = assignment.createdAt ? new Date(assignment.createdAt).getTime() : 0;
      if (currentDate > existingDate) {
        map.set(assignment.coacheeId, assignment);
      }
    });
    return map;
  }, [coachAssignments]);

  const availableCoaches = useMemo(() => {
    return (Array.isArray(activeUsers) ? activeUsers : [])
      .filter((user) => user.roles.includes("coach"))
      .filter((user) => !user.archived);
  }, [activeUsers]);

  const availableCoachees = useMemo(() => {
    if (!coachToAssign) return [];
    return (Array.isArray(activeUsers) ? activeUsers : [])
      .filter((user) => user.roles.includes("consultant"))
      .filter((user) => {
        if (user.archived || user.id === coachToAssign.id) {
          return false;
        }
        const assignment = assignmentsByCoachee.get(user.id);
        return !assignment;
      });
  }, [coachToAssign, assignmentsByCoachee, activeUsers]);

  const coachOptionsForSelection = useMemo(() => {
    if (!coacheeForCoachDialog) return [];
    return availableCoaches.filter((coach) => coach.id !== coacheeForCoachDialog.id);
  }, [availableCoaches, coacheeForCoachDialog]);

  useEffect(() => {
    if (!coacheeForCoachDialog) {
      return;
    }
    if (coachOptionsForSelection.length === 0) {
      setSelectedCoachIdForCoachee(null);
      return;
    }
    setSelectedCoachIdForCoachee((current) => {
      if (current && coachOptionsForSelection.some((coach) => coach.id === current)) {
        return current;
      }
      return coachOptionsForSelection[0].id;
    });
  }, [coacheeForCoachDialog, coachOptionsForSelection]);

  const getAssignedFormationTitles = (instructorId: string) => {
    const formationIds = assignmentsByInstructor[instructorId] || [];
    const titles = formationIds
      .map((id) => formations.find((f) => f.id === id)?.title)
      .filter((title): title is string => Boolean(title));
    return titles;
  };

  const toggleCoachRole = (consultant: User) => {
    const roles = consultant.roles.includes("coach")
      ? consultant.roles.filter((role) => role !== "coach")
      : [...consultant.roles, "coach"];
    updateRolesMutation.mutate({ userId: consultant.id, roles });
  };

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

  const handleBulkUpload = async () => {
    if (!bulkUploadFile || bulkUploadMutation.isPending) {
      return;
    }

    try {
      const arrayBuffer = await bulkUploadFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const chunkSize = 0x8000;
      let binary = "";
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        let chunkString = "";
        for (let j = 0; j < chunk.length; j++) {
          chunkString += String.fromCharCode(chunk[j]);
        }
        binary += chunkString;
      }
      const base64 = btoa(binary);

      await bulkUploadMutation.mutateAsync({
        fileName: bulkUploadFile.name,
        fileContent: base64,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lecture impossible",
        description: error?.message || "Impossible de lire le fichier sélectionné.",
      });
    }
  };

  const handleAssignCoachee = () => {
    if (!coachToAssign || !selectedCoacheeId) return;
    createCoachAssignmentMutation.mutate({
      coachId: coachToAssign.id,
      coacheeId: selectedCoacheeId,
    });
  };

  const handleAssignCoachToCollaborator = () => {
    if (!coacheeForCoachDialog || !selectedCoachIdForCoachee) return;
    createCoachAssignmentMutation.mutate({
      coachId: selectedCoachIdForCoachee,
      coacheeId: coacheeForCoachDialog.id,
    });
  };

  const getFormation = (id: string) => formations.find(f => f.id === id);
  const getSession = (id: string) => sessions.find(s => s.id === id);

  const toggleConsultant = (userId: string) => {
    setExpandedConsultant(expandedConsultant === userId ? null : userId);
  };

  const openHistoryDialog = (user: User) => {
    setSelectedConsultant(user);
  };

  if (isLoadingUsers || isLoadingCoachAssignments) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement des collaborateurs...</p>
        </div>
      </div>
    );
  }

  const selectedHistory = selectedConsultant ? getConsultantHistory(selectedConsultant.id) : null;

  return (
    <div className="space-y-12">
      <section className="surface-elevated relative overflow-hidden rounded-[2rem] px-12 py-14">
        <div className="pointer-events-none absolute inset-y-8 right-0 hidden w-72 rounded-l-[32px] bg-[radial-gradient(circle_at_center,rgba(10,132,255,0.12),transparent_60%)] md:block" />
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-5">
            <p className="eyebrow text-muted-foreground">Administration RH</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">Gestion des collaborateurs</h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Pilotez les parcours de vos collaborateurs, suivez leurs intentions et assurez le lien avec les formateurs externes.
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-4">
            <div className="rounded-2xl border border-white/40 bg-white/80 p-5 text-[#00313F] shadow-sm backdrop-blur">
              <p className="text-sm font-semibold">Formateurs externes actifs</p>
              <p className="text-3xl font-bold">{activeExternalInstructors.length}</p>
              <p className="text-xs text-[#00313F]/70">Gérés par l'équipe RH</p>
            </div>
            <Button
              className="h-12 rounded-xl text-sm font-semibold"
              onClick={() => setShowCreateCollaboratorDialog(true)}
              data-testid="button-create-collaborator"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Nouveau collaborateur
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total collaborateurs</p>
              <p className="text-3xl font-semibold text-foreground">{consultants.length}</p>
            </div>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </div>
          </Card>

          <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Intentions {currentYear}</p>
              <p className="text-3xl font-semibold text-foreground">
                {Array.isArray(allInterests) ? allInterests.filter(i => {
                  const date = i.expressedAt ? new Date(i.expressedAt) : new Date();
                  return date.getFullYear() === currentYear;
                }).length : 0}
              </p>
            </div>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600">
              <Heart className="h-6 w-6" />
            </div>
          </Card>

          <Card className="surface-soft flex h-full items-center justify-between gap-6 rounded-2xl border-none p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Inscriptions validées</p>
              <p className="text-3xl font-semibold text-foreground">
                {Array.isArray(allRegistrations) ? allRegistrations.filter(r => r.status === "validated").length : 0}
              </p>
            </div>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <UserCheck className="h-6 w-6" />
            </div>
          </Card>
        </div>

        <Card className="rounded-[1.75rem] border border-dashed border-primary/40 p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-4 md:max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Import de collaborateurs</h3>
                <p className="text-sm text-muted-foreground">
                  Importez un fichier Excel (.xlsx) contenant les colonnes matricule, nom, prénom, email, date d’entrée,
                  séniorité, rôle et type d’accès (RH, collaborateur, coach, formateur externe).
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Les types d’accès multiples peuvent être séparés par une virgule ou un point-virgule.</li>
                <li>Un mot de passe temporaire est généré pour chaque profil créé "Colombus138".</li>
              </ul>
            </div>
            <div className="w-full max-w-sm space-y-3">
              <Input
                key={fileInputKey}
                type="file"
                accept=".xlsx,.xlsm"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setBulkUploadFile(file);
                  setBulkUploadResult(null);
                }}
                disabled={bulkUploadMutation.isPending}
              />
              <Button
                className="w-full"
                onClick={handleBulkUpload}
                disabled={!bulkUploadFile || bulkUploadMutation.isPending}
              >
                {bulkUploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Import en cours...
                  </>
                ) : (
                  "Importer le fichier"
                )}
              </Button>
              {bulkUploadFile && !bulkUploadMutation.isPending ? (
                <p className="text-xs text-muted-foreground">Fichier sélectionné : {bulkUploadFile.name}</p>
              ) : null}
            </div>
          </div>

          {bulkUploadResult ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Collaborateurs créés</p>
                  <p className="text-2xl font-semibold text-primary">{bulkUploadResult.createdCount}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Profils ignorés</p>
                  <p className="text-2xl font-semibold text-primary">{bulkUploadResult.skippedCount}</p>
                </div>
              </div>

              {bulkUploadResult.createdUsers.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Collaborateur</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Mot de passe temporaire</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkUploadResult.createdUsers.map((user) => (
                        <TableRow key={user.email}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <code className="rounded bg-muted px-2 py-1 text-xs font-medium">{user.temporaryPassword}</code>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              {bulkUploadResult.errors.length > 0 ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
                  <p className="font-semibold text-destructive">Lignes non importées</p>
                  <ul className="mt-2 space-y-1 text-destructive">
                    {bulkUploadResult.errors.map((error) => (
                      <li key={`${error.row}-${error.message}`}>
                        Ligne {error.row} — {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card className="rounded-[1.75rem] border border-border/50 shadow-sm">
          <div className="flex flex-col gap-2 p-6 border-b border-border/60 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Formateurs externes</h2>
              <p className="text-sm text-muted-foreground">
                Comptes pilotés par l'équipe RH. Attribuez les formations animées et mettez à jour leurs accès.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {isLoadingAssignments
                ? "Chargement des affectations..."
                : `${activeExternalInstructors.length} formateur${activeExternalInstructors.length > 1 ? "s" : ""} externe${activeExternalInstructors.length > 1 ? "s" : ""}`}
            </div>
          </div>
          {activeExternalInstructors.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Aucun formateur externe actif pour le moment. Créez-en un via le bouton en haut de page.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Formations animées</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeExternalInstructors.map((instructor) => {
                    const formationsTitles = getAssignedFormationTitles(instructor.id);
                    return (
                      <TableRow key={instructor.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-semibold">{instructor.name}</div>
                            <div className="text-xs text-muted-foreground">Formateur externe</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{instructor.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {instructor.businessUnit ? instructor.businessUnit : "Non renseigné"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {formationsTitles.length > 0 ? (
                              formationsTitles.map((title) => (
                                <Badge key={title} variant="outline" className="whitespace-nowrap">
                                  {title}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline">Aucune formation assignée</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditExternalInstructorId(instructor.id)}
                            data-testid={`button-edit-external-instructor-${instructor.id}`}
                          >
                            Modifier
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Collaborators Table */}
        <Card className="rounded-[1.75rem] border border-border/50 p-6 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
              <Users className="w-5 h-5" />
              Liste des collaborateurs
            </h2>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "active" | "archived")}>
              <TabsList>
                <TabsTrigger value="active" data-testid="tab-active-collaborators">
                  Actifs ({activeUsers.filter(u => u.roles.includes("consultant")).length})
                </TabsTrigger>
                <TabsTrigger value="archived" data-testid="tab-archived-collaborators">
                  Archive ({archivedUsers.filter(u => u.roles.includes("consultant")).length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Matricule</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Date d'entrée</TableHead>
                      <TableHead>Séniorité</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                          Aucun collaborateur trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      consultants.map((consultant) => {
                        const stats = getConsultantStats(consultant.id);
                        const isExpanded = expandedConsultant === consultant.id;
                        const coachAssignmentsForUser = assignmentsByCoach[consultant.id] || [];
                        const availableCoacheesForCoach = (Array.isArray(activeUsers) ? activeUsers : [])
                          .filter((user) => user.roles.includes("consultant"))
                          .filter((user) => {
                            if (user.archived || user.id === consultant.id) {
                              return false;
                            }
                            const assignment = assignmentsByCoachee.get(user.id);
                            return !assignment;
                          });
                        const { firstName, lastName } = splitName(consultant.name);
                        const currentCoachAssignment = assignmentsByCoachee.get(consultant.id) || null;
                        const currentCoach = currentCoachAssignment
                          ? allUsersMap.get(currentCoachAssignment.coachId) || null
                          : null;
                        const availableCoachChoices = availableCoaches.filter(
                          (coach) => coach.id !== consultant.id
                        );

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
                              <TableCell className="font-medium">{consultant.employeeId || "-"}</TableCell>
                              <TableCell>{lastName || "-"}</TableCell>
                              <TableCell>{firstName || consultant.name}</TableCell>
                              <TableCell>{consultant.email}</TableCell>
                              <TableCell>
                                {consultant.hireDate
                                  ? format(new Date(consultant.hireDate), "dd/MM/yyyy", { locale: fr })
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {consultant.seniority || "Non définie"}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatRoles(consultant.roles)}</TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditConsultant(consultant)}
                                    data-testid={`button-edit-${consultant.id}`}
                                  >
                                    Modifier
                                  </Button>
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
                                <TableCell colSpan={9} className="bg-muted/30 p-4">
                                  <div className="grid md:grid-cols-3 gap-4">
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

                                    {/* Coaching Management */}
                                    <div className="space-y-3">
                                      <h4 className="font-semibold text-sm flex items-center gap-2">
                                        <UserCheck className="w-4 h-4" />
                                        Coaching
                                      </h4>

                                      <div className="space-y-2 rounded-xl border border-border/40 bg-background/60 p-3">
                                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                          <UserCircle className="h-4 w-4" />
                                          Coach référent
                                        </div>
                                        {currentCoach ? (
                                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-background px-3 py-2">
                                            <div>
                                              <p className="text-sm font-semibold text-foreground">{currentCoach.name}</p>
                                              <p className="text-xs text-muted-foreground">{currentCoach.email}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  setCoacheeForCoachDialog(consultant);
                                                  const initialCoachId =
                                                    availableCoachChoices.find((coach) => coach.id === currentCoach.id)?.id ??
                                                    availableCoachChoices[0]?.id ??
                                                    null;
                                                  setSelectedCoachIdForCoachee(initialCoachId);
                                                }}
                                                disabled={createCoachAssignmentMutation.isPending}
                                              >
                                                Changer de coach
                                              </Button>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  if (currentCoachAssignment) {
                                                    removeCoachAssignmentMutation.mutate(currentCoachAssignment.id);
                                                  }
                                                }}
                                                disabled={removeCoachAssignmentMutation.isPending}
                                              >
                                                <XCircle className="h-4 w-4" />
                                                <span className="sr-only">Retirer le coach</span>
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border/60 bg-background px-3 py-2">
                                            <p className="text-sm text-muted-foreground">
                                              Aucun coach n'est encore assigné à ce collaborateur.
                                            </p>
                                            <Button
                                              size="sm"
                                              variant="secondary"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                setCoacheeForCoachDialog(consultant);
                                                setSelectedCoachIdForCoachee(availableCoachChoices[0]?.id ?? null);
                                              }}
                                              disabled={availableCoachChoices.length === 0 || createCoachAssignmentMutation.isPending}
                                            >
                                              <UserPlus className="mr-2 h-4 w-4" />
                                              Assigner un coach
                                            </Button>
                                          </div>
                                        )}
                                        {availableCoachChoices.length === 0 && (
                                          <p className="text-xs text-muted-foreground">
                                            Aucun coach disponible pour le moment.
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <Badge variant={consultant.roles.includes("coach") ? "default" : "secondary"}>
                                          {consultant.roles.includes("coach") ? "Coach actif" : "Coach inactif"}
                                        </Badge>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            toggleCoachRole(consultant);
                                          }}
                                          disabled={updateRolesMutation.isPending}
                                        >
                                          {consultant.roles.includes("coach") ? "Retirer le rôle" : "Activer le rôle"}
                                        </Button>
                                      </div>

                                      {consultant.roles.includes("coach") ? (
                                        <div className="space-y-2">
                                          <div className="space-y-1">
                                            <p className="text-sm font-medium">Coachés assignés</p>
                                            {coachAssignmentsForUser.length ? (
                                              <div className="flex flex-wrap gap-2">
                                                {coachAssignmentsForUser.map((assignment) => {
                                                  const coachee = allUsersMap.get(assignment.coacheeId);
                                                  return (
                                                    <div
                                                      key={assignment.id}
                                                      className="flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1"
                                                    >
                                                      <span className="text-sm font-medium">
                                                        {coachee?.name || "Collaborateur inconnu"}
                                                      </span>
                                                      <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-6 w-6"
                                                        onClick={(event) => {
                                                          event.stopPropagation();
                                                          removeCoachAssignmentMutation.mutate(assignment.id);
                                                        }}
                                                        disabled={removeCoachAssignmentMutation.isPending}
                                                      >
                                                        <XCircle className="h-4 w-4" />
                                                        <span className="sr-only">Retirer</span>
                                                      </Button>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            ) : (
                                              <p className="text-sm text-muted-foreground">
                                                Aucun coaché n'est encore assigné.
                                              </p>
                                            )}
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              setCoachToAssign(consultant);
                                              setSelectedCoacheeId(null);
                                            }}
                                            disabled={consultant.archived || availableCoacheesForCoach.length === 0}
                                          >
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Assigner un coaché
                                          </Button>
                                          {consultant.archived && (
                                            <p className="text-xs text-muted-foreground">
                                              Impossible d'assigner de nouveaux coachés à un coach archivé.
                                            </p>
                                          )}
                                          {!consultant.archived && availableCoacheesForCoach.length === 0 && (
                                            <p className="text-xs text-muted-foreground">
                                              Tous les collaborateurs actifs sont déjà assignés à ce coach.
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">
                                          Activez le rôle coach pour gérer des coachés.
                                        </p>
                                      )}
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
      </section>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!archiveDialogUser} onOpenChange={() => setArchiveDialogUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archiver ce collaborateur ?</AlertDialogTitle>
              <AlertDialogDescription>
                L'archivage du collaborateur <strong>{archiveDialogUser?.name}</strong> aura les conséquences suivantes :
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Suppression de toutes les intentions en attente ou approuvées</li>
                  <li>Suppression de toutes les inscriptions en attente ou validées</li>
                  <li>Remboursement automatique des quotas P1/P2 utilisés</li>
                  <li>Conservation de l'historique complet des formations</li>
                </ul>
                <p className="mt-2 text-yellow-600">
                  Le collaborateur archivé sera accessible dans l'onglet "Historique".
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

      <CreateCollaboratorDialog
        open={showCreateCollaboratorDialog}
        onOpenChange={setShowCreateCollaboratorDialog}
      />

      <EditConsultantDialog
        user={editConsultant}
        open={!!editConsultant}
        onOpenChange={(open) => {
          if (!open) {
            setEditConsultant(null);
          }
        }}
      />

      <EditExternalInstructorDialog
        userId={editExternalInstructorId}
        open={editExternalInstructorId !== null}
        onOpenChange={(open) => {
          if (!open) setEditExternalInstructorId(null);
        }}
      />

      <Dialog
        open={coachToAssign !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCoachToAssign(null);
            setSelectedCoacheeId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner un coaché</DialogTitle>
            <DialogDescription>
              Sélectionnez le collaborateur à rattacher à {coachToAssign?.name}.
            </DialogDescription>
          </DialogHeader>
          {coachToAssign ? (
            <div className="space-y-4">
              {availableCoachees.length > 0 ? (
                <Select
                  value={selectedCoacheeId ?? ""}
                  onValueChange={(value) => setSelectedCoacheeId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un collaborateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCoachees.map((coachee) => (
                      <SelectItem key={coachee.id} value={coachee.id}>
                        {coachee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tous les collaborateurs actifs sont déjà assignés à ce coach.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCoachToAssign(null);
                    setSelectedCoacheeId(null);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={handleAssignCoachee}
                  disabled={!selectedCoacheeId || createCoachAssignmentMutation.isPending}
                >
                  {createCoachAssignmentMutation.isPending ? "Assignation..." : "Assigner"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={coacheeForCoachDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCoacheeForCoachDialog(null);
            setSelectedCoachIdForCoachee(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner un coach</DialogTitle>
            <DialogDescription>
              Choisissez le coach référent pour {coacheeForCoachDialog?.name}.
            </DialogDescription>
          </DialogHeader>
          {coacheeForCoachDialog ? (
            <div className="space-y-4">
              {coachOptionsForSelection.length > 0 ? (
                <Select
                  value={selectedCoachIdForCoachee ?? ""}
                  onValueChange={(value) => setSelectedCoachIdForCoachee(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un coach" />
                  </SelectTrigger>
                  <SelectContent>
                    {coachOptionsForSelection.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun coach disponible pour le moment.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCoacheeForCoachDialog(null);
                    setSelectedCoachIdForCoachee(null);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={handleAssignCoachToCollaborator}
                  disabled={!selectedCoachIdForCoachee || createCoachAssignmentMutation.isPending}
                >
                  {createCoachAssignmentMutation.isPending ? "Assignation..." : "Assigner"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialogUser} onOpenChange={() => setDeleteDialogUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer définitivement ce collaborateur ?</AlertDialogTitle>
              <AlertDialogDescription>
                La suppression du collaborateur <strong>{deleteDialogUser?.name}</strong> est <strong>irréversible</strong> et aura les conséquences suivantes :
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Suppression définitive du compte collaborateur</li>
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
                        const formation = interest.formationId ? getFormation(interest.formationId) : undefined;
                        const isOffCatalog = !interest.formationId;
                        const formationTitle = isOffCatalog
                          ? interest.customTitle ?? "Formation hors catalogue"
                          : formation?.title ?? "Formation inconnue";
                        return (
                          <div key={interest.id} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">{formationTitle}</div>
                                  {isOffCatalog ? (
                                    <Badge variant="outline" className="border-dashed text-xs">
                                      Hors catalogue
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Exprimée le {interest.expressedAt ? format(new Date(interest.expressedAt), "dd MMM yyyy", { locale: fr }) : "-"}
                                </div>
                                {isOffCatalog && interest.customDescription && (
                                  <div className="text-xs text-muted-foreground line-clamp-2">
                                    {interest.customDescription}
                                  </div>
                                )}
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
  );
}
