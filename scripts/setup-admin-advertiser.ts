import { db } from "../src/lib/db";

/**
 * Configura o usuário admin com perfil de imobiliária aprovado + plano Enterprise,
 * para que possa cadastrar imóveis pelo painel do anunciante.
 * Executar: bun run tsx scripts/setup-admin-advertiser.ts
 */
async function main() {
  const adminEmail = "admin@mapimovel.com";

  const admin = await db.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    console.error("❌ Admin não encontrado. Rode o seed primeiro: bun run tsx prisma/seed.ts");
    process.exit(1);
  }

  console.log(`👤 Admin encontrado: ${admin.email} (role: ${admin.role})`);

  // Cria ou atualiza perfil de imobiliária aprovado
  let agency = await db.agency.findUnique({ where: { userId: admin.id } });
  if (!agency) {
    agency = await db.agency.create({
      data: {
        userId: admin.id,
        name: "LOCVIA (Admin)",
        responsibleName: admin.name,
        phone: admin.phone || "+55 31 99999-0000",
        whatsapp: admin.phone || "+55 31 99999-0000",
        email: admin.email,
        description: "Conta administrativa da plataforma LOCVIA — acesso total para cadastro e gestão de imóveis.",
        status: "APPROVED",
        verified: true,
      },
    });
    console.log("🏢 Perfil de imobiliária criado e APROVADO.");
  } else {
    agency = await db.agency.update({
      where: { userId: admin.id },
      data: { status: "APPROVED", verified: true },
    });
    console.log("🏢 Perfil de imobiliária atualizado para APROVADO.");
  }

  // Cria assinatura Enterprise (ativa, sem expiração — admin)
  const plan = await db.plan.findUnique({ where: { code: "ENTERPRISE" } });
  if (!plan) {
    console.error("❌ Plano ENTERPRISE não encontrado. Rode o seed.");
    process.exit(1);
  }

  // Cancela assinaturas anteriores e cria nova ativa
  await db.subscription.updateMany({
    where: { agencyId: agency.id, status: "ACTIVE" },
    data: { status: "CANCELED" },
  });

  const sub = await db.subscription.create({
    data: {
      agencyId: agency.id,
      planId: plan.id,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10), // 10 anos
    },
  });
  console.log(`💳 Assinatura Enterprise ativa (plano: ${plan.name}, máx ${plan.maxProperties} imóveis).`);
  console.log(`   Validade: ${sub.expiresAt?.toISOString().split("T")[0]}`);

  console.log("\n✅ Configuração concluída!");
  console.log("\n📋 CREDENCIAIS DE ACESSO:");
  console.log("   E-mail: admin@mapimovel.com");
  console.log("   Senha:  admin123");
  console.log("\n🔑 Com estas credenciais você pode:");
  console.log("   • Cadastrar imóveis pelo 'Painel do anunciante' (sem limite de plano)");
  console.log("   • Gerenciar imobiliárias, usuários, planos e denúncias pelo 'Painel administrativo'");
  console.log("   • Aprovar/rejeitar imóveis e anunciantes");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
