"use client";

import { useCallback } from "react";
import { useUI } from "@/lib/store";

/** Hook de geolocalização — solicita permissão e atualiza o store. */
export function useGeolocation() {
  const {
    setUserLocation,
    setLocating,
    setLocationDenied,
    flyTo,
    userLocation,
  } = useUI();

  const locate = useCallback(
    (opts?: { silent?: boolean; fly?: boolean }) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        if (!opts?.silent) setLocationDenied(true);
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setUserLocation(loc);
          setLocating(false);
          setLocationDenied(false);
          if (opts?.fly !== false) flyTo(loc.lat, loc.lng, 15);
        },
        (err) => {
          setLocating(false);
          if (err.code === err.PERMISSION_DENIED) {
            setLocationDenied(true);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    },
    [setUserLocation, setLocating, setLocationDenied, flyTo]
  );

  return { locate, userLocation };
}
