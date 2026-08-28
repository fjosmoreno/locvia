"use client";

import { useQuery } from "@tanstack/react-query";
import { useUI } from "@/lib/store";
import type { Property, Filters } from "@/lib/types";
import { useDebouncedValue } from "@/hooks/use-debounced";

function buildBboxParams(filters: Partial<Filters> & Record<string, any>, bbox: any, origin: any): URLSearchParams {
  const sp = new URLSearchParams();
  if (filters.purpose) sp.set("purpose", filters.purpose);
  for (const t of filters.propertyTypes || []) sp.append("propertyType", t);
  if (filters.minPrice != null) sp.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) sp.set("maxPrice", String(filters.maxPrice));
  if (filters.bedrooms != null) sp.set("bedrooms", String(filters.bedrooms));
  if (filters.bathrooms != null) sp.set("bathrooms", String(filters.bathrooms));
  if (filters.parkingSpaces != null) sp.set("parkingSpaces", String(filters.parkingSpaces));
  if (filters.minArea != null) sp.set("minArea", String(filters.minArea));
  if (filters.maxArea != null) sp.set("maxArea", String(filters.maxArea));
  if (filters.search) sp.set("search", filters.search);
  if (bbox) {
    sp.set("minLat", String(bbox.minLat));
    sp.set("maxLat", String(bbox.maxLat));
    sp.set("minLng", String(bbox.minLng));
    sp.set("maxLng", String(bbox.maxLng));
  }
  if (origin) {
    sp.set("originLat", String(origin.lat));
    sp.set("originLng", String(origin.lng));
  }
  sp.set("limit", "400");
  return sp;
}

function buildNearbyParams(
  filters: Partial<Filters> & Record<string, any>,
  center: { lat: number; lng: number }
): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set("lat", String(center.lat));
  sp.set("lng", String(center.lng));
  if (filters.radius != null) sp.set("radius", String(filters.radius));
  if (filters.purpose) sp.set("purpose", filters.purpose);
  for (const t of filters.propertyTypes || []) sp.append("propertyType", t);
  if (filters.minPrice != null) sp.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) sp.set("maxPrice", String(filters.maxPrice));
  if (filters.bedrooms != null) sp.set("bedrooms", String(filters.bedrooms));
  if (filters.bathrooms != null) sp.set("bathrooms", String(filters.bathrooms));
  if (filters.parkingSpaces != null) sp.set("parkingSpaces", String(filters.parkingSpaces));
  if (filters.minArea != null) sp.set("minArea", String(filters.minArea));
  sp.set("limit", "400");
  return sp;
}

/**
 * Query principal de imóveis no mapa (reage a filtros + radius).
 *
 * Estratégia: a query SEMPRE busca TODOS os imóveis com `status=ACTIVE` que
 * casam os filtros ativos (purpose/tipo/preço/etc), SEM filtrar pelo bbox do
 * mapa visível. Isso garante que:
 * - O usuário sempre vê TODOS os imóveis cadastrados no painel de resultados.
 * - O mapa (via `useCluster`/Supercluster) cuida de mostrar apenas os
 *   imóveis do viewport atual, agrupando em clusters quando há muitos.
 *
 * Excessão: se `filters.radius > 0`, a busca muda para o endpoint
 * `/api/properties/nearby` (busca por raio a partir de um ponto — userLocation
 * com prioridade, mapCenter como fallback).
 */
export function useProperties(enabled: boolean) {
  const { filters, mapCenter, userLocation, ai } = useUI();
  const debouncedFilters = useDebouncedValue(filters, 400);
  const debouncedMapCenter = useDebouncedValue(mapCenter, 500);

  // Quando a IA tem filtros ativos, eles SOBRESCREVEM os filtros permanentes do mapa
  // (modo temporário). A busca da IA não usa bbox (consulta por contexto, não área visível).
  const aiActive = ai.highlightSource === "ai" && ai.activeFilters;
  const effectiveFilters = aiActive ? ai.activeFilters : debouncedFilters;

  // Filtro de raio: prioriza localização do usuário, senão centro do mapa
  const hasRadius = (effectiveFilters?.radius ?? 0) > 0;
  const radiusCenter = userLocation ?? debouncedMapCenter;
  const useNearby = hasRadius && !!radiusCenter;

  return useQuery<Property[]>({
    queryKey: [
      "properties",
      effectiveFilters,
      useNearby ? { mode: "nearby", center: radiusCenter } : { mode: "all" },
      ai.highlightSource,
    ],
    enabled,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      if (useNearby) {
        const sp = buildNearbyParams(effectiveFilters, radiusCenter!);
        const res = await fetch(`/api/properties/nearby?${sp.toString()}`);
        if (!res.ok) throw new Error("Falha ao buscar imóveis próximos");
        const data = await res.json();
        return data.properties as Property[];
      }
      // Sem bbox — a query retorna todos os imóveis que casam os filtros.
      // O `useCluster` no mapa filtra pelo viewport automaticamente.
      const origin = userLocation
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : undefined;
      const sp = buildBboxParams(effectiveFilters, null, origin);
      const res = await fetch(`/api/properties?${sp.toString()}`);
      if (!res.ok) throw new Error("Falha ao carregar imóveis");
      const data = await res.json();
      return data.properties as Property[];
    },
  });
}

/** Busca imóveis por raio a partir de um ponto (usado no "pesquisar próximos"). */
export function useNearbyProperties(
  center: { lat: number; lng: number } | null,
  radius: number,
  filters: Filters,
  enabled: boolean
) {
  return useQuery<Property[]>({
    queryKey: ["nearby", center, radius, filters],
    enabled: enabled && !!center,
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("lat", String(center!.lat));
      sp.set("lng", String(center!.lng));
      sp.set("radius", String(radius));
      if (filters.purpose) sp.set("purpose", filters.purpose);
      for (const t of filters.propertyTypes) sp.append("propertyType", t);
      if (filters.minPrice != null) sp.set("minPrice", String(filters.minPrice));
      if (filters.maxPrice != null) sp.set("maxPrice", String(filters.maxPrice));
      if (filters.bedrooms != null) sp.set("bedrooms", String(filters.bedrooms));
      if (filters.bathrooms != null) sp.set("bathrooms", String(filters.bathrooms));
      if (filters.parkingSpaces != null) sp.set("parkingSpaces", String(filters.parkingSpaces));
      if (filters.minArea != null) sp.set("minArea", String(filters.minArea));
      const res = await fetch(`/api/properties/nearby?${sp.toString()}`);
      if (!res.ok) throw new Error("Falha ao buscar imóveis próximos");
      const data = await res.json();
      return data.properties as Property[];
    },
  });
}
