import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, ADMIN_ROLES } from "@/lib/session";

// GET /api/admin/reports
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
