"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

/** Hook de favoritos: status + toggle. */
export function useFavorite(propertyId: string) {
  const { data: session } = useSession();
  const qc = useQueryClient();

  const { data: favorites = [] } = useQuery<string[]>({
    queryKey: ["favorites-ids"],
    enabled: !!session,
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      if (!res.ok) return [];
      const d = await res.json();
      return (d.properties || []).map((p: any) => p.id);
    },
    staleTime: 60_000,
  });

  const isFavorited = favorites.includes(propertyId);

  const mutation = useMutation({
    mutationFn: async () => {
      const method = isFavorited ? "DELETE" : "POST";
      const url = isFavorited
        ? `/api/favorites/${propertyId}`
        : "/api/favorites";
      const body = isFavorited ? undefined : JSON.stringify({ propertyId });
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body,
      });
      if (!res.ok) throw new Error();
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["favorites-ids"] });
      const prev = qc.getQueryData<string[]>(["favorites-ids"]) || [];
      qc.setQueryData<string[]>(
        ["favorites-ids"],
        isFavorited ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(["favorites-ids"], ctx?.prev || []);
      toast.error("Não foi possível atualizar favoritos.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
    onSuccess: () => {
      toast.success(
        isFavorited ? "Removido dos favoritos" : "Adicionado aos favoritos",
        { duration: 1800 }
      );
    },
  });

  return {
    isFavorited,
    canFavorite: !!session,
    toggle: () => {
      if (!session) {
        toast.info("Faça login para favoritar imóveis.");
        return;
      }
      mutation.mutate();
    },
  };
}

/** Hook para registrar lead/interação. */
export function useLead() {
  return useMutation({
    mutationFn: async (input: { propertyId: string; source: string; message?: string; contact?: string }) => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onError: () => {
      // falha silenciosa para o usuário (lead é best-effort)
    },
  });
}
