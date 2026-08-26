import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, ADMIN_ROLES, ADVERTISER_ROLES, getAdvertiser } from "@/lib/session";
import { canPublish, getPlanLimit, countActiveProperties } from "@/lib/plans";

// GET /api/plans — planos públicos (para seleção de assinatura)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const manage = sp.get("manage") === "1";
  const user = await getSessionUser();

  if (manage) {
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }
    const plans = await db.plan.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ plans });
  }

  // plano do próprio anunciante + limites
  let subscriptionInfo: any = null;
  if (user && ADVERTISER_ROLES.includes(user.role)) {
    const { agency, owner } = await getAdvertiser(user.id);
    if (agency || owner) {
      const limit = await getPlanLimit({ agencyId: agency?.id, ownerId: owner?.id });
      const current = await countActiveProperties({ agencyId: agency?.id, ownerId: owner?.id });
      subscriptionInfo = { ...limit, currentActive: current };
    }
  }

  const plans = await db.plan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ plans, subscription: subscriptionInfo });
}

// POST /api/plans — assina um plano (MVP: ativação direta, gateway abstraído)
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !ADVERTISER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Faça login como anunciante." }, { status: 403 });
  }
  const { planId } = await req.json();
  if (!planId) return NextResponse.json({ error: "planId obrigatório." }, { status: 400 });

  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }

  const { agency, owner } = await getAdvertiser(user.id);
  if (user.role === "AGENCY" && !agency) {
    return NextResponse.json({ error: "Perfil de imobiliária não encontrado." }, { status: 400 });
  }
  if (user.role === "OWNER" && !owner) {
    return NextResponse.json({ error: "Perfil de proprietário não encontrado." }, { status: 400 });
  }

  // Cancela assinatura anterior ativa do mesmo anunciante
  if (agency) {
    await db.subscription.updateMany({
      where: { agencyId: agency.id, status: "ACTIVE" },
      data: { status: "CANCELED" },
    });
  }
  if (owner) {
    await db.subscription.updateMany({
      where: { ownerId: owner.id, status: "ACTIVE" },
      data: { status: "CANCELED" },
    });
  }

  const expiresAt = plan.durationDays
    ? new Date(Date.now() + plan.durationDays * 86400000)
    : new Date(Date.now() + 30 * 86400000);

  const sub = await db.subscription.create({
    data: {
      agencyId: agency?.id ?? null,
      ownerId: owner?.id ?? null,
      planId: plan.id,
      status: "ACTIVE",
      expiresAt,
    },
  });

  // Registra pagamento (abstração: gateway_reference pendente)
  await db.payment.create({
    data: {
      subscriptionId: sub.id,
      userId: user.id,
      amount: plan.price,
      status: "PAID", // MVP: simulado como pago — gateway real conectável depois
      gatewayReference: `MVP-DEMO-${Date.now()}`,
    },
  });

  return NextResponse.json({ ok: true, subscription: sub });
}
