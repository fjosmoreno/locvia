"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Bell, X, Trash2, Plus, MapPinOff } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUI } from "@/lib/store";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/geo";
import { PROPERTY_TYPE_LABELS, PURPOSE_LABELS } from "@/lib/constants";

export function SavedSearchesDrawer() {
  const { drawer, closeDrawer, filters } = useUI();
  const open = drawer === "saved-searches";
  const { data: session } = useSession();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["saved-searches"],
    enabled: open && !!session,
    queryFn: async () => {
      const res = await fetch("/api/saved-searches");
      if (!res.ok) return [];
      const d = await res.json();
      return d.searches || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = buildSearchName(filters);
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, filters }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Busca salva! Você será avisado de novos imóveis.");
      qc.invalidateQueries({ queryKey: ["saved-searches"] });
    },
    onError: () => toast.error("Não foi possível salvar a busca."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-searches"] });
      toast.success("Alerta removido.");
    },
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-4 border-b border-border flex-row items-center justify-between space-y-0">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> Alertas de imóveis
          </SheetTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeDrawer}>
            <X className="w-4 h-4" />
          </Button>
        </SheetHeader>

        {/* Salvar busca atual */}
        {session && (
          <div className="p-3 border-b border-border">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full"
              size="sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Salvar busca atual como alerta
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              Você será avisado quando novos imóveis corresponderem.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto scroll-area p-3 space-y-3">
          {!session ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-muted grid place-items-center text-muted-foreground/60 mb-4">
                <Bell className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Faça login para criar alertas</h3>
              <p className="text-xs text-muted-foreground">Receba notificações de novos imóveis que correspondam aos seus critérios.</p>
            </div>
          ) : isLoading ? (
            <div className="text-center text-xs text-muted-foreground py-8">Carregando alertas…</div>
          ) : !data?.length ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-muted grid place-items-center text-muted-foreground/60 mb-4">
                <MapPinOff className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Nenhum alerta ainda</h3>
              <p className="text-xs text-muted-foreground">Salve uma busca para ser avisado de novos imóveis.</p>
            </div>
          ) : (
            data.map((s: any) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {formatRelativeTime(s.createdAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(s.id)}
                    className="shrink-0 w-7 h-7 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label="Remover alerta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {s.matchCount > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {s.matchCount} imóveis
                    </Badge>
                  )}
                  {s.newMatches > 0 && (
                    <Badge className="text-[10px] bg-primary text-primary-foreground">
                      {s.newMatches} novos
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function buildSearchName(filters: any): string {
  const parts: string[] = [];
  if (filters.purpose) parts.push(PURPOSE_LABELS[filters.purpose] || filters.purpose);
  if (filters.propertyTypes?.length)
    parts.push(filters.propertyTypes.map((t: string) => PROPERTY_TYPE_LABELS[t] || t).join("/"));
  if (filters.search) parts.push(filters.search);
  if (filters.maxPrice) parts.push(`até R$ ${filters.maxPrice}`);
  if (filters.bedrooms) parts.push(`${filters.bedrooms}+ quartos`);
  return parts.length ? parts.join(" · ") : "Busca geral";
}
