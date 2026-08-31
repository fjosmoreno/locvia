"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Logo oficial LOCVIA.
 * Símbolo: "L" que se transforma em pino de mapa, com gradiente ciano
 * (#0891B2 → #22D3EE), sobre container squircle navy (#0B1120).
 * Wordmark: "LOC" + "VIA" em branco, maiúsculas, letter-spacing amplo.
 *
 * Modos:
 *  - `static`    → div não-clicável. Usado onde o BrandLogo é decorativo
 *                  (ex: header de auth, telas de marketing).
 *  - `home`      → link clicável que volta pra home ("/"). Usado no topbar.
 *                  No mobile vira um botão AAA 44x44 com label "Início".
 */
type BrandLogoMode = "static" | "home";

export function BrandLogo({
  compact = false,
  className,
  mode = "static",
}: {
  compact?: boolean;
  className?: string;
  mode?: BrandLogoMode;
}) {
  // ID único por instância — evita conflito de gradient quando há
  // múltiplos BrandLogos no mesmo DOM (topbar mobile + desktop).
  const reactId = React.useId();
  const gradId = `locvia-grad-${reactId.replace(/:/g, "")}`;

  const symbol = (
    <div
      data-slot="brand-logo-symbol"
      className={cn(
        "relative grid place-items-center rounded-[10px] shadow-sm overflow-hidden shrink-0",
        // Mobile: 44x44 touch target. Desktop: 36x36.
        compact ? "w-11 h-11 sm:w-9 sm:h-9" : "w-9 h-9",
        // Borda ciano forte + ring externo pra se destacar de qualquer fundo
        "border-2 border-primary/70",
        "shadow-[0_0_0_3px_rgba(0,212,255,0.10),0_2px_8px_rgba(0,0,0,0.35)]",
      )}
      style={{
        background:
          "radial-gradient(circle at 30% 25%, #1e293b 0%, #0b1120 100%)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={cn(compact ? "w-8 h-8 sm:w-5 sm:h-5" : "w-5 h-5")}
        aria-hidden
        style={{ filter: "drop-shadow(0 0 1.5px rgba(34, 211, 238, 0.65))" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#A5F3FC" />
          </linearGradient>
        </defs>
        {/* "L" que vira pino: corpo do L mais robusto + cabeça do pino maior */}
        <path
          d="M4 3.5v13.4c0 .9.7 1.6 1.6 1.6h12.9"
          stroke={`url(#${gradId})`}
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* cabeça do pino — círculo grande com furo (preenchimento sólido ciano) */}
        <circle cx="18.5" cy="5.5" r="4.5" fill={`url(#${gradId})`} />
        <circle cx="18.5" cy="5.5" r="1.8" fill="#0b1120" />
      </svg>
    </div>
  );

  const wordmark = !compact && (
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
  );

  // Modo home: vira um botão/link AAA. Touch target mínimo 44x44 no mobile.
  if (mode === "home") {
    return (
      <Link
        href="/"
        aria-label="Ir para o início"
        title="Ir para o início — LOCVIA"
        data-slot="brand-logo-home"
        className={cn(
          // hit area AAA — garante 44x44 mesmo com squircle 40px
          "group inline-flex items-center justify-center",
          "min-h-[44px] min-w-[44px] sm:min-w-0 sm:min-h-0",
          "rounded-xl",
          // feedback visual
          "hover:scale-[1.04] active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "motion-safe:transition-transform motion-safe:duration-150",
          "cursor-pointer select-none",
          "-webkit-tap-highlight-color:transparent",
          className,
        )}
      >
        <div className="flex items-center gap-2.5">
          {symbol}
          {wordmark}
        </div>
      </Link>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      {symbol}
      {wordmark}
    </div>
  );
}
