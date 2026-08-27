import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// DELETE /api/favorites/[propertyId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  await db.favorite.deleteMany({ where: { userId: user.id, propertyId } });
  return NextResponse.json({ ok: true, favorited: false });
}
