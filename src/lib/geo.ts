// Utilidades geográficas — Haversine, bounding box, formatação de distância

export interface LatLng {
  lat: number;
  lng: number;
}

export interface BBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const R = 6371000; // raio da Terra em metros

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distância Haversine em metros entre dois pontos. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Bounding box a partir de centro + raio (metros). Margem de segurança. */
export function bboxFromCenter(center: LatLng, radiusMeters: number): BBox {
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.cos(toRad(center.lat)));
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

/** Verifica se ponto está dentro de bbox. */
export function inBBox(p: LatLng, b: BBox): boolean {
  return (
    p.lat >= b.minLat &&
    p.lat <= b.maxLat &&
    p.lng >= b.minLng &&
    p.lng <= b.maxLng
  );
}

/** Formata distância legível: "850 m", "2,4 km". */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/** Formata preço em R$. */
export function formatPrice(value: number, purpose?: string): string {
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
  return purpose === "RENT" ? `${formatted}/mês` : formatted;
}

/** Formata duração relativa: "Atualizado há 2 dias". */
export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "Sem atualização recente";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Atualizado hoje";
  if (days === 1) return "Atualizado há 1 dia";
  if (days < 30) return `Atualizado há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1
    ? "Atualizado há 1 mês"
    : `Atualizado há ${months} meses`;
}
