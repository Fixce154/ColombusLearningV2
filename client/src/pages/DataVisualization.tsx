import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BarChart as RechartsBarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  Clock,
  Download,
  Filter,
  Loader2,
  Target,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { User } from "@shared/schema";

interface StatusCounts {
  pending: number;
  validated: number;
  completed: number;
  cancelled: number;
  refused: number;
}

interface StatusPercentages extends StatusCounts {}

interface ConsultantAnalytics {
  userId: string;
  name: string;
  email: string;
  seniority: string | null;
  businessUnit: string | null;
  statusCounts: StatusCounts;
  statusPercentages: StatusPercentages;
  absenteeismRate: number;
  evaluationRate: number;
  totalTrainingHours: number;
  totalTrainingDays: number;
  refusedDetails: Array<{
    interestId: string;
    formationId: string;
    formationTitle: string;
    expressedAt: string | null;
  }>;
}

interface AnalyticsSummary {
  totalConsultants: number;
  totalRegistrations: number;
  statusCounts: StatusCounts;
  statusPercentages: StatusPercentages;
  absenteeismRate: number;
  evaluationRate: number;
  totalTrainingHours: number;
  totalTrainingDays: number;
  lastUpdated: string;
}

interface SeniorityAnalytics {
  seniority: string;
  totalRegistrations: number;
  completedCount: number;
  refusedCount: number;
  totalTrainingHours: number;
  totalTrainingDays: number;
  uniqueConsultants: number;
}

type TimelineStatus = "pending" | "validated" | "completed" | "cancelled" | "refused";

type TimelineEntry = {
  recordType: "registration" | "interest";
  id: string;
  consultantId: string;
  consultantName: string;
  formationId: string;
  formationTitle: string;
  sessionId: string | null;
  sessionStartDate: string | null;
  sessionEndDate: string | null;
  status: TimelineStatus;
  attended: boolean | null;
  priority: string | null | undefined;
  durationHours: number;
  durationDays: number;
  seniority: string | null;
  businessUnit: string | null;
};

interface AnalyticsResponse {
  summary: AnalyticsSummary;
  byConsultant: ConsultantAnalytics[];
  bySeniority: SeniorityAnalytics[];
  timeline: TimelineEntry[];
}

interface CurrentUserResponse {
  user: User;
}

const statusLabels: Record<TimelineStatus, string> = {
  pending: "En attente",
  validated: "Validée",
  completed: "Terminée",
  cancelled: "Annulée",
  refused: "Refusée",
};

const statusBadgeVariant: Record<TimelineStatus, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  validated: "secondary",
  cancelled: "destructive",
  pending: "outline",
  refused: "destructive",
};

const chartConfig = {
  completed: {
    label: "Formations terminées",
    color: "hsl(var(--chart-1))",
  },
  cancelled: {
    label: "Formations annulées",
    color: "hsl(var(--chart-3))",
  },
  validated: {
    label: "Formations validées",
    color: "hsl(var(--chart-2))",
  },
  refused: {
    label: "Intentions refusées",
    color: "hsl(var(--chart-4))",
  },
  pending: {
    label: "En attente",
    color: "hsl(var(--muted-foreground))",
  },
} as const;

function formatNumber(value: number) {
  return value.toLocaleString("fr-FR");
}

function formatPercentage(value: number) {
  return `${value.toFixed(1)} %`;
}

function formatHours(value: number) {
  return `${value.toFixed(1)} h`;
}

function formatDays(value: number) {
  return `${value.toFixed(1)} j`;
}

export default function DataVisualization() {
  const [consultantFilter, setConsultantFilter] = useState<string>("all");
  const [formationFilter, setFormationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<TimelineStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: currentUser, isLoading: isCurrentUserLoading } = useQuery<CurrentUserResponse | null>({
    queryKey: ["/api/auth/me"],
  });

  const isRh = currentUser?.user?.roles.includes("rh") ?? false;

  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    isError,
  } = useQuery<AnalyticsResponse>({
    queryKey: ["/api/admin/analytics"],
    enabled: isRh,
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Impossible de charger les indicateurs");
      }
      return res.json();
    },
  });

  const consultantOptions = useMemo(() => {
    if (!analytics) return [];
    return analytics.byConsultant
      .map((consultant) => ({ value: consultant.userId, label: consultant.name }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [analytics]);

  const formationOptions = useMemo(() => {
    if (!analytics) return [];
    const map = new Map<string, string>();
    analytics.timeline.forEach((entry) => {
      map.set(entry.formationId, entry.formationTitle);
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [analytics]);

  const filteredTimeline = useMemo(() => {
    if (!analytics) return [] as TimelineEntry[];

    return analytics.timeline
      .filter((entry) => {
        const matchesConsultant = consultantFilter === "all" || entry.consultantId === consultantFilter;
        const matchesFormation = formationFilter === "all" || entry.formationId === formationFilter;
        const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const matchesSearch =
          normalizedSearch.length === 0 ||
          entry.consultantName.toLowerCase().includes(normalizedSearch) ||
          entry.formationTitle.toLowerCase().includes(normalizedSearch) ||
          (entry.businessUnit ?? "").toLowerCase().includes(normalizedSearch);
        return matchesConsultant && matchesFormation && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = a.sessionStartDate ? new Date(a.sessionStartDate).getTime() : 0;
        const dateB = b.sessionStartDate ? new Date(b.sessionStartDate).getTime() : 0;
        return dateB - dateA;
      });
  }, [analytics, consultantFilter, formationFilter, statusFilter, searchTerm]);

  const monthlySeries = useMemo(() => {
    if (!analytics) return [] as Array<{ key: string; month: string; hours: number; absences: number }>;
    const aggregation = new Map<string, { key: string; month: string; hours: number; absences: number }>();

    analytics.timeline.forEach((entry) => {
      if (entry.recordType !== "registration") return;
      if (entry.status !== "completed") return;
      if (!entry.sessionStartDate) return;

      const key = format(new Date(entry.sessionStartDate), "yyyy-MM");
      if (!aggregation.has(key)) {
        aggregation.set(key, {
          key,
          month: format(new Date(entry.sessionStartDate), "MMM yyyy", { locale: fr }),
          hours: 0,
          absences: 0,
        });
      }
      const record = aggregation.get(key)!;
      record.hours += entry.attended ? entry.durationHours : 0;
      record.absences += entry.attended === false ? 1 : 0;
    });

    return Array.from(aggregation.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [analytics]);

  const consultantChartData = useMemo(() => {
    if (!analytics) return [] as Array<Record<string, unknown>>;
    return analytics.byConsultant.map((consultant) => ({
      consultant: consultant.name,
      completed: consultant.statusCounts.completed,
      cancelled: consultant.statusCounts.cancelled,
      validated: consultant.statusCounts.validated,
      refused: consultant.statusCounts.refused,
    }));
  }, [analytics]);

  const statusDistribution = useMemo(() => {
    if (!analytics) return [] as Array<{ status: TimelineStatus; value: number; label: string }>;
    return (["completed", "cancelled", "validated", "refused"] as TimelineStatus[])
      .map((status) => ({
        status,
        value: analytics.summary.statusCounts[status],
        label: chartConfig[status].label,
      }))
      .filter((item) => item.value > 0);
  }, [analytics]);

  const handleExport = () => {
    if (!analytics) return;

    const headers = [
      "Consultant",
      "Formation",
      "Type",
      "Statut",
      "Date de début",
      "Date de fin",
      "Présence",
      "Durée (h)",
      "Durée (j)",
      "Priorité",
      "Ancienneté",
      "Business Unit",
    ];

    const rows = filteredTimeline.map((entry) => [
      entry.consultantName,
      entry.formationTitle,
      entry.recordType === "registration" ? "Inscription" : "Intention",
      statusLabels[entry.status],
      entry.sessionStartDate ? format(new Date(entry.sessionStartDate), "dd/MM/yyyy", { locale: fr }) : "",
      entry.sessionEndDate ? format(new Date(entry.sessionEndDate), "dd/MM/yyyy", { locale: fr }) : "",
      entry.attended === null ? "-" : entry.attended ? "Présent" : "Absent",
      entry.durationHours.toString().replace(".", ","),
      entry.durationDays.toString().replace(".", ","),
      entry.priority ?? "",
      entry.seniority ?? "",
      entry.businessUnit ?? "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "colombus-indicateurs-formations.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isCurrentUserLoading || (isRh && isAnalyticsLoading)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p>Chargement des indicateurs...</p>
        </div>
      </div>
    );
  }

  if (!isCurrentUserLoading && !isRh) {
    return (
      <Alert>
        <AlertTitle>Accès restreint</AlertTitle>
        <AlertDescription>
          Cette section est réservée aux responsables RH. Contactez un administrateur pour obtenir les droits nécessaires.
        </AlertDescription>
      </Alert>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          Impossible de récupérer les indicateurs. Veuillez réessayer plus tard.
        </AlertDescription>
      </Alert>
    );
  }

  if (!analytics) {
    return null;
  }

  const { summary } = analytics;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-primary">Data visualisation RH</h1>
          <p className="text-muted-foreground max-w-2xl">
            Suivez en un coup d'œil l'activité de formation : états des demandes, participation réelle, intentions refusées et
            volumes d'heures consommées par consultant.
          </p>
          <p className="text-xs text-muted-foreground">
            Dernière mise à jour : {format(new Date(summary.lastUpdated), "dd MMMM yyyy à HH:mm", { locale: fr })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exporter en CSV
          </Button>
        </div>
      </div>

      <Alert className="bg-primary/5 border-primary/20">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">Dimensions sociales partielles</AlertTitle>
        <AlertDescription>
          Les informations d'âge et de genre ne sont pas collectées dans la plateforme. Les répartitions sont disponibles par
          ancienneté, business unit et statut de formation.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formations terminées</CardTitle>
            <BarChart2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatNumber(summary.statusCounts.completed)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(summary.statusPercentages.completed)} des décisions (hors en attente)
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intentions refusées</CardTitle>
            <Target className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{formatNumber(summary.statusCounts.refused)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(summary.statusPercentages.refused)} des décisions finales
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Heures suivies</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatHours(summary.totalTrainingHours)}</div>
            <p className="text-xs text-muted-foreground">
              {formatDays(summary.totalTrainingDays)} de formation réalisée
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tx d'absentéisme</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatPercentage(summary.absenteeismRate)}</div>
            <p className="text-xs text-muted-foreground">
              Taux basé sur les formations terminées et déclarées absentes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Statuts par consultant</CardTitle>
            <CardDescription>Répartition des inscriptions validées, terminées, annulées et intentions refusées</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="w-full">
              <RechartsBarChart data={consultantChartData} stackOffset="expand">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="consultant" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} angle={-20} dy={10} height={60} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" />
                <Bar dataKey="validated" stackId="a" fill="var(--color-validated)" />
                <Bar dataKey="cancelled" stackId="a" fill="var(--color-cancelled)" />
                <Bar dataKey="refused" stackId="a" fill="var(--color-refused)" />
                <ChartLegend content={<ChartLegendContent />} />
              </RechartsBarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Décisions globales</CardTitle>
            <CardDescription>Répartition des statuts (hors demandes en attente)</CardDescription>
          </CardHeader>
          <CardContent>
            {statusDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pas encore de décisions enregistrées.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusDistribution} dataKey="value" nameKey="label" innerRadius={60} outerRadius={110} paddingAngle={4}>
                    {statusDistribution.map((entry) => (
                      <Cell key={entry.status} fill={`var(--color-${entry.status})`} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _name: string, entry: any) => {
                      const status = entry?.payload?.status as TimelineStatus | undefined;
                      const percent = status ? analytics.summary.statusPercentages[status] : 0;
                      const label = status ? statusLabels[status] : "";
                      return [`${formatNumber(value)} (${formatPercentage(percent)})`, label];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Heures consommées par mois</CardTitle>
          <CardDescription>Volumes d'heures suivies et détections d'absences déclarées</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {monthlySeries.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>Aucune formation terminée pour le moment.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" orientation="left" tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number, name: string) => (name === "hours" ? formatHours(value) : `${value} abs.`)} />
                <Line type="monotone" yAxisId="left" dataKey="hours" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Heures suivies" />
                <Line type="monotone" yAxisId="right" dataKey="absences" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Absences" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Répartition par ancienneté</CardTitle>
          <CardDescription>Volume d'inscriptions et d'heures consommées selon la seniorité déclarée</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analytics.bySeniority.map((item) => (
              <Card key={item.seniority} className="bg-muted/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{item.seniority}</CardTitle>
                  <CardDescription>{item.uniqueConsultants} consultants concernés</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Inscriptions</span>
                    <span className="font-semibold">{formatNumber(item.totalRegistrations)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Formations terminées</span>
                    <span className="font-semibold">{formatNumber(item.completedCount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Intentions refusées</span>
                    <span className="font-semibold text-destructive">{formatNumber(item.refusedCount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Heures suivies</span>
                    <span className="font-semibold">{formatHours(item.totalTrainingHours)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Suivi global des consultants</CardTitle>
              <CardDescription>Historique des formations et intentions avec filtres combinables</CardDescription>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>Filtres actifs</span>
              </div>
              <Select value={consultantFilter} onValueChange={setConsultantFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Consultant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les consultants</SelectItem>
                  {consultantOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={formationFilter} onValueChange={setFormationFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Formation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les formations</SelectItem>
                  {formationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value: TimelineStatus | "all") => setStatusFilter(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {(Object.keys(statusLabels) as TimelineStatus[]).map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher (consultant, formation, BU)"
                className="w-[260px]"
              />
              <Button
                variant="ghost"
                onClick={() => {
                  setConsultantFilter("all");
                  setFormationFilter("all");
                  setStatusFilter("all");
                  setSearchTerm("");
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consultant</TableHead>
                  <TableHead>Formation</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date(s)</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Présence</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>BU</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimeline.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Aucun enregistrement correspondant aux filtres.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTimeline.map((entry) => (
                    <TableRow key={`${entry.recordType}-${entry.id}`} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{entry.consultantName}</span>
                          {entry.seniority && (
                            <span className="text-xs text-muted-foreground">{entry.seniority}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{entry.formationTitle}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="uppercase">
                          {entry.recordType === "registration" ? "Inscription" : "Intention"}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        {entry.sessionStartDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span>{format(new Date(entry.sessionStartDate), "dd MMM yyyy", { locale: fr })}</span>
                              {entry.sessionEndDate && (
                                <span className="text-xs text-muted-foreground">
                                  au {format(new Date(entry.sessionEndDate), "dd MMM yyyy", { locale: fr })}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Date non planifiée</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant[entry.status]}>{statusLabels[entry.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        {entry.recordType === "interest" ? (
                          <span className="text-muted-foreground text-sm">—</span>
                        ) : entry.attended === null ? (
                          <span className="text-muted-foreground text-sm">Non renseigné</span>
                        ) : (
                          <Badge variant={entry.attended ? "secondary" : "destructive"}>
                            {entry.attended ? "Présent" : "Absent"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.recordType === "interest" ? (
                          <span className="text-muted-foreground text-sm">—</span>
                        ) : (
                          <div className="flex flex-col text-sm">
                            <span>{formatHours(entry.durationHours)}</span>
                            <span className="text-muted-foreground">{formatDays(entry.durationDays)}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{entry.priority ?? "-"}</TableCell>
                      <TableCell>{entry.businessUnit ?? "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
