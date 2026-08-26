"use client";

import { cn } from "@/lib/utils";

export function BrandLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div className="relative grid place-items-center w-9 h-9 rounded-xl bg-foreground text-white shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5" aria-hidden>
          <path
            d="M12 21s7-6.27 7-11a7 7 0 1 0-14 0c0 4.73 7 11 7 11Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="10" r="2.6" fill="currentColor" />
        </svg>
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-foreground" />
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="font-semibold text-[15px] tracking-tight text-foreground">
            Map<span className="text-primary">Imóvel</span>
          </div>
          <div className="text-[10px] text-muted-foreground font-medium tracking-wide -mt-0.5">
            imóveis no mapa
          </div>
        </div>
      )}
    </div>
  );
}
