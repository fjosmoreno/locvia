import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeProperty, propertyInclude, incrementViews } from "@/lib/property-serializer";
import { getSessionUser, getAdvertiser, ADMIN_ROLES, ADVERTISER_ROLES } from "@/lib/session";
import { PROPERTY_STATUS } from "@/lib/constants";

// GET /api/properties/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const originLat = sp.get("originLat");
  const originLng = sp.get("originLng");
  const origin =
    originLat && originLng
      ? { lat: Number(originLat), lng: Number(originLng) }
      : undefined;

  const p = await db.property.findUnique({ where: { id }, include: propertyInclude });
  if (!p) return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });

  // Acesso a imóveis não públicos apenas para dono/admin
  const user = await getSessionUser();
  const isOwner =
    user &&
    (p.agency?.userId === user.id ||
      p.owner?.userId === user.id ||
      p.broker?.userId === user.id ||
      user.role === "ADMIN");
  if (p.status !== PROPERTY_STATUS.ACTIVE && !isOwner) {
    return NextResponse.json({ error: "Imóvel indisponível." }, { status: 404 });
  }

  // Incrementa visualização apenas para imóveis ativos vistos publicamente
  if (p.status === PROPERTY_STATUS.ACTIVE) incrementViews(id);

  return NextResponse.json({ property: await serializeProperty(p, origin) });
}

// PUT /api/properties/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const p = await db.property.findUnique({ where: { id }, include: propertyInclude });
  if (!p) return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });

  const isOwnerAdvertiser =
    (user.role === "AGENCY" && p.agency?.userId === user.id) ||
    (user.role === "OWNER" && p.owner?.userId === user.id) ||
    (user.role === "BROKER" && p.broker?.userId === user.id);
  if (!isOwnerAdvertiser && !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body = await req.json();
  const allowed: Record<string, any> = {};
  const fields = [
    "title", "description", "purpose", "propertyType", "price",
    "condominium", "iptu", "area", "bedrooms", "bathrooms", "parkingSpaces",
    "address", "number", "complement", "neighborhood", "city", "state",
    "postalCode", "contactName", "whatsapp", "phone",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f] === "" ? null : body[f];
  }
  if (body.latitude != null) allowed.latitude = Number(body.latitude);
  if (body.longitude != null) allowed.longitude = Number(body.longitude);

  // Status transitions controladas
  if (body.status && PROPERTY_STATUS[body.status as keyof typeof PROPERTY_STATUS]) {
    // anunciante só pode: PAUSED, ACTIVE, RENTED, SOLD (não aprovar o próprio)
    const allowedStatusForAdvertiser = ["PAUSED", "ACTIVE", "RENTED", "SOLD"];
    if (ADMIN_ROLES.includes(user.role)) {
      allowed.status = body.status;
    } else if (allowedStatusForAdvertiser.includes(body.status)) {
      // só reativa se já estava aprovado antes (ACTIVE→PAUSED→ACTIVE)
      allowed.status = body.status;
    }
  }
  allowed.lastConfirmedAt = new Date();

  const updated = await db.property.update({ where: { id }, data: allowed });

  // Replacing images
  if (Array.isArray(body.images)) {
    await db.propertyImage.deleteMany({ where: { propertyId: id } });
    if (body.images.length) {
      await db.propertyImage.createMany({
        data: body.images.map((url: string, i: number) => ({
          propertyId: id,
          url,
          sortOrder: i,
          isPrimary: i === 0,
        })),
      });
    }
  }

  // Replacing video (opcional, um por anúncio)
  if (body.video !== undefined) {
    await db.propertyVideo.deleteMany({ where: { propertyId: id } });
    if (body.video && typeof body.video === "object" && body.video.url) {
      const v = body.video as {
        url: string;
        duration?: number;
        thumbnail?: string | null;
      };
      await db.propertyVideo.create({
        data: {
          propertyId: id,
          url: String(v.url),
          duration: Math.max(0, Math.min(60, Math.round(Number(v.duration) || 0))),
          thumbnail: typeof v.thumbnail === "string" ? v.thumbnail : null,
          sortOrder: 0,
          isPrimary: true,
        },
      });
    }
  }

  const full = await db.property.findUnique({ where: { id }, include: propertyInclude });
  return NextResponse.json({ property: await serializeProperty(full!) });
}

// DELETE /api/properties/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const p = await db.property.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });

  const isOwnerAdvertiser =
    (user.role === "AGENCY" && p.agencyId && (await db.agency.findUnique({ where: { id: p.agencyId } }))?.userId === user.id) ||
    (user.role === "OWNER" && p.ownerId && (await db.owner.findUnique({ where: { id: p.ownerId } }))?.userId === user.id);
  if (!isOwnerAdvertiser && !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  await db.property.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
