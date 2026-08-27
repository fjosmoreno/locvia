"use client";

import { useHistory } from "@/hooks/use-history";
import { useSession } from "next-auth/react";
import { History, X, MapPinOff } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property/property-card";
import { useUI } from "@/lib/store";

export function HistoryDrawer() {
  const { drawer, closeDrawer } = useUI();
  const open = drawer === "history";
  const { data: session } = useSession();
  const { data, isLoading } = useHistory(open && !!session);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-4 border-b border-border flex-row items-center justify-between space-y-0">
          <SheetTitle className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> Imóveis vistos
          </SheetTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeDrawer}>
            <X className="w-4 h-4" />
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scroll-area p-3 space-y-3">
          {!session ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-muted grid place-items-center text-muted-foreground/60 mb-4">
                <History className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Faça login para ver seu histórico</h3>
              <p className="text-xs text-muted-foreground">Os imóveis que você visitar aparecerão aqui.</p>
            </div>
          ) : isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <PropertyCardSkeleton key={i} />)
          ) : !data?.length ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-muted grid place-items-center text-muted-foreground/60 mb-4">
                <MapPinOff className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Nenhum imóvel visto ainda</h3>
              <p className="text-xs text-muted-foreground">Explore imóveis no mapa para construir seu histórico.</p>
            </div>
          ) : (
            data.map((p: any) => <PropertyCard key={p.id} property={p} />)
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
