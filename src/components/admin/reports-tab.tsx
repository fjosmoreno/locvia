"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Flag,
  Search as SearchIcon,
  CheckCircle2,
  Ban,
  Eye,
  Loader2,
  Mail,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ReportStatusBadge,
  PropertyStatusBadge,
  EmptyState,
  ErrorState,
  ListSkeleton,
  formatDate,
  type ReportAdmin,
} from "@/components/admin/shared";

type StatusFilter = "ALL" | "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "OPEN", label: "Abertas" },
  { value: "REVIEWING", label: "Em análise" },
  { value: "RESOLVED", label: "Resolvidas" },
  { value: "DISMISSED", label: "Dispensadas" },
];

export function ReportsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState<StatusFilter>("OPEN");

  const { data, isLoading, isError, refetch } = useQuery<{ reports: ReportAdmin[] }>({
    queryKey: ["admin", "reports", filter],
    queryFn: async () => {
      const url =
        filter === "ALL"
          ? "/api/admin/reports"
          : `/api/admin/reports?status=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Falha ao carregar denúncias");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: { status: string };
    }) => {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Falha ao atualizar denúncia");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = (r: ReportAdmin, status: string, msg: string) => {
    updateMutation.mutate(
      { id: r.id, body: { status } },
      { onSuccess: () => toast.success(msg) }
    );
  };

  return (
    <div className="flex flex-col">
      {/* Filtros */}
      <div className="p-3 border-b border-border bg-muted/30">
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as StatusFilter)}
        >
          <SelectTrigger className="h-8 w-full sm:w-56 bg-background">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorState
          message="Não foi possível carregar a lista de denúncias."
          onRetry={() => refetch()}
        />
      ) : !data?.reports?.length ? (
        <EmptyState
          icon={<Flag className="w-7 h-7" />}
          title="Nenhuma denúncia encontrada."
          description={
            filter === "OPEN"
              ? "Não há denúncias em aberto no momento."
              : "Não há denúncias com o filtro selecionado."
          }
        />
      ) : (
        <div className="p-3 space-y-3">
          {data.reports.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-border bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0">
                    <Flag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">
                      {r.reason}
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(r.createdAt)}
                    </span>
                  </div>
                </div>
                <ReportStatusBadge status={r.status} />
              </div>

              {r.description && (
                <p className="text-sm text-foreground/80 bg-muted/40 rounded-md p-2.5 border border-border">
                  {r.description}
                </p>
              )}

              {/* Imóvel reportado */}
              {r.property && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Home className="w-3 h-3" />
                  <span>Imóvel:</span>
                  <span className="text-foreground font-medium truncate">
                    {r.property.title}
                  </span>
                  <span className="ml-1">
                    <PropertyStatusBadge status={r.property.status} />
                  </span>
                </div>
              )}

              {/* Reporter */}
              {r.user && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3 h-3" />
                  <span>Reportado por:</span>
                  <span className="text-foreground font-medium">
                    {r.user.name}
                  </span>
                  <span className="text-muted-foreground">({r.user.email})</span>
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-wrap items-center gap-2 pt-2 mt-1 border-t border-border/60">
                {r.status !== "REVIEWING" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setStatus(r, "REVIEWING", "Denúncia marcada em análise.")
                    }
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <SearchIcon className="w-3.5 h-3.5" />
                    )}
                    Em análise
                  </Button>
                )}
                {r.status !== "RESOLVED" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      setStatus(r, "RESOLVED", "Denúncia resolvida.")
                    }
                    disabled={updateMutation.isPending}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
                  </Button>
                )}
                {r.status !== "DISMISSED" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setStatus(r, "DISMISSED", "Denúncia dispensada.")
                    }
                    disabled={updateMutation.isPending}
                  >
                    <Ban className="w-3.5 h-3.5" /> Dispensar
                  </Button>
                )}
                {r.status !== "OPEN" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatus(r, "OPEN", "Denúncia reaberta.")}
                    disabled={updateMutation.isPending}
                  >
                    <Eye className="w-3.5 h-3.5" /> Reabrir
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
