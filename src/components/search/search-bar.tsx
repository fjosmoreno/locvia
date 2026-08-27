"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, X, Loader2 } from "lucide-react";
import { useUI } from "@/lib/store";
import { Input } from "@/components/ui/input";
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
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function pick(r: GeoResult) {
    flyTo(r.lat, r.lng, 15);
    setFilters({ search: undefined });
    setQuery(r.displayName.split(",")[0]);
    setOpen(false);
    onPickResult?.();
  }

  function submitTextSearch(e: React.FormEvent) {
    e.preventDefault();
    if (visibleResults.length) pick(visibleResults[0]);
    else if (query.trim().length >= 3) {
      setFilters({ search: query.trim() });
      setOpen(false);
    }
  }

  return (
    <div className="relative w-full">
      <form onSubmit={submitTextSearch} className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 180);
          }}
          placeholder="Buscar bairro, endereço ou cidade"
          className={cn(
            "pl-10 pr-9 h-11 rounded-full glass-surface shadow-md border border-border",
            "placeholder:text-muted-foreground/70 text-sm font-medium focus:bg-secondary"
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebounced("");
              setFilters({ search: undefined });
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {isFetching && (
          <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </form>

      {open && visibleResults.length > 0 && (
        <div className="absolute z-[1200] mt-2 w-full bg-card rounded-2xl shadow-xl border border-border overflow-hidden max-h-80 overflow-y-auto scroll-area animate-scale-in">
          {visibleResults.map((r, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => {
                if (blurTimer.current) clearTimeout(blurTimer.current);
                pick(r);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-accent/60 flex items-start gap-3 border-b border-border/50 last:border-0 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground clamp-1">
                  {r.displayName.split(",")[0]}
                </div>
                <div className="text-xs text-muted-foreground clamp-1">
                  {r.displayName.split(",").slice(1).join(",").trim()}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
