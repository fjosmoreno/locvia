import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, ADMIN_ROLES } from "@/lib/session";

// PUT /api/admin/users/[id] — bloquear / ativar / alterar role
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
  if (body.role) allowed.role = body.role;
  if (body.name) allowed.name = body.name;

  const updated = await db.user.update({ where: { id }, data: allowed });
  return NextResponse.json({ user: updated });
}
