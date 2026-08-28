import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeProperty, publicWhere, propertyInclude } from "@/lib/property-serializer";
import { getSessionUser, getAdvertiser, ADVERTISER_ROLES } from "@/lib/session";
import { canPublish } from "@/lib/plans";
import { PROPERTY_STATUS } from "@/lib/constants";
import { geocodeAddress } from "@/lib/geocode";

// GET /api/properties — listagem pública com filtros + bbox
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const purpose = sp.get("purpose") || undefined;
  const propertyType = sp.getAll("propertyType");
  const minPrice = sp.get("minPrice") ? Number(sp.get("minPrice")) : undefined;
  const maxPrice = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined;
  const bedrooms = sp.get("bedrooms") ? Number(sp.get("bedrooms")) : undefined;
  const bathrooms = sp.get("bathrooms") ? Number(sp.get("bathrooms")) : undefined;
  const parkingSpaces = sp.get("parkingSpaces") ? Number(sp.get("parkingSpaces")) : undefined;
  const minArea = sp.get("minArea") ? Number(sp.get("minArea")) : undefined;
  const city = sp.get("city") || undefined;
  const search = sp.get("search") || undefined;
  const minLat = sp.get("minLat");
  const maxLat = sp.get("maxLat");
  const minLng = sp.get("minLng");
  const maxLng = sp.get("maxLng");
  const bbox =
    minLat && maxLat && minLng && maxLng
      ? { minLat: +minLat, maxLat: +maxLat, minLng: +minLng, maxLng: +maxLng }
      : undefined;
  const limit = Math.min(Number(sp.get("limit") || "300"), 500);
  const origin =
    sp.get("originLat") && sp.get("originLng")
      ? { lat: Number(sp.get("originLat")), lng: Number(sp.get("originLng")) }
      : undefined;
  const featuredOnly = sp.get("featured") === "1";

  const where = publicWhere({
    purpose,
    propertyType: propertyType.length ? propertyType : undefined,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    parkingSpaces,
    minArea,
    city,
    bbox,
    search,
  });
  if (featuredOnly) (where.AND as any[]).push({ featured: true });

  const props = await db.property.findMany({
    where,
    include: propertyInclude,
    orderBy: [{ featured: "desc" }, { views: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  const data = await Promise.all(props.map((p) => serializeProperty(p, origin)));
  // ordena por distância se houver origem
  if (origin) data.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  return NextResponse.json({ properties: data, total: data.length });
}

// POST /api/properties — cria imóvel (anunciante autenticado)
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !ADVERTISER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acesso negado. Faça login como anunciante." }, { status: 403 });
  }
  const body = await req.json();

  // Validações básicas
  if (!body.title || !body.purpose || !body.propertyType || body.price == null) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
  }
  if (body.latitude == null || body.longitude == null) {
    return NextResponse.json({ error: "Localização do imóvel é obrigatória." }, { status: 400 });
  }

  const { agency, owner, broker } = await getAdvertiser(user.id);

  // ADMIN bypassa verificações de aprovação e limite de plano (acesso total)
  const isAdmin = user.role === "ADMIN";

  // Regra: imobiliária deve estar aprovada (admin isento)
  if (!isAdmin && user.role === "AGENCY" && agency?.status !== "APPROVED") {
    return NextResponse.json({ error: "Sua imobiliária precisa ser aprovada para publicar." }, { status: 403 });
  }
  // Regra: proprietário precisa estar verificado (admin isento)
  if (!isAdmin && user.role === "OWNER" && owner?.verificationStatus !== "VERIFIED") {
    return NextResponse.json({ error: "Validação de proprietário pendente." }, { status: 403 });
  }

  // Regra: limite do plano (admin isento — sem limite)
  if (!isAdmin) {
    const canPub = await canPublish({
      agencyId: agency?.id,
      ownerId: owner?.id,
    });
    if (!canPub.allowed) {
      return NextResponse.json({ error: canPub.reason }, { status: 403 });
    }
  }

  // Geocode se endereço fornecido mas sem coords
  let latitude = Number(body.latitude);
  let longitude = Number(body.longitude);
  if ((!latitude || !longitude) && (body.address || body.neighborhood || body.city)) {
    const geo = await geocodeAddress({
      street: body.address,
      number: body.number,
      neighborhood: body.neighborhood,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
    });
    if (geo) {
      latitude = geo.lat;
      longitude = geo.lng;
    }
  }
  if (!latitude || !longitude) {
    return NextResponse.json({ error: "Não foi possível obter a localização. Ajuste o ponto no mapa." }, { status: 400 });
  }

  const created = await db.property.create({
    data: {
      agencyId: agency?.id ?? null,
      brokerId: broker?.id ?? null,
      ownerId: owner?.id ?? null,
      title: body.title,
      description: body.description ?? null,
      purpose: body.purpose,
      propertyType: body.propertyType,
      price: Number(body.price),
      condominium: body.condominium != null ? Number(body.condominium) : null,
      iptu: body.iptu != null ? Number(body.iptu) : null,
      area: body.area != null ? Number(body.area) : null,
      bedrooms: body.bedrooms != null ? Number(body.bedrooms) : null,
      bathrooms: body.bathrooms != null ? Number(body.bathrooms) : null,
      parkingSpaces: body.parkingSpaces != null ? Number(body.parkingSpaces) : null,
      address: body.address ?? null,
      number: body.number ?? null,
      complement: body.complement ?? null,
      neighborhood: body.neighborhood ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      postalCode: body.postalCode ?? null,
      latitude,
      longitude,
      contactName: body.contactName ?? user.name,
      whatsapp: body.whatsapp ?? user.phone ?? null,
      phone: body.phone ?? user.phone ?? null,
      status: PROPERTY_STATUS.PENDING_APPROVAL,
      lastConfirmedAt: new Date(),
    },
  });

  // imagens (URLs já enviadas pelo cliente após upload)
  if (Array.isArray(body.images) && body.images.length) {
    await db.propertyImage.createMany({
      data: body.images.map((url: string, i: number) => ({
        propertyId: created.id,
        url,
        sortOrder: i,
        isPrimary: i === 0,
      })),
    });
  }

  // vídeo (opcional, um por anúncio)
  if (body.video && typeof body.video === "object" && body.video.url) {
    const v = body.video as {
      url: string;
      duration?: number;
      thumbnail?: string | null;
    };
    if (typeof v.url === "string" && v.url.length > 0) {
      await db.propertyVideo.create({
        data: {
          propertyId: created.id,
          url: v.url,
          duration: Math.max(0, Math.min(60, Math.round(Number(v.duration) || 0))),
          thumbnail: typeof v.thumbnail === "string" ? v.thumbnail : null,
          sortOrder: 0,
          isPrimary: true,
        },
      });
    }
  }

  const full = await db.property.findUnique({ where: { id: created.id }, include: propertyInclude });
  return NextResponse.json({ property: await serializeProperty(full!) }, { status: 201 });
}
