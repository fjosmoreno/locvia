"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

/** Registra visualização de imóvel no histórico (best-effort, não bloqueia UI). */
export function useTrackView() {
  const { data: session } = useSession();
  return useMutation({
    mutationFn: async (propertyId: string) => {
      if (!session) return; // só loga autenticado
      await fetch(`/api/history/${propertyId}`, { method: "POST" });
    },
    onError: () => {
      // best-effort — falha silenciosa
    },
  });
}

/** Lista imóveis vistos (histórico). */
export function useHistory(enabled: boolean) {
  return useQuery({
    queryKey: ["history"],
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/history");
      if (!res.ok) return [];
      const d = await res.json();
      return d.properties || [];
    },
  });
}
