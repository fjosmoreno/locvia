"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUI } from "@/lib/store";
import { Topbar } from "@/components/layout/topbar";
import { ResultsPanel } from "@/components/property/results-panel";
import { PropertyDetail } from "@/components/property/property-detail";
import { FilterSheet } from "@/components/filters/filter-sheet";
import { AuthModal } from "@/components/auth/auth-modal";
import { FavoritesDrawer } from "@/components/favorites/favorites-drawer";
import { ReportModal } from "@/components/report/report-modal";
import { AgencyDashboard } from "@/components/agency/agency-dashboard";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { LocationPermissionPrompt } from "@/components/map/location-permission-prompt";
import { MobilePanel } from "@/components/layout/mobile-panel";
import { FilterChips } from "@/components/filters/filter-chips";
import { AiPanel } from "@/components/ai/ai-panel";
import { RoutePanel } from "@/components/route/route-panel";
import { CompareDrawer } from "@/components/compare/compare-drawer";
import { HistoryDrawer } from "@/components/history/history-drawer";
import { SavedSearchesDrawer } from "@/components/saved-searches/saved-searches-drawer";
import { FloatingShortcuts } from "@/components/layout/floating-shortcuts";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { panelView, selectedPropertyId, openPropertyById } = useUI();
  const searchParams = useSearchParams();
  const router = useRouter();
  const deepLinked = useRef(false);

  // Deep link: ?imovel=ID
  useEffect(() => {
    if (deepLinked.current) return;
    const id = searchParams.get("imovel");
    if (id) {
      openPropertyById(id);
      deepLinked.current = true;
    }
  }, [searchParams, openPropertyById]);

  // limpa o query param ao fechar
  useEffect(() => {
    if (!selectedPropertyId && deepLinked.current) {
      const url = new URL(window.location.href);
      url.searchParams.delete("imovel");
      router.replace(url.pathname + (url.search || ""), { scroll: false });
      deepLinked.current = false;
    }
  }, [selectedPropertyId, router]);

  const showDetail = panelView === "detail" && selectedPropertyId;

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-background flex">
      {/* Mapa (persistent) */}
      <div className="relative flex-1 min-w-0">
        <MapView />
        <Topbar />
        <FilterChips />
        <LocationPermissionPrompt />
        <AiPanel />
        <RoutePanel />
        <FloatingShortcuts />
      </div>

      {/* Painel lateral — desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col w-[380px] lg:w-[420px] xl:w-[460px] border-l border-border bg-card shrink-0",
          "mt-[68px] h-[calc(100dvh-68px)]"
        )}
      >
        {showDetail ? (
          <PropertyDetail propertyId={selectedPropertyId!} />
        ) : (
          <ResultsPanel />
        )}
      </aside>

      {/* Painel inferior — mobile */}
      <MobilePanel>
        {showDetail ? (
          <PropertyDetail propertyId={selectedPropertyId!} />
        ) : (
          <ResultsPanel />
        )}
      </MobilePanel>

      {/* Drawers / modais */}
      <FilterSheet />
      <AuthModal />
      <FavoritesDrawer />
      <HistoryDrawer />
      <CompareDrawer />
      <SavedSearchesDrawer />
      <AgencyDashboard />
      <AdminDashboard />
      <ReportModal />
    </div>
  );
}

const MapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
});
