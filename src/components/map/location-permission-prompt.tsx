"use client";

import { useState } from "react";
import { X, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserLocation } from "@/hooks/use-geolocation";
import { useUI } from "@/lib/store";

/**
 * Card flutuante de geolocalização — só aparece em estado de FALHA
 * (denied / timeout / error / unavailable) com mensagem clara + tentar novamente.
 *
 * Em idle/success/requesting não aparece (o auto-request e o botão de localização
 * no mapa cuidam do fluxo normal). Dismissal é escopado por status: ao mudar,
 * o card reaparece automaticamente.
 */
export function LocationPermissionPrompt() {
  const { status, request, message } = useUserLocation();
  const { drawer } = useUI();
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  const failed =
    status === "denied" ||
    status === "timeout" ||
    status === "error" ||
    status === "unavailable";

  const visible = failed && dismissedFor !== status && !drawer;
  if (!visible) return null;

  function dismiss() {
    setDismissedFor(status);
  }
  function handleRetry() {
    setDismissedFor(null);
    request();
  }

  return (
    <div className="absolute z-[1040] left-1/2 -translate-x-1/2 top-[64px] sm:top-[72px] pointer-events-none animate-panel-in">
      <div
        className="pointer-events-auto rounded-full pl-2.5 pr-2 py-2 flex items-center gap-2.5 max-w-[calc(100vw-32px)]"
        style={{
          background: "rgba(19, 28, 49, 0.92)",
          backdropFilter: "saturate(180%) blur(18px)",
          WebkitBackdropFilter: "saturate(180%) blur(18px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="w-6 h-6 rounded-full grid place-items-center shrink-0"
          style={{
            background: "rgba(251, 146, 60, 0.16)",
            color: "oklch(0.78 0.16 65)",
          }}
        >
          <AlertCircle className="w-3.5 h-3.5" />
        </div>
        <span className="text-[12px] font-medium text-foreground/90 truncate max-w-[200px] sm:max-w-[280px]">
          Localização indisponível
        </span>
        {status !== "unavailable" && (
          <button
            onClick={handleRetry}
            className="shrink-0 rounded-full min-h-[36px] h-9 px-3.5 text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RefreshCw className="w-3 h-3" />
            Tentar
          </button>
        )}
        <button
          onClick={dismiss}
          className="shrink-0 w-9 h-9 grid place-items-center text-muted-foreground hover:text-foreground rounded-full transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Dispensar aviso de localização"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
