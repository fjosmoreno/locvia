import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, ADMIN_ROLES } from "@/lib/session";

// PUT /api/plans/[id] — admin edita plano (preço, limites, etc.)
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
  const fields = ["name", "description", "maxProperties", "price", "billingCycle", "durationDays", "active", "sortOrder"];
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f];
  }
  const updated = await db.plan.update({ where: { id }, data: allowed });
  return NextResponse.json({ plan: updated });
}
