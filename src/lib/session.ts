import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLES, USER_STATUS } from "@/lib/constants";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

/** Retorna o usuário autenticado (session) ou null. */
export async function getSessionUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    phone: session.user.phone,
  };
}

/** Versão completa: usuário + registro de anunciante (agency/owner/broker). */
export async function getAdvertiser(userId: string) {
  const [agency, owner, broker] = await Promise.all([
    db.agency.findUnique({ where: { userId }, include: { subscription: true } }),
    db.owner.findUnique({ where: { userId }, include: { subscription: true } }),
    db.broker.findUnique({ where: { userId } }),
  ]);
  return { agency, owner, broker };
}

export function isAuthorized(
  user: CurrentUser | null,
  roles: string[]
): user is CurrentUser {
  return !!user && roles.includes(user.role);
}

/** Verifica status ativo do usuário no banco (defesa em profundidade). */
export async function assertActiveUser(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!u || u.status === USER_STATUS.BLOCKED) return false;
  return true;
}

export const ADMIN_ROLES = [ROLES.ADMIN];
export const ADVERTISER_ROLES = [ROLES.AGENCY, ROLES.OWNER, ROLES.BROKER];
