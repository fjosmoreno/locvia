import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { serializeProperty, propertyInclude } from "@/lib/property-serializer";

// GET /api/history — lista imóveis vistos pelo usuário (mais recentes primeiro)
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ properties: [] });

  const viewed = await db.propertyViewed.findMany({
    where: { userId: user.id },
    include: { property: { include: propertyInclude } },
    orderBy: { viewedAt: "desc" },
    take: 50,
  });

  const properties = await Promise.all(
    viewed
      .filter((v) => v.property && v.property.status === "ACTIVE")
      .map((v) => serializeProperty(v.property))
  );

  return NextResponse.json({ properties, total: properties.length });
}
