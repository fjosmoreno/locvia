import { create } from "zustand";
import type { Filters, Property, UserLocation, PanelView } from "@/lib/types";

type DrawerKind = null | "auth" | "favorites" | "agency" | "admin" | "filters" | "report";

interface UIState {
  // painel direito / bottom sheet
  panelView: PanelView;
  selectedProperty: Property | null;
  selectedPropertyId: string | null; // para abrir via ?imovel=ID
  panelOpen: boolean;

  // localização do usuário
  userLocation: UserLocation | null;
  locating: boolean;
  locationDenied: boolean;

  // filtros
  filters: Filters;
  filtersDirty: boolean;

  // drawerrs / modais
  drawer: DrawerKind;
  reportPropertyId: string | null;

  // mapa
  mapBbox: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null;
  mapCenter: { lat: number; lng: number };
  searchInAreaPrompt: boolean; // mostrar botão "Pesquisar nesta área"
  loadingProperties: boolean;
  properties: Property[];
  propertiesError: string | null;

  // actions
  setPanelView: (v: PanelView) => void;
  openProperty: (p: Property) => void;
  openPropertyById: (id: string) => void;
  closeProperty: () => void;
  setUserLocation: (l: UserLocation | null) => void;
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

export const useUI = create<UIState>((set, get) => ({
  panelView: "list",
  selectedProperty: null,
  selectedPropertyId: null,
  panelOpen: false,
  userLocation: null,
  locating: false,
  locationDenied: false,
  filters: { ...DEFAULT_FILTERS },
  filtersDirty: false,
  drawer: null,
  reportPropertyId: null,
  mapBbox: null,
  mapCenter: { lat: -19.9245, lng: -43.9352 },
  searchInAreaPrompt: false,
  loadingProperties: false,
  properties: [],
  propertiesError: null,
  flyToTarget: null,

  setPanelView: (v) => set({ panelView: v }),
  openProperty: (p) =>
    set({ selectedProperty: p, selectedPropertyId: p.id, panelView: "detail", panelOpen: true }),
  openPropertyById: (id) =>
    set({ selectedPropertyId: id, panelView: "detail", panelOpen: true, selectedProperty: null }),
  closeProperty: () =>
    set({ selectedProperty: null, selectedPropertyId: null, panelView: "list" }),
  setUserLocation: (l) => set({ userLocation: l }),
  setLocating: (v) => set({ locating: v }),
  setLocationDenied: (v) => set({ locationDenied: v }),
  setFilters: (f) =>
    set((s) => ({ filters: { ...s.filters, ...f }, filtersDirty: true })),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS }, filtersDirty: true }),
  setFiltersDirty: (v) => set({ filtersDirty: v }),
  openDrawer: (d) => set({ drawer: d }),
  closeDrawer: () => set({ drawer: null }),
  openReport: (propertyId) => set({ reportPropertyId: propertyId, drawer: "report" }),
  closeReport: () => set({ reportPropertyId: null, drawer: null }),
  setMapBbox: (b) => set({ mapBbox: b }),
  setMapCenter: (c) => set({ mapCenter: c }),
  setSearchInAreaPrompt: (v) => set({ searchInAreaPrompt: v }),
  setProperties: (p) => set({ properties: p }),
  setLoadingProperties: (v) => set({ loadingProperties: v }),
  setPropertiesError: (e) => set({ propertiesError: e }),
  flyTo: (lat, lng, zoom) =>
    set((s) => ({ flyToTarget: { lat, lng, zoom, nonce: Date.now() } })),
}));
