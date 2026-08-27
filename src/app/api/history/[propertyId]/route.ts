import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// POST /api/history/[propertyId] — registra visualização de imóvel
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }); // não loga se não autenticado

  try {
    // upsert: se já visualizou, atualiza viewedAt; senão cria
    await db.propertyViewed.upsert({
      where: { userId_propertyId: { userId: user.id, propertyId } },
      update: { viewedAt: new Date() },
      create: { userId: user.id, propertyId },
    });
  } catch {
    // noop — imóvel pode não existir mais
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/history/[propertyId] — remove do histórico
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  await db.propertyViewed.deleteMany({
    where: { userId: user.id, propertyId },
  });
  return NextResponse.json({ ok: true });
}
