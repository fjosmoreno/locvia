import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, ADMIN_ROLES } from "@/lib/session";
import { serializeProperty, propertyInclude } from "@/lib/property-serializer";
import { PROPERTY_STATUS, PROPERTY_TYPES, PURPOSES } from "@/lib/constants";
import { geocodeAddress } from "@/lib/geocode";

const EDITABLE_FIELDS = [
  "title",
  "description",
  "purpose",
  "propertyType",
  "price",
  "condominium",
  "iptu",
  "area",
  "bedrooms",
  "bathrooms",
  "parkingSpaces",
  "address",
  "number",
  "complement",
  "neighborhood",
  "city",
  "state",
  "postalCode",
  "contactName",
  "whatsapp",
  "phone",
  "status",
  "featured",
  "badge",
] as const;

const NUMERIC_FIELDS = [
  "price",
  "condominium",
  "iptu",
  "area",
  "bedrooms",
  "bathrooms",
  "parkingSpaces",
] as const;

const NULLABLE_FIELDS = [
  "description",
  "condominium",
  "iptu",
  "area",
  "bedrooms",
  "bathrooms",
  "parkingSpaces",
  "address",
  "number",
  "complement",
  "neighborhood",
  "city",
  "state",
  "postalCode",
  "contactName",
  "whatsapp",
  "phone",
] as const;

// GET /api/admin/properties/[id] — detalhes completos de um imóvel
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const p = await db.property.findUnique({ where: { id }, include: propertyInclude });
  if (!p) return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });
  return NextResponse.json({ property: await serializeProperty(p) });
}

// PUT /api/admin/properties/[id] — admin atualiza qualquer campo do imóvel
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const existing = await db.property.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  // Campos escalares editáveis
  for (const f of EDITABLE_FIELDS) {
    if (body[f] === undefined) continue;
    let val: unknown = body[f];
    if (val === "") {
      // string vazia em campo nullable → null; senão, mantém
      if ((NULLABLE_FIELDS as readonly string[]).includes(f)) val = null;
    }
    if (val !== null && (NUMERIC_FIELDS as readonly string[]).includes(f)) {
      const n = Number(val);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: `Campo "${f}" inválido.` }, { status: 400 });
      }
      val = n;
    }
    if (f === "purpose" && !Object.values(PURPOSES).includes(val as string)) {
      return NextResponse.json({ error: "Finalidade inválida." }, { status: 400 });
    }
    if (f === "propertyType" && !Object.values(PROPERTY_TYPES).includes(val as string)) {
      return NextResponse.json({ error: "Tipo de imóvel inválido." }, { status: 400 });
    }
    if (f === "status" && !Object.values(PROPERTY_STATUS).includes(val as string)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }
    data[f] = val;
  }

  // badge: "" ou null → null
  if (body.badge === "" || body.badge === null) data.badge = null;

  // featured boolean
  if (body.featured !== undefined) data.featured = Boolean(body.featured);

  // Latitude/longitude (validação numérica)
  if (body.latitude !== undefined) {
    const lat = Number(body.latitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return NextResponse.json({ error: "Latitude inválida." }, { status: 400 });
    }
    data.latitude = lat;
  }
  if (body.longitude !== undefined) {
    const lng = Number(body.longitude);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Longitude inválida." }, { status: 400 });
    }
    data.longitude = lng;
  }

  // Se lat/lng não vierem mas address mudou, tenta geocodificar
  if (
    (body.latitude === undefined || body.longitude === undefined) &&
    (body.address !== undefined || body.neighborhood !== undefined || body.city !== undefined)
  ) {
    const lat = data.latitude as number | undefined;
    const lng = data.longitude as number | undefined;
    if (!lat || !lng) {
      const geo = await geocodeAddress({
        street: (data.address as string) ?? existing.address ?? undefined,
        number: (data.number as string) ?? existing.number ?? undefined,
        neighborhood: (data.neighborhood as string) ?? existing.neighborhood ?? undefined,
        city: (data.city as string) ?? existing.city ?? undefined,
        state: (data.state as string) ?? existing.state ?? undefined,
        postalCode: (data.postalCode as string) ?? existing.postalCode ?? undefined,
      });
      if (geo) {
        data.latitude = geo.lat;
        data.longitude = geo.lng;
      }
    }
  }

  // Vincular anunciante (opcional na edição)
  if (body.agencyId !== undefined) data.agencyId = body.agencyId || null;
  if (body.ownerId !== undefined) data.ownerId = body.ownerId || null;
  if (body.brokerId !== undefined) data.brokerId = body.brokerId || null;

  // Substituir imagens se vier array
  const replaceImages = Array.isArray(body.images);
  // Substituir vídeo se vier definido
  const replaceVideo = body.video !== undefined;

  data.lastConfirmedAt = new Date();

  const updated = await db.$transaction(async (tx) => {
    const p = await tx.property.update({ where: { id }, data });

    if (replaceImages) {
      await tx.propertyImage.deleteMany({ where: { propertyId: id } });
      const images = (body.images as unknown[]).filter(
        (u): u is string => typeof u === "string" && u.trim().length > 0
      );
      if (images.length) {
        await tx.propertyImage.createMany({
          data: images.map((url, i) => ({
            propertyId: id,
            url: url.trim(),
            sortOrder: i,
            isPrimary: i === 0,
          })),
        });
      }
    }

    if (replaceVideo) {
      await tx.propertyVideo.deleteMany({ where: { propertyId: id } });
      const v = body.video as { url?: string; duration?: number; thumbnail?: string | null } | null;
      if (v && typeof v.url === "string" && v.url.length > 0) {
        await tx.propertyVideo.create({
          data: {
            propertyId: id,
            url: v.url,
            duration: Math.max(0, Math.min(60, Math.round(Number(v.duration) || 0))),
            thumbnail: typeof v.thumbnail === "string" ? v.thumbnail : null,
            sortOrder: 0,
            isPrimary: true,
          },
        });
      }
    }

    return p;
  });

  const full = await db.property.findUnique({ where: { id: updated.id }, include: propertyInclude });
  return NextResponse.json({ property: await serializeProperty(full!) });
}

// DELETE /api/admin/properties/[id] — remover anúncio
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  await db.property.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
