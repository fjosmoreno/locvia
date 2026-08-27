"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Building2,
  Home,
  MessageSquare,
  Flag,
  CreditCard,
  DollarSign,
  Eye,
  UserCheck,
  Heart,
  Trophy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  KpiCard,
  KpiGridSkeleton,
  EmptyState,
  ErrorState,
  PropertyStatusBadge,
  type AdminStats,
} from "@/components/admin/shared";
import { formatPrice } from "@/lib/geo";
import { LEAD_SOURCES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LEAD_SOURCE_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  PHONE: "Telefone",
  INTEREST: "Interesse",
  DIRECTIONS: "Como chegar",
  SHARE: "Compartilhamento",
};

const LEAD_SOURCE_COLORS: Record<string, string> = {
  WHATSAPP: "bg-emerald-400",
  PHONE: "bg-teal-400",
  INTEREST: "bg-amber-400",
  DIRECTIONS: "bg-violet-400",
  SHARE: "bg-zinc-400",
};

export function OverviewTab() {
  const { data, isLoading, isError, refetch } = useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Falha ao carregar estatísticas");
      return res.json();
    },
  });

  if (isLoading) return <KpiGridSkeleton />;
  if (isError || !data)
    return (
      <ErrorState
        message="Não foi possível carregar as estatísticas do painel."
        onRetry={() => refetch()}
      />
    );

  const c = data.counts;
  const top = data.topProperties ?? [];
  const sources = data.leadsBySource ?? {};
  const maxSource = Math.max(1, ...Object.values(sources));
  const sourceEntries = Object.entries(sources).sort((a, b) => b[1] - a[1]);
  const totalLeads = Object.values(sources).reduce((s, n) => s + n, 0);
  const activePct =
    c.properties > 0 ? Math.round((c.activeProperties / c.properties) * 100) : 0;

  return (
    <div className="p-4 space-y-6">
      {/* Header — eyebrow + title */}
      <section className="space-y-3">
        <div>
          <div className="eyebrow text-primary/80">Dashboard</div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground mt-0.5">
            Visão geral da plataforma
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Métricas em tempo real — anunciantes, imóveis, leads e receita.
          </p>
        </div>

        {/* KPI grid — 1 col mobile, 2 sm, 4 lg */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Usuários"
            value={c.users}
            icon={<Users className="w-4 h-4" />}
            hint="total cadastrado"
          />
          <KpiCard
            label="Imobiliárias"
            value={c.agencies}
            icon={<Building2 className="w-4 h-4" />}
            hint={
              c.pendingAgencies > 0
                ? `${c.pendingAgencies} pendente${c.pendingAgencies > 1 ? "s" : ""}`
                : "todas revisadas"
            }
            hintTone={c.pendingAgencies > 0 ? "warn" : "success"}
          />
          <KpiCard
            label="Proprietários"
            value={c.owners}
            icon={<UserCheck className="w-4 h-4" />}
            hint="contas verificadas"
          />
          <KpiCard
            label="Imóveis ativos"
            value={
              <span>
                {c.activeProperties}
                <span className="text-muted-foreground text-base font-medium">
                  {" "}
                  / {c.properties}
                </span>
              </span>
            }
            icon={<Home className="w-4 h-4" />}
            hint={`${activePct}% do catálogo ativo`}
            hintTone={activePct >= 70 ? "success" : "default"}
          />
          <KpiCard
            label="Leads"
            value={c.leads}
            icon={<MessageSquare className="w-4 h-4" />}
            hint="contatos recebidos"
          />
          <KpiCard
            label="Denúncias"
            value={c.openReports}
            icon={<Flag className="w-4 h-4" />}
            hint={`${c.reports} no total`}
            hintTone={c.openReports > 0 ? "warn" : "default"}
          />
          <KpiCard
            label="Assinaturas"
            value={c.subscriptions}
            icon={<CreditCard className="w-4 h-4" />}
            hint="planos ativos"
          />
          <KpiCard
            label="Receita"
            value={formatPrice(c.revenue)}
            icon={<DollarSign className="w-4 h-4" />}
            hint="pagamentos confirmados"
            hintTone="success"
          />
        </div>
      </section>

      {/* Top properties */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow text-primary/80">Ranking</div>
            <h3 className="text-sm font-semibold text-foreground">
              Imóveis mais visualizados
            </h3>
          </div>
          <Trophy className="w-4 h-4 text-amber-400" />
        </div>
        <Card className="shadow-none border-border/60 bg-card/60 backdrop-blur-sm divide-y divide-border/50 overflow-hidden">
          {top.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Eye className="w-7 h-7" />}
                title="Sem dados de visualizações ainda."
                description="Quando usuários visualizarem imóveis, o ranking aparecerá aqui."
              />
            </div>
          ) : (
            top.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors group"
              >
                <RankMedal position={idx + 1} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {p.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Eye className="w-3 h-3" />
                    <span className="tabular-nums">{p.views}</span>
                    <span>visualizações</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-primary price tabular-nums">
                    {formatPrice(p.price, p.purpose)}
                  </div>
                  <div className="mt-1 flex justify-end">
                    <PropertyStatusBadge status={p.status} />
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>
      </section>

      {/* Leads by source */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow text-primary/80">Distribuição</div>
            <h3 className="text-sm font-semibold text-foreground">
              Leads por origem
            </h3>
          </div>
          {totalLeads > 0 && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {totalLeads} total
            </span>
          )}
        </div>
        <Card className="shadow-none border-border/60 bg-card/60 backdrop-blur-sm p-4 space-y-3">
          {sourceEntries.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="w-7 h-7" />}
              title="Ainda não há leads registrados."
              description="Quando alguém entrar em contato via WhatsApp, telefone ou demonstrar interesse, aparecerá aqui."
            />
          ) : (
            sourceEntries.map(([src, count]) => {
              const pct = Math.round((count / maxSource) * 100);
              const sharePct =
                totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
              return (
                <div key={src} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-2">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          LEAD_SOURCE_COLORS[src] ?? "bg-zinc-400"
                        )}
                      />
                      {LEAD_SOURCE_LABELS[src] ?? src}
                    </span>
                    <span className="text-muted-foreground tabular-nums flex items-center gap-2">
                      <span className="font-semibold text-foreground">{count}</span>
                      <span className="text-[10px]">{sharePct}%</span>
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={pct} className="h-1.5" />
                  </div>
                </div>
              );
            })
          )}
          {/* show sources with zero for completeness */}
          {sourceEntries.length > 0 &&
            Object.values(LEAD_SOURCES)
              .filter((s) => !sources[s])
              .map((src) => (
                <div key={src} className="space-y-1.5 opacity-40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-2">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          LEAD_SOURCE_COLORS[src] ?? "bg-zinc-400"
                        )}
                      />
                      {LEAD_SOURCE_LABELS[src] ?? src}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      <span className="font-semibold text-foreground">0</span>
                    </span>
                  </div>
                  <Progress value={0} className="h-1.5" />
                </div>
              ))}
        </Card>
      </section>
    </div>
  );
}

function RankMedal({ position }: { position: number }) {
  const styles =
    position === 1
      ? "bg-amber-500/20 text-amber-300 ring-amber-500/30"
      : position === 2
      ? "bg-zinc-400/20 text-zinc-200 ring-zinc-400/30"
      : position === 3
      ? "bg-orange-600/20 text-orange-300 ring-orange-600/30"
      : "bg-muted text-muted-foreground ring-border/40";
  return (
    <div
      className={cn(
        "w-7 h-7 rounded-lg grid place-items-center text-xs font-bold shrink-0 ring-1 tabular-nums",
        styles
      )}
    >
      {position}
    </div>
  );
}

export function OverviewTabSkeleton() {
  return (
    <div className="p-4 space-y-6">
      <KpiGridSkeleton />
      <Skeleton className="h-40 w-full rounded-xl skeleton-premium" />
      <Skeleton className="h-32 w-full rounded-xl skeleton-premium" />
    </div>
  );
}
