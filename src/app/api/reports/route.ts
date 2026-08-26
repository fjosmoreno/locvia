import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, ADMIN_ROLES } from "@/lib/session";

// GET /api/reports — admin lista denúncias
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || undefined;
  const reports = await db.report.findMany({
    where: status ? { status } : {},
    include: {
      property: { select: { id: true, title: true, status: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ reports });
}

// POST /api/reports — usuário denuncia imóvel
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  const body = await req.json();
  const { propertyId, reason, description } = body || {};
  if (!propertyId || !reason) {
    return NextResponse.json({ error: "propertyId e reason são obrigatórios." }, { status: 400 });
  }
  const property = await db.property.findUnique({ where: { id: propertyId } });
  if (!property) return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });

  const report = await db.report.create({
    data: {
      propertyId,
      userId: user?.id ?? null,
      reason,
      description: description || null,
      status: "OPEN",
    },
  });
  return NextResponse.json({ ok: true, reportId: report.id }, { status: 201 });
}
