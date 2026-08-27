import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { publicWhere, propertyInclude } from "@/lib/property-serializer";

// GET /api/saved-searches — lista buscas salvas do usuário com contagem de matches
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ searches: [] });

  const searches = await db.savedSearch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  // Para cada busca, conta quantos imóveis ativos correspondem aos filtros
  const result = await Promise.all(
    searches.map(async (s) => {
      let filters: any = {};
      try {
        filters = JSON.parse(s.filters);
      } catch {
        /* noop */
      }
      const where = publicWhere({
        purpose: filters.purpose,
        propertyType: filters.propertyTypes?.length ? filters.propertyTypes : undefined,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        bedrooms: filters.bedrooms,
        bathrooms: filters.bathrooms,
        parkingSpaces: filters.parkingSpaces,
        minArea: filters.minArea,
        search: filters.search,
      });
      const count = await db.property.count({ where });
      const newMatches = Math.max(0, count - s.lastMatchCount);
      return {
        id: s.id,
        name: s.name,
        filters,
        matchCount: count,
        newMatches,
        createdAt: s.createdAt.toISOString(),
      };
    })
  );

  return NextResponse.json({ searches: result });
}

// POST /api/saved-searches — cria nova busca salva (alerta)
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Faça login para salvar buscas." }, { status: 401 });

  const body = await req.json();
  const { name, filters } = body;
  if (!name || !filters)
    return NextResponse.json({ error: "Nome e filtros obrigatórios." }, { status: 400 });

  // Conta matches atuais para baseline
  const where = publicWhere({
    purpose: filters.purpose,
    propertyType: filters.propertyTypes?.length ? filters.propertyTypes : undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    bedrooms: filters.bedrooms,
    bathrooms: filters.bathrooms,
    parkingSpaces: filters.parkingSpaces,
    minArea: filters.minArea,
    search: filters.search,
  });
  const count = await db.property.count({ where });

  const created = await db.savedSearch.create({
    data: {
      userId: user.id,
      name,
      filters: JSON.stringify(filters),
      lastMatchCount: count,
    },
  });

  return NextResponse.json({ search: created, matchCount: count }, { status: 201 });
}
