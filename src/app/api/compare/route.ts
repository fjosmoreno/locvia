import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeProperty, propertyInclude } from "@/lib/property-serializer";

// GET /api/compare?ids=id1,id2,id3 — retorna até 3 imóveis para comparação
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") || "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (!ids.length) return NextResponse.json({ properties: [] });

  const props = await db.property.findMany({
    where: { id: { in: ids } },
    include: propertyInclude,
  });

  // preserva a ordem dos ids
  const sorted = ids
    .map((id) => props.find((p) => p.id === id))
    .filter(Boolean) as typeof props;

  const serialized = await Promise.all(sorted.map((p) => serializeProperty(p)));
  return NextResponse.json({ properties: serialized });
}
