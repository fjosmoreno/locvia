"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import Supercluster from "supercluster";
import type { Map as MLMap, MapboxMouseEvent } from "maplibre-gl";
import { useUI } from "@/lib/store";
import { useProperties } from "@/hooks/use-properties";
import { useUserLocation } from "@/hooks/use-geolocation";
import { formatPrice } from "@/lib/geo";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/constants";
import { MapControls, SearchInAreaPrompt } from "@/components/map/map-overlays";
import type { Property } from "@/lib/types";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || "";

/**
 * Estilo do mapa — estratégia DARK premium coesa com o app LOCVIA:
 * 1. MapTiler "basic" (vector tiles premium) se a chave funcionar
 * 2. Fallback: estilo raster CARTO dark_all (sempre funciona, alta compatibilidade)
 *
 * Raster tiles são mais compatíveis que vector tiles (funcionam mesmo em
 * headless Chromium com WebGL limitado). Visual DARK coeso com o navy do app,
 * faz o ciano (#00D4FF) e os marcadores brancos saltarem — padrão Apple/Stripe.
 */
const MAPTILER_STYLE = `https://api.maptiler.com/maps/basic/style.json?key=${MAPTILER_KEY}`;

// Estilo raster DARK premium (CARTO dark_all) — sempre renderiza
const FALLBACK_STYLE = {
  version: 8 as const,
  name: "LOCVIA Dark",
  sources: {
    "osm-tiles": {
      type: "raster" as const,
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contribuidores",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm-tiles",
      type: "raster" as const,
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 22,
      paint: {
        // Leve ajuste para coesão com o navy do app — dim sutil + contraste
        "raster-saturation": -0.08,
        "raster-contrast": 0.08,
        "raster-brightness-min": 0.0,
        "raster-brightness-max": 0.96,
        "raster-opacity": 0.96,
      },
    },
  ],
};

let maptilerChecked = false;
let maptilerOk = false;

async function getMapStyle(): Promise<any> {
  if (!MAPTILER_KEY) return FALLBACK_STYLE;
  if (maptilerChecked) return maptilerOk ? MAPTILER_STYLE : FALLBACK_STYLE;
  try {
    const res = await fetch(MAPTILER_STYLE, { method: "GET" });
    if (!res.ok) {
      maptilerOk = false;
      maptilerChecked = true;
      return FALLBACK_STYLE;
    }
    const data = await res.json();
    if (!data || typeof data.version !== "number") {
      maptilerOk = false;
      maptilerChecked = true;
      return FALLBACK_STYLE;
    }
    maptilerOk = true;
    maptilerChecked = true;
    return MAPTILER_STYLE;
  } catch {
    maptilerOk = false;
    maptilerChecked = true;
    return FALLBACK_STYLE;
  }
}

// ---------- Marcador de preço ----------

function PriceMarker({
  property,
  selected,
  onClick,
}: {
  property: Property;
  selected: boolean;
  onClick: () => void;
}) {
  const featured = property.featured;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`price-marker${featured ? " is-featured" : ""}${selected ? " is-selected" : ""}`}
      aria-label={property.title}
    >
      {featured && <span className="badge-dot" />}
      <span>{formatPrice(property.price, property.purpose)}</span>
    </button>
  );
}

function UserMarker() {
  return (
    <div className="user-marker">
      <div className="pulse" />
      <div className="dot" />
    </div>
  );
}

// ---------- Cluster manager ----------

function useCluster(properties: Property[], mapRef: React.RefObject<MLMap | null>) {
  const scRef = useRef<Supercluster | null>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const lastView = useRef<{ bbox: [number, number, number, number] | null; zoom: number }>({
    bbox: null,
    zoom: 0,
  });

  // indexa imóveis no supercluster
  useEffect(() => {
    const points = properties.map((p) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.longitude, p.latitude] as [number, number] },
      properties: { cluster: false, propertyId: p.id, property: p },
    }));
    scRef.current = new Supercluster({ radius: 56, maxZoom: 16 });
    scRef.current.load(points as any);
    // re-update com bbox ATUAL do mapa (não o lastView que pode estar desatualizado)
    if (mapRef.current) {
      const b = mapRef.current.getBounds();
      const bbox: [number, number, number, number] = [
        b.getWest(), b.getSouth(), b.getEast(), b.getNorth(),
      ];
      lastView.current = { bbox, zoom: mapRef.current.getZoom() };
      setClusters(scRef.current.getClusters(bbox, Math.floor(mapRef.current.getZoom())));
    } else if (lastView.current.bbox) {
      setClusters(scRef.current.getClusters(lastView.current.bbox, Math.floor(lastView.current.zoom)));
    }
  }, [properties, mapRef]);

  const updateClusters = useCallback(
    (bbox: [number, number, number, number], zoom: number) => {
      lastView.current = { bbox, zoom };
      if (scRef.current) {
        setClusters(scRef.current.getClusters(bbox, Math.floor(zoom)));
      }
    },
    []
  );

  const expandCluster = useCallback((clusterId: number) => {
    if (scRef.current) {
      return scRef.current.getClusterExpansionZoom(clusterId);
    }
    return null;
  }, []);

  return { clusters, updateClusters, expandCluster };
}

// ---------- Controller (flyTo) ----------

function MapController({ mapRef }: { mapRef: React.RefObject<MLMap | null> }) {
  const flyToTarget = useUI((s) => s.flyToTarget);
  useEffect(() => {
    if (!mapRef.current || !flyToTarget) return;
    mapRef.current.flyTo({
      center: [flyToTarget.lng, flyToTarget.lat],
      zoom: flyToTarget.zoom ?? mapRef.current.getZoom(),
      duration: 850,
      essential: true,
    });
  }, [flyToTarget, mapRef]);
  return null;
}

// ---------- Componente principal ----------

export default function MapView() {
  const {
    selectedPropertyId,
    openProperty,
    userLocation,
    properties,
    setProperties,
    setLoadingProperties,
    setPropertiesError,
    setMapBbox,
    setMapCenter,
    setExploreView,
    setSearchInAreaPrompt,
    panelView,
    exploreView,
  } = useUI();

  const { request } = useUserLocation();
  const didAutoRequest = useRef(false);
  const mapRef = useRef<MLMap | null>(null);

  const query = useProperties(true);

  useEffect(() => {
    setLoadingProperties(query.isLoading || query.isFetching);
    if (query.data) {
      setProperties(query.data);
      setPropertiesError(null);
    }
    if (query.isError) setPropertiesError("Não conseguimos carregar os imóveis desta região.");
  }, [
    query.data, query.isLoading, query.isFetching, query.isError,
    setProperties, setLoadingProperties, setPropertiesError,
  ]);

  useEffect(() => {
    if (didAutoRequest.current) return;
    didAutoRequest.current = true;
    const t = setTimeout(() => request(), 400);
    return () => clearTimeout(t);
  }, [request]);

  const { clusters, updateClusters, expandCluster } = useCluster(properties, mapRef);

  // Carrega o estilo do mapa (com fallback MapTiler → raster CARTO Voyager)
  const [mapStyle, setMapStyle] = useState<any>(FALLBACK_STYLE);
  useEffect(() => {
    let mounted = true;
    getMapStyle().then((s) => {
      if (mounted) setMapStyle(s);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const [viewState, setViewState] = useState({
    longitude: exploreView?.lng ?? DEFAULT_CENTER.lng,
    latitude: exploreView?.lat ?? DEFAULT_CENTER.lat,
    zoom: exploreView?.zoom ?? DEFAULT_ZOOM,
    bearing: 0,
    pitch: 0,
  });

  const onMove = useCallback((evt: any) => {
    setViewState(evt.viewState);
    setSearchInAreaPrompt(true);
  }, [setSearchInAreaPrompt]);

  const onMoveEnd = useCallback(
    (evt: any) => {
      const map = evt.target as MLMap;
      const b = map.getBounds();
      setMapBbox({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      });
      const c = map.getCenter();
      const z = map.getZoom();
      setMapCenter({ lat: c.lat, lng: c.lng });
      if (panelView !== "detail") {
        setExploreView({ lat: c.lat, lng: c.lng, zoom: z });
      }
      updateClusters(
        [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        z
      );
      window.setTimeout(() => setSearchInAreaPrompt(false), 800);
    },
    [panelView, setMapBbox, setMapCenter, setExploreView, updateClusters, setSearchInAreaPrompt]
  );

  // update clusters quando properties mudam OU quando o mapa carrega
  const updateFromMap = useCallback(() => {
    if (mapRef.current) {
      const b = mapRef.current.getBounds();
      const bbox: [number, number, number, number] = [
        b.getWest(), b.getSouth(), b.getEast(), b.getNorth(),
      ];
      setMapBbox({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      });
      updateClusters(bbox, mapRef.current.getZoom());
    }
  }, [updateClusters, setMapBbox]);

  // Sempre que properties mudam, atualiza clusters (com bbox atual ou default BH)
  useEffect(() => {
    if (mapRef.current) {
      // Pequeno delay para garantir que o mapa terminou de mover (flyTo da IA)
      const raf = requestAnimationFrame(() => {
        if (mapRef.current) updateFromMap();
      });
      return () => cancelAnimationFrame(raf);
    } else {
      // mapa ainda não carregou — updateClusters com bbox amplo para mostrar todos
      updateClusters([-180, -90, 180, 90], 10);
    }
  }, [properties, updateFromMap, updateClusters]);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) || null,
    [properties, selectedPropertyId]
  );

  return (
    <div className="absolute inset-0">
      <Map
        {...viewState}
        onMove={onMove}
        onMoveEnd={onMoveEnd}
        onLoad={updateFromMap}
        mapStyle={mapStyle}
        ref={mapRef as any}
        maxZoom={20}
        minZoom={3}
        attributionControl={{ compact: true }}
      >
        <MapController mapRef={mapRef} />
        <MapControls />
        <SearchInAreaPrompt />

        {/* Marcadores (clusters + individuais) */}
        {clusters.map((cluster: any) => {
          const [lng, lat] = cluster.geometry.coordinates;
          if (cluster.properties.cluster) {
            const count = cluster.properties.point_count;
            const size = count < 10 ? 40 : count < 30 ? 46 : 54;
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                longitude={lng}
                latitude={lat}
                onClick={(e: MapboxMouseEvent) => {
                  e.stopPropagation();
                  const z = expandCluster(cluster.id);
                  if (z != null && mapRef.current) {
                    mapRef.current.flyTo({
                      center: [lng, lat],
                      zoom: z,
                      duration: 600,
                    });
                  }
                }}
                anchor="center"
              >
                <div className="marker-cluster" style={{ width: size, height: size }}>
                  <span>{count}</span>
                </div>
              </Marker>
            );
          }
          const p = cluster.properties.property as Property;
          const isSelected = p.id === selectedPropertyId;
          return (
            <Marker
              key={p.id}
              longitude={lng}
              latitude={lat}
              anchor="center"
            >
              <PriceMarker property={p} selected={isSelected} onClick={() => openProperty(p)} />
            </Marker>
          );
        })}

        {/* Marcador do usuário */}
        {userLocation && (
          <>
            <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
              <UserMarker />
            </Marker>
            {userLocation.accuracy && userLocation.accuracy < 500 && (
              <Source
                id="user-accuracy"
                type="geojson"
                data={{
                  type: "Feature",
                  geometry: {
                    type: "Polygon",
                    coordinates: [circleCoords(userLocation.lat, userLocation.lng, userLocation.accuracy)],
                  },
                }}
              >
                <Layer
                  type="fill"
                  paint={{ "fill-color": "#00D4FF", "fill-opacity": 0.10 }}
                />
                <Layer
                  type="line"
                  paint={{
                    "line-color": "#00D4FF",
                    "line-width": 1,
                    "line-opacity": 0.35,
                  }}
                />
              </Source>
            )}
          </>
        )}

        {/* Imóvel selecionado não na lista atual */}
        {selectedProperty && !properties.find((p) => p.id === selectedProperty.id) && (
          <Marker
            longitude={selectedProperty.longitude}
            latitude={selectedProperty.latitude}
            anchor="center"
          >
            <PriceMarker property={selectedProperty} selected onClick={() => openProperty(selectedProperty)} />
          </Marker>
        )}

        <RouteLayer />
      </Map>
      {/* Vignette premium sobre o canvas — profundidade, coesão com o navy do app.
          pointer-events: none para não bloquear a interação com o mapa. */}
      <div className="map-vignette" aria-hidden />
      {/* Grain texture — micro ruído para acabamento físico/matte premium */}
      <div className="map-grain" aria-hidden />
    </div>
  );
}

// ---------- Route Layer ----------
function RouteLayer() {
  const { route } = useUI();
  if (!route.route || route.route.length < 2) return null;

  const coords = route.route.map((p) => [p.lng, p.lat]) as [number, number][];
  const geojson = {
    type: "Feature",
    geometry: { type: "LineString", coordinates: coords },
  };

  return (
    <>
      <Source id="route-halo" type="geojson" data={geojson as any}>
        <Layer
          type="line"
          paint={{
            "line-color": "#00D4FF",
            "line-width": 12,
            "line-opacity": 0.15,
            "line-cap": "round",
            "line-join": "round",
          }}
        />
      </Source>
      <Source id="route-main" type="geojson" data={geojson as any}>
        <Layer
          type="line"
          paint={{
            "line-color": "#00D4FF",
            "line-width": 5,
            "line-opacity": 0.9,
            "line-cap": "round",
            "line-join": "round",
          }}
        />
      </Source>
      {route.origin && (
        <Marker longitude={route.origin.lng} latitude={route.origin.lat} anchor="center">
          <div style={originMarkerStyle} />
        </Marker>
      )}
      {route.destination && (
        <Marker longitude={route.destination.lng} latitude={route.destination.lat} anchor="center">
          <div style={destMarkerStyle} />
        </Marker>
      )}
    </>
  );
}

const originMarkerStyle: React.CSSProperties = {
  width: 14, height: 14, borderRadius: 999,
  background: "#00D4FF", border: "2.5px solid #fff",
  boxShadow: "0 0 0 4px rgba(0,212,255,.30), 0 2px 6px rgba(0,0,0,.5), 0 0 14px rgba(0,212,255,.55)",
};
const destMarkerStyle: React.CSSProperties = {
  width: 14, height: 14, borderRadius: 3,
  background: "#ef4444", border: "2.5px solid #fff",
  boxShadow: "0 0 0 4px rgba(239,68,68,.30), 0 2px 6px rgba(0,0,0,.5), 0 0 14px rgba(239,68,68,.45)",
};

/** Coordenadas de um círculo (precisão GPS). */
function circleCoords(lat: number, lng: number, radiusM: number): [number, number][] {
  const coords: [number, number][] = [];
  const R = 6378137;
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = ((radiusM * Math.cos(angle)) / R) * (180 / Math.PI);
    const dLng = ((radiusM * Math.sin(angle)) / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
    coords.push([lng + dLng, lat + dLat]);
  }
  return coords;
}
