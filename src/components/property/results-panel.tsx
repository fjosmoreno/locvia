"use client";

import { MapPinOff, SearchX, Loader2, RefreshCw, SlidersHorizontal, X, Sparkles, Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property/property-card";
import { useUI } from "@/lib/store";
import { DISTANCE_OPTIONS } from "@/lib/constants";

export function ResultsPanel() {
  const {
    properties,
    loadingProperties,
    propertiesError,
    panelView,
    selectedProperty,
    closeProperty,
    openDrawer,
    filters,
    setFilters,
    userLocation,
    flyTo,
    mapCenter,
    ai,
    route,
    clearAi,
    clearRoute,
  } = useUI();

  const showDetail = panelView === "detail" && (selectedProperty || false);

  if (showDetail) {
    // o detalhe é renderizado pelo PropertyDetail (app-shell)
    return null;
  }

  const count = properties.length;
  const aiActive = ai.highlightSource === "ai" && ai.highlightedIds;
  const routeActive = route.properties.length > 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header — eyebrow + count */}
      <div className="px-4 py-3.5 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="eyebrow">Resultados</div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="text-sm font-semibold text-foreground">
            {loadingProperties && count === 0 ? "Buscando imóveis…" : `${count} ${count === 1 ? "imóvel" : "imóveis"}`}
            {filters.purpose && !aiActive && (
              <span className="text-muted-foreground font-normal ml-1.5">
                · {filters.purpose === "RENT" ? "Aluguel" : "Venda"}
              </span>
            )}
          </div>
        </div>

        {/* Banner: modo IA ativo */}
        {aiActive && (
          <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs text-primary font-medium truncate">
                {ai.highlightedIds!.length} imóveis pela busca do LOCVIA
              </span>
            </div>
            <button
              onClick={clearAi}
              className="text-[11px] text-primary hover:text-primary/80 font-medium shrink-0 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Limpar
            </button>
          </div>
        )}

        {/* Banner: modo rota ativo */}
        {routeActive && (
          <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 min-w-0">
              <RouteIcon className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs text-primary font-medium truncate">
                {route.properties.length} imóveis no seu caminho
              </span>
            </div>
            <button
              onClick={clearRoute}
              className="text-[11px] text-primary hover:text-primary/80 font-medium shrink-0 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Limpar
            </button>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto scroll-area p-3 space-y-3">
        {propertiesError ? (
          <EmptyState
            icon={<SearchX className="w-10 h-10" />}
            title="Não conseguimos carregar os imóveis desta região."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4 mr-1.5" /> Tentar novamente
              </Button>
            }
          />
        ) : loadingProperties && properties.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <PropertyCardSkeleton key={i} />
            ))}
          </div>
        ) : count === 0 ? (
          <EmptyState
            icon={<MapPinOff className="w-10 h-10" />}
            title="Nenhum imóvel encontrado nesta região."
            description="Tente ampliar a área de busca ou ajustar os filtros."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // expande: voa para fora e aumenta raio
                  flyTo(mapCenter.lat, mapCenter.lng, 12);
                  setFilters({ radius: undefined });
                }}
              >
                Expandir área de busca
              </Button>
            }
          />
        ) : (
          <>
            {loadingProperties && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Atualizando…
              </div>
            )}
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-muted grid place-items-center text-muted-foreground/60 mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-[260px] mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
