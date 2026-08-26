import { db } from "@/lib/db";
import { haversine, type LatLng } from "@/lib/geo";

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
      whatsapp: p.agency.whatsapp ?? p.whatsapp ?? null,
      phone: p.agency.phone ?? p.phone ?? null,
      verified: p.agency.verified,
      logoUrl: p.agency.logoUrl ?? null,
    };
  } else if (p?.owner?.user) {
    advertiser = {
      type: "OWNER",
      name: p.owner.user.name,
      whatsapp: p.whatsapp ?? null,
      phone: p.phone ?? null,
      verified: p.owner.verificationStatus === "VERIFIED",
      logoUrl: null,
    };
  } else if (p?.broker?.user) {
    advertiser = {
      type: "BROKER",
      name: p.broker.user.name,
      whatsapp: p.broker.whatsapp ?? p.whatsapp ?? null,
      phone: p.broker.phone ?? p.phone ?? null,
      verified: !!p.broker.creci,
      logoUrl: p.broker.photoUrl ?? null,
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
    state: p.state,
    postalCode: p.postalCode,
    latitude: p.latitude,
    longitude: p.longitude,
    contactName: p.contactName,
    whatsapp: p.whatsapp,
    phone: p.phone,
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
    advertiser,
    distance,
  };
}

const includeAdvertiser = {
  images: true,
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
  if (input.city) and.push({ city: { contains: input.city } });
  if (input.bbox) {
    and.push({ latitude: { gte: input.bbox.minLat, lte: input.bbox.maxLat } });
    and.push({ longitude: { gte: input.bbox.minLng, lte: input.bbox.maxLng } });
  }
  if (input.search) {
    and.push({
      OR: [
        { title: { contains: input.search } },
        { neighborhood: { contains: input.search } },
        { city: { contains: input.search } },
        { address: { contains: input.search } },
      ],
    });
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
