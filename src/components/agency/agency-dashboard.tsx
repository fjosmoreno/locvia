"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  CalendarDays,
  Lock,
  Sparkles,
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

const ROLE_AVATAR_COLOR: Record<string, string> = {
  USER: "from-zinc-500/20 to-zinc-600/20 text-zinc-300 ring-zinc-500/30",
  OWNER: "from-teal-500/20 to-teal-600/20 text-teal-300 ring-teal-500/30",
  BROKER: "from-cyan-500/20 to-cyan-600/20 text-cyan-300 ring-cyan-500/30",
  AGENCY: "from-emerald-500/20 to-emerald-600/20 text-emerald-300 ring-emerald-500/30",
  ADMIN: "from-primary/25 to-primary/10 text-primary ring-primary/40",
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

/**
 * Abas que exigem plano pago ativo.
 * Usuário sem subscription vê o conteúdo bloqueado (placeholder com CTA)
 * e só consegue interagir com overview/plans/profile.
 */
const LOCKED_TABS: ReadonlySet<TabValue> = new Set([
  "properties",
  "form",
  "leads",
  "stats",
]);

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
  const isAgencyPending =
    role === ROLES.AGENCY && agency && agency.status !== "APPROVED";

  // Gate: ADMIN sempre tem acesso total. Demais anunciantes precisam de plano ativo.
  const isAdmin = role === ROLES.ADMIN;
  const hasActivePlan = isAdmin || !!subscription?.active;

  /**
   * Se o usuário tentar abrir uma aba bloqueada, redireciona pra aba de
   * planos com uma flag pra mostrar um toast explicativo.
   */
  function handleTabChange(v: string) {
    const next = v as TabValue;
    if (LOCKED_TABS.has(next) && !hasActivePlan) {
      toast.info("Assine um plano para desbloquear essa funcionalidade.", {
        description: "Você pode escolher entre Start, Pro, Business ou Enterprise.",
      });
      setTab("plans");
      return;
    }
    setTab(next);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col border-l-border/60 bg-background"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-4 border-b border-border/60 flex-row items-center justify-between space-y-0 relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent"
          />
          <div className="flex items-center gap-3 min-w-0 relative">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0 ring-1 ring-primary/25 shadow-sm shadow-primary/10">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base leading-tight tracking-tight truncate">
                Painel do anunciante
              </SheetTitle>
              <SheetDescription className="text-xs">
                {session?.user ? (
                  <span className="flex items-center gap-1.5 mt-0.5">
                    <span className="truncate max-w-[160px]">
                      {session.user.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-4 px-1.5 font-medium"
                    >
                      {ROLE_LABELS[role] || role}
                    </Badge>
                  </span>
                ) : (
                  "LOCVIA"
                )}
              </SheetDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 relative rounded-lg hover:bg-muted"
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
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">
                  Carregando painel…
                </span>
              </div>
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
            <ErrorStateInline
              message="Não foi possível carregar seus dados."
              onRetry={() => meQuery.refetch()}
            />
          ) : (
            <Tabs
              value={tab}
              onValueChange={handleTabChange}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="border-b border-border/60 bg-background/95 backdrop-blur-md sticky top-0 z-10">
                <ScrollArea className="w-full">
                  <TabsList className="bg-transparent h-auto p-0 gap-0 flex w-max rounded-none">
                    {TABS.map((t) => {
                      const Icon = t.icon;
                      const locked = !hasActivePlan && LOCKED_TABS.has(t.value);
                      return (
                        <TabsTrigger
                          key={t.value}
                          value={t.value}
                          className={cn(
                            "flex-none gap-1.5 h-11 px-3.5 text-xs font-medium rounded-none border-b-2 border-transparent transition-colors",
                            "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none",
                            locked
                              ? "text-muted-foreground/60 cursor-pointer hover:text-foreground/80"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {t.label}
                          {locked && (
                            <Lock
                              className="w-3 h-3 ml-0.5 text-amber-400/80"
                              strokeWidth={2.4}
                              aria-label="Requer plano"
                            />
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </ScrollArea>
              </div>

              <div className="flex-1 overflow-y-auto scroll-area">
                <TabsContent value="overview" className="p-4 m-0 mt-0 animate-fade-in">
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

                {hasActivePlan ? (
                  <TabsContent value="properties" className="p-4 m-0 animate-fade-in">
                    <PropertiesTabContent
                      properties={meQuery.data!.properties}
                      onCreate={handleCreateNew}
                      onEdit={handleEdit}
                      editLoading={editLoading}
                    />
                  </TabsContent>
                ) : (
                  <TabsContent value="properties" className="p-4 m-0 animate-fade-in">
                    <LockedTabContent
                      title="Meus imóveis"
                      description="Gerencie e edite os imóveis que você já publicou no mapa."
                      onSubscribe={() => setTab("plans")}
                    />
                  </TabsContent>
                )}

                {hasActivePlan ? (
                  <TabsContent value="form" className="p-4 m-0 animate-fade-in">
                    <div className="mb-3">
                      <div className="eyebrow text-primary/80">Formulário</div>
                      <h2 className="text-base font-semibold tracking-tight">
                        {editProperty ? "Editar imóvel" : "Cadastrar imóvel"}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
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
                ) : (
                  <TabsContent value="form" className="p-4 m-0 animate-fade-in">
                    <LockedTabContent
                      title="Cadastrar imóvel"
                      description="Publique um novo imóvel no mapa com fotos, vídeo e descrição completa."
                      onSubscribe={() => setTab("plans")}
                    />
                  </TabsContent>
                )}

                {hasActivePlan ? (
                  <TabsContent value="leads" className="p-4 m-0 animate-fade-in">
                    <LeadsTab />
                  </TabsContent>
                ) : (
                  <TabsContent value="leads" className="p-4 m-0 animate-fade-in">
                    <LockedTabContent
                      title="Leads"
                      description="Veja os contatos e interesses recebidos dos seus imóveis anunciados."
                      onSubscribe={() => setTab("plans")}
                    />
                  </TabsContent>
                )}

                {hasActivePlan ? (
                  <TabsContent value="stats" className="p-4 m-0 animate-fade-in">
                    <StatsTab
                      properties={meQuery.data!.properties}
                      stats={meQuery.data!.stats}
                    />
                  </TabsContent>
                ) : (
                  <TabsContent value="stats" className="p-4 m-0 animate-fade-in">
                    <LockedTabContent
                      title="Estatísticas"
                      description="Acompanhe visualizações, favoritos e o desempenho dos seus anúncios."
                      onSubscribe={() => setTab("plans")}
                    />
                  </TabsContent>
                )}

                <TabsContent value="plans" className="p-4 m-0 animate-fade-in">
                  <PlansTabContent
                    plans={plansQuery.data?.plans ?? []}
                    subscription={subscription}
                  />
                </TabsContent>

                <TabsContent value="profile" className="p-4 m-0 animate-fade-in">
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

/**
 * Placeholder mostrado em abas que exigem plano pago (meus imóveis, cadastrar,
 * leads, estatísticas) quando o anunciante não tem subscription ativa.
 *
 * Visualmente discreto mas claro: ícone de cadeado, label da feature bloqueada,
 * descrição e CTA grande "Assinar plano agora" que muda pra aba de planos.
 */
function LockedTabContent({
  title,
  description,
  onSubscribe,
}: {
  title: string;
  description: string;
  onSubscribe: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 animate-fade-in">
      <div className="relative mb-5">
        <div
          aria-hidden
          className="absolute inset-0 bg-amber-500/15 blur-2xl rounded-full"
        />
        <div className="relative w-16 h-16 rounded-2xl bg-card border border-amber-500/30 grid place-items-center text-amber-300 shadow-sm shadow-amber-500/10">
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground grid place-items-center ring-2 ring-background">
            <Lock className="w-3 h-3" strokeWidth={2.6} />
          </div>
          <Sparkles className="w-6 h-6" strokeWidth={1.8} />
        </div>
      </div>

      <div className="eyebrow text-amber-300/80 mb-1.5">Conteúdo bloqueado</div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="text-xs text-muted-foreground mt-2 max-w-sm leading-relaxed">
        {description}
      </p>
      <p className="text-xs text-muted-foreground mt-3 max-w-sm leading-relaxed">
        Assine um dos planos pagos para liberar essa e outras funcionalidades
        do painel.
      </p>

      <Button
        onClick={onSubscribe}
        size="sm"
        className="mt-5 shadow-sm shadow-primary/20"
      >
        <Crown className="w-3.5 h-3.5 mr-1.5" />
        Assinar plano agora
      </Button>
    </div>
  );
}

function NotLoggedIn({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex-1 grid place-items-center px-6">
      <div className="text-center max-w-xs animate-fade-in">
        <div className="relative mb-5">
          <div
            aria-hidden
            className="absolute inset-0 bg-primary/15 blur-2xl rounded-full"
          />
          <div className="relative w-16 h-16 rounded-2xl bg-card border border-border/60 grid place-items-center text-primary shadow-sm mx-auto">
            <UserRound className="w-7 h-7" />
          </div>
        </div>
        <h3 className="text-sm font-semibold mb-1.5 tracking-tight">
          Faça login para acessar o painel.
        </h3>
        <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
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
      <div className="text-center max-w-xs animate-fade-in">
        <div className="relative mb-5">
          <div
            aria-hidden
            className="absolute inset-0 bg-amber-500/15 blur-2xl rounded-full"
          />
          <div className="relative w-16 h-16 rounded-2xl bg-card border border-amber-500/30 grid place-items-center text-amber-400 shadow-sm mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
        </div>
        <h3 className="text-sm font-semibold mb-1.5 tracking-tight">
          Esta área é para anunciantes.
        </h3>
        <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
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
          <Skeleton key={i} className="h-24 rounded-xl skeleton-premium" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-xl skeleton-premium" />
      <Skeleton className="h-64 rounded-xl skeleton-premium" />
    </div>
  );
}

function ErrorStateInline({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex-1 grid place-items-center px-6">
      <div className="text-center max-w-xs animate-fade-in">
        <div className="relative mb-5">
          <div
            aria-hidden
            className="absolute inset-0 bg-rose-500/15 blur-2xl rounded-full"
          />
          <div className="relative w-16 h-16 rounded-2xl bg-card border border-rose-500/30 grid place-items-center text-rose-400 shadow-sm mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
        </div>
        <h3 className="text-sm font-semibold mb-1.5 tracking-tight">{message}</h3>
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
  const remaining = Math.max(0, max - current);

  return (
    <div className="space-y-4">
      {isAgencyPending && (
        <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-300 grid place-items-center shrink-0 ring-1 ring-amber-500/25">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-300">
              Sua imobiliária está em análise.
            </p>
            <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
              Você poderá publicar imóveis após a aprovação do nosso time.
            </p>
          </div>
        </div>
      )}

      {/* Section header */}
      <div>
        <div className="eyebrow text-primary/80">Dashboard</div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground mt-0.5">
          Olá, aqui está sua visão geral
        </h2>
      </div>

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
        <Card className="border-primary/30 bg-primary/8 shadow-none">
          <CardContent className="p-4 flex flex-col items-start gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary grid place-items-center ring-1 ring-primary/25">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <div className="eyebrow text-primary/80">Assinatura</div>
                <span className="text-sm font-semibold tracking-tight block">
                  Escolha um plano para começar a anunciar
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sem plano ativo você não pode publicar imóveis no mapa. Escolha um
              plano que cabe no seu portfólio.
            </p>
            <Button onClick={onUpgrade} size="sm" className="shadow-sm shadow-primary/20">
              Ver planos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-none border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2 tracking-tight">
                <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary grid place-items-center ring-1 ring-primary/25">
                  <Crown className="w-3.5 h-3.5" />
                </div>
                Plano atual
              </CardTitle>
              {currentPlan && (
                <Badge className="bg-primary/15 text-primary border-primary/30">
                  {currentPlan.name}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              {currentPlan?.description || "Assinatura ativa"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground eyebrow !text-[10px]">
                Imóveis ativos
              </span>
              <span className="font-semibold price tabular-nums">
                {current}{" "}
                <span className="text-muted-foreground font-normal">/ {max}</span>
              </span>
            </div>
            <Progress value={pct} className="h-2" />
            <div className="flex items-center justify-between pt-1 gap-2">
              <span
                className={cn(
                  "text-[11px] font-medium flex items-center gap-1.5",
                  pct >= 100 ? "text-amber-400" : "text-emerald-400"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    pct >= 100 ? "bg-amber-400" : "bg-emerald-400"
                  )}
                />
                {pct >= 100
                  ? "Limite atingido — faça upgrade para publicar mais."
                  : `${remaining} imóvel(is) disponível(is) no plano.`}
              </span>
              <Button onClick={onUpgrade} variant="outline" size="sm" className="shrink-0">
                Fazer upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {totalProperties === 0 && (
        <Card className="border-dashed border-border/60 bg-card/40 shadow-none">
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 bg-primary/10 blur-2xl rounded-full"
              />
              <div className="relative w-14 h-14 rounded-2xl bg-card border border-border/60 grid place-items-center text-muted-foreground shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">
                Nenhum imóvel cadastrado
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Cadastre seu primeiro imóvel para aparecer no mapa.
              </p>
            </div>
            <Button onClick={onCreate} size="sm" className="mt-1 shadow-sm shadow-primary/20">
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
          "w-8 h-8 rounded-lg grid place-items-center mb-2 ring-1 transition-colors",
          tone === "primary"
            ? "bg-primary/15 text-primary ring-primary/25 shadow-sm shadow-primary/10"
            : "bg-muted text-muted-foreground ring-border/40 group-hover:bg-primary/10 group-hover:text-primary"
        )}
      >
        {icon}
      </div>
      <div className="text-[1.65rem] font-semibold leading-none tracking-tight text-foreground price tabular-nums">
        {value}
      </div>
      <div className="eyebrow !text-[10px] mt-1.5 text-muted-foreground/80">
        {label}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group text-left rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-3 transition-all duration-200 hover:border-primary/40 hover:bg-card hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5 cursor-pointer"
      >
        {content}
      </button>
    );
  }
  return (
    <div className="group rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-3 transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-md hover:shadow-primary/5">
      {content}
    </div>
  );
}

// ============================================================
// Tab 2: Meus imóveis
// ============================================================

function PropertiesTabContent({
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
      <EmptyStateInline
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
        <div>
          <div className="eyebrow text-primary/80">Portfólio</div>
          <h2 className="text-sm font-semibold tracking-tight">
            {properties.length} imóvel(is)
          </h2>
        </div>
        <Button onClick={onCreate} size="sm" className="shadow-sm shadow-primary/20">
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Novo
        </Button>
      </div>

      {editLoading && (
        <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 flex items-center gap-2 border border-border/60">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
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
    <div className="group flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-md hover:shadow-primary/5">
      {/* Thumb */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0 ring-1 ring-border/40 relative">
        {property.primaryImage ? (
          <img
            src={property.primaryImage}
            alt={property.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
          <p className="text-sm font-medium text-foreground clamp-1 tracking-tight">
            {property.title}
          </p>
          <StatusBadge status={status} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
            {property.neighborhood ? ` · ${property.neighborhood}` : ""}
            {property.city ? ` · ${property.city}` : ""}
          </span>
        </p>
        <p className="text-sm font-bold text-primary mt-1 price tabular-nums">
          {formatPrice(property.price, property.purpose)}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 tabular-nums">
            <Eye className="w-3 h-3" /> {property.views}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <MessageSquare className="w-3 h-3" /> {property.leadsCount}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <Heart className="w-3 h-3" /> {property.favoritesCount}
          </span>
          <span className="text-[10px] text-muted-foreground/70">
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
            className="h-8 w-8 shrink-0 rounded-lg hover:bg-muted"
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
    ACTIVE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    PAUSED: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25",
    PENDING_APPROVAL: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    RENTED: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    SOLD: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    EXPIRED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    REJECTED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    DRAFT: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25",
  };
  const dot: Record<string, string> = {
    ACTIVE: "bg-emerald-400",
    PAUSED: "bg-zinc-400",
    PENDING_APPROVAL: "bg-amber-400",
    RENTED: "bg-teal-400",
    SOLD: "bg-teal-400",
    EXPIRED: "bg-zinc-500",
    REJECTED: "bg-rose-400",
    DRAFT: "bg-zinc-400",
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] h-5 px-1.5 font-medium shrink-0 gap-1.5",
        tone[status] || "bg-muted text-muted-foreground border-border"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", dot[status] || "bg-zinc-400")} />
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
          <Skeleton key={i} className="h-16 rounded-xl skeleton-premium" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <ErrorStateInline
        message="Não foi possível carregar os leads."
        onRetry={() => refetch()}
      />
    );
  }
  if (!data?.leads.length) {
    return (
      <EmptyStateInline
        icon={<MessageSquare className="w-9 h-9" />}
        title="Nenhum lead ainda."
        description="Quando alguém entrar em contato via WhatsApp, telefone ou demonstrar interesse em um imóvel seu, aparecerá aqui."
      />
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="eyebrow text-primary/80">Inbox</div>
          <h2 className="text-sm font-semibold tracking-tight">
            {data.total} lead(s)
          </h2>
        </div>
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
  { label: string; icon: React.ReactNode; tone: string; dot: string }
> = {
  WHATSAPP: {
    label: "WhatsApp",
    icon: <MessageCircle className="w-3 h-3" />,
    tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  PHONE: {
    label: "Telefone",
    icon: <Phone className="w-3 h-3" />,
    tone: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    dot: "bg-teal-400",
  },
  INTEREST: {
    label: "Interesse",
    icon: <Heart className="w-3 h-3" />,
    tone: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
  },
  DIRECTIONS: {
    label: "Como chegar",
    icon: <Navigation className="w-3 h-3" />,
    tone: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    dot: "bg-violet-400",
  },
  SHARE: {
    label: "Compartilhamento",
    icon: <Share2 className="w-3 h-3" />,
    tone: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25",
    dot: "bg-zinc-400",
  },
};

function LeadRow({ lead }: { lead: LeadItem }) {
  const meta = LEAD_SOURCE_META[lead.source] || {
    label: lead.source,
    icon: <MessageSquare className="w-3 h-3" />,
    tone: "bg-muted text-muted-foreground border-border",
    dot: "bg-zinc-400",
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-3 transition-all duration-200 hover:bg-card hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {lead.property && (
            <p className="text-sm font-medium text-foreground clamp-1 tracking-tight">
              {lead.property.title}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground mt-0.5 price tabular-nums">
            {lead.property
              ? `${formatPrice(lead.property.price, lead.property.purpose)}`
              : "Imóvel removido"}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] h-5 px-1.5 font-medium shrink-0 gap-1.5",
            meta.tone
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
          {meta.icon}
          {meta.label}
        </Badge>
      </div>

      {lead.message && (
        <p className="text-xs text-foreground/80 mt-2 bg-muted/40 rounded-md p-2 border border-border/40 leading-relaxed italic">
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
        <span className="flex items-center gap-1">
          <CalendarDays className="w-3 h-3" />
          {formatRelativeTime(lead.createdAt)}
        </span>
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
      <div>
        <div className="eyebrow text-primary/80">Performance</div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground mt-0.5">
          Estatísticas
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Acompanhe o engajamento dos seus anúncios.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat
          icon={<Eye className="w-4 h-4" />}
          label="Visualizações"
          value={stats.views}
          tone="primary"
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

      <Card className="shadow-none border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 tracking-tight">
            <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary grid place-items-center ring-1 ring-primary/25">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
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
              <div key={p.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "w-5 h-5 grid place-items-center rounded text-[10px] font-bold shrink-0 ring-1 tabular-nums",
                        i === 0
                          ? "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                          : i === 1
                          ? "bg-zinc-400/20 text-zinc-200 ring-zinc-400/30"
                          : i === 2
                          ? "bg-orange-600/20 text-orange-300 ring-orange-600/30"
                          : "bg-muted text-muted-foreground ring-border/40"
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="clamp-1 font-medium text-foreground">
                      {p.title}
                    </span>
                  </span>
                  <span className="font-semibold text-foreground shrink-0 tabular-nums">
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
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "primary";
}) {
  return (
    <div className="group rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-3 transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-md hover:shadow-primary/5">
      <div
        className={cn(
          "w-8 h-8 rounded-lg grid place-items-center mb-2 ring-1 transition-colors",
          tone === "primary"
            ? "bg-primary/15 text-primary ring-primary/25"
            : "bg-muted text-muted-foreground ring-border/40 group-hover:bg-primary/10 group-hover:text-primary"
        )}
      >
        {icon}
      </div>
      <div className="text-[1.65rem] font-semibold leading-none tracking-tight price tabular-nums">
        {value}
      </div>
      <div className="eyebrow !text-[10px] mt-1.5 text-muted-foreground/80">
        {label}
      </div>
    </div>
  );
}

// ============================================================
// Tab 6: Assinatura
// ============================================================

function PlansTabContent({
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
        <div className="eyebrow text-primary/80">Assinatura</div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground mt-0.5">
          Planos disponíveis
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
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
          const [price, ...cycleParts] = priceLabel.split(" ");
          return (
            <Card
              key={p.id}
              className={cn(
                "relative overflow-hidden shadow-none border-border/60 bg-card/60 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5",
                isCurrent
                  ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                  : "hover:border-primary/40"
              )}
            >
              {isCurrent && (
                <div className="absolute top-0 right-0 z-10">
                  <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-bl-lg shadow-sm">
                    PLANO ATUAL
                  </div>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 tracking-tight">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg grid place-items-center ring-1",
                      isCurrent
                        ? "bg-primary/15 text-primary ring-primary/25"
                        : "bg-primary/10 text-primary ring-primary/20"
                    )}
                  >
                    {p.code === PLAN_CODES.START && <Home className="w-4 h-4" />}
                    {p.code === PLAN_CODES.PRO && <Building className="w-4 h-4" />}
                    {(p.code === PLAN_CODES.BUSINESS ||
                      p.code === PLAN_CODES.ENTERPRISE) && (
                      <Crown className="w-4 h-4" />
                    )}
                    {p.code === PLAN_CODES.OWNER_SINGLE && (
                      <UserRound className="w-4 h-4" />
                    )}
                  </div>
                  {p.name}
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {p.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground price tabular-nums tracking-tight">
                    {price}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {cycleParts.join(" ")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge
                    variant="outline"
                    className="font-medium bg-primary/10 text-primary border-primary/20"
                  >
                    {p.maxProperties} imóvel(is)
                  </Badge>
                  <span className="text-muted-foreground capitalize">
                    {p.billingCycle === "ONCE" ? "Pagamento único" : "Mensal"}
                  </span>
                </div>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Plano ativo
                  </Button>
                ) : (
                  <Button
                    className="w-full shadow-sm shadow-primary/20"
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

      <div className="flex items-start gap-2.5 bg-muted/40 border border-border/60 rounded-xl p-3.5">
        <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0 ring-1 ring-primary/25">
          <CreditCard className="w-3.5 h-3.5" />
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
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
      <div>
        <div className="eyebrow text-primary/80">Conta</div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground mt-0.5">
          Perfil
        </h2>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-14 h-14 rounded-full grid place-items-center text-xl font-bold shrink-0 ring-1 bg-gradient-to-br",
              ROLE_AVATAR_COLOR[role] ?? ROLE_AVATAR_COLOR.USER
            )}
          >
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate tracking-tight">
              {user.name}
            </p>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <Mail className="w-3 h-3" />
              {user.email}
            </p>
            <Badge variant="secondary" className="text-[10px] mt-1.5 font-medium">
              {ROLE_LABELS[role] || role}
            </Badge>
          </div>
        </div>
      </div>

      {agency && <AgencyProfileForm agency={agency} />}
      {owner && !agency && (
        <Card className="shadow-none border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 tracking-tight">
              <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary grid place-items-center ring-1 ring-primary/25">
                <Home className="w-3.5 h-3.5" />
              </div>
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
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }
              >
                {owner.verificationStatus === "VERIFIED"
                  ? "Verificada"
                  : "Em análise"}
              </Badge>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Proprietários podem anunciar um imóvel por vez com o plano Anúncio
              Individual.
            </p>
          </CardContent>
        </Card>
      )}
      {broker && !agency && (
        <Card className="shadow-none border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 tracking-tight">
              <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary grid place-items-center ring-1 ring-primary/25">
                <UserRound className="w-3.5 h-3.5" />
              </div>
              Corretor
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Conta de corretor vinculada. Anúncios aparecem no mapa e leads são
            recebidos aqui.
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="space-y-2">
        <h3 className="eyebrow text-muted-foreground/80">Conta</h3>
        <Button
          variant="outline"
          className="w-full justify-start hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
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
    <Card className="shadow-none border-border/60 bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 tracking-tight">
          <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary grid place-items-center ring-1 ring-primary/25">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          Perfil da imobiliária
        </CardTitle>
        <CardDescription className="text-xs flex items-center gap-2">
          <span>Status:</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-medium",
              agency.status === "APPROVED"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : agency.status === "PENDING"
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-rose-500/15 text-rose-300 border-rose-500/30"
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
          className="w-full shadow-sm shadow-primary/20"
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
      <Label className="eyebrow !text-[10px] text-muted-foreground/80 flex items-center gap-1">
        {icon}
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

// ============================================================
// Shared
// ============================================================

function EmptyStateInline({
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
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 animate-fade-in">
      <div className="relative mb-5">
        <div
          aria-hidden
          className="absolute inset-0 bg-primary/15 blur-2xl rounded-full"
        />
        <div className="relative w-16 h-16 rounded-2xl bg-card border border-border/60 grid place-items-center text-muted-foreground shadow-sm">
          {icon}
        </div>
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1.5 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mt-4 shadow-sm shadow-primary/20">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
