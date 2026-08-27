"use client";

import { useEffect, useRef, useState } from "react";
import {
  Home, Building2, Store, DoorOpen, SlidersHorizontal, X, Check,
} from "lucide-react";
import { useUI } from "@/lib/store";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DISTANCE_OPTIONS, PROPERTY_TYPES, PROPERTY_TYPE_LABELS, PURPOSES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  APARTMENT: <Building2 className="w-4 h-4" />,
  HOUSE: <Home className="w-4 h-4" />,
  SHOP: <Store className="w-4 h-4" />,
  COMMERCIAL_ROOM: <DoorOpen className="w-4 h-4" />,
  OTHER: <Building2 className="w-4 h-4" />,
};

export function FilterChips() {
  const {
    filters, setFilters, resetFilters, openDrawer, userLocation,
  } = useUI();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  // detecta overflow horizontal para mostrar fade indicator
  useEffect(() => {
    function check() {
      const el = scrollRef.current;
      if (!el) return;
      setHasOverflow(el.scrollWidth > el.clientWidth + 4);
    }
    check();
    window.addEventListener("resize", check);
    // observa mudanças nos filtros (número de chips muda)
    const mo = new MutationObserver(check);
    if (scrollRef.current) mo.observe(scrollRef.current, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("resize", check);
      mo.disconnect();
    };
  }, [filters]);

  const activeCount =
    filters.propertyTypes.length +
    (filters.minPrice != null || filters.maxPrice != null ? 1 : 0) +
    (filters.bedrooms != null ? 1 : 0) +
    (filters.bathrooms != null ? 1 : 0) +
    (filters.parkingSpaces != null ? 1 : 0) +
    (filters.minArea != null ? 1 : 0);

  function togglePurpose(p: string) {
    setFilters({ purpose: filters.purpose === p ? undefined : p });
  }
  function toggleType(t: string) {
    const next = filters.propertyTypes.includes(t)
      ? filters.propertyTypes.filter((x) => x !== t)
      : [...filters.propertyTypes, t];
    setFilters({ propertyTypes: next });
  }

  return (
    <div className="absolute top-[64px] sm:top-[72px] left-3 right-3 z-[1050] pointer-events-none">
      <div
        ref={scrollRef}
        className={cn(
          "chip-scroll-wrap pointer-events-auto flex items-center gap-2 overflow-x-auto scroll-x pb-1.5 pr-7",
          hasOverflow && "has-overflow"
        )}
      >
        {/* Finalidade */}
        <button
          onClick={() => togglePurpose(PURPOSES.RENT)}
          className={cn("filter-chip shrink-0", filters.purpose === PURPOSES.RENT && "is-active")}
        >
          Alugar
        </button>
        <button
          onClick={() => togglePurpose(PURPOSES.SALE)}
          className={cn("filter-chip shrink-0", filters.purpose === PURPOSES.SALE && "is-active")}
        >
          Comprar
        </button>

        {/* Tipo */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn("filter-chip shrink-0", filters.propertyTypes.length > 0 && "is-active")}>
              Tipo
              {filters.propertyTypes.length > 0 && (
                <span className="chip-count">{filters.propertyTypes.length}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-1.5" align="start">
            <div className="grid grid-cols-2 gap-1.5">
              {Object.values(PROPERTY_TYPES).map((t) => {
                const active = filters.propertyTypes.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={cn(
                      "flex items-center gap-2 h-11 px-3 rounded-xl border text-sm transition-all",
                      active
                        ? "border-primary bg-accent text-accent-foreground font-medium"
                        : "border-border bg-background hover:bg-accent/50"
                    )}
                  >
                    {TYPE_ICONS[t]}
                    {PROPERTY_TYPE_LABELS[t]}
                    {active && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Preço */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn("filter-chip shrink-0", (filters.minPrice != null || filters.maxPrice != null) && "is-active")}>
              Preço
              {(filters.minPrice != null || filters.maxPrice != null) && <span className="chip-count">•</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <Label className="eyebrow">Faixa de preço (R$)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Mínimo"
                value={filters.minPrice ?? ""}
                onChange={(e) => setFilters({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Máximo"
                value={filters.maxPrice ?? ""}
                onChange={(e) => setFilters({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div className="flex gap-1.5 mt-2">
              {[
                { label: "até 2k", min: undefined, max: 2000 },
                { label: "2k–4k", min: 2000, max: 4000 },
                { label: "4k–8k", min: 4000, max: 8000 },
              ].map((q) => (
                <button
                  key={q.label}
                  onClick={() => setFilters({ minPrice: q.min, maxPrice: q.max })}
                  className="text-[11px] px-2 py-1 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Quartos */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn("filter-chip shrink-0", filters.bedrooms != null && "is-active")}>
              Quartos
              {filters.bedrooms != null && <span className="chip-count">{filters.bedrooms}+</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setFilters({ bedrooms: filters.bedrooms === n ? undefined : n })}
                  className={cn(
                    "w-11 h-11 rounded-xl text-sm font-semibold transition-all",
                    filters.bedrooms === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-accent text-foreground"
                  )}
                >
                  {n}+
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Distância — só se localização ativa */}
        {userLocation && (
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn("filter-chip shrink-0", filters.radius != null && "is-active")}>
                Distância
                {filters.radius != null && (
                  <span className="chip-count">
                    {DISTANCE_OPTIONS.find((d) => d.value === filters.radius)?.label.replace(" ", "")}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1.5" align="start">
              {DISTANCE_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setFilters({ radius: d.value || undefined })}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between",
                    filters.radius === d.value
                      ? "bg-accent text-accent-foreground font-medium"
                      : "hover:bg-accent/50"
                  )}
                >
                  {d.label}
                  {filters.radius === d.value && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}

        {/* Mais filtros (sheet avançado) */}
        <button
          onClick={() => openDrawer("filters")}
          className={cn("filter-chip shrink-0", activeCount > 0 && "is-active")}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Mais
          {activeCount > 0 && <span className="chip-count">{activeCount}</span>}
        </button>

        {/* Limpar — destructive */}
        {(activeCount > 0 || filters.purpose) && (
          <button
            onClick={resetFilters}
            className="filter-chip is-destructive shrink-0"
            aria-label="Limpar filtros"
          >
            <X className="w-3.5 h-3.5" />
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
