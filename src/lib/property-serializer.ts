import { db } from "@/lib/db";
import { haversine, type LatLng } from "@/lib/geo";

/** Normaliza telefone BR pra wa.me — remove caracteres não numéricos e
 *  garante prefixo 55. Aceita "(31) 9XXXX-XXXX", "31 9XXXX-XXXX", "313XXXX0000".
 *  Retorna string com só dígitos e prefixo 55, ou null se inválido. */
export function normalizeBrPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // se já começa com 55 (Brasil), mantém; senão adiciona
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  // tira 0 inicial se tiver (telefone antigo com 0XX)
  const withoutZero = digits.replace(/^0+/, "");
  // DDI BR (55) + DDD (2) + número (8 ou 9) = 12 ou 13 dígitos
  if (withoutZero.length === 10 || withoutZero.length === 11) {
    return `55${withoutZero}`;
  }
  // número malformado — devolve como está pra wa.me gerar erro útil
  return digits;
}

export function normalizeState(s: string | null | undefined): string {
  if (!s) return "";
  return s.trim().toUpperCase();
}

// Serialização pública de imóvel (não expõe dados sensíveis do anunciante)
export interface PublicProperty {
  id: string;
  title: string;
  description: string | null;
  purpose: string;
  propertyType: string;
  price: number;
  condominium: number | null;
  iptu: number | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  contactName: string | null;
  whatsapp: string | null;
  phone: string | null;
  status: string;
  featured: boolean;
  badge: string | null;
  views: number;
  lastConfirmedAt: string | null;
  createdAt: string;
  images: { id: string; url: string; isPrimary: boolean; sortOrder: number }[];
  videos: {
    id: string;
    url: string;
    duration: number;
    thumbnail: string | null;
    isPrimary: boolean;
    sortOrder: number;
  }[];
  advertiser: {
    type: string;
    name: string;
    whatsapp: string | null;
    phone: string | null;
    verified: boolean;
    logoUrl: string | null;
  } | null;
  distance?: number;
}

export async function serializeProperty(
  p: any,
  origin?: LatLng
): Promise<PublicProperty> {
  let advertiser: PublicProperty["advertiser"] = null;
  if (p?.agency) {
    advertiser = {
      type: "AGENCY",
      name: p.agency.name,
      whatsapp: normalizeBrPhone(p.agency.whatsapp ?? p.whatsapp ?? null),
      phone: normalizeBrPhone(p.agency.phone ?? p.phone ?? null),
      verified: p.agency.verified,
      logoUrl: p.agency.logoUrl ?? null,
    };
  } else if (p?.owner?.user) {
    advertiser = {
      type: "OWNER",
      name: p.owner.user.name,
      whatsapp: normalizeBrPhone(p.whatsapp ?? null),
      phone: normalizeBrPhone(p.phone ?? null),
      verified: p.owner.verificationStatus === "VERIFIED",
      logoUrl: null,
    };
  } else if (p?.broker?.user) {
    advertiser = {
      type: "BROKER",
      name: p.broker.user.name,
      whatsapp: normalizeBrPhone(p.broker.whatsapp ?? p.whatsapp ?? null),
      phone: normalizeBrPhone(p.broker.phone ?? p.phone ?? null),
      verified: !!p.broker.creci,
      logoUrl: p.broker.photoUrl ?? null,
    };
  } else if (p?.contactName) {
    // Fallback: imóvel sem FK de anunciante (legado, ADMIN cadastrou
    // diretamente, ou dados corrompidos). Ainda assim retornamos um
    // "USER" advertiser mínimo pra UI não quebrar e o lead poder ser
    // enviado pra um contato (contactName + whatsapp/phone do imóvel).
    advertiser = {
      type: "USER",
      name: p.contactName,
      whatsapp: normalizeBrPhone(p.whatsapp ?? null),
      phone: normalizeBrPhone(p.phone ?? null),
      verified: false,
      logoUrl: null,
    };
  }

  const distance = origin
    ? haversine(origin, { lat: p.latitude, lng: p.longitude })
    : undefined;

  return {
    id: p.id,
    title: p.title,
    description: p.description,
    purpose: p.purpose,
    propertyType: p.propertyType,
    price: p.price,
    condominium: p.condominium,
    iptu: p.iptu,
    area: p.area,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    parkingSpaces: p.parkingSpaces,
    address: p.address,
    number: p.number,
    complement: p.complement,
    neighborhood: p.neighborhood,
    city: p.city,
    state: normalizeState(p.state),
    postalCode: p.postalCode,
    latitude: p.latitude,
    longitude: p.longitude,
    contactName: p.contactName,
    whatsapp: normalizeBrPhone(p.whatsapp),
    phone: normalizeBrPhone(p.phone),
    status: p.status,
    featured: p.featured,
    badge: p.badge,
    views: p.views,
    lastConfirmedAt: p.lastConfirmedAt ? p.lastConfirmedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    images: (p.images ?? [])
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
      .map((im: any) => ({
        id: im.id,
        url: im.url,
        isPrimary: im.isPrimary,
        sortOrder: im.sortOrder,
      })),
    videos: (p.videos ?? [])
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
      .map((v: any) => ({
        id: v.id,
        url: v.url,
        duration: v.duration,
        thumbnail: v.thumbnail ?? null,
        isPrimary: v.isPrimary,
        sortOrder: v.sortOrder,
      })),
    advertiser,
    distance,
  };
}

const includeAdvertiser = {
  images: true,
  videos: true,
  agency: { select: { name: true, whatsapp: true, phone: true, verified: true, logoUrl: true } },
  owner: { select: { verificationStatus: true, user: { select: { name: true } } } },
  broker: { select: { creci: true, whatsapp: true, phone: true, photoUrl: true, user: { select: { name: true } } } },
};

export const propertyInclude = includeAdvertiser;

/** Query comum para listagem pública (apenas ativos). */
export function publicWhere(input: {
  purpose?: string;
  propertyType?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  minArea?: number;
  city?: string;
  state?: string;
  bbox?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  search?: string;
}) {
  const and: any[] = [{ status: "ACTIVE" }];
  if (input.purpose) and.push({ purpose: input.purpose });
  if (input.propertyType) {
    if (Array.isArray(input.propertyType)) {
      and.push({ propertyType: { in: input.propertyType } });
    } else {
      and.push({ propertyType: input.propertyType });
    }
  }
  if (input.minPrice != null) and.push({ price: { gte: input.minPrice } });
  if (input.maxPrice != null) and.push({ price: { lte: input.maxPrice } });
  if (input.bedrooms != null) and.push({ bedrooms: { gte: input.bedrooms } });
  if (input.bathrooms != null) and.push({ bathrooms: { gte: input.bathrooms } });
  if (input.parkingSpaces != null) and.push({ parkingSpaces: { gte: input.parkingSpaces } });
  if (input.minArea != null) and.push({ area: { gte: input.minArea } });
  if (input.city) {
    // Case-insensitive: PostgreSQL via Prisma aceita `mode: "insensitive"`
    // (requer `citext` na extensão OU comparação via LOWER). Usamos
    // `contains` + `mode: "insensitive"` (Prisma 5+ em Postgres com
    // extension `pg_trgm` ou `citext` configurado). Como o Neon não tem
    // citext por padrão, fazemos um fallback mais robusto: comparamos
    // o lowercase do input contra o lowercase do campo via LOWER().
    and.push({
      city: { contains: input.city, mode: "insensitive" },
    });
  }
  if (input.state) {
    // Estado é case-insensitive por natureza (UF é sempre maiúscula)
    and.push({
      state: { equals: normalizeState(input.state) },
    });
  }
  if (input.bbox) {
    and.push({ latitude: { gte: input.bbox.minLat, lte: input.bbox.maxLat } });
    and.push({ longitude: { gte: input.bbox.minLng, lte: input.bbox.maxLng } });
  }
  if (input.search) {
    // Busca token-based: quebra o search em palavras e exige que TODAS
    // apareçam em algum campo (neighborhood/city/address/title).
    // Assim "Eldorado Contagem" encontra bairro=Eldorado + cidade=Contagem.
    const tokens = input.search
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);
    if (tokens.length === 1) {
      and.push({
        OR: [
          { title: { contains: tokens[0], mode: "insensitive" } },
          { neighborhood: { contains: tokens[0], mode: "insensitive" } },
          { city: { contains: tokens[0], mode: "insensitive" } },
          { address: { contains: tokens[0], mode: "insensitive" } },
        ],
      });
    } else if (tokens.length > 1) {
      // cada token deve aparecer em algum campo
      for (const tok of tokens) {
        and.push({
          OR: [
            { title: { contains: tok, mode: "insensitive" } },
            { neighborhood: { contains: tok, mode: "insensitive" } },
            { city: { contains: tok, mode: "insensitive" } },
            { address: { contains: tok, mode: "insensitive" } },
          ],
        });
      }
    }
  }
  return { AND: and };
}

/** Incrementa visualizações (com salvaguarda). */
export async function incrementViews(propertyId: string) {
  try {
    await db.property.update({
      where: { id: propertyId },
      data: { views: { increment: 1 } },
    });
  } catch {
    // noop
  }
}
