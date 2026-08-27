"use client";

import { useCallback, useEffect, useRef } from "react";
import { useUI, type LocationStatus } from "@/lib/store";

/**
 * Hook robusto de geolocalização — máquina de estados centralizada.
 *
 * Estados: idle | requesting | success | denied | unavailable | timeout | error
 *
 * Robustez mobile:
 * - timeout 15s (GPS frio no iOS Safari costuma precisar disso)
 * - enableHighAccuracy true (precisão de rua); maximumAge 30s evita re-fetch desnecessário
 * - visibilitychange: ao voltar ao app, atualiza silenciosamente se já estava localizado
 * - não usa watchPosition (bateria); one-shot + refresh manual/visibilidade
 * - NÃO persiste localização (LGPD/privacidade) — apenas em memória
 *
 * Uso:
 *   const { status, location, error, message, request, reset } = useUserLocation();
 */

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 30000,
};

const ERROR_MESSAGES: Record<LocationStatus, string> = {
  idle: "",
  requesting: "",
  success: "",
  denied:
    "Não conseguimos acessar sua localização. Ative a permissão do navegador para encontrar imóveis próximos.",
  unavailable:
    "Seu dispositivo ou navegador não suporta geolocalização.",
  timeout:
    "Demoramos demais para obter sua localização. Tente novamente.",
  error:
    "Não foi possível obter sua localização agora. Tente novamente.",
};

export interface UseUserLocation {
  status: LocationStatus;
  location: { lat: number; lng: number; accuracy?: number } | null;
  error: string | null;
  message: string;
  /** Solicita localização. fly=true centraliza o mapa (default). silent=true não mostra erros. */
  request: (opts?: { silent?: boolean; fly?: boolean; zoom?: number }) => void;
  /** Limpa o estado de localização (sem revogar permissão do navegador). */
  reset: () => void;
}

export function useUserLocation(): UseUserLocation {
  const {
    userLocation,
    locationStatus,
    locationError,
    setUserLocation,
    setLocationStatus,
    flyTo,
  } = useUI();

  // Evita múltiplas chamadas concorrentes de getCurrentPosition
  const inflight = useRef(false);

  const request = useCallback(
    (opts?: { silent?: boolean; fly?: boolean; zoom?: number }) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setLocationStatus("unavailable");
        return;
      }
      if (inflight.current) return;
      inflight.current = true;

      const fly = opts?.fly !== false;
      const zoom = opts?.zoom ?? 15;

      setLocationStatus("requesting");

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          inflight.current = false;
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setUserLocation(loc);
          setLocationStatus("success");
          if (fly) flyTo(loc.lat, loc.lng, zoom);
        },
        (err) => {
          inflight.current = false;
          let status: LocationStatus = "error";
          if (err.code === err.PERMISSION_DENIED) status = "denied";
          else if (err.code === err.POSITION_UNAVAILABLE) status = "unavailable";
          else if (err.code === err.TIMEOUT) status = "timeout";
          setLocationStatus(status, err.message || null);
        },
        GEO_OPTIONS
      );
    },
    [setUserLocation, setLocationStatus, flyTo]
  );

  const reset = useCallback(() => {
    inflight.current = false;
    setUserLocation(null);
    setLocationStatus("idle");
  }, [setUserLocation, setLocationStatus]);

  // Ao voltar ao app (visibilitychange), atualiza localização silenciosamente
  // se já estava localizado — mantém precisão sem incomodar o usuário.
  useEffect(() => {
    if (typeof document === "undefined") return;
    function onVisibility() {
      if (
        document.visibilityState === "visible" &&
        useUI.getState().locationStatus === "success" &&
        !inflight.current
      ) {
        // refresh silencioso: não voa o mapa, não mostra erros
        inflight.current = true;
        setLocationStatus("requesting");
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            inflight.current = false;
            setUserLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
            setLocationStatus("success");
          },
          () => {
            inflight.current = false;
            // em caso de falha no refresh, mantém o último success conhecido
            setLocationStatus("success");
          },
          { ...GEO_OPTIONS, timeout: 10000 }
        );
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [setUserLocation, setLocationStatus]);

  return {
    status: locationStatus,
    location: userLocation,
    error: locationError,
    message: ERROR_MESSAGES[locationStatus],
    request,
    reset,
  };
}

/** Compat: nome antigo usado em alguns componentes. */
export const useGeolocation = useUserLocation;
