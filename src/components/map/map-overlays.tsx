"use client";

import { useMap } from "react-leaflet";
import { Plus, Minus, LocateFixed, Loader2, RefreshCw } from "lucide-react";
import { useUI } from "@/lib/store";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useQueryClient } from "@tanstack/react-query";

/** Controles de zoom + localizar — overlay premium. */
export function MapControls() {
  const map = useMap();
  const { locate, locating, userLocation } = useGeolocation();

  return (
    <div className="absolute right-3 bottom-8 z-[1000] flex flex-col gap-2 pointer-events-auto">
      <button
        onClick={() => map.zoomIn()}
        className="map-overlay-btn"
        aria-label="Aproximar"
      >
        <Plus className="w-5 h-5" strokeWidth={2.4} />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="map-overlay-btn"
        aria-label="Afastar"
      >
        <Minus className="w-5 h-5" strokeWidth={2.4} />
      </button>
      <button
        onClick={() => locate()}
        className={`map-overlay-btn ${userLocation ? "is-active" : ""}`}
        aria-label="Minha localização"
        title="Minha localização"
      >
        {locating ? (
          <Loader2 className="w-4.5 h-4.5 animate-spin" />
        ) : (
          <LocateFixed className="w-4.5 h-4.5" />
        )}
      </button>
    </div>
  );
}

/** Botão flutuante "Pesquisar nesta área" — aparece ao mover o mapa. */
export function SearchInAreaPrompt() {
  const { searchInAreaPrompt, loadingProperties } = useUI();
  const qc = useQueryClient();
  if (!searchInAreaPrompt) return null;

  function refetch() {
    qc.invalidateQueries({ queryKey: ["properties"] });
  }

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-8 z-[1000] pointer-events-none">
      <button
        onClick={refetch}
        className="search-area-btn pointer-events-auto animate-scale-in"
      >
        {loadingProperties ? (
          <span className="ring" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5 text-primary" />
        )}
        {loadingProperties ? "Atualizando…" : "Pesquisar nesta área"}
      </button>
    </div>
  );
}
