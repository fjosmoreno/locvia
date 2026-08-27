"use client";

import { useState } from "react";
import { MapPin, X, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserLocation } from "@/hooks/use-geolocation";

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
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  const failed =
    status === "denied" ||
    status === "timeout" ||
    status === "error" ||
    status === "unavailable";

  const visible = failed && dismissedFor !== status;
  if (!visible) return null;

  function dismiss() {
    setDismissedFor(status);
  }
  function handleRetry() {
    setDismissedFor(null);
    request();
  }

  return (
    <div className="absolute z-[1040] left-1/2 -translate-x-1/2 top-[120px] sm:top-[128px] w-[calc(100%-24px)] max-w-md animate-panel-in pointer-events-none">
      <div className="pointer-events-auto glass-surface shadow-lg rounded-2xl border border-destructive/20 p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-destructive/10 text-destructive">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">Localização indisponível</div>
          <div className="text-[11px] text-muted-foreground">{message}</div>
        </div>
        {status !== "unavailable" && (
          <Button
            size="sm"
            className="shrink-0 rounded-full h-8"
            onClick={handleRetry}
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Tentar
          </Button>
        )}
        <button
          onClick={dismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground p-1"
          aria-label="Dispensar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
