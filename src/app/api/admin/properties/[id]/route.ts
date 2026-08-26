import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, ADMIN_ROLES } from "@/lib/session";

// PUT /api/admin/properties/[id] — moderar (status, featured, badge, rejeitar com motivo)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const body = await req.json();
  const allowed: Record<string, any> = {};
  if (body.status) allowed.status = body.status;
  if (body.featured !== undefined) allowed.featured = body.featured;
  if (body.badge !== undefined) allowed.badge = body.badge || null;
  if (body.title) allowed.title = body.title;

  const updated = await db.property.update({ where: { id }, data: allowed });
  return NextResponse.json({ property: updated });
}

// DELETE /api/admin/properties/[id] — remover anúncio
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  await db.property.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
