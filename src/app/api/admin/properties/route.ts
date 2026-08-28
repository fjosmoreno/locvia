import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeProperty, propertyInclude } from "@/lib/property-serializer";
import { getSessionUser, ADMIN_ROLES } from "@/lib/session";
import { PROPERTY_STATUS, PROPERTY_TYPES, PURPOSES } from "@/lib/constants";
import { geocodeAddress } from "@/lib/geocode";

// GET /api/admin/properties — lista todos os imóveis (admin)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || undefined;
  const limit = Math.min(Number(sp.get("limit") || "200"), 500);
  const props = await db.property.findMany({
    where: status ? { status } : {},
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      agency: { select: { name: true } },
      owner: { select: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ properties: props });
}

// POST /api/admin/properties — admin cadastra imóvel manualmente
export async function POST(req: NextRequest) {
  const admin = await getSessionUser();
  if (!admin || !ADMIN_ROLES.includes(admin.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    description,
    purpose,
    propertyType,
    price,
    condominium,
    iptu,
    area,
    bedrooms,
    bathrooms,
    parkingSpaces,
    address,
    number,
    complement,
    neighborhood,
    city,
    state,
    postalCode,
    latitude,
    longitude,
    contactName,
    whatsapp,
    phone,
    // anunciante (admin escolhe explicitamente)
    agencyId,
    ownerId,
    brokerId,
    // publicação
    status,
    featured,
    badge,
    images, // array de URLs já upadas
  } = body || {};

  // ===== Validações =====
  if (!title || !purpose || !propertyType || price == null) {
    return NextResponse.json(
      { error: "Título, finalidade, tipo e preço são obrigatórios." },
      { status: 400 }
    );
  }
  if (!Object.values(PURPOSES).includes(purpose)) {
    return NextResponse.json({ error: "Finalidade inválida." }, { status: 400 });
  }
  if (!Object.values(PROPERTY_TYPES).includes(propertyType)) {
    return NextResponse.json({ error: "Tipo de imóvel inválido." }, { status: 400 });
  }
  if (Number(price) < 0) {
    return NextResponse.json({ error: "Preço inválido." }, { status: 400 });
  }
  // Pelo menos 1 anunciante (imobiliária, corretor ou proprietário)
  if (!agencyId && !brokerId && !ownerId) {
    return NextResponse.json(
      { error: "Vincule o imóvel a uma imobiliária, corretor ou proprietário." },
      { status: 400 }
    );
  }

  // Validar anunciantes se fornecidos
  if (agencyId) {
    const a = await db.agency.findUnique({ where: { id: agencyId }, select: { id: true } });
    if (!a) return NextResponse.json({ error: "Imobiliária não encontrada." }, { status: 404 });
  }
  if (ownerId) {
    const o = await db.owner.findUnique({ where: { id: ownerId }, select: { id: true } });
    if (!o) return NextResponse.json({ error: "Proprietário não encontrado." }, { status: 404 });
  }
  if (brokerId) {
    const b = await db.broker.findUnique({ where: { id: brokerId }, select: { id: true } });
    if (!b) return NextResponse.json({ error: "Corretor não encontrado." }, { status: 404 });
  }

  // Status: default ACTIVE (admin cadastra e já publica)
  const validStatus = [
    PROPERTY_STATUS.DRAFT,
    PROPERTY_STATUS.PENDING_APPROVAL,
    PROPERTY_STATUS.ACTIVE,
    PROPERTY_STATUS.PAUSED,
  ] as string[];
  const finalStatus = validStatus.includes(status) ? status : PROPERTY_STATUS.ACTIVE;

  // ===== Geolocalização =====
  let lat = Number(latitude);
  let lng = Number(longitude);
  if ((!lat || !lng) && (address || neighborhood || city)) {
    const geo = await geocodeAddress({
      street: address,
      number,
      neighborhood,
      city,
      state,
      postalCode,
    });
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }
  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Localização obrigatória. Informe latitude/longitude ou um endereço válido." },
      { status: 400 }
    );
  }

  // ===== Criar imóvel + imagens em transação =====
  const created = await db.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        agencyId: agencyId || null,
        brokerId: brokerId || null,
        ownerId: ownerId || null,
        title: String(title).trim(),
        description: description ?? null,
        purpose,
        propertyType,
        price: Number(price),
        condominium: condominium != null ? Number(condominium) : null,
        iptu: iptu != null ? Number(iptu) : null,
        area: area != null ? Number(area) : null,
        bedrooms: bedrooms != null ? Number(bedrooms) : null,
        bathrooms: bathrooms != null ? Number(bathrooms) : null,
        parkingSpaces: parkingSpaces != null ? Number(parkingSpaces) : null,
        address: address ?? null,
        number: number ?? null,
        complement: complement ?? null,
        neighborhood: neighborhood ?? null,
        city: city ?? null,
        state: state ?? null,
        postalCode: postalCode ?? null,
        latitude: lat,
        longitude: lng,
        contactName: contactName ?? admin.name,
        whatsapp: whatsapp ?? null,
        phone: phone ?? null,
        status: finalStatus,
        featured: Boolean(featured ?? false),
        badge: badge || null,
        lastConfirmedAt: new Date(),
      },
    });

    if (Array.isArray(images) && images.length) {
      await tx.propertyImage.createMany({
        data: images.map((url: string, i: number) => ({
          propertyId: property.id,
          url: String(url),
          sortOrder: i,
          isPrimary: i === 0,
        })),
      });
    }

    return property;
  });

  const full = await db.property.findUnique({
    where: { id: created.id },
    include: propertyInclude,
  });
  return NextResponse.json(
    { property: await serializeProperty(full!) },
    { status: 201 }
  );
}
