"use client";

import { useQuery } from "@tanstack/react-query";
import { Heart, MapPinOff } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CloseButton } from "@/components/ui/close-button";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property/property-card";
import { useUI } from "@/lib/store";
import { useSession } from "next-auth/react";
import type { Property } from "@/lib/types";

export function FavoritesDrawer() {
  const { drawer, closeDrawer } = useUI();
  const open = drawer === "favorites";
  const { data: session } = useSession();

  const { data, isLoading } = useQuery<Property[]>({
    queryKey: ["favorites"],
    enabled: open && !!session,
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      if (!res.ok) return [];
      const d = await res.json();
      return d.properties;
    },
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0 gap-2">
          <SheetTitle className="flex items-center gap-2 min-w-0">
            <Heart className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="truncate">Meus favoritos</span>
          </SheetTitle>
          <CloseButton variant="labeled" onClose={closeDrawer} className="shrink-0" />
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scroll-area p-3 space-y-3">
          {!session ? (
            <Empty
              icon={<Heart className="w-10 h-10" />}
              title="Faça login para ver seus favoritos."
            />
          ) : isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <PropertyCardSkeleton key={i} />)
          ) : !data?.length ? (
            <Empty
              icon={<MapPinOff className="w-10 h-10" />}
              title="Você ainda não salvou nenhum imóvel."
              description="Toque no coração dos imóveis no mapa para salvá-los aqui."
            />
          ) : (
            data.map((p) => <PropertyCard key={p.id} property={p} />)
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Empty({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-muted grid place-items-center text-muted-foreground mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-xs text-muted-foreground max-w-[260px]">{description}</p>}
    </div>
  );
}
