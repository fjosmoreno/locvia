import { db } from "@/lib/db";
import { PLAN_CODES } from "@/lib/constants";

/** Conta imóveis ativos de um anunciante (respeita limite do plano). */
export async function countActiveProperties(opts: {
  agencyId?: string;
  ownerId?: string;
}): Promise<number> {
  return db.property.count({
    where: {
      AND: [
        { status: "ACTIVE" },
        opts.agencyId ? { agencyId: opts.agencyId } : {},
        opts.ownerId ? { ownerId: opts.ownerId } : {},
      ].filter((c) => Object.keys(c).length > 0) as any,
    },
  });
}

/** Retorna o limite do plano ativo do anunciante. */
export async function getPlanLimit(opts: {
  agencyId?: string;
  ownerId?: string;
}): Promise<{ maxProperties: number; planCode: string | null; active: boolean }> {
  const sub = await db.subscription.findFirst({
    where: {
      OR: [
        opts.agencyId ? { agencyId: opts.agencyId } : {},
        opts.ownerId ? { ownerId: opts.ownerId } : {},
      ].filter((c) => Object.keys(c).length > 0) as any,
      status: "ACTIVE",
    },
    include: { plan: true },
    orderBy: { expiresAt: "desc" },
  });
  if (!sub) return { maxProperties: 0, planCode: null, active: false };
  const expired = sub.expiresAt && new Date(sub.expiresAt) < new Date();
  return {
    maxProperties: sub.plan.maxProperties,
    planCode: sub.plan.code,
    active: !expired,
  };
}

/** Verifica se anunciante pode publicar mais um imóvel ativo. */
export async function canPublish(opts: {
  agencyId?: string;
  ownerId?: string;
}): Promise<{ allowed: boolean; reason?: string; current: number; max: number }> {
  const [current, limit] = await Promise.all([
    countActiveProperties(opts),
    getPlanLimit(opts),
  ]);
  if (!limit.active) {
    return {
      allowed: false,
      reason: "Assine um plano para publicar imóveis.",
      current,
      max: 0,
    };
  }
  if (current >= limit.maxProperties) {
    return {
      allowed: false,
      reason: `Limite do plano atingido (${current}/${limit.maxProperties}). Faça upgrade para publicar mais imóveis.`,
      current,
      max: limit.maxProperties,
    };
  }
  return { allowed: true, current, max: limit.maxProperties };
}

/** Planos padrão (criados no seed). */
export const DEFAULT_PLANS = [
  {
    code: PLAN_CODES.START,
    name: "Start",
    description: "Para imobiliárias começando no mapa.",
    maxProperties: 20,
    price: 149.9,
    billingCycle: "MONTHLY",
    sortOrder: 1,
  },
  {
    code: PLAN_CODES.PRO,
    name: "Pro",
    description: "Mais imóveis e prioridade nos resultados.",
    maxProperties: 40,
    price: 299.9,
    billingCycle: "MONTHLY",
    sortOrder: 2,
  },
  {
    code: PLAN_CODES.BUSINESS,
    name: "Business",
    description: "Para portfólios maiores.",
    maxProperties: 80,
    price: 549.9,
    billingCycle: "MONTHLY",
    sortOrder: 3,
  },
  {
    code: PLAN_CODES.ENTERPRISE,
    name: "Enterprise",
    description: "Sem limites práticos de imóveis.",
    maxProperties: 500,
    price: 1199.9,
    billingCycle: "MONTHLY",
    sortOrder: 4,
  },
  {
    code: PLAN_CODES.OWNER_SINGLE,
    name: "Anúncio Individual",
    description: "Para proprietários: 1 imóvel por 30 dias.",
    maxProperties: 1,
    price: 29.9,
    billingCycle: "ONCE",
    durationDays: 30,
    sortOrder: 5,
  },
];
