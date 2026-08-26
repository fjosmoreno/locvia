import { create } from "zustand";
import type { Filters, Property, UserLocation, PanelView } from "@/lib/types";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/constants";

type DrawerKind = null | "auth" | "favorites" | "agency" | "admin" | "filters" | "report";

// Estado robusto de geolocalização (máquina de estados única)
export type LocationStatus =
  | "idle" // ainda não solicitado
  | "requesting" // em andamento
  | "success" // obtido
  | "denied" // usuário negou
  | "unavailable" // dispositivo/navegador sem geolocation
  | "timeout" // demorou demais
  | "error"; // outro erro

export interface MapView {
  lat: number;
  lng: number;
  zoom: number;
}

interface UIState {
  // painel direito / bottom sheet
  panelView: PanelView;
  selectedProperty: Property | null;
  selectedPropertyId: string | null;
  panelOpen: boolean;

  // localização do usuário — estado centralizado
  userLocation: UserLocation | null;
  locationStatus: LocationStatus;
  locationError: string | null;
  // compat legada (derivados)
  locating: boolean;
  locationDenied: boolean;

  // filtros
  filters: Filters;
  filtersDirty: boolean;

  // drawerrs / modais
  drawer: DrawerKind;
  reportPropertyId: string | null;

  // mapa — memória de posição
  mapBbox: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null;
  mapCenter: { lat: number; lng: number };
  exploreView: MapView | null; // visão de exploração do usuário (persistida)
  returnView: MapView | null; // snapshot ao abrir imóvel, para restaurar ao fechar
  searchInAreaPrompt: boolean;
  loadingProperties: boolean;
  properties: Property[];
  propertiesError: string | null;

  // actions
  setPanelView: (v: PanelView) => void;
  openProperty: (p: Property) => void;
  openPropertyById: (id: string) => void;
  closeProperty: () => void;
  setUserLocation: (l: UserLocation | null) => void;
  setLocationStatus: (s: LocationStatus, error?: string | null) => void;
  setLocating: (v: boolean) => void;
  setLocationDenied: (v: boolean) => void;
  setFilters: (f: Partial<Filters>) => void;
  resetFilters: () => void;
  setFiltersDirty: (v: boolean) => void;
  openDrawer: (d: DrawerKind) => void;
  closeDrawer: () => void;
  openReport: (propertyId: string) => void;
  closeReport: () => void;
  setMapBbox: (b: UIState["mapBbox"]) => void;
  setMapCenter: (c: { lat: number; lng: number }) => void;
  setExploreView: (v: MapView) => void;
  setReturnView: (v: MapView | null) => void;
  setSearchInAreaPrompt: (v: boolean) => void;
  setProperties: (p: Property[]) => void;
  setLoadingProperties: (v: boolean) => void;
  setPropertiesError: (e: string | null) => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  flyToTarget: { lat: number; lng: number; zoom?: number; nonce: number } | null;
}

const DEFAULT_FILTERS: Filters = {
  purpose: undefined,
  propertyTypes: [],
  minPrice: undefined,
  maxPrice: undefined,
  bedrooms: undefined,
  bathrooms: undefined,
  parkingSpaces: undefined,
  minArea: undefined,
  radius: undefined,
  search: undefined,
};

// ---- Persistência leve (sessionStorage) para memória de mapa + filtros ----
// Localização do usuário NÃO é persistida (privacidade/LGPD).
const SS_MAP = "locvia:mapView";
const SS_FILTERS = "locvia:filters";

function loadMapView(): MapView | null {
  if (typeof window === "undefined") return null;
  try {
    const s = window.sessionStorage.getItem(SS_MAP);
    if (!s) return null;
    const v = JSON.parse(s) as MapView;
    if (
      typeof v?.lat === "number" &&
      typeof v?.lng === "number" &&
      typeof v?.zoom === "number" &&
      v.lat >= -90 && v.lat <= 90 &&
      v.lng >= -180 && v.lng <= 180
    )
      return v;
    return null;
  } catch {
    return null;
  }
}

function loadFilters(): Filters | null {
  if (typeof window === "undefined") return null;
  try {
    const s = window.sessionStorage.getItem(SS_FILTERS);
    if (!s) return null;
    return { ...DEFAULT_FILTERS, ...JSON.parse(s) };
  } catch {
    return null;
  }
}

function saveMapView(v: MapView) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SS_MAP, JSON.stringify(v));
  } catch {
    /* noop */
  }
}

function saveFilters(f: Filters) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SS_FILTERS, JSON.stringify(f));
  } catch {
    /* noop */
  }
}

// Restauração lazy na inicialização do store
const restoredView = loadMapView();
const restoredFilters = loadFilters();

export const useUI = create<UIState>((set, get) => ({
  panelView: "list",
  selectedProperty: null,
  selectedPropertyId: null,
  panelOpen: false,
  userLocation: null,
  locationStatus: "idle",
  locationError: null,
  locating: false,
  locationDenied: false,
  filters: restoredFilters || { ...DEFAULT_FILTERS },
  filtersDirty: false,
  drawer: null,
  reportPropertyId: null,
  mapBbox: null,
  mapCenter: restoredView
    ? { lat: restoredView.lat, lng: restoredView.lng }
    : { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng },
  exploreView: restoredView,
  returnView: null,
  searchInAreaPrompt: false,
  loadingProperties: false,
  properties: [],
  propertiesError: null,
  flyToTarget: null,

  setPanelView: (v) => set({ panelView: v }),

  openProperty: (p) =>
    set((s) => ({
      selectedProperty: p,
      selectedPropertyId: p.id,
      panelView: "detail",
      panelOpen: true,
      // snapshot da visão de exploração atual para restaurar ao fechar
      // (só se ainda não houver — encadeamento de imóvel→imóvel preserva o original)
      returnView: s.returnView ?? s.exploreView,
    })),

  openPropertyById: (id) =>
    set((s) => ({
      selectedPropertyId: id,
      panelView: "detail",
      panelOpen: true,
      selectedProperty: null,
      returnView: s.returnView ?? s.exploreView,
    })),

  closeProperty: () => {
    const { returnView, flyTo } = get();
    // Restaura a visão de exploração anterior ao fechar o imóvel
    if (returnView) {
      flyTo(returnView.lat, returnView.lng, returnView.zoom);
    }
    set({
      selectedProperty: null,
      selectedPropertyId: null,
      panelView: "list",
      returnView: null,
    });
  },

  setUserLocation: (l) => set({ userLocation: l }),

  setLocationStatus: (status, error = null) =>
    set({
      locationStatus: status,
      locationError: error,
      locating: status === "requesting",
      locationDenied: status === "denied" || status === "unavailable",
    }),

  setLocating: (v) => set({ locating: v }),
  setLocationDenied: (v) => set({ locationDenied: v }),

  setFilters: (f) =>
    set((s) => {
      const next = { ...s.filters, ...f };
      saveFilters(next);
      return { filters: next, filtersDirty: true };
    }),
  resetFilters: () => {
    const next = { ...DEFAULT_FILTERS };
    saveFilters(next);
    set({ filters: next, filtersDirty: true });
  },
  setFiltersDirty: (v) => set({ filtersDirty: v }),

  openDrawer: (d) => set({ drawer: d }),
  closeDrawer: () => set({ drawer: null }),
  openReport: (propertyId) => set({ reportPropertyId: propertyId, drawer: "report" }),
  closeReport: () => set({ reportPropertyId: null, drawer: null }),

  setMapBbox: (b) => set({ mapBbox: b }),
  setMapCenter: (c) => set({ mapCenter: c }),

  setExploreView: (v) => {
    saveMapView(v);
    set({ exploreView: v, mapCenter: { lat: v.lat, lng: v.lng } });
  },
  setReturnView: (v) => set({ returnView: v }),

  setSearchInAreaPrompt: (v) => set({ searchInAreaPrompt: v }),
  setProperties: (p) => set({ properties: p }),
  setLoadingProperties: (v) => set({ loadingProperties: v }),
  setPropertiesError: (e) => set({ propertiesError: e }),

  flyTo: (lat, lng, zoom) =>
    set((s) => ({ flyToTarget: { lat, lng, zoom, nonce: Date.now() } })),
}));
