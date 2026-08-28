import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { rateLimitResponse } from "@/lib/rate-limit";

// POST /api/auth/register
export async function POST(req: NextRequest) {
  // Limite agressivo: registro é caro (bcrypt + emails de boas-vindas).
  // 10 por minuto por IP deve ser suficiente pra tentativas legítimas,
  // mas bloqueia scripts maliciosos que tentam criar contas em massa.
  const limited = rateLimitResponse(req, { windowMs: 60_000, max: 10 });
  if (limited) return limited;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const { email, password, name, phone, role } = body || {};

  if (!email || !password || !name) {
    return NextResponse.json({ error: "E-mail, senha e nome são obrigatórios." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "A senha deve ter ao menos 6 caracteres." }, { status: 400 });
  }
  const validRoles = [ROLES.USER, ROLES.OWNER, ROLES.BROKER, ROLES.AGENCY];
  const finalRole = validRoles.includes(role) ? role : ROLES.USER;

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      email: email.toLowerCase().trim(),
      name: name.trim(),
      phone: phone || null,
      passwordHash,
      role: finalRole,
    },
  });

  // Cria registros de anunciante conforme o role
  if (finalRole === ROLES.AGENCY) {
    const agencyBody = body.agency || {};
    await db.agency.create({
      data: {
        userId: user.id,
        name: agencyBody.name || name,
        cnpj: agencyBody.cnpj || null,
        creci: agencyBody.creci || null,
        responsibleName: agencyBody.responsibleName || name,
        phone: phone || agencyBody.phone || null,
        whatsapp: agencyBody.whatsapp || phone || null,
        email: user.email,
        address: agencyBody.address || null,
        description: agencyBody.description || null,
        status: "PENDING", // aguarda aprovação do admin
      },
    });
  } else if (finalRole === ROLES.OWNER) {
    await db.owner.create({ data: { userId: user.id, verificationStatus: "PENDING" } });
  } else if (finalRole === ROLES.BROKER) {
    await db.broker.create({
      data: {
        userId: user.id,
        name,
        phone: phone || null,
        whatsapp: body.broker?.whatsapp || phone || null,
        creci: body.broker?.creci || null,
      },
    });
  }

  return NextResponse.json({ ok: true, userId: user.id, role: finalRole }, { status: 201 });
}
