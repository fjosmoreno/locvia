import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, ADMIN_ROLES } from "@/lib/session";

// GET /api/admin/agencies — lista todas (admin)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || undefined;
  const agencies = await db.agency.findMany({
    where: status ? { status } : {},
    include: {
      user: { select: { email: true, phone: true } },
      _count: { select: { properties: true } },
      subscription: { include: { plan: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ agencies });
}
