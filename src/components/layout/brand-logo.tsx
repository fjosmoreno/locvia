"use client";

import { MapPin } from "lucide-react";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="relative grid place-items-center w-8 h-8 rounded-xl bg-primary text-primary-foreground shadow-sm">
        <MapPin className="w-4.5 h-4.5" strokeWidth={2.5} />
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="font-bold text-[15px] tracking-tight text-foreground">
            Map<span className="text-primary">Imóvel</span>
          </div>
          <div className="text-[10px] text-muted-foreground font-medium -mt-0.5">
            imóveis no mapa
          </div>
        </div>
      )}
    </div>
  );
}
