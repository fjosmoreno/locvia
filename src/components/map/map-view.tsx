"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
  Circle,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useUI } from "@/lib/store";
import { useProperties } from "@/hooks/use-properties";
import { useUserLocation } from "@/hooks/use-geolocation";
import { formatPrice } from "@/lib/geo";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/constants";
import { MapControls, SearchInAreaPrompt } from "@/components/map/map-overlays";
import type { Property } from "@/lib/types";

// ---------- Ícones ----------

function priceIcon(p: Property, selected: boolean) {
  const featuredCls = p.featured ? " is-featured" : "";
  const selectedCls = selected ? " is-selected" : "";
  const badge = p.featured ? '<span class="badge-dot"></span>' : "";
  const label = formatPrice(p.price, p.purpose);
  return L.divIcon({
    html: `<div class="marker-wrap"><div class="price-marker${featuredCls}${selectedCls}">${badge}<span>${label}</span></div></div>`,
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function clusterIcon(cluster: any) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 40 : count < 30 ? 46 : 54;
  return L.divIcon({
    html: `<div class="marker-cluster" style="width:${size}px;height:${size}px"><span>${count}</span></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function userIcon() {
  return L.divIcon({
    html: `<div class="user-marker"><div class="pulse"></div><div class="dot"></div></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

// ---------- Controladores ----------

function MapController() {
  const map = useMap();
  const flyToTarget = useUI((s) => s.flyToTarget);

  useEffect(() => {
    if (!flyToTarget) return;
    map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom ?? map.getZoom(), {
      duration: 0.85,
      easeLinearity: 0.25,
    });
  }, [flyToTarget, map]);

  return null;
}

function MapEvents() {
  const setMapBbox = useUI((s) => s.setMapBbox);
  const setMapCenter = useUI((s) => s.setMapCenter);
  const setExploreView = useUI((s) => s.setExploreView);
  const setSearchInAreaPrompt = useUI((s) => s.setSearchInAreaPrompt);
  const panelView = useUI((s) => s.panelView);

  const map = useMapEvents({
    move: () => setSearchInAreaPrompt(true),
    moveend: () => {
      const b = map.getBounds();
      const c = map.getCenter();
      const z = map.getZoom();
      setMapBbox({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      });
      setMapCenter({ lat: c.lat, lng: c.lng });
      // Preserva a visão de EXPLORAÇÃO apenas quando não está visualizando um imóvel
      // (durante detalhe, o mapa voou para o imóvel — não deve sobrescrever o returnView)
      if (panelView !== "detail") {
        setExploreView({ lat: c.lat, lng: c.lng, zoom: z });
      }
      window.setTimeout(() => setSearchInAreaPrompt(false), 800);
    },
    zoomend: () => {
      const b = map.getBounds();
      const c = map.getCenter();
      const z = map.getZoom();
      setMapBbox({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      });
      if (panelView !== "detail") {
        setExploreView({ lat: c.lat, lng: c.lng, zoom: z });
      }
    },
  });
  return null;
}

// ---------- Componente ----------

export default function MapView() {
  const {
    selectedPropertyId,
    openProperty,
    userLocation,
    properties,
    setProperties,
    setLoadingProperties,
    setPropertiesError,
    exploreView,
  } = useUI();

  const { request } = useUserLocation();
  const didAutoRequest = useRef(false);

  const query = useProperties(true);

  useEffect(() => {
    setLoadingProperties(query.isLoading || query.isFetching);
    if (query.data) {
      setProperties(query.data);
      setPropertiesError(null);
    }
    if (query.isError) setPropertiesError("Não conseguimos carregar os imóveis desta região.");
  }, [
    query.data,
    query.isLoading,
    query.isFetching,
    query.isError,
    setProperties,
    setLoadingProperties,
    setPropertiesError,
  ]);

  // Auto-request de localização na primeira entrada (uma única vez)
  useEffect(() => {
    if (didAutoRequest.current) return;
    didAutoRequest.current = true;
    // Pequeno delay para o mapa montar antes de solicitar (evita race no iOS)
    const t = setTimeout(() => request(), 400);
    return () => clearTimeout(t);
  }, [request]);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) || null,
    [properties, selectedPropertyId]
  );

  // Centro/zoom iniciais: restaura da memória (sessionStorage) ou padrão
  const initialCenter: [number, number] = exploreView
    ? [exploreView.lat, exploreView.lng]
    : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
  const initialZoom = exploreView?.zoom ?? DEFAULT_ZOOM;

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      zoomControl={false}
      className="h-full w-full"
      preferCanvas
      zoomSnap={0.5}
      wheelPxPerZoomLevel={120}
    >
      {/* Positron — canvas minimalista premium */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />

      <MapController />
      <MapEvents />
      <MapControls />
      <SearchInAreaPrompt />

      <MarkerClusterGroup
        iconCreateFunction={clusterIcon}
        showCoverageOnHover={false}
        spiderfyOnMaxZoom
        maxClusterRadius={56}
        chunkedLoading
        animate
      >
        {properties.map((p) => {
          const isSelected = p.id === selectedPropertyId;
          return (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={priceIcon(p, isSelected)}
              zIndexOffset={isSelected ? 1100 : p.featured ? 500 : 0}
              eventHandlers={{ click: () => openProperty(p) }}
            />
          );
        })}
      </MarkerClusterGroup>

      {userLocation && (
        <>
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon()}
            zIndexOffset={2000}
          />
          {userLocation.accuracy && userLocation.accuracy < 500 && (
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={userLocation.accuracy}
              pathOptions={{
                color: "var(--primary)",
                fillColor: "var(--primary)",
                fillOpacity: 0.06,
                weight: 1,
                opacity: 0.3,
              }}
            />
          )}
        </>
      )}

      {selectedProperty && !properties.find((p) => p.id === selectedProperty.id) && (
        <Marker
          position={[selectedProperty.latitude, selectedProperty.longitude]}
          icon={priceIcon(selectedProperty, true)}
          zIndexOffset={1500}
        />
      )}
    </MapContainer>
  );
}
