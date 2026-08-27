import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, getAdvertiser, ADMIN_ROLES, ADVERTISER_ROLES } from "@/lib/session";
import { LEAD_SOURCES } from "@/lib/constants";

// GET /api/leads — leads do anunciante ou todos (admin)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get("limit") || "100"), 500);

  let where: any = {};
  if (ADVERTISER_ROLES.includes(user.role)) {
    const { agency, owner } = await getAdvertiser(user.id);
    if (agency) where.agencyId = agency.id;
    else if (owner) {
      // leads em imóveis do proprietário
      where.property = { ownerId: owner.id };
    } else {
      where.property = { broker: { userId: user.id } };
    }
  } else if (!ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const leads = await db.lead.findMany({
    where,
    include: {
      property: { select: { id: true, title: true, price: true, purpose: true, propertyType: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ leads, total: leads.length });
}

// POST /api/leads — registra interação (whatsapp/telefone/interesse/direções/compartilhamento)
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  const body = await req.json();
  const { propertyId, source, message, contact } = body || {};

  if (!propertyId) return NextResponse.json({ error: "propertyId obrigatório." }, { status: 400 });
  const validSources = Object.values(LEAD_SOURCES);
  if (!validSources.includes(source)) {
    return NextResponse.json({ error: "source inválido." }, { status: 400 });
  }

  const property = await db.property.findUnique({
    where: { id: propertyId },
    select: { agencyId: true, ownerId: true, brokerId: true },
  });
  if (!property) return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });

  const advertiserType = property.agencyId
    ? "AGENCY"
    : property.ownerId
    ? "OWNER"
    : "BROKER";

  const lead = await db.lead.create({
    data: {
      userId: user?.id ?? null,
      propertyId,
      agencyId: property.agencyId,
      advertiserType,
      source,
      message: message || null,
      contact: contact || user?.phone || null,
    },
  });

  return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
}
