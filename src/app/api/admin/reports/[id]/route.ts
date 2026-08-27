import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, ADMIN_ROLES } from "@/lib/session";

// PUT /api/admin/reports/[id] — resolver / dispensar denúncia
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
  const updated = await db.report.update({
    where: { id },
    data: { status: body.status || "RESOLVED" },
  });
  return NextResponse.json({ report: updated });
}
