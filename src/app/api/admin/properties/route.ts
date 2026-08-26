import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, ADMIN_ROLES } from "@/lib/session";

// GET /api/admin/properties — lista todos os imóveis (admin)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || undefined;
  const limit = Math.min(Number(sp.get("limit") || "200"), 500);
  const props = await db.property.findMany({
    where: status ? { status } : {},
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      agency: { select: { name: true } },
      owner: { select: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ properties: props });
}
