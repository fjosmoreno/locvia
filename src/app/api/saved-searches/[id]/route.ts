import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// DELETE /api/saved-searches/[id] — remove busca salva
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  await db.savedSearch.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
