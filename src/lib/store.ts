import { create } from "zustand";
import type { Filters, Property, UserLocation, PanelView } from "@/lib/types";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/constants";

type DrawerKind = null | "auth" | "favorites" | "agency" | "admin" | "filters" | "report" | "history" | "compare" | "saved-searches";

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

// ---- Pergunte ao LOCVIA (IA conversacional) ----
export interface AiMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  // snapshot dos imóveis retornados nesta resposta (para o mapa destacar)
  propertyIds?: string[];
}
export interface AiContext {
  open: boolean;
  loading: boolean;
  messages: AiMessage[];
  // filtros temporários aplicados pela IA (substituem os do mapa enquanto ativos)
  activeFilters: any | null;
  // imóveis destacados pela última resposta da IA
  highlightedIds: string[] | null;
  // origem do destaque: "ai" | "route" | null
  highlightSource: "ai" | "route" | null;
  // erro da última chamada
  error: string | null;
}

// ---- LOCVIA ROUTE (imóveis no caminho) ----
export interface RouteContext {
  open: boolean;
  loading: boolean;
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number; label?: string } | null;
  route: { lat: number; lng: number }[] | null; // geometria
  distance: number | null; // metros
  duration: number | null; // segundos
  properties: Property[]; // imóveis no caminho
  error: string | null;
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

  // Pergunte ao LOCVIA (IA) — contexto temporário, NÃO altera filtros permanentes
  ai: AiContext;
  // LOCVIA ROUTE — imóveis no caminho
  route: RouteContext;
  // Comparador de imóveis (até 3)
  compareIds: string[];

  // Hydration: começamos SEMPRE com defaults pra evitar mismatch SSR/CSR.
  // O client hidrata a sessionStorage num useEffect (via `hydrateFromSession`).
  hydrated: boolean;

  // actions
  setPanelView: (v: PanelView) => void;
  hydrateFromSession: () => void;
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
  // IA actions
  openAi: () => void;
  closeAi: () => void;
  setAiLoading: (v: boolean) => void;
  addAiMessage: (m: AiMessage) => void;
  setAiResult: (r: {
    reply: string;
    filters: any;
    propertyIds: string[];
  }) => void;
  setAiError: (e: string | null) => void;
  clearAi: () => void; // limpa destaque da IA (volta ao mapa normal)
  // ROUTE actions
  openRoute: () => void;
  closeRoute: () => void;
  setRouteOrigin: (o: { lat: number; lng: number } | null) => void;
  setRouteDestination: (d: { lat: number; lng: number; label?: string } | null) => void;
  setRouteGeometry: (g: { route: { lat: number; lng: number }[]; distance: number; duration: number } | null) => void;
  setRouteProperties: (p: Property[]) => void;
  setRouteLoading: (v: boolean) => void;
  setRouteError: (e: string | null) => void;
  clearRoute: () => void;
  // Comparador
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  setLoadingProperties: (v: boolean) => void;
  setPropertiesError: (e: string | null) => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  flyToTarget: { lat: number; lng: number; zoom?: number; nonce: number } | null;
  // Restaura posição inicial do mapa (localização do usuário ou centro default)
  resetMap: () => void;
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

// IMPORTANTE (hydration): não lemos sessionStorage no module scope.
// Servidor e cliente devem produzir o MESMO estado inicial — qualquer
// divergência aqui causa hydration mismatch e React re-renderiza toda
// a árvore inteira. A restauração da visão do mapa e dos filtros
// acontece em `useHydrateSessionState()` (chamado uma vez no AppShell).
let restoredView: MapView | null = null;
let restoredFilters: Filters | null = null;

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
  // SEMPRE defaults na inicialização — `hydrateFromSession` carrega sessionStorage
  // depois da hidratação, evitando mismatch entre server e client.
  filters: { ...DEFAULT_FILTERS },
  filtersDirty: false,
  drawer: null,
  reportPropertyId: null,
  mapBbox: null,
  mapCenter: { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng },
  exploreView: null,
  returnView: null,
  searchInAreaPrompt: false,
  loadingProperties: false,
  properties: [],
  propertiesError: null,
  flyToTarget: null,
  hydrated: false,

  // Pergunte ao LOCVIA — estado inicial
  ai: {
    open: false,
    loading: false,
    messages: [],
    activeFilters: null,
    highlightedIds: null,
    highlightSource: null,
    error: null,
  },
  // LOCVIA ROUTE — estado inicial
  route: {
    open: false,
    loading: false,
    origin: null,
    destination: null,
    route: null,
    distance: null,
    duration: null,
    properties: [],
    error: null,
  },
  // Comparador — vazio
  compareIds: [],

  setPanelView: (v) => set({ panelView: v }),

  /**
   * Hidrata o store com valores persistidos em sessionStorage.
   * Chamado UMA vez após o mount no client. Não faz nada no servidor.
   *
   * Por que existe: se lermos sessionStorage no module scope (top-level),
   * o servidor gera um estado e o client gera outro diferente — React
   * detecta o mismatch e re-renderiza toda a árvore. Aqui lemos DEPOIS
   * do hydration, então o primeiro render é idêntico em ambos os lados.
   */
  hydrateFromSession: () => {
    if (typeof window === "undefined") return;
    if (get().hydrated) return; // idempotente
    const view = loadMapView();
    const filters = loadFilters();
    set((s) => ({
      hydrated: true,
      exploreView: view,
      mapCenter: view
        ? { lat: view.lat, lng: view.lng }
        : s.mapCenter,
      filters: filters ?? s.filters,
    }));
  },

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

  // ---- Pergunte ao LOCVIA (IA) ----
  openAi: () => set((s) => ({ ai: { ...s.ai, open: true } })),
  closeAi: () => set((s) => ({ ai: { ...s.ai, open: false } })),
  setAiLoading: (v) => set((s) => ({ ai: { ...s.ai, loading: v } })),
  addAiMessage: (m) => set((s) => ({ ai: { ...s.ai, messages: [...s.ai.messages, m] } })),
  setAiResult: (r) =>
    set((s) => ({
      ai: {
        ...s.ai,
        loading: false,
        error: null,
        activeFilters: r.filters,
        highlightedIds: r.propertyIds.length ? r.propertyIds : null,
        highlightSource: r.propertyIds.length ? "ai" : s.ai.highlightSource,
        messages: [
          ...s.ai.messages,
          {
            role: "assistant" as const,
            content: r.reply,
            timestamp: Date.now(),
            propertyIds: r.propertyIds,
          },
        ],
      },
    })),
  setAiError: (e) =>
    set((s) => ({
      ai: {
        ...s.ai,
        loading: false,
        error: e,
        // se erro, não limpa o destaque anterior (mantém contexto)
      },
    })),
  clearAi: () =>
    set((s) => ({
      ai: {
        ...s.ai,
        activeFilters: null,
        highlightedIds: null,
        highlightSource: s.route.properties.length ? "route" : null,
        // mantém o histórico de mensagens — usuário pode continuar conversando
      },
    })),

  // ---- LOCVIA ROUTE ----
  openRoute: () => set((s) => ({ route: { ...s.route, open: true } })),
  closeRoute: () => set((s) => ({ route: { ...s.route, open: false } })),
  setRouteOrigin: (o) => set((s) => ({ route: { ...s.route, origin: o } })),
  setRouteDestination: (d) => set((s) => ({ route: { ...s.route, destination: d } })),
  setRouteGeometry: (g) =>
    set((s) => ({
      route: g
        ? {
            ...s.route,
            route: g.route,
            distance: g.distance,
            duration: g.duration,
          }
        : { ...s.route, route: null, distance: null, duration: null },
    })),
  setRouteProperties: (p) =>
    set((s) => ({
      route: { ...s.route, properties: p },
      // destaca imóveis da rota no mapa
      ai: {
        ...s.ai,
        highlightedIds: p.length ? p.map((x) => x.id) : null,
        highlightSource: p.length ? "route" : s.ai.highlightSource,
      },
    })),
  setRouteLoading: (v) => set((s) => ({ route: { ...s.route, loading: v } })),
  setRouteError: (e) => set((s) => ({ route: { ...s.route, error: e } })),
  clearRoute: () =>
    set((s) => ({
      route: {
        open: false,
        loading: false,
        origin: null,
        destination: null,
        route: null,
        distance: null,
        duration: null,
        properties: [],
        error: null,
      },
      ai: {
        ...s.ai,
        highlightedIds: s.ai.highlightSource === "route" ? null : s.ai.highlightIds,
        highlightSource: s.ai.highlightSource === "route" ? null : s.ai.highlightSource,
      },
    })),

  // ---- Comparador ----
  toggleCompare: (id) =>
    set((s) => {
      const exists = s.compareIds.includes(id);
      if (exists) return { compareIds: s.compareIds.filter((x) => x !== id) };
      if (s.compareIds.length >= 3) return { compareIds: [...s.compareIds.slice(1), id] };
      return { compareIds: [...s.compareIds, id] };
    }),
  clearCompare: () => set({ compareIds: [] }),

  flyTo: (lat, lng, zoom) =>
    set((s) => ({ flyToTarget: { lat, lng, zoom, nonce: Date.now() } })),

  resetMap: () => {
    // Restaura para a localização do usuário (se disponível) ou centro default
    const { userLocation } = get();
    const target = userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng, zoom: 15 }
      : { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng, zoom: DEFAULT_ZOOM };
    set({ flyToTarget: { ...target, nonce: Date.now() } });
  },
}));
