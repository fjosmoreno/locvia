"use client";

import { useMap } from "react-leaflet";
import { Plus, Minus, LocateFixed, Loader2 } from "lucide-react";
import { useUI } from "@/lib/store";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Button } from "@/components/ui/button";

/** Controles de zoom + localizar (renderizados como overlay do mapa). */
export function MapControls() {
  const map = useMap();
  const { locate, locating, userLocation } = useGeolocation();
  const { flyTo } = useUI();

  return (
    <div className="absolute right-3 bottom-7 z-[1000] flex flex-col gap-2 pointer-events-auto">
      <button
        onClick={() => map.zoomIn()}
        className="w-10 h-10 grid place-items-center bg-white rounded-xl shadow-md hover:bg-accent/80 transition-colors border border-black/5"
        aria-label="Aproximar"
      >
        <Plus className="w-5 h-5" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-10 h-10 grid place-items-center bg-white rounded-xl shadow-md hover:bg-accent/80 transition-colors border border-black/5"
        aria-label="Afastar"
      >
        <Minus className="w-5 h-5" />
      </button>
      <button
        onClick={() => locate()}
        className="w-10 h-10 grid place-items-center bg-white rounded-xl shadow-md hover:bg-accent/80 transition-colors border border-black/5"
        aria-label="Minha localização"
        title="Minha localização"
      >
        {locating ? (
          <Loader2 className="w-4.5 h-4.5 animate-spin text-primary" />
        ) : (
          <LocateFixed className={`w-4.5 h-4.5 ${userLocation ? "text-primary" : ""}`} />
        )}
      </button>
    </div>
  );
}

/** Botão "Pesquisar nesta área" que aparece ao mover o mapa. */
export function SearchInAreaPrompt() {
  const { searchInAreaPrompt } = useUI();
  if (!searchInAreaPrompt) return null;
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-7 z-[1000] pointer-events-none">
      <div className="pointer-events-auto bg-white/95 backdrop-blur shadow-lg rounded-full px-4 py-2 border border-black/5 flex items-center gap-2 animate-panel-in">
        <span className="text-xs text-muted-foreground">Mova o mapa e solte</span>
        <span className="w-px h-3 bg-border" />
        <span className="text-xs font-medium text-foreground">Resultados atualizando…</span>
      </div>
    </div>
  );
}
