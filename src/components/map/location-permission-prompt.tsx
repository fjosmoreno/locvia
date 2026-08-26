"use client";

import { useEffect, useState } from "react";
import { MapPin, Navigation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useUI } from "@/lib/store";

/** Card flutuante que oferece ativar localização (aparece uma vez). */
export function LocationPermissionPrompt() {
  const { locate, userLocation } = useGeolocation();
  const { locationDenied } = useUI();
  const [dismissed, setDismissed] = useState(false);

  // não mostra se já localizado, se negado, ou se dispensado
  const visible = !userLocation && !locationDenied && !dismissed;

  // Some depois de 12s se ignorado
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setDismissed(true), 12000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="absolute z-[1050] left-1/2 -translate-x-1/2 top-[68px] sm:top-[76px] w-[calc(100%-24px)] max-w-md animate-panel-in">
      <div className="bg-white/95 backdrop-blur shadow-xl rounded-2xl border border-border p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
          <Navigation className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">
            Encontre imóveis ao seu redor
          </div>
          <div className="text-[11px] text-muted-foreground">
            Ative sua localização para ver imóveis próximos no mapa.
          </div>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => locate()}>
          <MapPin className="w-3.5 h-3.5 mr-1" /> Ativar
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-muted-foreground hover:text-foreground p-1"
          aria-label="Dispensar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
