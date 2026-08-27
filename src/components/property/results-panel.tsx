"use client";

import { useMemo } from "react";
import {
  MapPinOff,
  SearchX,
  Loader2,
  RefreshCw,
  X,
  Sparkles,
  Route as RouteIcon,
  SlidersHorizontal,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property/property-card";
import { useUI } from "@/lib/store";
import { PROPERTY_TYPE_LABELS, PURPOSE_LABELS } from "@/lib/constants";
import type { Filters } from "@/lib/types";
import { formatPrice } from "@/lib/geo";

export function ResultsPanel() {
  const {
    properties,
    loadingProperties,
    propertiesError,
    panelView,
    selectedProperty,
    filters,
    setFilters,
    resetFilters,
    mapCenter,
    flyTo,
    ai,
    route,
    clearAi,
    clearRoute,
    openDrawer,
  } = useUI();

  const showDetail = panelView === "detail" && (selectedProperty || false);

  // Constrói lista de chips removíveis a partir dos filtros ativos
  const filterChips = useMemo(() => buildFilterChips(filters), [filters]);
  const hasActiveFilters = filterChips.length > 0;

  // Highlighted ids (IA / Route mode) — Set para lookup O(1)
  const highlightedIds = useMemo(() => {
    if (!ai.highlightedIds && route.properties.length === 0) return null;
    const ids = new Set<string>();
    if (ai.highlightSource === "ai" && ai.highlightedIds) {
      ai.highlightedIds.forEach((id) => ids.add(id));
    }
    if (route.properties.length) {
      route.properties.forEach((p) => ids.add(p.id));
    }
    return ids.size ? ids : null;
  }, [ai.highlightedIds, ai.highlightSource, route.properties]);

  if (showDetail) return null;

  const count = properties.length;
  const aiActive = ai.highlightSource === "ai" && ai.highlightedIds;
  const routeActive = route.properties.length > 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header — eyebrow + count + filtros ativos */}
      <div className="px-4 pt-3.5 pb-3 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="eyebrow flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-primary inline-block" />
              Resultados
            </div>
            <div className="text-[15px] font-semibold text-foreground mt-0.5 leading-tight">
              {loadingProperties && count === 0 ? (
                <span className="text-muted-foreground">Buscando imóveis…</span>
              ) : (
                <span
                  key={count}
                  className="count-anim"
                >
                  <span className="tabular-nums">{count}</span>
                  <span className="text-muted-foreground font-normal">
                    {count === 1 ? " imóvel" : " imóveis"}
                  </span>
                  {filters.purpose && !aiActive && (
                    <span className="text-muted-foreground font-normal ml-1">
                      · {filters.purpose === "RENT" ? "Aluguel" : "Venda"}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Botão filtros (topo direito do header) */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => openDrawer("filters")}
            aria-label="Abrir filtros avançados"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="text-[12px] font-medium hidden sm:inline">Filtros</span>
          </Button>
        </div>

        {/* Filtros ativos como chips removíveis */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {filterChips.map((chip) => (
              <span key={chip.key} className="chip-removable">
                <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                  {chip.label}:
                </span>
                <span className="text-foreground">{chip.value}</span>
                <button
                  onClick={() => chip.clear(setFilters, resetFilters)}
                  aria-label={`Remover filtro ${chip.label}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            {filterChips.length > 1 && (
              <button
                onClick={() => resetFilters()}
                className="text-[11px] text-muted-foreground hover:text-foreground font-medium px-2 py-1 transition-colors"
              >
                Limpar tudo
              </button>
            )}
          </div>
        )}

        {/* Banner: modo IA ativo */}
        {aiActive && (
          <div className="ai-route-banner mt-3 animate-scale-in">
            <div className="flex items-center gap-2 min-w-0">
              <div className="icon-wrap">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-primary/80 leading-none">
                  Busca IA LOCVIA
                </div>
                <div className="text-[12px] text-foreground font-medium truncate mt-0.5">
                  {ai.highlightedIds!.length} imóveis encontrados
                </div>
              </div>
            </div>
            <button onClick={clearAi} className="clear-btn" aria-label="Limpar busca IA">
              <X className="w-2.5 h-2.5" /> Limpar
            </button>
          </div>
        )}

        {/* Banner: modo rota ativo */}
        {routeActive && (
          <div className="ai-route-banner mt-3 animate-scale-in">
            <div className="flex items-center gap-2 min-w-0">
              <div className="icon-wrap">
                <RouteIcon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-primary/80 leading-none">
                  Imóveis no caminho
                </div>
                <div className="text-[12px] text-foreground font-medium truncate mt-0.5">
                  {route.properties.length} imóveis ao longo da sua rota
                </div>
              </div>
            </div>
            <button onClick={clearRoute} className="clear-btn" aria-label="Limpar rota">
              <X className="w-2.5 h-2.5" /> Limpar
            </button>
          </div>
        )}
      </div>

      {/* Lista — scroll suave */}
      <div className="flex-1 overflow-y-auto results-list p-3 space-y-3">
        {propertiesError ? (
          <EmptyState
            icon={<SearchX className="w-9 h-9" strokeWidth={1.5} />}
            eyebrow="Algo deu errado"
            title="Não conseguimos carregar os imóveis desta região."
            description="Verifique sua conexão e tente novamente em instantes."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="h-8"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Tentar novamente
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
            icon={<MapPinOff className="w-9 h-9" strokeWidth={1.5} />}
            eyebrow="Nada por aqui"
            title="Nenhum imóvel encontrado nesta região."
            description={
              hasActiveFilters
                ? "Tente ampliar a área de busca ou remover alguns filtros para ver mais opções."
                : "Tente ampliar a área de busca ou explorar outra região do mapa."
            }
            action={
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant="default"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    flyTo(mapCenter.lat, mapCenter.lng, 12);
                    setFilters({ radius: undefined });
                  }}
                >
                  <MapPinOff className="w-3.5 h-3.5 mr-1.5" /> Expandir área
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => resetFilters()}
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" /> Limpar filtros
                  </Button>
                )}
              </div>
            }
          />
        ) : (
          <>
            {/* Indicador de atualização inline (refinando resultados) */}
            {loadingProperties && (
              <div className="flex justify-center -my-1">
                <div className="refreshing-pill">
                  <Loader2 className="w-3 h-3 animate-spin" /> Atualizando…
                </div>
              </div>
            )}
            {properties.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                highlighted={highlightedIds?.has(p.id) ?? false}
              />
            ))}

            {/* Rodapé discreto da lista */}
            <div className="text-center text-[10.5px] text-muted-foreground/70 py-3 pt-5">
              <div className="inline-flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                Fim da lista · {count} {count === 1 ? "imóvel" : "imóveis"}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

interface FilterChip {
  key: string;
  label: string;
  value: string;
  clear: (setFilters: (f: Partial<Filters>) => void, resetFilters: () => void) => void;
}

function buildFilterChips(f: Filters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.purpose) {
    chips.push({
      key: "purpose",
      label: "Finalidade",
      value: PURPOSE_LABELS[f.purpose] ?? f.purpose,
      clear: (setF) => setF({ purpose: undefined }),
    });
  }
  if (f.propertyTypes?.length) {
    chips.push({
      key: "types",
      label: "Tipo",
      value:
        f.propertyTypes.length === 1
          ? (PROPERTY_TYPE_LABELS[f.propertyTypes[0]] ?? f.propertyTypes[0])
          : `${f.propertyTypes.length} tipos`,
      clear: (setF) => setF({ propertyTypes: [] }),
    });
  }
  if (f.minPrice != null || f.maxPrice != null) {
    const min = f.minPrice != null ? formatPrice(f.minPrice) : "R$ 0";
    const max = f.maxPrice != null ? formatPrice(f.maxPrice) : "∞";
    chips.push({
      key: "price",
      label: "Preço",
      value: f.minPrice != null && f.maxPrice != null ? `${min} – ${max}` : f.minPrice != null ? `≥ ${min}` : `≤ ${max}`,
      clear: (setF) => setF({ minPrice: undefined, maxPrice: undefined }),
    });
  }
  if (f.bedrooms != null) {
    chips.push({
      key: "bed",
      label: "Quartos",
      value: `${f.bedrooms}+`,
      clear: (setF) => setF({ bedrooms: undefined }),
    });
  }
  if (f.bathrooms != null) {
    chips.push({
      key: "bath",
      label: "Banheiros",
      value: `${f.bathrooms}+`,
      clear: (setF) => setF({ bathrooms: undefined }),
    });
  }
  if (f.parkingSpaces != null) {
    chips.push({
      key: "park",
      label: "Vagas",
      value: `${f.parkingSpaces}+`,
      clear: (setF) => setF({ parkingSpaces: undefined }),
    });
  }
  if (f.minArea != null) {
    chips.push({
      key: "area",
      label: "Área mín.",
      value: `${f.minArea} m²`,
      clear: (setF) => setF({ minArea: undefined }),
    });
  }
  if (f.radius != null) {
    chips.push({
      key: "radius",
      label: "Raio",
      value: f.radius >= 1000 ? `${(f.radius / 1000).toFixed(f.radius % 1000 === 0 ? 0 : 1)} km` : `${f.radius} m`,
      clear: (setF) => setF({ radius: undefined }),
    });
  }
  if (f.search) {
    chips.push({
      key: "search",
      label: "Busca",
      value: f.search.length > 18 ? `${f.search.slice(0, 18)}…` : f.search,
      clear: (setF) => setF({ search: undefined }),
    });
  }
  return chips;
}

function EmptyState({
  icon,
  eyebrow,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
      <div className="empty-illustration mb-5">
        {icon}
      </div>
      {eyebrow && (
        <div className="eyebrow mb-1.5 text-primary/80">{eyebrow}</div>
      )}
      <h3 className="text-[14px] font-semibold text-foreground mb-1.5 leading-snug max-w-[280px]">
        {title}
      </h3>
      {description && (
        <p className="text-[12px] text-muted-foreground max-w-[280px] mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="flex flex-wrap gap-2 justify-center">{action}</div>}
    </div>
  );
}
