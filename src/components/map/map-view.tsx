"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
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
import { formatPrice } from "@/lib/geo";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/constants";
import { MapControls, SearchInAreaPrompt } from "@/components/map/map-overlays";
import type { Property } from "@/lib/types";

// ---------- Helpers de ícone ----------

function priceIcon(p: Property, selected: boolean) {
  const featuredCls = p.featured ? " is-featured" : "";
  const selectedCls = selected ? " is-selected" : "";
  const badge = p.badge === "OFFER" ? '<span class="badge-dot"></span>' : "";
  const label = formatPrice(p.price, p.purpose);
  return L.divIcon({
    html: `<div class="price-marker${featuredCls}${selectedCls}">${badge}<span>${label}</span></div>`,
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function houseIcon(p: Property, selected: boolean) {
  const featuredCls = p.featured ? " is-featured" : "";
  const emoji =
    p.propertyType === "SHOP"
      ? "🏬"
      : p.propertyType === "COMMERCIAL_ROOM"
      ? "🏢"
      : p.propertyType === "HOUSE"
      ? "🏠"
      : "🏢";
  const sel = selected ? " is-selected" : "";
  return L.divIcon({
    html: `<div class="house-marker${featuredCls}${sel}"><span>${emoji}</span></div>`,
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
}

function clusterIcon(cluster: any) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 38 : count < 50 ? 48 : 58;
  return L.divIcon({
    html: `<div class="marker-cluster" style="width:${size}px;height:${size}px"><span>${count}</span></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function userIcon() {
  return L.divIcon({
    html: `<div class="user-marker"></div>`,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// ---------- Controladores internos ----------

function MapController() {
  const map = useMap();
  const flyToTarget = useUI((s) => s.flyToTarget);
  const setMapCenter = useUI((s) => s.setMapCenter);

  useEffect(() => {
    if (!flyToTarget) return;
    map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom ?? map.getZoom(), {
      duration: 0.8,
    });
  }, [flyToTarget, map]);

  useEffect(() => {
    const c = map.getCenter();
    setMapCenter({ lat: c.lat, lng: c.lng });
  }, [map, setMapCenter]);

  return null;
}

function MapEvents({ onZoom }: { onZoom: (z: number) => void }) {
  const setMapBbox = useUI((s) => s.setMapBbox);
  const setMapCenter = useUI((s) => s.setMapCenter);
  const setSearchInAreaPrompt = useUI((s) => s.setSearchInAreaPrompt);

  const map = useMapEvents({
    move: () => setSearchInAreaPrompt(true),
    moveend: () => {
      const b = map.getBounds();
      setMapBbox({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      });
      const c = map.getCenter();
      setMapCenter({ lat: c.lat, lng: c.lng });
      window.setTimeout(() => setSearchInAreaPrompt(false), 700);
    },
    zoomend: () => onZoom(map.getZoom()),
  });
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
  } = useUI();

  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
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

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) || null,
    [properties, selectedPropertyId]
  );

  return (
    <MapContainer
      center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
      zoom={DEFAULT_ZOOM}
      zoomControl={false}
      className="h-full w-full"
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      <MapController />
      <MapEvents onZoom={setZoom} />
      <MapControls />
      <SearchInAreaPrompt />

      <MarkerClusterGroup
        iconCreateFunction={clusterIcon}
        showCoverageOnHover={false}
        spiderfyOnMaxZoom
        maxClusterRadius={52}
        chunkedLoading
      >
        {properties.map((p) => {
          const isSelected = p.id === selectedPropertyId;
          const icon = zoom >= 16 ? houseIcon(p, isSelected) : priceIcon(p, isSelected);
          return (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={icon}
              zIndexOffset={isSelected ? 1000 : p.featured ? 500 : 0}
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
          {userLocation.accuracy && (
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={userLocation.accuracy}
              pathOptions={{
                color: "#2563eb",
                fillColor: "#2563eb",
                fillOpacity: 0.08,
                weight: 1,
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
