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
  TrendingUp,
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

const LEAD_SOURCE_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  PHONE: "Telefone",
  INTEREST: "Interesse",
  DIRECTIONS: "Como chegar",
  SHARE: "Compartilhamento",
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

  return (
    <div className="p-4 space-y-6">
      {/* KPI grid */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Visão geral
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard
            label="Usuários"
            value={c.users}
            icon={<Users className="w-4 h-4" />}
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
          />
          <KpiCard
            label="Imóveis ativos"
            value={`${c.activeProperties}/${c.properties}`}
            icon={<Home className="w-4 h-4" />}
            hint={`${c.properties - c.activeProperties} não ativos`}
          />
          <KpiCard
            label="Leads"
            value={c.leads}
            icon={<MessageSquare className="w-4 h-4" />}
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
          />
          <KpiCard
            label="Receita"
            value={formatPrice(c.revenue)}
            icon={<DollarSign className="w-4 h-4" />}
            hint="pagamentos confirmados"
          />
          <KpiCard
            label="Favoritos"
            value={c.favorites}
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>
      </section>

      {/* Top properties */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Imóveis mais visualizados
          </h2>
        </div>
        <Card className="shadow-none divide-y divide-border">
          {top.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Eye className="w-7 h-7" />}
                title="Sem dados de visualizações ainda."
              />
            </div>
          ) : (
            top.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="w-6 text-center text-xs font-bold text-muted-foreground">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {p.title}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Eye className="w-3 h-3" />
                    {p.views} visualizações
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-primary">
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
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Leads por origem
          </h2>
        </div>
        <Card className="shadow-none p-4 space-y-3">
          {sourceEntries.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="w-7 h-7" />}
              title="Ainda não há leads registrados."
            />
          ) : (
            sourceEntries.map(([src, count]) => {
              const pct = Math.round((count / maxSource) * 100);
              return (
                <div key={src} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {LEAD_SOURCE_LABELS[src] ?? src}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {count}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })
          )}
          {/* show sources with zero for completeness */}
          {sourceEntries.length > 0 &&
            Object.values(LEAD_SOURCES)
              .filter((s) => !sources[s])
              .map((src) => (
                <div key={src} className="space-y-1 opacity-50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {LEAD_SOURCE_LABELS[src] ?? src}
                    </span>
                    <span className="text-muted-foreground tabular-nums">0</span>
                  </div>
                  <Progress value={0} className="h-1.5" />
                </div>
              ))}
        </Card>
      </section>
    </div>
  );
}

export function OverviewTabSkeleton() {
  return (
    <div className="p-4 space-y-6">
      <KpiGridSkeleton />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
