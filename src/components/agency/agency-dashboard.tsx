"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { useUI } from "@/lib/store";
import { PropertyForm } from "./property-form";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  MessageSquare,
  BarChart3,
  CreditCard,
  UserRound,
  LogOut,
  MoreVertical,
  Pencil,
  Pause,
  Play,
  CheckCircle2,
  Eye,
  TrendingUp,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  ShieldAlert,
  MapPin,
  Heart,
  Phone,
  MessageCircle,
  Navigation,
  Share2,
  Crown,
  Home,
  Building,
  Mail,
  Globe,
  Instagram,
  Save,
} from "lucide-react";
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_STATUS,
  PROPERTY_STATUS_LABELS,
  PLAN_CODES,
  ROLES,
} from "@/lib/constants";
import { formatPrice, formatRelativeTime } from "@/lib/geo";
import type { MyPropertyItem, LeadItem, Property } from "@/lib/types";
import { cn } from "@/lib/utils";

// ============================================================
// Tipos
// ============================================================

interface MeResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone?: string | null;
  } | null;
  agency: AgencyProfile | null;
  owner: { id: string; verificationStatus: string } | null;
  broker: { id: string; name: string } | null;
  properties: MyPropertyItem[];
  stats: {
    active: number;
    total: number;
    views: number;
    leads: number;
    favorites: number;
  };
}

interface AgencyProfile {
  id: string;
  name: string;
  cnpj: string | null;
  creci: string | null;
  responsibleName: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
  instagram: string | null;
  status: string;
  verified: boolean;
}

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  maxProperties: number;
  price: number;
  billingCycle: string;
  durationDays: number | null;
  sortOrder: number;
}

interface SubscriptionInfo {
  maxProperties: number;
  planCode: string | null;
  active: boolean;
  currentActive: number;
}

interface PlansResponse {
  plans: Plan[];
  subscription: SubscriptionInfo | null;
}

const ADVERTISER_ROLES: string[] = [
  ROLES.AGENCY,
  ROLES.OWNER,
  ROLES.BROKER,
  ROLES.ADMIN,
];
const ROLE_LABELS: Record<string, string> = {
  USER: "Usuário",
  OWNER: "Proprietário",
  BROKER: "Corretor",
  AGENCY: "Imobiliária",
  ADMIN: "Administrador",
};

const TABS = [
  { value: "overview", label: "Visão geral", icon: LayoutDashboard },
  { value: "properties", label: "Meus imóveis", icon: Building2 },
  { value: "form", label: "Cadastrar", icon: PlusCircle },
  { value: "leads", label: "Leads", icon: MessageSquare },
  { value: "stats", label: "Estatísticas", icon: BarChart3 },
  { value: "plans", label: "Assinatura", icon: CreditCard },
  { value: "profile", label: "Perfil", icon: UserRound },
] as const;

type TabValue = (typeof TABS)[number]["value"];

// ============================================================
// Componente raiz
// ============================================================

export function AgencyDashboard() {
  const { drawer, closeDrawer, openDrawer } = useUI();
  const open = drawer === "agency";
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<TabValue>("overview");
  const [editProperty, setEditProperty] = useState<Property | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const qc = useQueryClient();

  const meQuery = useQuery<MeResponse>({
    queryKey: ["me"],
    enabled: open && status === "authenticated",
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) throw new Error("Falha ao carregar perfil.");
      return res.json();
    },
  });

  const plansQuery = useQuery<PlansResponse>({
    queryKey: ["plans"],
    enabled: open && status === "authenticated",
    queryFn: async () => {
      const res = await fetch("/api/plans");
      if (!res.ok) throw new Error("Falha ao carregar planos.");
      return res.json();
    },
  });

  function handleCreateNew() {
    setEditProperty(null);
    setTab("form");
  }

  async function handleEdit(p: MyPropertyItem) {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/properties/${p.id}`);
      const d = await res.json();
      if (d.property) {
        setEditProperty(d.property as Property);
        setTab("form");
      } else {
        toast.error(d.error || "Não foi possível carregar o imóvel.");
      }
    } catch {
      toast.error("Não foi possível carregar o imóvel.");
    } finally {
      setEditLoading(false);
    }
  }

  function handleFormDone() {
    setEditProperty(null);
    setTab("properties");
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  const role = (session?.user?.role as string) || "";
  const isAdvertiser = ADVERTISER_ROLES.includes(role);
  const agency = meQuery.data?.agency ?? null;
  const subscription = plansQuery.data?.subscription ?? null;
  const planCode = subscription?.planCode ?? null;
  const isAgencyPending =
    role === ROLES.AGENCY && agency && agency.status !== "APPROVED";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3.5 border-b flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base leading-tight truncate">
                Painel do anunciante
              </SheetTitle>
              {session?.user && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                    {session.user.name}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-4 px-1.5 font-medium"
                  >
                    {ROLE_LABELS[role] || role}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={closeDrawer}
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </Button>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {status === "loading" ? (
            <div className="flex-1 grid place-items-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !session ? (
            <NotLoggedIn
              onLogin={() => {
                closeDrawer();
                openDrawer("auth");
              }}
            />
          ) : !isAdvertiser ? (
            <NotAdvertiser
              onRegister={() => {
                closeDrawer();
                openDrawer("auth");
              }}
            />
          ) : !meQuery.data || plansQuery.isLoading ? (
            <DashboardSkeleton />
          ) : meQuery.isError ? (
            <ErrorState message="Não foi possível carregar seus dados." onRetry={() => meQuery.refetch()} />
          ) : (
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as TabValue)}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="border-b px-2 py-2 overflow-x-auto scroll-area">
                <TabsList className="bg-transparent h-auto p-0 gap-1 flex w-max">
                  {TABS.map((t) => {
                    const Icon = t.icon;
                    return (
                      <TabsTrigger
                        key={t.value}
                        value={t.value}
                        className="flex-none gap-1.5 h-8 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {t.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto scroll-area">
                <TabsContent value="overview" className="p-4 m-0 mt-0">
                  <OverviewTab
                    stats={meQuery.data!.stats}
                    totalProperties={meQuery.data!.properties.length}
                    subscription={subscription}
                    plans={plansQuery.data?.plans ?? []}
                    isAgencyPending={!!isAgencyPending}
                    onUpgrade={() => setTab("plans")}
                    onCreate={handleCreateNew}
                  />
                </TabsContent>

                <TabsContent value="properties" className="p-4 m-0">
                  <PropertiesTab
                    properties={meQuery.data!.properties}
                    onCreate={handleCreateNew}
                    onEdit={handleEdit}
                    editLoading={editLoading}
                  />
                </TabsContent>

                <TabsContent value="form" className="p-4 m-0">
                  <div className="mb-3">
                    <h2 className="text-base font-semibold">
                      {editProperty ? "Editar imóvel" : "Cadastrar imóvel"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {editProperty
                        ? "Atualize as informações do seu anúncio."
                        : "Preencha as informações para publicar um novo anúncio."}
                    </p>
                  </div>
                  <PropertyForm
                    editProperty={editProperty}
                    onDone={handleFormDone}
                    defaultContact={{
                      name: session.user.name,
                      phone: session.user.phone,
                    }}
                  />
                </TabsContent>

                <TabsContent value="leads" className="p-4 m-0">
                  <LeadsTab />
                </TabsContent>

                <TabsContent value="stats" className="p-4 m-0">
                  <StatsTab
                    properties={meQuery.data!.properties}
                    stats={meQuery.data!.stats}
                  />
                </TabsContent>

                <TabsContent value="plans" className="p-4 m-0">
                  <PlansTab
                    plans={plansQuery.data?.plans ?? []}
                    subscription={subscription}
                  />
                </TabsContent>

                <TabsContent value="profile" className="p-4 m-0">
                  <ProfileTab
                    agency={agency}
                    user={session.user}
                    role={role}
                    owner={meQuery.data?.owner ?? null}
                    broker={meQuery.data?.broker ?? null}
                  />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Guardas de acesso
// ============================================================

function NotLoggedIn({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex-1 grid place-items-center px-6">
      <div className="text-center max-w-xs">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-4">
          <UserRound className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-semibold mb-1">Faça login para acessar o painel.</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Acesse sua conta de anunciante para gerenciar imóveis, leads e
          assinatura.
        </p>
        <Button onClick={onLogin} className="w-full">
          Entrar
        </Button>
      </div>
    </div>
  );
}

function NotAdvertiser({ onRegister }: { onRegister: () => void }) {
  return (
    <div className="flex-1 grid place-items-center px-6">
      <div className="text-center max-w-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 grid place-items-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-semibold mb-1">Esta área é para anunciantes.</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Crie uma conta como imobiliária ou proprietário para anunciar imóveis
          no mapa.
        </p>
        <Button onClick={onRegister} className="w-full">
          Quero anunciar
        </Button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex-1 grid place-items-center px-6">
      <div className="text-center max-w-xs">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive grid place-items-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-semibold mb-1">{message}</h3>
        <Button onClick={onRetry} variant="outline" className="mt-3">
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Tab 1: Visão geral
// ============================================================

function OverviewTab({
  stats,
  totalProperties,
  subscription,
  plans,
  isAgencyPending,
  onUpgrade,
  onCreate,
}: {
  stats: MeResponse["stats"];
  totalProperties: number;
  subscription: SubscriptionInfo | null;
  plans: Plan[];
  isAgencyPending: boolean;
  onUpgrade: () => void;
  onCreate: () => void;
}) {
  const planCode = subscription?.planCode;
  const currentPlan = plans.find((p) => p.code === planCode) || null;
  const hasActivePlan = !!subscription?.active;
  const current = subscription?.currentActive ?? 0;
  const max = subscription?.maxProperties ?? 0;
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;

  return (
    <div className="space-y-4">
      {isAgencyPending && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-800">
              Sua imobiliária está em análise.
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Você poderá publicar imóveis após a aprovação do nosso time.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Imóveis ativos"
          value={stats.active}
          tone="primary"
        />
        <StatCard
          icon={<Building2 className="w-4 h-4" />}
          label="Total de imóveis"
          value={stats.total}
        />
        <StatCard
          icon={<Eye className="w-4 h-4" />}
          label="Visualizações"
          value={stats.views}
        />
        <StatCard
          icon={<MessageSquare className="w-4 h-4" />}
          label="Leads"
          value={stats.leads}
        />
        <StatCard
          icon={<Heart className="w-4 h-4" />}
          label="Favoritos"
          value={stats.favorites}
        />
        <StatCard
          icon={<PlusCircle className="w-4 h-4" />}
          label="Cadastrar"
          value="Novo"
          onClick={onCreate}
          tone="primary"
        />
      </div>

      {/* Plan info */}
      {!hasActivePlan ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex flex-col items-start gap-3">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold">
                Escolha um plano para começar a anunciar
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Sem plano ativo você não pode publicar imóveis no mapa. Escolha um
              plano que cabe no seu portfólio.
            </p>
            <Button onClick={onUpgrade} size="sm" className="mt-1">
              Ver planos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                Plano atual
              </CardTitle>
              {currentPlan && (
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {currentPlan.name}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              {currentPlan?.description || "Assinatura ativa"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">Imóveis ativos</span>
              <span className="font-semibold">
                {current} / {max}
              </span>
            </div>
            <Progress value={pct} className="h-2" />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted-foreground">
                {pct >= 100
                  ? "Limite atingido — faça upgrade para publicar mais."
                  : `${max - current} imóvel(is) disponível(is) no plano.`}
              </span>
              <Button onClick={onUpgrade} variant="outline" size="sm">
                Fazer upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {totalProperties === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted grid place-items-center text-muted-foreground">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">Nenhum imóvel cadastrado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cadastre seu primeiro imóvel para aparecer no mapa.
              </p>
            </div>
            <Button onClick={onCreate} size="sm" className="mt-1">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Cadastrar imóvel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: "primary";
  onClick?: () => void;
}) {
  const content = (
    <>
      <div
        className={cn(
          "w-7 h-7 rounded-md grid place-items-center mb-2",
          tone === "primary"
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div className="text-xl font-bold leading-tight text-foreground">
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-left rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/40 cursor-pointer"
      >
        {content}
      </button>
    );
  }
  return <div className="rounded-xl border bg-card p-3">{content}</div>;
}

// ============================================================
// Tab 2: Meus imóveis
// ============================================================

function PropertiesTab({
  properties,
  onCreate,
  onEdit,
  editLoading,
}: {
  properties: MyPropertyItem[];
  onCreate: () => void;
  onEdit: (p: MyPropertyItem) => void;
  editLoading: boolean;
}) {
  if (!properties.length) {
    return (
      <EmptyState
        icon={<Building2 className="w-9 h-9" />}
        title="Cadastre seu primeiro imóvel."
        description="Seus anúncios aparecerão aqui. Você poderá editar, pausar e acompanhar as métricas."
        actionLabel="Cadastrar imóvel"
        onAction={onCreate}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {properties.length} imóvel(is)
        </h2>
        <Button onClick={onCreate} size="sm">
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Novo
        </Button>
      </div>

      {editLoading && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Carregando imóvel para edição…
        </div>
      )}

      <div className="space-y-2.5">
        {properties.map((p) => (
          <PropertyRow key={p.id} property={p} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

function PropertyRow({
  property,
  onEdit,
}: {
  property: MyPropertyItem;
  onEdit: (p: MyPropertyItem) => void;
}) {
  const qc = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erro ao atualizar status.");
      return d;
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: "DELETE",
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erro ao excluir imóvel.");
      return d;
    },
    onSuccess: () => {
      toast.success("Imóvel excluído.");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const status = property.status;
  const isActive = status === PROPERTY_STATUS.ACTIVE;
  const isPaused = status === PROPERTY_STATUS.PAUSED;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:border-primary/30 transition-colors">
      {/* Thumb */}
      <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
        {property.primaryImage ? (
          <img
            src={property.primaryImage}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground">
            <Building2 className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground clamp-1">
            {property.title}
          </p>
          <StatusBadge status={status} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
          {property.neighborhood ? ` · ${property.neighborhood}` : ""}
          {property.city ? ` · ${property.city}` : ""}
        </p>
        <p className="text-sm font-bold text-primary mt-1">
          {formatPrice(property.price, property.purpose)}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> {property.views}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> {property.leadsCount}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" /> {property.favoritesCount}
          </span>
          <span className="text-[10px] text-muted-foreground/80">
            · {formatRelativeTime(property.lastConfirmedAt)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Ações"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(property)}>
            <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isActive && (
            <DropdownMenuItem
              onClick={() => statusMutation.mutate(PROPERTY_STATUS.PAUSED)}
              disabled={statusMutation.isPending}
            >
              <Pause className="w-3.5 h-3.5 mr-2" /> Pausar
            </DropdownMenuItem>
          )}
          {isPaused && (
            <DropdownMenuItem
              onClick={() => statusMutation.mutate(PROPERTY_STATUS.ACTIVE)}
              disabled={statusMutation.isPending}
            >
              <Play className="w-3.5 h-3.5 mr-2" /> Ativar
            </DropdownMenuItem>
          )}
          {status !== PROPERTY_STATUS.RENTED && (
            <DropdownMenuItem
              onClick={() => statusMutation.mutate(PROPERTY_STATUS.RENTED)}
              disabled={statusMutation.isPending}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Marcar como alugado
            </DropdownMenuItem>
          )}
          {status !== PROPERTY_STATUS.SOLD && (
            <DropdownMenuItem
              onClick={() => statusMutation.mutate(PROPERTY_STATUS.SOLD)}
              disabled={statusMutation.isPending}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Marcar como vendido
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DeletePropertyItem
            onConfirm={() => deleteMutation.mutate()}
            loading={deleteMutation.isPending}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DeletePropertyItem({
  onConfirm,
  loading,
}: {
  onConfirm: () => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <DropdownMenuItem
        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        onSelect={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        disabled={loading}
      >
        <Trash2 className="w-3.5 h-3.5 mr-2" />
        {loading ? "Excluindo…" : "Excluir"}
      </DropdownMenuItem>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir imóvel?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O imóvel e todas as suas fotos,
              leads e favoritos associados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = PROPERTY_STATUS_LABELS[status] || status;
  const tone: Record<string, string> = {
    ACTIVE: "bg-primary/10 text-primary border-primary/20",
    PAUSED: "bg-muted text-muted-foreground border-border",
    PENDING_APPROVAL: "bg-amber-100 text-amber-700 border-amber-200",
    RENTED: "bg-violet-100 text-violet-700 border-violet-200",
    SOLD: "bg-rose-100 text-rose-700 border-rose-200",
    EXPIRED: "bg-slate-100 text-slate-600 border-slate-200",
    REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
    DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] h-5 px-1.5 font-medium shrink-0",
        tone[status] || "bg-muted text-muted-foreground border-border"
      )}
    >
      {label}
    </Badge>
  );
}

// ============================================================
// Tab 4: Leads
// ============================================================

function LeadsTab() {
  const { data, isLoading, error, refetch } = useQuery<{
    leads: LeadItem[];
    total: number;
  }>({
    queryKey: ["leads"],
    queryFn: async () => {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Falha ao carregar leads.");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <ErrorState message="Não foi possível carregar os leads." onRetry={() => refetch()} />
    );
  }
  if (!data?.leads.length) {
    return (
      <EmptyState
        icon={<MessageSquare className="w-9 h-9" />}
        title="Nenhum lead ainda."
        description="Quando alguém entrar em contato via WhatsApp, telefone ou demonstrar interesse em um imóvel seu, aparecerá aqui."
      />
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold">{data.total} lead(s)</h2>
        <span className="text-[11px] text-muted-foreground">
          Mais recentes primeiro
        </span>
      </div>
      {data.leads.map((l) => (
        <LeadRow key={l.id} lead={l} />
      ))}
    </div>
  );
}

const LEAD_SOURCE_META: Record<
  string,
  { label: string; icon: React.ReactNode; tone: string }
> = {
  WHATSAPP: {
    label: "WhatsApp",
    icon: <MessageCircle className="w-3 h-3" />,
    tone: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  PHONE: {
    label: "Telefone",
    icon: <Phone className="w-3 h-3" />,
    tone: "bg-teal-100 text-teal-700 border-teal-200",
  },
  INTEREST: {
    label: "Interesse",
    icon: <Heart className="w-3 h-3" />,
    tone: "bg-amber-100 text-amber-700 border-amber-200",
  },
  DIRECTIONS: {
    label: "Como chegar",
    icon: <Navigation className="w-3 h-3" />,
    tone: "bg-violet-100 text-violet-700 border-violet-200",
  },
  SHARE: {
    label: "Compartilhamento",
    icon: <Share2 className="w-3 h-3" />,
    tone: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

function LeadRow({ lead }: { lead: LeadItem }) {
  const meta = LEAD_SOURCE_META[lead.source] || {
    label: lead.source,
    icon: <MessageSquare className="w-3 h-3" />,
    tone: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {lead.property && (
            <p className="text-sm font-medium text-foreground clamp-1">
              {lead.property.title}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {lead.property
              ? `${formatPrice(lead.property.price, lead.property.purpose)}`
              : "Imóvel removido"}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] h-5 px-1.5 font-medium shrink-0 gap-1",
            meta.tone
          )}
        >
          {meta.icon}
          {meta.label}
        </Badge>
      </div>

      {lead.message && (
        <p className="text-xs text-foreground/80 mt-2 bg-muted/60 rounded-md p-2">
          “{lead.message}”
        </p>
      )}

      <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
        {lead.contact ? (
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" /> {lead.contact}
          </span>
        ) : (
          <span>Sem contato</span>
        )}
        <span>{formatRelativeTime(lead.createdAt)}</span>
      </div>
    </div>
  );
}

// ============================================================
// Tab 5: Estatísticas
// ============================================================

function StatsTab({
  properties,
  stats,
}: {
  properties: MyPropertyItem[];
  stats: MeResponse["stats"];
}) {
  const top = [...properties]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5)
    .filter((p) => (p.views || 0) > 0);
  const maxViews = top.length ? top[0].views : 0;

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat
          icon={<Eye className="w-4 h-4" />}
          label="Visualizações"
          value={stats.views}
        />
        <MiniStat
          icon={<MessageSquare className="w-4 h-4" />}
          label="Leads"
          value={stats.leads}
        />
        <MiniStat
          icon={<Heart className="w-4 h-4" />}
          label="Favoritos"
          value={stats.favorites}
        />
        <MiniStat
          icon={<Building2 className="w-4 h-4" />}
          label="Ativos"
          value={stats.active}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Imóveis mais visualizados
          </CardTitle>
          <CardDescription className="text-xs">
            Top 5 anúncios por número de visualizações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!top.length ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Sem visualizações registradas ainda.
            </p>
          ) : (
            top.map((p, i) => (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-4 h-4 grid place-items-center rounded bg-muted text-[10px] font-bold text-muted-foreground shrink-0">
                      {i + 1}
                    </span>
                    <span className="clamp-1 font-medium text-foreground">
                      {p.title}
                    </span>
                  </span>
                  <span className="font-semibold text-foreground shrink-0">
                    {p.views}
                  </span>
                </div>
                <Progress
                  value={maxViews > 0 ? Math.round((p.views / maxViews) * 100) : 0}
                  className="h-1.5"
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="w-7 h-7 rounded-md bg-primary/10 text-primary grid place-items-center mb-2">
        {icon}
      </div>
      <div className="text-xl font-bold leading-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

// ============================================================
// Tab 6: Assinatura
// ============================================================

function PlansTab({
  plans,
  subscription,
}: {
  plans: Plan[];
  subscription: SubscriptionInfo | null;
}) {
  const qc = useQueryClient();
  const subscribeMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erro ao ativar plano.");
      return d;
    },
    onSuccess: () => {
      toast.success("Plano ativado! Pagamento confirmado.");
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const currentPlanCode = subscription?.planCode;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Planos disponíveis</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Escolha o plano que cabe no seu portfólio. Você pode trocar a
          qualquer momento.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {plans.map((p) => {
          const isCurrent = p.code === currentPlanCode && subscription?.active;
          const priceLabel =
            p.billingCycle === "ONCE"
              ? `${formatPrice(p.price)} / ${p.durationDays || 30} dias`
              : `${formatPrice(p.price)} / mês`;
          return (
            <Card
              key={p.id}
              className={cn(
                "relative overflow-hidden",
                isCurrent && "border-primary ring-1 ring-primary/30"
              )}
            >
              {isCurrent && (
                <div className="absolute top-0 right-0">
                  <div className="bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-bl-md">
                    Plano atual
                  </div>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {p.code === PLAN_CODES.START && (
                    <Home className="w-4 h-4 text-primary" />
                  )}
                  {p.code === PLAN_CODES.PRO && (
                    <Building className="w-4 h-4 text-primary" />
                  )}
                  {(p.code === PLAN_CODES.BUSINESS ||
                    p.code === PLAN_CODES.ENTERPRISE) && (
                    <Crown className="w-4 h-4 text-primary" />
                  )}
                  {p.code === PLAN_CODES.OWNER_SINGLE && (
                    <UserRound className="w-4 h-4 text-primary" />
                  )}
                  {p.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {p.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xl font-bold text-foreground">
                    {priceLabel.split(" ")[0]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    {priceLabel.split(" ").slice(1).join(" ")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary" className="font-medium">
                    {p.maxProperties} imóvel(is)
                  </Badge>
                  <span className="text-muted-foreground capitalize">
                    {p.billingCycle === "ONCE" ? "Único" : "Mensal"}
                  </span>
                </div>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Plano ativo
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => subscribeMutation.mutate(p.id)}
                    disabled={subscribeMutation.isPending}
                  >
                    {subscribeMutation.isPending &&
                      subscribeMutation.variables === p.id && (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      )}
                    Assinar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-start gap-2 bg-muted/60 border rounded-lg p-3">
        <CreditCard className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          Pagamento processado de forma simulada para o MVP. Integração com
          gateway de pagamento disponível sob demanda.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Tab 7: Perfil
// ============================================================

function ProfileTab({
  agency,
  user,
  role,
  owner,
  broker,
}: {
  agency: AgencyProfile | null;
  user: { name: string; email: string; phone?: string | null };
  role: string;
  owner: { id: string; verificationStatus: string } | null;
  broker: { id: string; name: string } | null;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary grid place-items-center text-lg font-bold">
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {user.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
            <Badge variant="secondary" className="text-[10px] mt-1">
              {ROLE_LABELS[role] || role}
            </Badge>
          </div>
        </div>
      </div>

      {agency && <AgencyProfileForm agency={agency} />}
      {owner && !agency && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Home className="w-4 h-4 text-primary" />
              Conta de proprietário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Validação</span>
              <Badge
                variant="outline"
                className={
                  owner.verificationStatus === "VERIFIED"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-amber-100 text-amber-700 border-amber-200"
                }
              >
                {owner.verificationStatus === "VERIFIED"
                  ? "Verificada"
                  : "Em análise"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Proprietários podem anunciar um imóvel por vez com o plano Anúncio
              Individual.
            </p>
          </CardContent>
        </Card>
      )}
      {broker && !agency && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <UserRound className="w-4 h-4 text-primary" />
              Corretor
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Conta de corretor vinculada. Anúncios aparecem no mapa e leads são
            recebidos aqui.
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">
          Conta
        </h3>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da conta
        </Button>
      </div>
    </div>
  );
}

function AgencyProfileForm({ agency }: { agency: AgencyProfile }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: agency.name || "",
    cnpj: agency.cnpj || "",
    creci: agency.creci || "",
    responsibleName: agency.responsibleName || "",
    phone: agency.phone || "",
    whatsapp: agency.whatsapp || "",
    email: agency.email || "",
    address: agency.address || "",
    description: agency.description || "",
    website: agency.website || "",
    instagram: agency.instagram || "",
  });

  function set<K extends keyof typeof form>(key: K, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/agencies/${agency.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erro ao salvar perfil.");
      return d;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          Perfil da imobiliária
        </CardTitle>
        <CardDescription className="text-xs">
          Status:{" "}
          <Badge
            variant="outline"
            className={cn(
              "ml-1 text-[10px]",
              agency.status === "APPROVED"
                ? "bg-primary/10 text-primary border-primary/20"
                : agency.status === "PENDING"
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-destructive/10 text-destructive border-destructive/20"
            )}
          >
            {agency.status === "APPROVED"
              ? "Aprovada"
              : agency.status === "PENDING"
              ? "Em análise"
              : "Bloqueada"}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <ProfileField label="Nome" className="col-span-2">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </ProfileField>
          <ProfileField label="CNPJ">
            <Input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} />
          </ProfileField>
          <ProfileField label="CRECI">
            <Input value={form.creci} onChange={(e) => set("creci", e.target.value)} />
          </ProfileField>
          <ProfileField label="Responsável">
            <Input
              value={form.responsibleName}
              onChange={(e) => set("responsibleName", e.target.value)}
            />
          </ProfileField>
          <ProfileField label="Telefone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </ProfileField>
          <ProfileField label="WhatsApp">
            <Input
              value={form.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
            />
          </ProfileField>
          <ProfileField label="E-mail" icon={<Mail className="w-3.5 h-3.5" />}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </ProfileField>
        </div>
        <ProfileField label="Endereço" icon={<MapPin className="w-3.5 h-3.5" />}>
          <Input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </ProfileField>
        <ProfileField label="Descrição">
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Apresentação da imobiliária…"
          />
        </ProfileField>
        <div className="grid grid-cols-2 gap-3">
          <ProfileField label="Website" icon={<Globe className="w-3.5 h-3.5" />}>
            <Input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://…"
            />
          </ProfileField>
          <ProfileField label="Instagram" icon={<Instagram className="w-3.5 h-3.5" />}>
            <Input
              value={form.instagram}
              onChange={(e) => set("instagram", e.target.value)}
              placeholder="@imobiliaria"
            />
          </ProfileField>
        </div>

        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full"
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1.5" />
          )}
          Salvar perfil
        </Button>
      </CardContent>
    </Card>
  );
}

function ProfileField({
  label,
  icon,
  className,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// ============================================================
// Shared
// ============================================================

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-16 h-16 rounded-2xl bg-muted grid place-items-center text-muted-foreground mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-[260px]">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
