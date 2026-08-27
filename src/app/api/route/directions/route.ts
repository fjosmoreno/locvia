import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeProperty, propertyInclude } from "@/lib/property-serializer";
import { haversine, type LatLng } from "@/lib/geo";

/**
 * LOCVIA ROUTE — direções entre origem e destino.
 * Usa OSRM public demo server (gratuito, sem chave).
 * Retorna a geometria da rota (polyline decodificada em [lat,lng][])
 * + distância total + duração.
 *
 * Profile: driving (carro). Caminhada/bicicleta podem ser adicionados depois.
 */
interface RoutePoint {
  lat: number;
  lng: number;
}
interface RouteResponse {
  geometry: LatLng[];
  distance: number; // metros
  duration: number; // segundos
}

const OSRM_BASE = "https://router.project-osrm.org";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const oLat = sp.get("originLat");
  const oLng = sp.get("originLng");
  const dLat = sp.get("destLat");
  const dLng = sp.get("destLng");
  const profile = sp.get("profile") || "driving";

  if (!oLat || !oLng || !dLat || !dLng) {
    return NextResponse.json(
      { error: "originLat, originLng, destLat, destLng são obrigatórios." },
      { status: 400 }
    );
  }

  const coords = `${oLng},${oLat};${dLng},${dLat}`;
  const url = `${OSRM_BASE}/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=false`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "LOCVIA/1.0" },
      // timeout: se OSRM demorar ou estiver inacessível, cai no fallback
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      // fallback: rota reta
      return fallbackRoute(
        { lat: +oLat, lng: +oLng },
        { lat: +dLat, lng: +dLng }
      );
    }
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) {
      return fallbackRoute(
        { lat: +oLat, lng: +oLng },
        { lat: +dLat, lng: +dLng }
      );
    }
    const geometry: LatLng[] = (route.geometry?.coordinates || []).map(
      ([lng, lat]: [number, number]) => ({ lat, lng })
    );
    const response: RouteResponse = {
      geometry,
      distance: route.distance,
      duration: route.duration,
    };
    return NextResponse.json(response);
  } catch (e: any) {
    // Fallback: gerar rota reta (linha entre origem e destino com pontos interpolados)
    // Útil quando OSRM está inacessível (sandbox, rate limit, etc.)
    return fallbackRoute(
      { lat: +oLat, lng: +oLng },
      { lat: +dLat, lng: +dLng }
    );
  }
}

/** Reta de fallback: interpola N pontos entre origem e destino. */
function fallbackRoute(origin: LatLng, dest: LatLng) {
  const N = 12;
  const geometry: LatLng[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    geometry.push({
      lat: origin.lat + (dest.lat - origin.lat) * t,
      lng: origin.lng + (dest.lng - origin.lng) * t,
    });
  }
  // distância aproximada (haversine direto)
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(dest.lat - origin.lat);
  const dLng = toRad(dest.lng - origin.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(origin.lat)) * Math.cos(toRad(dest.lat)) * Math.sin(dLng / 2) ** 2;
  const distance = 2 * R * Math.asin(Math.sqrt(a));
  // duração estimada: ~40km/h urbano
  const duration = (distance / 40000) * 3600;
  const response: RouteResponse = { geometry, distance, duration };
  return NextResponse.json(response);
}
