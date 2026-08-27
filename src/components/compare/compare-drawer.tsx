"use client";

import { useQuery } from "@tanstack/react-query";
import {
  X, GitCompare, Check, Minus, BedDouble, Bath, Car, Maximize, MapPin, BadgeCheck,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUI } from "@/lib/store";
import { formatPrice } from "@/lib/geo";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";
import type { Property } from "@/lib/types";

export function CompareDrawer() {
  const { drawer, closeDrawer, compareIds, toggleCompare, clearCompare, openProperty } = useUI();
  const open = drawer === "compare";

  const { data, isLoading } = useQuery<Property[]>({
    queryKey: ["compare", compareIds],
    enabled: open && compareIds.length > 0,
    queryFn: async () => {
      const res = await fetch(`/api/compare?ids=${compareIds.join(",")}`);
      if (!res.ok) return [];
      const d = await res.json();
      return d.properties || [];
    },
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col">
        <SheetHeader className="px-4 py-4 border-b border-border flex-row items-center justify-between space-y-0">
          <SheetTitle className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-primary" />
            Comparar imóveis
            <span className="text-xs text-muted-foreground font-normal">
              {compareIds.length}/3
            </span>
          </SheetTitle>
          <div className="flex items-center gap-2">
            {compareIds.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCompare} className="text-xs">
                Limpar
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeDrawer}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scroll-area">
          {compareIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 px-6">
              <div className="w-16 h-16 rounded-2xl bg-muted grid place-items-center text-muted-foreground/60 mb-4">
                <GitCompare className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Selecione imóveis para comparar
              </h3>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                Toque no ícone de comparar nos cards para adicionar até 3 imóveis aqui.
              </p>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-3 gap-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="p-4">
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(data?.length || 1, 1)}, minmax(0, 1fr))` }}>
                {data?.map((p) => (
                  <CompareColumn key={p.id} property={p} onRemove={() => toggleCompare(p.id)} onView={() => { closeDrawer(); openProperty(p); }} />
                ))}
              </div>

              {/* Tabela comparativa de features */}
              {data && data.length >= 2 && (
                <div className="mt-6 rounded-2xl border border-border overflow-hidden">
                  <CompareTable properties={data} />
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CompareColumn({ property: p, onRemove, onView }: { property: Property; onRemove: () => void; onView: () => void }) {
  const img = p.images[0]?.url;
  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-card">
      <div className="relative aspect-[4/3] bg-muted">
        {img ? (
           
          <img src={img} alt={p.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground text-xs">Sem foto</div>
        )}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-full bg-black/60 backdrop-blur text-white hover:bg-black/80"
          aria-label="Remover do comparador"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div className="price text-lg font-bold text-primary leading-none">
          {formatPrice(p.price, p.purpose)}
        </div>
        <div className="text-xs font-medium text-foreground clamp-2">{p.title}</div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5" />
          {p.neighborhood} · {p.city}
        </div>
        <Button size="sm" variant="secondary" className="w-full mt-2 text-xs h-8" onClick={onView}>
          Ver detalhes
        </Button>
      </div>
    </div>
  );
}

function CompareTable({ properties }: { properties: Property[] }) {
  const rows: { label: string; icon: React.ReactNode; get: (p: Property) => string }[] = [
    { label: "Tipo", icon: <BadgeCheck className="w-3.5 h-3.5" />, get: (p) => PROPERTY_TYPE_LABELS[p.propertyType] || p.propertyType },
    { label: "Finalidade", icon: <MapPin className="w-3.5 h-3.5" />, get: (p) => (p.purpose === "RENT" ? "Aluguel" : "Venda") },
    { label: "Preço", icon: <MapPin className="w-3.5 h-3.5" />, get: (p) => formatPrice(p.price, p.purpose) },
    { label: "Área", icon: <Maximize className="w-3.5 h-3.5" />, get: (p) => (p.area ? `${p.area} m²` : "—") },
    { label: "Quartos", icon: <BedDouble className="w-3.5 h-3.5" />, get: (p) => (p.bedrooms != null ? String(p.bedrooms) : "—") },
    { label: "Banheiros", icon: <Bath className="w-3.5 h-3.5" />, get: (p) => (p.bathrooms != null ? String(p.bathrooms) : "—") },
    { label: "Vagas", icon: <Car className="w-3.5 h-3.5" />, get: (p) => (p.parkingSpaces != null ? String(p.parkingSpaces) : "—") },
    { label: "Condomínio", icon: <MapPin className="w-3.5 h-3.5" />, get: (p) => (p.condominium ? formatPrice(p.condominium) : "—") },
    { label: "IPTU", icon: <MapPin className="w-3.5 h-3.5" />, get: (p) => (p.iptu ? formatPrice(p.iptu) : "—") },
    { label: "Preço/m²", icon: <Maximize className="w-3.5 h-3.5" />, get: (p) => (p.area && p.price ? `${(p.price / p.area).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}` : "—") },
  ];

  return (
    <div className="overflow-x-auto scroll-area">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Comparativo</th>
            {properties.map((p) => (
              <th key={p.id} className="text-left px-3 py-2 font-medium text-foreground clamp-1 max-w-[120px]">
                {p.title.slice(0, 30)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-2 text-muted-foreground flex items-center gap-1.5">
                {row.icon}
                {row.label}
              </td>
              {properties.map((p) => (
                <td key={p.id} className="px-3 py-2 text-foreground font-medium">
                  {row.get(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
