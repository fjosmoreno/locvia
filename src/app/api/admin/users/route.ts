import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, ADMIN_ROLES } from "@/lib/session";

// GET /api/admin/users
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const role = sp.get("role") || undefined;
  const users = await db.user.findMany({
    where: role ? { role } : {},
    select: {
      id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return NextResponse.json({ users });
}
