import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, getAdvertiser, ADMIN_ROLES, ADVERTISER_ROLES } from "@/lib/session";

// GET /api/agencies (público, lista aprovadas) ou com include se dono
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mine = sp.get("mine") === "1";
  const user = await getSessionUser();

  if (mine) {
    if (!user || !ADVERTISER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }
    const { agency, owner, broker } = await getAdvertiser(user.id);
    return NextResponse.json({ agency, owner, broker });
  }

  const id = sp.get("id");
  if (id) {
    const ag = await db.agency.findUnique({
      where: { id },
      include: {
        properties: {
          where: { status: "ACTIVE" },
          take: 50,
          orderBy: { createdAt: "desc" },
          include: { images: { where: { isPrimary: true }, take: 1 } },
        },
      },
    });
    if (!ag || ag.status !== "APPROVED") {
      return NextResponse.json({ error: "Imobiliária não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ agency: ag });
  }

  // lista pública
  const agencies = await db.agency.findMany({
    where: { status: "APPROVED" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      description: true,
      whatsapp: true,
      phone: true,
      verified: true,
      _count: { select: { properties: { where: { status: "ACTIVE" } } } },
    },
  });
  return NextResponse.json({ agencies });
}

// PUT /api/agencies/[id] (própria imobiliária) — ver arquivo [id]/route.ts
