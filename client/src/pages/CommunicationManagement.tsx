import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Megaphone, Palette, Sparkles } from "lucide-react";
import DashboardInformationCard from "@/components/DashboardInformationCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DashboardInformationSettings } from "@shared/schema";
import { DEFAULT_DASHBOARD_INFORMATION } from "@shared/schema";

const INFORMATION_LAYOUT_OPTIONS: {
  value: DashboardInformationSettings["layout"];
  title: string;
  description: string;
}[] = [
  {
    value: "text-only",
    title: "Texte seul",
    description: "Affiche uniquement un titre et un message détaillé.",
  },
  {
    value: "image-right",
    title: "Image à droite",
    description: "Affiche une image compacte à droite du texte.",
  },
  {
    value: "image-left",
    title: "Image à gauche",
    description: "Affiche une image compacte à gauche du texte.",
  },
  {
    value: "image-top",
    title: "Image en haut",
    description: "Affiche une image large au-dessus du texte.",
  },
];

const INFORMATION_TONE_OPTIONS: {
  value: DashboardInformationSettings["tone"];
  title: string;
  description: string;
}[] = [
  {
    value: "neutral",
    title: "Neutre",
    description: "Fond clair et discret adapté aux messages généraux.",
  },
  {
    value: "accent",
    title: "Accent coloré",
    description: "Fond bleu clair pour mettre en avant l'information.",
  },
  {
    value: "highlight",
    title: "Contrasté",
    description: "Fond sombre pour les annonces importantes.",
  },
];

export default function CommunicationManagement() {
  const [informationForm, setInformationForm] = useState<DashboardInformationSettings>(
    DEFAULT_DASHBOARD_INFORMATION,
  );
  const { toast } = useToast();

  const { data: dashboardInformationSettings, isFetching } = useQuery<DashboardInformationSettings>({
    queryKey: ["/api/settings/dashboard-information"],
  });

  useEffect(() => {
    if (dashboardInformationSettings) {
      setInformationForm(dashboardInformationSettings);
    } else {
      setInformationForm(DEFAULT_DASHBOARD_INFORMATION);
    }
  }, [dashboardInformationSettings]);

  const updateDashboardInformationMutation = useMutation({
    mutationFn: async (payload: DashboardInformationSettings) => {
      return apiRequest("/api/admin/settings/dashboard-information", "PATCH", payload);
    },
    onSuccess: (data: DashboardInformationSettings) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/dashboard-information"] });
      toast({
        title: "Communication mise à jour",
        description: data.enabled
          ? "L'encadré est désormais visible sur le tableau de bord des collaborateurs."
          : "L'encadré d'information est désactivé.",
      });
      setInformationForm(data);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error?.message || "Impossible d'enregistrer la configuration.",
      });
    },
  });

  const handleInformationInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setInformationForm((prev) => ({
      ...prev,
      [name as keyof DashboardInformationSettings]: value,
    }));
  };

  const handleInformationEnabledChange = (checked: boolean) => {
    setInformationForm((prev) => ({
      ...prev,
      enabled: Boolean(checked),
    }));
  };

  const handleInformationLayoutChange = (value: string) => {
    setInformationForm((prev) => ({
      ...prev,
      layout: value as DashboardInformationSettings["layout"],
    }));
  };

  const handleInformationToneChange = (value: string) => {
    setInformationForm((prev) => ({
      ...prev,
      tone: value as DashboardInformationSettings["tone"],
    }));
  };

  const handleInformationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: DashboardInformationSettings = {
      ...informationForm,
      title: informationForm.title.trim(),
      body: informationForm.body.trim(),
      imageUrl: informationForm.imageUrl.trim(),
    };
    updateDashboardInformationMutation.mutate(payload);
  };

  const previewInformationSettings: DashboardInformationSettings = useMemo(
    () => ({
      ...informationForm,
      enabled:
        informationForm.enabled &&
        informationForm.title.trim().length > 0 &&
        informationForm.body.trim().length > 0,
      imageUrl: informationForm.imageUrl.trim(),
    }),
    [informationForm],
  );

  const isAnnouncementActive = previewInformationSettings.enabled;

  return (
    <div className="space-y-12">
      <section className="surface-elevated relative overflow-hidden rounded-[2rem] px-12 py-14">
        <div className="pointer-events-none absolute inset-y-8 right-0 hidden w-72 rounded-l-[32px] bg-[radial-gradient(circle_at_center,rgba(10,132,255,0.12),transparent_60%)] md:block" />
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-5">
            <p className="eyebrow text-muted-foreground">Administration RH</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                Communication
              </h1>
              <Badge variant={isAnnouncementActive ? "secondary" : "outline"} className="gap-1">
                <Megaphone className="h-3.5 w-3.5" />
                {isAnnouncementActive ? "Encadré actif" : "Encadré masqué"}
              </Badge>
            </div>
            <p className="text-base leading-relaxed text-muted-foreground">
              Publiez des annonces clés pour tous les collaborateurs directement dans le tableau de bord Colombus Learning.
            </p>
          </div>
          <Card className="surface-soft flex w-full max-w-sm flex-col gap-4 rounded-2xl border-none p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Visibilité</p>
                <p className="text-xs text-muted-foreground">
                  {isAnnouncementActive
                    ? "L'information est actuellement affichée sur le tableau de bord."
                    : "Aucune information n'est visible pour le moment."}
                </p>
              </div>
              <Switch
                checked={informationForm.enabled}
                onCheckedChange={(checked) => handleInformationEnabledChange(Boolean(checked))}
                aria-label="Activer l'encadré d'information"
              />
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-4 text-primary">
              <Sparkles className="h-5 w-5" />
              <p className="text-xs leading-relaxed">
                Ajoutez un visuel et choisissez une mise en forme pour renforcer l'impact de votre message.
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="space-y-10">
        <Card className="rounded-[1.75rem] border border-border/60 p-8 shadow-sm">
          <form onSubmit={handleInformationSubmit} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="information-title">Titre</Label>
                  <Input
                    id="information-title"
                    name="title"
                    value={informationForm.title}
                    onChange={handleInformationInputChange}
                    placeholder="Nouvelle formation Colombus"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="information-image">Image (optionnelle)</Label>
                  <Input
                    id="information-image"
                    name="imageUrl"
                    value={informationForm.imageUrl}
                    onChange={handleInformationInputChange}
                    placeholder="https://... ou /assets/visuel.jpg"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formats paysage recommandés (16:9 ou 4:3). Laissez vide pour une carte sans illustration.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="information-body">Texte</Label>
                <Textarea
                  id="information-body"
                  name="body"
                  value={informationForm.body}
                  onChange={handleInformationInputChange}
                  rows={6}
                  placeholder="Décrivez l'information à partager..."
                />
              </div>

              <div className="space-y-3">
                <Label>Disposition</Label>
                <RadioGroup
                  value={informationForm.layout}
                  onValueChange={handleInformationLayoutChange}
                  className="grid gap-3 md:grid-cols-2"
                >
                  {INFORMATION_LAYOUT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      htmlFor={`information-layout-${option.value}`}
                      className={cn(
                        "flex cursor-pointer flex-col gap-2 rounded-2xl border border-border/60 p-4 transition",
                        informationForm.layout === option.value
                          ? "border-primary/60 bg-primary/5"
                          : "hover:border-primary/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem
                          id={`information-layout-${option.value}`}
                          value={option.value}
                          className="mt-0.5"
                        />
                        <span className="text-sm font-medium text-foreground">{option.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Style visuel</Label>
                <RadioGroup
                  value={informationForm.tone}
                  onValueChange={handleInformationToneChange}
                  className="grid gap-3 md:grid-cols-3"
                >
                  {INFORMATION_TONE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      htmlFor={`information-tone-${option.value}`}
                      className={cn(
                        "flex cursor-pointer flex-col gap-2 rounded-2xl border border-border/60 p-4 transition",
                        informationForm.tone === option.value
                          ? "border-primary/60 bg-primary/5"
                          : "hover:border-primary/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem
                          id={`information-tone-${option.value}`}
                          value={option.value}
                          className="mt-0.5"
                        />
                        <span className="text-sm font-medium text-foreground">{option.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={updateDashboardInformationMutation.isPending}
                  className="gap-2"
                >
                  {updateDashboardInformationMutation.isPending ? (
                    <>Enregistrement...</>
                  ) : (
                    <>
                      <Megaphone className="h-4 w-4" />
                      Mettre à jour l'encadré
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-xs"
                  disabled={isFetching || updateDashboardInformationMutation.isPending}
                  onClick={() =>
                    setInformationForm(dashboardInformationSettings ?? DEFAULT_DASHBOARD_INFORMATION)
                  }
                >
                  Réinitialiser les modifications
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Palette className="h-4 w-4" />
                Aperçu du rendu
              </div>
              <Card className="rounded-2xl border border-border/40 bg-muted/40 p-4">
                <DashboardInformationCard settings={previewInformationSettings} showWhenDisabled />
              </Card>
            </div>
          </form>
        </Card>
      </section>
    </div>
  );
}
