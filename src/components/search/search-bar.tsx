"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, X, Loader2, Building } from "lucide-react";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";

interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

export function SearchBar({ onPickResult }: { onPickResult?: () => void }) {
  const { flyTo, setFilters } = useUI();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // debounce input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  // geocode via TanStack Query (loading gerenciado pela lib)
  const { data, isFetching } = useQuery<GeoResult[]>({
    queryKey: ["geocode", debounced],
    enabled: debounced.trim().length >= 3,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(debounced)}`);
      if (!res.ok) return [];
      const d = await res.json();
      return d.results || [];
    },
  });

  const results = data || [];
  const visibleResults = query.trim().length >= 3 ? results : [];

  // fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function pick(r: GeoResult) {
    flyTo(r.lat, r.lng, 15);
    setFilters({ search: undefined });
    setQuery(r.displayName.split(",")[0]);
    setOpen(false);
    onPickResult?.();
  }

  function submitTextSearch(e: React.FormEvent) {
    e.preventDefault();
    if (visibleResults.length) pick(visibleResults[safeActiveIdx] ?? visibleResults[0]);
    else if (query.trim().length >= 3) {
      setFilters({ search: query.trim() });
      setOpen(false);
    }
  }

  // clamp activeIdx dentro dos limites da lista atual
  const safeActiveIdx = visibleResults.length === 0 ? 0 : Math.min(activeIdx, visibleResults.length - 1);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || visibleResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % visibleResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + visibleResults.length) % visibleResults.length);
    } else if (e.key === "Enter" && visibleResults.length) {
      e.preventDefault();
      pick(visibleResults[safeActiveIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showEmpty = open && query.trim().length >= 3 && !isFetching && visibleResults.length === 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={submitTextSearch} className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Buscar bairro, endereço ou cidade"
          aria-label="Buscar bairro, endereço ou cidade"
          className={cn(
            "glass-input w-full pl-10 pr-10 h-11 rounded-full text-sm font-medium",
            "placeholder:text-muted-foreground/70 outline-none"
          )}
        />
        {/* Botão limpar — touch target 32px */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebounced("");
              setFilters({ search: undefined });
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {/* Loading spinner */}
        {isFetching && !query && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground pointer-events-none" />
        )}
        {isFetching && query && (
          <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground pointer-events-none" />
        )}
      </form>

      {/* Dropdown de resultados — premium glass */}
      {open && visibleResults.length > 0 && (
        <div className="search-dropdown absolute z-[1200] mt-2 w-full max-h-80 overflow-y-auto overlay-scroll animate-scale-in">
          {visibleResults.map((r, i) => {
            const parts = r.displayName.split(",");
            const title = parts[0];
            const subtitle = parts.slice(1).join(",").trim();
            return (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  pick(r);
                }}
                className={cn(
                  "search-dropdown-item w-full text-left",
                  safeActiveIdx === i && "is-active"
                )}
              >
                <div className="pin-badge">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground clamp-1">
                    {title}
                  </div>
                  {subtitle && (
                    <div className="text-xs text-muted-foreground clamp-1">
                      {subtitle}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Estado vazio */}
      {showEmpty && (
        <div className="search-dropdown absolute z-[1200] mt-2 w-full animate-scale-in p-4">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-muted grid place-items-center text-muted-foreground">
              <Building className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-foreground">Nenhum local encontrado</div>
            <div className="text-xs text-muted-foreground">
              Tente buscar por um bairro, rua ou CEP.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
