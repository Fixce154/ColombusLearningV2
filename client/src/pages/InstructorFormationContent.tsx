import { useEffect, useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Formation } from "@shared/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Download,
  Loader2,
  Save,
  Trash2,
  Upload,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MaterialMetadata {
  id: string;
  formationId: string;
  title: string;
  description?: string | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  requiresEnrollment: boolean;
  createdAt: string;
  createdBy?: string | null;
}

type MaterialsQueryError = Error & { status?: number };

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.split(",")[1] ?? "";
        resolve(base64);
      } else if (result instanceof ArrayBuffer) {
        const bytes = new Uint8Array(result);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]!);
        }
        resolve(btoa(binary));
      } else {
        reject(new Error("Lecture du fichier impossible"));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });
}

export default function InstructorFormationContent() {
  const [, params] = useRoute("/instructor-formations/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const formationId = params?.id;

  const {
    data: formation,
    isLoading: isLoadingFormation,
    error: formationError,
  } = useQuery<Formation>({
    queryKey: ["/api/formations", formationId],
    enabled: Boolean(formationId),
    queryFn: async () => {
      const res = await fetch(`/api/formations/${formationId}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Formation introuvable");
      }
      return res.json();
    },
  });

  const {
    data: materials,
    isLoading: isLoadingMaterials,
    error: materialsError,
  } = useQuery<MaterialMetadata[], MaterialsQueryError>({
    queryKey: ["/api/formations", formationId, "materials"],
    enabled: Boolean(formationId),
    queryFn: async () => {
      const res = await fetch(`/api/formations/${formationId}/materials`, {
        credentials: "include",
      });
      if (res.status === 403) {
        const error = new Error("Accès refusé") as MaterialsQueryError;
        error.status = 403;
        throw error;
      }
      if (res.status === 404) {
        return [];
      }
      if (!res.ok) {
        throw new Error("Impossible de charger les ressources");
      }
      return res.json();
    },
  });

  const [contentDraft, setContentDraft] = useState("");
  const [isContentDirty, setIsContentDirty] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceRequiresEnrollment, setResourceRequiresEnrollment] = useState(true);
  const [resourceFile, setResourceFile] = useState<File | null>(null);

  useEffect(() => {
    if (formation) {
      setContentDraft(formation.content ?? "");
      setIsContentDirty(false);
    }
  }, [formation?.id, formation?.content]);

  const updateContentMutation = useMutation({
    mutationFn: async () => {
      if (!formationId) return;
      await apiRequest(`/api/formations/${formationId}/content`, "PATCH", {
        content: contentDraft,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formations", formationId] });
      toast({
        title: "Contenu enregistré",
        description: "Le contenu pédagogique a été mis à jour",
      });
      setIsContentDirty(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'enregistrer le contenu",
        variant: "destructive",
      });
    },
  });

  const uploadMaterialMutation = useMutation({
    mutationFn: async () => {
      if (!formationId || !resourceFile) return;
      if (!resourceTitle.trim()) {
        throw new Error("Le titre est obligatoire");
      }
      if (resourceFile.size > MAX_FILE_SIZE) {
        throw new Error("Le fichier dépasse la taille maximale de 10 Mo");
      }
      const fileData = await readFileAsBase64(resourceFile);
      await apiRequest(`/api/formations/${formationId}/materials`, "POST", {
        title: resourceTitle.trim(),
        description: resourceDescription.trim() || undefined,
        requiresEnrollment: resourceRequiresEnrollment,
        fileName: resourceFile.name,
        fileType: resourceFile.type || "application/octet-stream",
        fileSize: resourceFile.size,
        fileData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formations", formationId, "materials"] });
      toast({
        title: "Ressource ajoutée",
        description: "Le document est désormais disponible pour les stagiaires",
      });
      setUploadDialogOpen(false);
      setResourceTitle("");
      setResourceDescription("");
      setResourceRequiresEnrollment(true);
      setResourceFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'ajouter la ressource",
        variant: "destructive",
      });
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (materialId: string) => {
      if (!formationId) return;
      await apiRequest(
        `/api/formations/${formationId}/materials/${materialId}`,
        "DELETE"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formations", formationId, "materials"] });
      toast({
        title: "Ressource supprimée",
        description: "Le document a été retiré",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de supprimer la ressource",
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (material: MaterialMetadata) => {
    try {
      const res = await fetch(
        `/api/formations/${material.formationId}/materials/${material.id}/download`,
        {
          credentials: "include",
        }
      );
      if (!res.ok) {
        throw new Error("Téléchargement impossible");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = material.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de télécharger le document",
        variant: "destructive",
      });
    }
  };

  const formattedMaterials = useMemo(() => {
    return (materials ?? []).map((material) => ({
      ...material,
      createdAtFormatted: material.createdAt
        ? format(new Date(material.createdAt), "d MMMM yyyy à HH:mm", { locale: fr })
        : "",
      sizeLabel: `${(material.fileSize / 1024).toFixed(1)} Ko`,
    }));
  }, [materials]);

  if (isLoadingFormation) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!formation || formationError) {
    return (
      <Card className="max-w-xl mx-auto mt-16 p-10 text-center space-y-4">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">Formation introuvable</h2>
        <p className="text-muted-foreground">
          La formation demandée n'existe pas ou vous n'y avez pas accès.
        </p>
        <Button onClick={() => navigate("/instructor-formations")}>Retour aux formations</Button>
      </Card>
    );
  }

  const isForbidden = (materialsError as MaterialsQueryError | undefined)?.status === 403;

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate("/instructor-formations")}
          className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">{formation.title}</h1>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Contenu pédagogique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={contentDraft}
            onChange={(event) => {
              setContentDraft(event.target.value);
              setIsContentDirty(true);
            }}
            rows={10}
            placeholder="Rédigez ici le déroulé pédagogique, les points clés, les activités..."
          />
          <div className="flex items-center justify-end gap-3">
            <Button
              onClick={() => updateContentMutation.mutate()}
              disabled={updateContentMutation.isPending || !isContentDirty}
            >
              {updateContentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="ml-2">Enregistrer</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ressources à télécharger</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fournissez les supports nécessaires aux stagiaires. Ils seront réservés aux inscrits.
            </p>
          </div>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Ajouter un document
          </Button>
        </CardHeader>
        <CardContent>
          {isForbidden ? (
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas les droits nécessaires pour gérer les ressources de cette formation.
            </p>
          ) : isLoadingMaterials ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement des ressources...
            </div>
          ) : (formattedMaterials?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune ressource n'a encore été déposée.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Visibilité</TableHead>
                    <TableHead>Ajouté le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formattedMaterials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>
                        <div className="font-medium">{material.title}</div>
                        {material.description && (
                          <div className="text-sm text-muted-foreground">
                            {material.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{material.sizeLabel}</TableCell>
                      <TableCell>
                        {material.requiresEnrollment ? "Inscrits uniquement" : "Tous les participants"}
                      </TableCell>
                      <TableCell>{material.createdAtFormatted}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(material)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMaterialMutation.mutate(material.id)}
                          disabled={deleteMaterialMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une ressource</DialogTitle>
            <DialogDescription>
              Uploadez un document ou une vidéo à destination des stagiaires inscrits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Titre</label>
              <Input
                value={resourceTitle}
                onChange={(event) => setResourceTitle(event.target.value)}
                placeholder="Ex : Guide pédagogique"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optionnel)</label>
              <Textarea
                value={resourceDescription}
                onChange={(event) => setResourceDescription(event.target.value)}
                placeholder="Conseillez l'usage du document, le temps de lecture..."
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Réservé aux inscrits</p>
                <p className="text-xs text-muted-foreground">
                  Les stagiaires devront être inscrits pour voir la ressource.
                </p>
              </div>
              <Switch
                checked={resourceRequiresEnrollment}
                onCheckedChange={setResourceRequiresEnrollment}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fichier</label>
              <Input
                type="file"
                onChange={(event) => setResourceFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">Taille maximale : 10 Mo</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => uploadMaterialMutation.mutate()}
              disabled={uploadMaterialMutation.isPending}
            >
              {uploadMaterialMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="ml-2">Téléverser</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
