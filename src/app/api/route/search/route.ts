import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeProperty, publicWhere, propertyInclude } from "@/lib/property-serializer";
import { haversine, type LatLng } from "@/lib/geo";

/**
 * LOCVIA ROUTE — "Imóveis no meu caminho".
 *
 * Recebe origem + destino (ou uma rota já calculada), busca imóveis ativos
 * num buffer ao redor da rota, e ordena pela SEQUÊNCIA do percurso
 * (proximidade ao ponto atual → destino).
 *
 * Consulta o mesmo banco do mapa (propriedades ativas). Aplica filtros
 * opcionais (purpose, type, price, area) como o /api/properties.
 */

const BUFFER_METERS = 800; // raio de busca ao redor da rota

/** Distância mínima de um ponto a um segmento de reta (para buffer de rota). */
function distanceToSegment(p: LatLng, a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  // projeção equiretangular local
  const project = (pt: LatLng) => ({
    x: toRad(pt.lng) * Math.cos(toRad((a.lat + b.lat) / 2)) * R,
    y: toRad(pt.lat) * R,
  });
  const pp = project(p);
  const pa = project(a);
  const pb = project(b);
  const dx = pb.x - pa.x;
  const dy = pb.y - pa.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(pp.x - pa.x, pp.y - pa.y);
  let t = ((pp.x - pa.x) * dx + (pp.y - pa.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = pa.x + t * dx;
  const cy = pa.y + t * dy;
  return Math.hypot(pp.x - cx, pp.y - cy);
}

/** Distância de um ponto à rota (mínima entre todos os segmentos). */
function distanceToRoute(p: LatLng, route: LatLng[]): number {
  if (route.length < 2) return haversine(p, route[0] || p);
  let min = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const d = distanceToSegment(p, route[i], route[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

/** Progresso ao longo da rota (0=origem, 1=destino) do ponto mais próximo. */
function progressAlongRoute(p: LatLng, route: LatLng[]): number {
  if (route.length < 2) return 0;
  let bestT = 0;
  let bestDist = Infinity;
  let cumLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const segLen = haversine(route[i], route[i + 1]);
    segLens.push(segLen);
    cumLen += segLen;
  }
  if (cumLen === 0) return 0;
  let acc = 0;
  for (let i = 0; i < route.length - 1; i++) {
    // projeção simples: t no segmento
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371000;
    const project = (pt: LatLng) => ({
      x: toRad(pt.lng) * Math.cos(toRad((route[i].lat + route[i + 1].lat) / 2)) * R,
      y: toRad(pt.lat) * R,
    });
    const pp = project(p);
    const pa = project(route[i]);
    const pb = project(route[i + 1]);
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((pp.x - pa.x) * dx + (pp.y - pa.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const dist = Math.hypot(pp.x - (pa.x + t * dx), pp.y - (pa.y + t * dy));
    if (dist < bestDist) {
      bestDist = dist;
      bestT = (acc + t * segLens[i]) / cumLen;
    }
    acc += segLens[i];
  }
  return bestT;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      route, // LatLng[] — geometria da rota (do /api/route/directions)
      origin, // LatLng — ponto atual do usuário
      filters = {}, // filtros opcionais (purpose, type, price, area)
    } = body as {
      route?: LatLng[];
      origin?: LatLng;
      filters?: any;
    };

    if (!route || route.length < 2) {
      return NextResponse.json(
        { error: "Rota inválida. Calcule a rota primeiro." },
        { status: 400 }
      );
    }

    // bounding box da rota + buffer
    const lats = route.map((p) => p.lat);
    const lngs = route.map((p) => p.lng);
    const latDelta = BUFFER_METERS / 111320;
    const lngDelta = BUFFER_METERS / (111320 * Math.cos(((Math.min(...lats) + Math.max(...lats)) / 2 * Math.PI) / 180));
    const bbox = {
      minLat: Math.min(...lats) - latDelta,
      maxLat: Math.max(...lats) + latDelta,
      minLng: Math.min(...lngs) - lngDelta,
      maxLng: Math.max(...lngs) + lngDelta,
    };

    // consulta o mesmo banco do mapa (propriedades ativas) + filtros + bbox da rota
    const where = publicWhere({
      purpose: filters.purpose,
      propertyType: filters.propertyTypes?.length ? filters.propertyTypes : undefined,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minArea: filters.minArea,
      bedrooms: filters.bedrooms,
      bathrooms: filters.bathrooms,
      parkingSpaces: filters.parkingSpaces,
      bbox,
    });

    const props = await db.property.findMany({
      where,
      include: propertyInclude,
      take: 200,
    });

    // filtra por buffer real (distância à rota <= BUFFER_METERS)
    const withDistance = props
      .map((p) => {
        const pt = { lat: p.latitude, lng: p.longitude };
        const distToRoute = distanceToRoute(pt, route);
        const progress = progressAlongRoute(pt, route);
        return { p, distToRoute, progress };
      })
      .filter((x) => x.distToRoute <= BUFFER_METERS);

    // ordena pela sequência do percurso (progress 0→1)
    withDistance.sort((a, b) => a.progress - b.progress);

    const serialized = await Promise.all(
      withDistance.map(async (x) => {
        const s = await serializeProperty(x.p, origin);
        return {
          ...s,
          distanceToRoute: Math.round(x.distToRoute),
          routeProgress: x.progress, // 0-1
          // tempo estimado até o imóvel (proporcional à duração total)
          etaMinutes: x.progress * (filters.routeDuration || 0) / 60,
        };
      })
    );

    return NextResponse.json({
      properties: serialized,
      total: serialized.length,
      bufferMeters: BUFFER_METERS,
    });
  } catch (e: any) {
    console.error("[/api/route/search] error:", e?.message);
    return NextResponse.json(
      { error: "Erro ao buscar imóveis na rota." },
      { status: 500 }
    );
  }
}
