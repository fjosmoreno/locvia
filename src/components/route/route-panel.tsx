"use client";

import { useState, useRef, useEffect } from "react";
import {
  Route, Navigation, X, Loader2, MapPin, Search, Circle, Square,
} from "lucide-react";
import { useUI } from "@/lib/store";
import { useUserLocation } from "@/hooks/use-geolocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistance } from "@/lib/geo";
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
    openProperty,
    flyTo,
  } = useUI();
  const { status: locStatus, request: requestLocation } = useUserLocation();

  const [destQuery, setDestQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      } catch {
        /* noop */
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [destQuery]);

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
    // espera localização e então seta
    setTimeout(() => {
      const loc = useUI.getState().userLocation;
      if (loc) setRouteOrigin({ lat: loc.lat, lng: loc.lng });
    }, 4000);
  }

  function pickDestination(r: GeoResult) {
    setRouteDestination({ lat: r.lat, lng: r.lng, label: r.displayName });
    setDestQuery(r.displayName.split(",")[0]);
    setResults([]);
    flyTo(r.lat, r.lng, 13);
  }

  async function calculateRoute() {
    if (!route.origin || !route.destination) {
      setRouteError("Defina origem e destino.");
      return;
    }
    setRouteLoading(true);
    setRouteError(null);
    try {
      // 1. direções (OSRM)
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

      // 2. imóveis no caminho
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

      // voa para enquadrar a rota inteira
      if (dirData.geometry?.length) {
        const lats = dirData.geometry.map((p: any) => p.lat);
        const lngs = dirData.geometry.map((p: any) => p.lng);
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
    <div className="absolute left-3 right-3 sm:left-3 sm:right-auto bottom-8 z-[1050] w-full max-w-sm pointer-events-auto animate-scale-in sm:bottom-8">
      <div
        className="rounded-2xl border border-border overflow-hidden flex flex-col"
        style={{
          background: "rgba(11, 17, 32, 0.92)",
          backdropFilter: "blur(16px)",
          boxShadow: "var(--shadow-xl)",
          maxHeight: "min(80vh, 600px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary grid place-items-center">
              <Route className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">LOCVIA ROUTE</div>
              <div className="text-[10px] text-muted-foreground -mt-0.5">imóveis no seu caminho</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {route.properties.length > 0 && (
              <button
                onClick={clearRoute}
                className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-secondary transition-colors"
              >
                Limpar
              </button>
            )}
            <button
              onClick={closeRoute}
              className="w-7 h-7 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-area">
          {/* Origem / Destino */}
          <div className="p-4 space-y-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                {route.origin ? (
                  <div className="text-xs text-foreground truncate">
                    {route.origin.lat.toFixed(4)}, {route.origin.lng.toFixed(4)}
                  </div>
                ) : (
                  <button
                    onClick={useMyLocationAsOrigin}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    + usar minha localização
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Square className="w-3 h-3 text-destructive shrink-0" />
              <div className="flex-1 min-w-0 relative">
                <Input
                  value={destQuery}
                  onChange={(e) => setDestQuery(e.target.value)}
                  placeholder="Para onde você vai?"
                  className="h-8 text-xs bg-secondary border-border"
                />
                {results.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-card rounded-lg shadow-xl border border-border overflow-hidden max-h-48 overflow-y-auto scroll-area">
                    {results.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => pickDestination(r)}
                        className="w-full text-left px-3 py-1.5 hover:bg-secondary text-xs border-b border-border/50 last:border-0"
                      >
                        <div className="text-foreground truncate">{r.displayName.split(",")[0]}</div>
                        <div className="text-muted-foreground truncate text-[10px]">
                          {r.displayName.split(",").slice(1).join(",")}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searching && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            <Button
              onClick={calculateRoute}
              disabled={!route.origin || !route.destination || route.loading}
              className="w-full h-9 text-sm"
              size="sm"
            >
              {route.loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Calculando…
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5 mr-1.5" /> Encontrar imóveis no caminho
                </>
              )}
            </Button>
            {route.error && (
              <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {route.error}
              </div>
            )}
          </div>

          {/* Resumo da rota */}
          {route.distance && route.duration && (
            <div className="px-4 py-3 border-b border-border flex items-center gap-4 text-xs">
              <div>
                <div className="text-muted-foreground">Duração</div>
                <div className="text-foreground font-semibold">
                  {durationMin} min
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Distância</div>
                <div className="text-foreground font-semibold">
                  {distanceKm ? `${distanceKm.toFixed(1)} km` : "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Imóveis</div>
                <div className="text-primary font-semibold">{route.properties.length}</div>
              </div>
            </div>
          )}

          {/* Lista de imóveis no caminho */}
          {route.properties.length > 0 && (
            <div className="p-3 space-y-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold px-1">
                No seu caminho · ordenados pelo percurso
              </div>
              {route.properties.map((p: any, i) => (
                <div key={p.id} className="relative">
                  <div className="absolute -left-1 top-3 z-10 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center shadow">
                    {i + 1}
                  </div>
                  <div className="pl-4">
                    <PropertyCard property={p} />
                  </div>
                </div>
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
