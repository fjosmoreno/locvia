// Geocoding e busca de endereço via Nominatim (OpenStreetMap) — gratuito, sem chave.
// Usado para: (1) converter endereço do imóvel em lat/lng no cadastro;
// (2) busca por texto (bairro/cidade/endereço) no mapa.
// Respeita a política de uso justo: 1 req/usuário, com debounce.

export interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
  type?: string;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

const country = "BR";
const headers = {
  "Accept-Language": "pt-BR",
  "User-Agent": "MapImovel/1.0 (MVP)",
};

/** Busca endereço/bairro/cidade por texto. Retorna múltiplas sugestões. */
export async function searchAddress(query: string, limit = 6): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `${NOMINATIM_BASE}/search?format=jsonv2&addressdetails=1&limit=${limit}&countrycodes=${country}&q=${encodeURIComponent(
    q
  )}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      type?: string;
    }>;
    return data.map((d) => ({
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
      displayName: d.display_name,
      type: d.type,
    }));
  } catch {
    return [];
  }
}

/** Geocoding direto: endereço estruturado → lat/lng. */
export async function geocodeAddress(parts: {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}): Promise<GeoResult | null> {
  const street = [parts.number, parts.street].filter(Boolean).join(" ");
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
    countrycodes: country,
  });
  if (street) params.set("street", street);
  if (parts.city) params.set("city", parts.city);
  if (parts.state) params.set("state", parts.state);
  if (parts.postalCode) params.set("postalcode", parts.postalCode);
  const q = [parts.neighborhood, parts.city].filter(Boolean).join(", ");
  if (q) params.set("q", q);

  const url = `${NOMINATIM_BASE}/search?${params.toString()}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

/** Monta URL de navegação "como chegar" no serviço de mapas do dispositivo. */
export function directionsUrl(
  dest: { lat: number; lng: number },
  origin?: { lat: number; lng: number }
): string {
  const destStr = `${dest.lat},${dest.lng}`;
  if (origin) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destStr}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destStr}`;
}

/** Link WhatsApp com mensagem pré-preenchida. */
export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
