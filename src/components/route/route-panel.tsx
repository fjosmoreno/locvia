"use client";

import { useState, useRef, useEffect } from "react";
import {
  Route, Navigation, X, Loader2, MapPin, LocateFixed,
} from "lucide-react";
import { useUI } from "@/lib/store";
import { useUserLocation } from "@/hooks/use-geolocation";
import { PropertyCard } from "@/components/property/property-card";
import { cn } from "@/lib/utils";

interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

export function RoutePanel() {
  const {
    route,
    openRoute,
    closeRoute,
    setRouteOrigin,
    setRouteDestination,
    setRouteGeometry,
    setRouteProperties,
    setRouteLoading,
    setRouteError,
    clearRoute,
    userLocation,
    flyTo,
  } = useUI();
  const { status: locStatus, request: requestLocation } = useUserLocation();

  const [destQuery, setDestQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // busca destino via Nominatim (debounce)
  useEffect(() => {
    if (destQuery.trim().length < 3) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(destQuery)}`);
        const d = await res.json();
        setResults(d.results || []);
        setShowResults(true);
      } catch {
        /* noop */
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [destQuery]);

  // reset active index
  useEffect(() => {
    setActiveIdx(0);
  }, [results.length]);

  // fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    if (showResults) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showResults]);

  // Estado fechado — botão flutuante "LOCVIA ROUTE"
  if (!route.open) {
    return (
      <div className="absolute right-3 bottom-[140px] z-[1050] pointer-events-auto">
        <button
          onClick={openRoute}
          className="map-overlay-btn"
          style={{ width: "auto", padding: "0 14px", gap: 7, fontSize: 13, fontWeight: 600 }}
          aria-label="LOCVIA ROUTE — Imóveis no caminho"
          title="Imóveis no meu caminho"
        >
          <Route className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">Rota</span>
        </button>
      </div>
    );
  }

  async function useMyLocationAsOrigin() {
    if (locStatus === "success" && userLocation) {
      setRouteOrigin({ lat: userLocation.lat, lng: userLocation.lng });
      return;
    }
    requestLocation();
    setTimeout(() => {
      const loc = useUI.getState().userLocation;
      if (loc) setRouteOrigin({ lat: loc.lat, lng: loc.lng });
    }, 4000);
  }

  function pickDestination(r: GeoResult) {
    setRouteDestination({ lat: r.lat, lng: r.lng, label: r.displayName });
    setDestQuery(r.displayName.split(",")[0]);
    setResults([]);
    setShowResults(false);
    if (blurTimer.current) clearTimeout(blurTimer.current);
    flyTo(r.lat, r.lng, 13);
  }

  function onDestKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showResults || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results.length) {
      e.preventDefault();
      pickDestination(results[activeIdx]);
    }
  }

  async function calculateRoute() {
    if (!route.origin || !route.destination) {
      setRouteError("Defina origem e destino.");
      return;
    }
    setRouteLoading(true);
    setRouteError(null);
    try {
      const dirRes = await fetch(
        `/api/route/directions?originLat=${route.origin.lat}&originLng=${route.origin.lng}&destLat=${route.destination.lat}&destLng=${route.destination.lng}`
      );
      const dirData = await dirRes.json();
      if (!dirRes.ok) {
        setRouteError(dirData.error || "Não foi possível calcular a rota.");
        return;
      }
      setRouteGeometry({
        route: dirData.geometry,
        distance: dirData.distance,
        duration: dirData.duration,
      });

      const searchRes = await fetch("/api/route/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: dirData.geometry,
          origin: route.origin,
          filters: { routeDuration: dirData.duration },
        }),
      });
      const searchData = await searchRes.json();
      if (!searchRes.ok) {
        setRouteError(searchData.error || "Erro ao buscar imóveis.");
        return;
      }
      setRouteProperties(searchData.properties || []);

      if (dirData.geometry?.length) {
        const lats = dirData.geometry.map((p: { lat: number }) => p.lat);
        const lngs = dirData.geometry.map((p: { lng: number }) => p.lng);
        const center = {
          lat: (Math.min(...lats) + Math.max(...lats)) / 2,
          lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
        };
        flyTo(center.lat, center.lng, 13);
      }
    } catch {
      setRouteError("Erro ao calcular rota. Tente novamente.");
    } finally {
      setRouteLoading(false);
    }
  }

  const durationMin = route.duration ? Math.round(route.duration / 60) : null;
  const distanceKm = route.distance ? route.distance / 1000 : null;

  return (
    <div className="absolute left-3 right-3 sm:left-3 sm:right-auto bottom-8 z-[1050] w-full sm:w-auto sm:max-w-sm pointer-events-auto animate-scale-in">
      <div
        className="overlay-panel flex flex-col"
        style={{ maxHeight: "min(80vh, 620px)" }}
      >
        {/* Header */}
        <div className="overlay-panel-header">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="overlay-panel-icon"
              style={{ background: "rgba(0, 212, 255, 0.14)", color: "var(--primary)" }}
            >
              <Route className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">LOCVIA ROUTE</div>
              <div className="text-[10px] text-muted-foreground -mt-0.5 truncate">
                imóveis no seu caminho
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {route.properties.length > 0 && (
              <button
                onClick={clearRoute}
                className="overlay-panel-close"
                title="Limpar rota"
                aria-label="Limpar rota"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={closeRoute}
              className="overlay-panel-close"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overlay-scroll flex-1 overflow-y-auto">
          {/* Origem / Destino */}
          <div className="p-4 space-y-1.5 border-b border-border">
            {/* Origem */}
            <div className="route-point">
              <div className="route-marker-dot is-origin" aria-hidden />
              <div className="flex-1 min-w-0">
                {route.origin ? (
                  <div className="text-xs text-foreground truncate font-medium px-1 py-1.5">
                    {route.origin.lat.toFixed(4)}, {route.origin.lng.toFixed(4)}
                  </div>
                ) : (
                  <button
                    onClick={useMyLocationAsOrigin}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1.5 h-9 px-1"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                    usar minha localização
                  </button>
                )}
              </div>
              {route.origin && (
                <button
                  onClick={() => setRouteOrigin(null)}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors px-2.5 py-1.5 rounded-lg hover:bg-secondary h-9"
                >
                  trocar
                </button>
              )}
            </div>

            {/* Conector */}
            <div className="route-connector" aria-hidden />

            {/* Destino */}
            <div ref={containerRef} className="route-point">
              <div className="route-marker-dot is-dest" aria-hidden />
              <div className="flex-1 min-w-0 relative">
                <input
                  value={destQuery}
                  onChange={(e) => setDestQuery(e.target.value)}
                  onFocus={() => results.length && setShowResults(true)}
                  onKeyDown={onDestKeyDown}
                  placeholder="Para onde você vai?"
                  aria-label="Destino da rota"
                  className="glass-input w-full h-11 px-4 rounded-full text-xs outline-none placeholder:text-muted-foreground/70 font-medium"
                />
                {searching && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground pointer-events-none" />
                )}
                {showResults && results.length > 0 && (
                  <div className="search-dropdown absolute z-10 mt-1.5 w-full max-h-52 overflow-y-auto overlay-scroll animate-scale-in">
                    {results.map((r, i) => {
                      const parts = r.displayName.split(",");
                      return (
                        <button
                          key={i}
                          onMouseEnter={() => setActiveIdx(i)}
                          onClick={() => pickDestination(r)}
                          className={cn(
                            "search-dropdown-item w-full text-left",
                            activeIdx === i && "is-active"
                          )}
                        >
                          <div className="pin-badge">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-foreground clamp-1">
                              {parts[0]}
                            </div>
                            {parts.length > 1 && (
                              <div className="text-[10px] text-muted-foreground clamp-1">
                                {parts.slice(1).join(",").trim()}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* CTA calcular */}
            <button
              onClick={calculateRoute}
              disabled={!route.origin || !route.destination || route.loading}
              className={cn(
                "w-full h-11 mt-3 rounded-full text-sm font-semibold transition-all",
                "bg-primary text-primary-foreground shadow-md",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
                "hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-1.5",
                !route.loading && route.origin && route.destination && "shadow-[0_0_0_3px_rgba(0,212,255,0.16),0_0_22px_rgba(0,212,255,0.24)]"
              )}
            >
              {route.loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculando…
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" /> Encontrar imóveis no caminho
                </>
              )}
            </button>
            {route.error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 mt-2">
                {route.error}
              </div>
            )}
          </div>

          {/* Resumo da rota — stats premium */}
          {route.distance && route.duration && (
            <div className="px-4 py-3.5 border-b border-border flex items-center gap-3">
              <div className="route-stat">
                <div className="route-stat-value text-primary">
                  {durationMin}<span className="text-xs font-medium ml-0.5">min</span>
                </div>
                <div className="route-stat-label">Duração</div>
              </div>
              <div className="w-px h-8 bg-border" aria-hidden />
              <div className="route-stat">
                <div className="route-stat-value text-foreground">
                  {distanceKm ? distanceKm.toFixed(1) : "—"}<span className="text-xs font-medium ml-0.5">km</span>
                </div>
                <div className="route-stat-label">Distância</div>
              </div>
              <div className="w-px h-8 bg-border" aria-hidden />
              <div className="route-stat">
                <div className="route-stat-value text-foreground">
                  {route.properties.length}
                </div>
                <div className="route-stat-label">Imóveis</div>
              </div>
            </div>
          )}

          {/* Lista de imóveis no caminho */}
          {route.properties.length > 0 && (
            <div className="p-3 space-y-3">
              <div className="eyebrow px-1">
                No seu caminho · ordenados pelo percurso
              </div>
              {route.properties.map((p: any, i: number) => (
                <RouteStop key={p.id} property={p} index={i} />
              ))}
            </div>
          )}

          {route.route && route.properties.length === 0 && !route.loading && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Nenhum imóvel no caminho.
              <br />
              Tente outra rota ou amplie a busca.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Parada numerada na rota — usa PropertyCard com numeração visual premium. */
function RouteStop({ property, index }: { property: any; index: number }) {
  return (
    <div className="route-stop">
      <div className="route-stop-num">{index + 1}</div>
      <div className="route-stop-line" aria-hidden />
      <div className="flex-1 min-w-0">
        <PropertyCard property={property} />
      </div>
    </div>
  );
}
