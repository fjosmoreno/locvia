import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSessionUser, ADMIN_ROLES } from "@/lib/session";
import { AGENCY_STATUS, ROLES } from "@/lib/constants";

// GET /api/admin/agencies — lista todas (admin)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || undefined;
  const agencies = await db.agency.findMany({
    where: status ? { status } : {},
    include: {
      user: { select: { email: true, phone: true } },
      _count: { select: { properties: true } },
      subscription: { include: { plan: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ agencies });
}

// POST /api/admin/agencies — admin cria imobiliária (User + Agency em transação)
export async function POST(req: NextRequest) {
  const admin = await getSessionUser();
  if (!admin || !ADMIN_ROLES.includes(admin.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body = await req.json();
  const {
    // login
    email,
    password,
    name,
    phone,
    // dados da imobiliária
    agencyName,
    cnpj,
    creci,
    responsibleName,
    whatsapp,
    agencyEmail,
    address,
    description,
    website,
    instagram,
    logoUrl,
    status,
    verified,
  } = body || {};

  // ===== Validações =====
  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "E-mail, senha e nome do responsável são obrigatórios." },
      { status: 400 }
    );
  }
  if (!agencyName) {
    return NextResponse.json(
      { error: "Nome da imobiliária é obrigatório." },
      { status: 400 }
    );
  }
  if (String(password).length < 6) {
    return NextResponse.json(
      { error: "A senha deve ter ao menos 6 caracteres." },
      { status: 400 }
    );
  }

  const cleanEmail = String(email).toLowerCase().trim();
  const existing = await db.user.findUnique({ where: { email: cleanEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe um usuário com esse e-mail." },
      { status: 409 }
    );
  }

  if (cnpj) {
    const cnpjClean = String(cnpj).replace(/\D/g, "");
    if (cnpjClean.length > 0) {
      const cnpjExists = await db.agency.findUnique({ where: { cnpj: cnpjClean } });
      if (cnpjExists) {
        return NextResponse.json(
          { error: "Já existe uma imobiliária com esse CNPJ." },
          { status: 409 }
        );
      }
    }
  }

  // Status: admin pode escolher; default APPROVED (cadastro manual já é aprovado)
  const finalStatus = [AGENCY_STATUS.PENDING, AGENCY_STATUS.APPROVED, AGENCY_STATUS.BLOCKED].includes(
    status
  )
    ? status
    : AGENCY_STATUS.APPROVED;
  const finalVerified = finalStatus === AGENCY_STATUS.APPROVED ? Boolean(verified ?? true) : Boolean(verified ?? false);

  // ===== Criação atômica =====
  const passwordHash = await bcrypt.hash(String(password), 10);
  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: cleanEmail,
        name: String(name).trim(),
        phone: phone || null,
        passwordHash,
        role: ROLES.AGENCY,
        status: "ACTIVE",
      },
    });

    const agency = await tx.agency.create({
      data: {
        userId: user.id,
        name: String(agencyName).trim(),
        cnpj: cnpj ? String(cnpj).replace(/\D/g, "") || null : null,
        creci: creci || null,
        responsibleName: responsibleName || String(name).trim(),
        phone: phone || null,
        whatsapp: whatsapp || phone || null,
        email: agencyEmail || cleanEmail,
        address: address || null,
        description: description || null,
        website: website || null,
        instagram: instagram || null,
        logoUrl: logoUrl || null,
        status: finalStatus,
        verified: finalVerified,
      },
    });

    return { user, agency };
  });

  return NextResponse.json(
    {
      ok: true,
      agency: {
        id: result.agency.id,
        name: result.agency.name,
        status: result.agency.status,
        verified: result.agency.verified,
        user: { email: result.user.email },
      },
    },
    { status: 201 }
  );
}
