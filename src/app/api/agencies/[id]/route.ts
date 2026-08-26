import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// PUT /api/agencies/[id] — atualiza perfil da própria imobiliária
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const ag = await db.agency.findUnique({ where: { id } });
  if (!ag) return NextResponse.json({ error: "Não encontrada." }, { status: 404 });
  if (ag.userId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body = await req.json();
  const allowed: Record<string, any> = {};
  const fields = [
    "name", "cnpj", "creci", "responsibleName", "phone", "whatsapp",
    "email", "address", "logoUrl", "description", "website", "instagram",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f] === "" ? null : body[f];
  }

  const updated = await db.agency.update({ where: { id }, data: allowed });
  return NextResponse.json({ agency: updated });
}

// GET /api/agencies/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
