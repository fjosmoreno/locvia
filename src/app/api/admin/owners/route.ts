import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, ADMIN_ROLES } from "@/lib/session";

// GET /api/admin/owners — lista proprietários (id do Owner + user)
export async function GET() {
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const owners = await db.owner.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      verificationStatus: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    take: 300,
  });
  return NextResponse.json({ owners });
}
