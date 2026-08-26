import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, getAdvertiser } from "@/lib/session";
import { serializeProperty, propertyInclude } from "@/lib/property-serializer";

// GET /api/me — perfil + imóveis do anunciante + estatísticas
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });

  const { agency, owner, broker } = await getAdvertiser(user.id);

  // imóveis do anunciante
  let properties: any[] = [];
  if (agency) {
    properties = await db.property.findMany({
      where: { agencyId: agency.id },
      include: { images: { where: { isPrimary: true }, take: 1 }, _count: { select: { leads: true, favorites: true } } },
      orderBy: { createdAt: "desc" },
    });
  } else if (owner) {
    properties = await db.property.findMany({
      where: { ownerId: owner.id },
      include: { images: { where: { isPrimary: true }, take: 1 }, _count: { select: { leads: true, favorites: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // estatísticas agregadas
  const stats = {
    active: properties.filter((p) => p.status === "ACTIVE").length,
    total: properties.length,
    views: properties.reduce((s, p) => s + (p.views || 0), 0),
    leads: properties.reduce((s, p) => s + (p._count?.leads || 0), 0),
    favorites: properties.reduce((s, p) => s + (p._count?.favorites || 0), 0),
  };

  return NextResponse.json({
    user,
    agency,
    owner,
    broker,
    properties: properties.map((p) => ({
      id: p.id,
      title: p.title,
      purpose: p.purpose,
      propertyType: p.propertyType,
      price: p.price,
      status: p.status,
      views: p.views,
      lastConfirmedAt: p.lastConfirmedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      leadsCount: p._count?.leads || 0,
      favoritesCount: p._count?.favorites || 0,
      primaryImage: p.images?.[0]?.url || null,
      neighborhood: p.neighborhood,
      city: p.city,
    })),
    stats,
  });
}
