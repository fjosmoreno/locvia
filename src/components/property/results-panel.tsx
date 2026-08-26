"use client";

import { MapPinOff, SearchX, Loader2, RefreshCw, SlidersHorizontal, X } from "lucide-react";
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
  } = useUI();

  const showDetail = panelView === "detail" && (selectedProperty || false);

  if (showDetail) {
    // o detalhe é renderizado pelo PropertyDetail (app-shell)
    return null;
  }

  const count = properties.length;

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card/95 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-foreground">
              {loadingProperties ? "Buscando…" : `${count} ${count === 1 ? "imóvel" : "imóveis"}`}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {filters.purpose
                ? filters.purpose === "RENT"
                  ? "Para alugar"
                  : "Para comprar"
                : "Aluguel e venda"}{" "}
              {filters.radius && userLocation ? `· até ${DISTANCE_OPTIONS.find((d) => d.value === filters.radius)?.label}` : ""}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => openDrawer("filters")}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1" /> Filtros
          </Button>
        </div>
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
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-muted grid place-items-center text-muted-foreground mb-4">
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
