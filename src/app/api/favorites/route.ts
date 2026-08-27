import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { serializeProperty, propertyInclude } from "@/lib/property-serializer";

// GET /api/favorites — lista favoritos do usuário
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const favs = await db.favorite.findMany({
    where: { userId: user.id },
    include: { property: { include: propertyInclude } },
    orderBy: { createdAt: "desc" },
  });
  const properties = await Promise.all(
    favs.map((f) => serializeProperty(f.property))
  );
  return NextResponse.json({ properties, total: properties.length });
}

// POST /api/favorites — adiciona favorito
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Faça login para favoritar." }, { status: 401 });
  const { propertyId } = await req.json();
  if (!propertyId) return NextResponse.json({ error: "propertyId obrigatório." }, { status: 400 });

  const exists = await db.property.findUnique({ where: { id: propertyId } });
  if (!exists) return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });

  try {
    await db.favorite.create({ data: { userId: user.id, propertyId } });
  } catch (e: any) {
    // já existe (unique) — ok
    if (!String(e?.code).includes("Unique")) {
      return NextResponse.json({ error: "Erro ao favoritar." }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, favorited: true });
}
