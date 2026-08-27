"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-map-gl/maplibre";
import { Plus, Minus, LocateFixed, Loader2, RefreshCw, AlertCircle, Home } from "lucide-react";
import { useUI } from "@/lib/store";
import { useUserLocation } from "@/hooks/use-geolocation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Controles de zoom + localizar + restaurar posição — overlay premium com estados. */
export function MapControls() {
  const { current: map } = useMap();
  const { status, request, message, location } = useUserLocation();
  const { resetMap, drawer } = useUI();
  const lastErrorStatus = useRef<string | null>(null);

  useEffect(() => {
    const failed = ["denied", "timeout", "error", "unavailable"];
    if (failed.includes(status) && lastErrorStatus.current !== status) {
      lastErrorStatus.current = status;
      toast.error(message, {
        id: `geo-${status}`,
        duration: 5000,
        action:
          status !== "unavailable"
            ? { label: "Tentar novamente", onClick: () => request() }
            : undefined,
      });
    }
    if (status === "success" || status === "requesting" || status === "idle") {
      lastErrorStatus.current = null;
    }
  }, [status, message, request]);

  function handleLocate() {
    if (status === "requesting") return;
    if (status === "success" && location && map) {
      map.flyTo({
        center: [location.lng, location.lat],
        zoom: 15,
        duration: 800,
        essential: true,
      });
      return;
    }
    request();
  }

  function handleReset() {
    // Restaura posição inicial (localização do usuário ou centro default BH)
    resetMap();
    toast.success("Posição inicial restaurada", { duration: 1800 });
  }

  // Esconde quando um drawer/sheet está aberto (admin, agency, favorites, etc.)
  if (drawer) return null;

  return (
    <div className="absolute right-3 bottom-8 z-[1000] flex flex-col gap-2 pointer-events-auto md:bottom-8">
      <button
        onClick={() => map?.zoomIn({ duration: 300 })}
        className="map-overlay-btn"
        aria-label="Aproximar"
        title="Aproximar"
      >
        <Plus className="w-5 h-5" strokeWidth={2.4} />
      </button>
      <button
        onClick={() => map?.zoomOut({ duration: 300 })}
        className="map-overlay-btn"
        aria-label="Afastar"
        title="Afastar"
      >
        <Minus className="w-5 h-5" strokeWidth={2.4} />
      </button>
      <button
        onClick={handleLocate}
        className={cn(
          "map-overlay-btn relative",
          status === "success" && "is-active",
          status === "requesting" && "is-requesting",
          status === "denied" && "is-error"
        )}
        aria-label="Minha localização"
        aria-pressed={status === "success"}
        title={
          status === "requesting"
            ? "Localizando…"
            : status === "success"
            ? "Você está aqui — toque para recentralizar"
            : status === "denied"
            ? "Localização negada — toque para tentar novamente"
            : "Minha localização"
        }
      >
        {status === "requesting" ? (
          <Loader2 className="w-[18px] h-[18px] animate-spin" />
        ) : status === "denied" ? (
          <AlertCircle className="w-[18px] h-[18px]" />
        ) : status === "success" ? (
          <LocateFixed className="w-[18px] h-[18px]" strokeWidth={2.6} />
        ) : (
          <LocateFixed className="w-[18px] h-[18px]" />
        )}
      </button>
      {/* Restaurar posição inicial do mapa */}
      <button
        onClick={handleReset}
        className="map-overlay-btn"
        aria-label="Restaurar posição inicial"
        title="Restaurar posição inicial do mapa"
      >
        <Home className="w-[18px] h-[18px]" strokeWidth={2.2} />
      </button>
    </div>
  );
}

/** Botão flutuante "Pesquisar nesta área" — aparece ao mover o mapa. */
export function SearchInAreaPrompt() {
  const { searchInAreaPrompt, loadingProperties, drawer } = useUI();
  const qc = useQueryClient();
  if (!searchInAreaPrompt || drawer) return null;

  function refetch() {
    qc.invalidateQueries({ queryKey: ["properties"] });
  }

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-8 z-[1000] pointer-events-none md:bottom-8">
      <button
        onClick={refetch}
        className="search-area-btn pointer-events-auto animate-scale-in"
      >
        {loadingProperties ? (
          <span className="ring" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        {loadingProperties ? "Atualizando…" : "Pesquisar nesta área"}
      </button>
    </div>
  );
}
