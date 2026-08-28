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

export interface ViaCepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const VIACEP_BASE = "https://viacep.com.br/ws";

const country = "BR";
const headers = {
  "Accept-Language": "pt-BR",
  "User-Agent": "LOCVIA/1.0 (MVP)",
};

/** Normaliza string pra comparação: lower-case + sem acentos + trim. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Busca CEP brasileiro via ViaCEP (gratuito, sem chave). Retorna null se não encontrado. */
export async function lookupCep(rawCep: string): Promise<ViaCepResult | null> {
  const digits = rawCep.replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`${VIACEP_BASE}/${digits}/json/`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepResult;
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

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
  // Tentativa 1: structured (street/number/postalcode)
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

  const tryStructured = async (): Promise<GeoResult | null> => {
    const url = `${NOMINATIM_BASE}/search?${params.toString()}`;
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) return null;
      const data = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
        address?: Record<string, string>;
      }>;
      if (!data.length) return null;
      const hit = data[0];
      return {
        lat: parseFloat(hit.lat),
        lng: parseFloat(hit.lon),
        displayName: hit.display_name,
        type: hit.address?.road ?? hit.address?.suburb,
      };
    } catch {
      return null;
    }
  };

  // Compara se o resultado Nominatim bate com o que o usuário digitou
  // (rua e bairro). Quando NÃO bate (ex: cidade tem 2 "Rua Bragança" em
  // bairros diferentes), o Nominatim pode retornar a errada — nesse caso
  // descartamos e caímos pra free-text, que é mais permissivo.
  const matches = (
    result: GeoResult,
    options: { strictRoad?: boolean } = {}
  ): boolean => {
    if (!result.displayName) return false;
    const display = normalize(result.displayName);
    if (parts.neighborhood) {
      const hood = normalize(parts.neighborhood);
      if (hood && !display.includes(hood)) return false;
    }
    if (options.strictRoad && parts.street) {
      const road = normalize(parts.street).replace(
        /^(rua|avenida|av\.?|alameda|travessa|rodovia|estrada)\s+/,
        ""
      );
      if (road && !display.includes(road)) return false;
    }
    return true;
  };

  // Tentativa 1: structured (street + number + city/state/postalcode)
  // Só aceita se o resultado mencionar o bairro que o usuário digitou.
  const first = await tryStructured();
  if (first && matches(first)) return first;

  // Tentativa 2: free-text com bairro e cidade juntos.
  // Mais robusto pra cidades com ruas de mesmo nome em bairros diferentes.
  const freeText = [
    parts.street,
    parts.number,
    parts.neighborhood,
    parts.city,
    parts.state,
  ]
    .filter(Boolean)
    .join(", ");
  if (freeText) {
    const fallback = await searchAddress(freeText, 3);
    const match = fallback.find((r) => matches(r, { strictRoad: true })) ??
      fallback.find((r) => matches(r)) ??
      fallback[0];
    if (match) return match;
  }

  // Tentativa 3: só com bairro + cidade (último recurso, retorna o bairro)
  if (parts.neighborhood && parts.city) {
    const hoodOnly = await searchAddress(
      `${parts.neighborhood}, ${parts.city}, ${parts.state ?? "BR"}`,
      1
    );
    if (hoodOnly[0]) return hoodOnly[0];
  }

  // Fallback final: aceita o structured mesmo sem bater (logged pra debug)
  if (first) {
    console.warn(
      `[geocode] structured Nominatim mismatch: requested "${parts.street} ${parts.number}, ${parts.neighborhood}, ${parts.city}" → got "${first.displayName}"`
    );
    return first;
  }
  return null;
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
