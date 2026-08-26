"use client";

import { cn } from "@/lib/utils";

/**
 * Logo oficial LOCVIA.
 * Símbolo: "L" que se transforma em pino de mapa, com gradiente ciano
 * (#0891B2 → #22D3EE), sobre container squircle navy (#0B1120).
 * Wordmark: "LOC" + "VIA" em branco, maiúsculas, letter-spacing amplo.
 */
export function BrandLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div
        className="relative grid place-items-center w-9 h-9 rounded-[10px] shadow-sm overflow-hidden"
        style={{
          background: "radial-gradient(circle at 30% 25%, #1e293b 0%, #0b1120 100%)",
          border: "1px solid rgba(0, 212, 255, 0.18)",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
          <defs>
            <linearGradient id="locvia-grad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#0891B2" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
          {/* "L" que vira pino: corpo do L + cabeça do pino */}
          <path
            d="M7 4.5v10.2c0 .5.4.9.9.9h6.4"
            stroke="url(#locvia-grad)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* cabeça do pino (círculo ciano com furo) */}
          <circle cx="16.5" cy="7" r="3" fill="url(#locvia-grad)" />
          <circle cx="16.5" cy="7" r="1.1" fill="#0b1120" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-none">
          <div
            className="font-bold text-[15px] tracking-[0.14em] text-white"
            style={{ letterSpacing: "0.14em" }}
          >
            LOC<span style={{ color: "var(--primary)" }}>VIA</span>
          </div>
          <div className="text-[10px] text-muted-foreground font-medium tracking-wide -mt-0.5">
            imóveis no mapa
          </div>
        </div>
      )}
    </div>
  );
}
