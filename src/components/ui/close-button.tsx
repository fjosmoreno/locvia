"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botão de fechar AAA — usado em drawers, modais, painéis e overlays.
 *
 * Vem em 3 variantes:
 *  - `icon`   → só ícone X (32px). Para headers compactos (desktop, não-crítico).
 *  - `tap`    → ícone X, target 44x44px (mínimo WCAG 2.5.5). Padrão mobile.
 *  - `labeled` → ícone X + texto "Fechar", pill AAA com border e bg destacados.
 *                Pra ser IMPOSSÍVEL não ver. Usado no mobile bottom panel,
 *                no mobile sheet header e em todo overlay aberto por toque.
 *
 * AAA:
 *  - Touch target ≥ 44x44 (mesmo no variant `icon` com borda invisível)
 *  - Focus ring sempre visível (3px ciano)
 *  - Cor de hover destrutiva discreta (vermelho) — fechar é uma ação destrutiva
 *  - `aria-label` automático = "Fechar"
 *  - Respeita `prefers-reduced-motion`
 */
export type CloseButtonVariant = "icon" | "tap" | "labeled";

export interface CloseButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: CloseButtonVariant;
  /** Label visível. Default: "Fechar". Use "" pra omitir (sr-only) no variant "icon". */
  label?: string;
  /** Callback opcional — se passado, sobrescreve onClick. */
  onClose?: () => void;
}

export const CloseButton = React.forwardRef<HTMLButtonElement, CloseButtonProps>(
  function CloseButton(
    { variant = "tap", label = "Fechar", className, onClose, onClick, "aria-label": ariaLabel, ...rest },
    ref
  ) {
    function handle(e: React.MouseEvent<HTMLButtonElement>) {
      onClick?.(e);
      if (!e.defaultPrevented) onClose?.();
    }

    if (variant === "labeled") {
      return (
        <button
          ref={ref}
          type="button"
          onClick={handle}
          aria-label={ariaLabel ?? label}
          data-slot="close-button"
          data-variant="labeled"
          className={cn(
            // Touch target AAA — mínimo 44px
            "inline-flex items-center justify-center gap-1.5",
            "min-h-[44px] min-w-[44px] h-10 px-3.5 rounded-full",
            // Visual distinto — bg levemente mais claro que o sheet
            "bg-secondary/70 text-muted-foreground",
            "border border-border/80",
            // Hover/active — sinaliza destino de fechar
            "hover:bg-destructive/15 hover:text-destructive hover:border-destructive/40",
            "active:scale-95",
            // Focus AAA
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            // Reduced motion
            "motion-safe:transition-all motion-safe:duration-150",
            "cursor-pointer select-none",
            "-webkit-tap-highlight-color:transparent",
            className
          )}
          {...rest}
        >
          <X className="w-4 h-4 shrink-0" strokeWidth={2.4} aria-hidden />
          {label && (
            <span className="text-xs font-semibold tracking-tight">{label}</span>
          )}
        </button>
      );
    }

    if (variant === "icon") {
      // Compact desktop — 32px, mas com hit area expandida pra 44x44 invisível
      return (
        <button
          ref={ref}
          type="button"
          onClick={handle}
          aria-label={ariaLabel ?? label}
          data-slot="close-button"
          data-variant="icon"
          className={cn(
            // Visual 32x32, hit area 44x44 via padding
            "relative inline-grid place-items-center w-8 h-8 rounded-lg",
            "text-muted-foreground",
            // Área de toque invisível 44px (Apple HIG / Material)
            "before:absolute before:inset-[-6px] before:content-['']",
            // Hover
            "hover:bg-secondary hover:text-foreground",
            "active:scale-90",
            // Focus
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "motion-safe:transition-all motion-safe:duration-150",
            "cursor-pointer",
            "-webkit-tap-highlight-color:transparent",
            className
          )}
          {...rest}
        >
          <X className="w-4 h-4" strokeWidth={2.2} aria-hidden />
        </button>
      );
    }

    // variant === "tap" (default mobile)
    return (
      <button
        ref={ref}
        type="button"
        onClick={handle}
        aria-label={ariaLabel ?? label}
        data-slot="close-button"
        data-variant="tap"
        className={cn(
          // 44x44 mínimo (AAA)
          "inline-grid place-items-center w-11 h-11 rounded-xl",
          // Visual
          "bg-secondary/60 text-muted-foreground",
          "border border-border/70",
          // Hover
          "hover:bg-destructive/15 hover:text-destructive hover:border-destructive/40",
          "active:scale-95",
          // Focus AAA — ring grosso
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          // Reduced motion
          "motion-safe:transition-all motion-safe:duration-150",
          "cursor-pointer select-none",
          "-webkit-tap-highlight-color:transparent",
          className
        )}
        {...rest}
      >
        <X className="w-5 h-5" strokeWidth={2.2} aria-hidden />
      </button>
    );
  }
);
