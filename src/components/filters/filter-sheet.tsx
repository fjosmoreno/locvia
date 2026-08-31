"use client";

import {
  SlidersHorizontal, Home, Building2, Store, DoorOpen, RotateCcw,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/close-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useUI } from "@/lib/store";
import {
  PURPOSES, PROPERTY_TYPES, PROPERTY_TYPE_LABELS, DISTANCE_OPTIONS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  APARTMENT: <Building2 className="w-4 h-4" />,
  HOUSE: <Home className="w-4 h-4" />,
  SHOP: <Store className="w-4 h-4" />,
  COMMERCIAL_ROOM: <DoorOpen className="w-4 h-4" />,
  OTHER: <Building2 className="w-4 h-4" />,
};

export function FilterSheet() {
  const { drawer, closeDrawer, filters, setFilters, resetFilters, userLocation } = useUI();
  const open = drawer === "filters";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0 gap-2">
          <SheetTitle className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">Filtros</span>
          </SheetTitle>
          <CloseButton variant="labeled" onClose={closeDrawer} className="shrink-0" />
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scroll-area px-4 py-4 space-y-6">
          {/* Finalidade */}
          <section className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Finalidade
            </Label>
            <ToggleGroup
              type="single"
              value={filters.purpose || ""}
              onValueChange={(v) => setFilters({ purpose: v || undefined })}
              className="grid grid-cols-2 gap-2 w-full"
            >
              <ToggleGroupItem value={PURPOSES.RENT} variant="outline" className="h-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Alugar
              </ToggleGroupItem>
              <ToggleGroupItem value={PURPOSES.SALE} variant="outline" className="h-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Comprar
              </ToggleGroupItem>
            </ToggleGroup>
          </section>

          <Separator />

          {/* Tipo */}
          <section className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tipo de imóvel
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(PROPERTY_TYPES).map((t) => {
                const active = filters.propertyTypes.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => {
                      const next = active
                        ? filters.propertyTypes.filter((x) => x !== t)
                        : [...filters.propertyTypes, t];
                      setFilters({ propertyTypes: next });
                    }}
                    className={cn(
                      "flex items-center gap-2 h-10 px-3 rounded-lg border text-sm transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-background hover:bg-accent/50"
                    )}
                  >
                    {TYPE_ICONS[t]}
                    {PROPERTY_TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* Preço */}
          <section className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Preço (R$)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Mínimo"
                  value={filters.minPrice ?? ""}
                  onChange={(e) =>
                    setFilters({ minPrice: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
              <div>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Máximo"
                  value={filters.maxPrice ?? ""}
                  onChange={(e) =>
                    setFilters({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            </div>
          </section>

          <Separator />
          <section className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Distância máxima{!userLocation && " (do centro do mapa)"}
            </Label>
            <Select
              value={String(filters.radius ?? 0)}
              onValueChange={(v) => setFilters({ radius: Number(v) || undefined })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISTANCE_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground/80 leading-snug">
              {userLocation
                ? "A partir da sua localização atual."
                : "Ative a localização para usar a sua, ou use o centro do mapa."}
            </p>
          </section>

          <Separator />

          {/* Características */}
          <section className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Características
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <SpecSelect
                label="Quartos"
                value={filters.bedrooms}
                onChange={(v) => setFilters({ bedrooms: v })}
              />
              <SpecSelect
                label="Banheiros"
                value={filters.bathrooms}
                onChange={(v) => setFilters({ bathrooms: v })}
              />
              <SpecSelect
                label="Vagas"
                value={filters.parkingSpaces}
                onChange={(v) => setFilters({ parkingSpaces: v })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Área mínima (m²)</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Ex: 50"
                value={filters.minArea ?? ""}
                onChange={(e) =>
                  setFilters({ minArea: e.target.value ? Number(e.target.value) : undefined })
                }
                className="mt-1"
              />
            </div>
          </section>
        </div>

        <div className="border-t border-border p-3 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={resetFilters}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Limpar
          </Button>
          <Button className="flex-1" onClick={closeDrawer}>
            Ver resultados
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SpecSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={value != null ? String(value) : "any"}
        onValueChange={(v) => onChange(v === "any" ? undefined : Number(v))}
      >
        <SelectTrigger className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Qualquer</SelectItem>
          <SelectItem value="1">1+</SelectItem>
          <SelectItem value="2">2+</SelectItem>
          <SelectItem value="3">3+</SelectItem>
          <SelectItem value="4">4+</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
