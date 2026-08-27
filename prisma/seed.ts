import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";
import { DEFAULT_PLANS } from "../src/lib/plans";
import { PROPERTY_STATUS } from "../src/lib/constants";

// Imagens de imóveis (Unsplash — URLs públicas e estáveis)
const IMG = [
  "photo-1560448204-e02f11c3d0e2",
  "photo-1502672260266-1c1ef2d93688",
  "photo-1568605114967-8130f3a36994",
  "photo-1512917774080-9991f1c4c750",
  "photo-1582407947304-fd86f028f716",
  "photo-1493809842364-78817add7ffb",
  "photo-1505873242700-f289a29e1e0f",
  "photo-1484154218962-a197022b5858",
  "photo-1494526585095-c41746248156",
  "photo-1564013799919-ab600027ffc6",
  "photo-1580587771545-6e7ef45b3d3d",
  "photo-1613490493576-7fde63acd311",
  "photo-1600596542815-ffad4c1539a9",
  "photo-1600585154340-be6161a56a0c",
  "photo-1600607687939-ce8a6c25118c",
];
const img = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

// Bairros de Belo Horizonte com coordenadas-base
const HOODS = [
  { name: "Savassi", lat: -19.9387, lng: -43.9284 },
  { name: "Lourdes", lat: -19.9286, lng: -43.9521 },
  { name: "Funcionários", lat: -19.9312, lng: -43.9398 },
  { name: "Centro", lat: -19.9205, lng: -43.9406 },
  { name: "Pampulha", lat: -19.8516, lng: -43.9698 },
  { name: "Serra", lat: -19.9552, lng: -43.9008 },
  { name: "Anchieta", lat: -19.9476, lng: -43.9162 },
  { name: "Cidade Jardim", lat: -19.9663, lng: -43.9521 },
  { name: "Buritis", lat: -19.9719, lng: -43.9873 },
  { name: "Grajaú", lat: -19.8996, lng: -43.9648 },
  { name: "Padre Eustáquio", lat: -19.9089, lng: -43.9453 },
  { name: "Prado", lat: -19.9031, lng: -43.9756 },
];

const TYPES = ["APARTMENT", "HOUSE", "SHOP", "COMMERCIAL_ROOM"];
const PURPOSES = ["RENT", "SALE"];

const pick = <T,>(arr: T[], i: number): T => arr[i % arr.length];

function jitter(base: number, seed: number, amt = 0.006) {
  return base + ((seed * 9301 + 49297) % 1000) / 1000 * amt - amt / 2;
}

async function main() {
  console.log("🧹 Limpando banco...");
  await db.report.deleteMany();
  await db.lead.deleteMany();
  await db.favorite.deleteMany();
  await db.payment.deleteMany();
  await db.subscription.deleteMany();
  await db.propertyImage.deleteMany();
  await db.property.deleteMany();
  await db.broker.deleteMany();
  await db.owner.deleteMany();
  await db.agency.deleteMany();
  await db.plan.deleteMany();
  await db.user.deleteMany();

  // ---- Planos ----
  console.log("📦 Criando planos...");
  for (const p of DEFAULT_PLANS) {
    await db.plan.create({ data: { ...p } as any });
  }

  // ---- Admin ----
  console.log("👑 Criando admin...");
  const adminPass = await bcrypt.hash("admin123", 10);
  const admin = await db.user.create({
    data: {
      email: "admin@mapimovel.com",
      name: "Administrador",
      phone: "+55 31 99999-0000",
      passwordHash: adminPass,
      role: "ADMIN",
    },
  });

  // ---- Imobiliárias ----
  console.log("🏢 Criando imobiliárias...");
  const agenciesData = [
    {
      name: "Imobiliária Horizonte",
      email: "contato@horizonteimoveis.com",
      cnpj: "12.345.678/0001-90",
      creci: "MG-12345",
      responsibleName: "Mariana Costa",
      whatsapp: "+55 31 98888-1001",
      logoUrl: "",
      description: "Mais de 15 anos no mercado de Belo Horizonte.",
      planCode: "PRO",
    },
    {
      name: "Savassi Imóveis Premium",
      email: "contato@savassiimoveis.com",
      cnpj: "23.456.789/0001-01",
      creci: "MG-23456",
      responsibleName: "Rafael Mendes",
      whatsapp: "+55 31 98888-1002",
      description: "Especialistas em imóveis de alto padrão na região Sul.",
      planCode: "BUSINESS",
    },
    {
      name: "Conecta Imóveis",
      email: "contato@conectaimoveis.com",
      cnpj: "34.567.890/0001-12",
      creci: "MG-34567",
      responsibleName: "Juliana Alves",
      whatsapp: "+55 31 98888-1003",
      description: "Tecnologia + atendimento humano para encontrar seu lar.",
      planCode: "START",
    },
  ];

  const agencies = [];
  for (const a of agenciesData) {
    const pass = await bcrypt.hash("imob123", 10);
    const u = await db.user.create({
      data: {
        email: a.email,
        name: a.name,
        phone: a.whatsapp,
        passwordHash: pass,
        role: "AGENCY",
      },
    });
    const plan = await db.plan.findUnique({ where: { code: a.planCode } });
    const ag = await db.agency.create({
      data: {
        userId: u.id,
        name: a.name,
        cnpj: a.cnpj,
        creci: a.creci,
        responsibleName: a.responsibleName,
        phone: a.whatsapp,
        whatsapp: a.whatsapp,
        email: a.email,
        description: a.description,
        status: "APPROVED",
        verified: true,
      },
    });
    if (plan) {
      await db.subscription.create({
        data: {
          agencyId: ag.id,
          planId: plan.id,
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        },
      });
    }
    agencies.push({ agency: ag, planCode: a.planCode });
  }

  // ---- Proprietário ----
  console.log("🏠 Criando proprietário...");
  const opass = await bcrypt.hash("dono123", 10);
  const ou = await db.user.create({
    data: {
      email: "dono@mapimovel.com",
      name: "Carlos Proprietário",
      phone: "+55 31 97777-2000",
      passwordHash: opass,
      role: "OWNER",
    },
  });
  const owner = await db.owner.create({
    data: { userId: ou.id, verificationStatus: "VERIFIED" },
  });
  const ownerPlan = await db.plan.findUnique({ where: { code: "OWNER_SINGLE" } });
  if (ownerPlan) {
    await db.subscription.create({
      data: {
        ownerId: owner.id,
        planId: ownerPlan.id,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });
  }

  // ---- Usuário comum (demo) ----
  const upass = await bcrypt.hash("user123", 10);
  await db.user.create({
    data: {
      email: "user@mapimovel.com",
      name: "Ana Buscadora",
      phone: "+55 31 96666-3000",
      passwordHash: upass,
      role: "USER",
    },
  });

  // ---- Imóveis ----
  console.log("🏘️ Criando imóveis...");
  const titles: Record<string, string[]> = {
    APARTMENT: [
      "Apartamento 2 quartos",
      "Apto 3 quartos com varanda",
      "Cobertura duplex",
      "Studio moderno",
      "Apartamento recém reformado",
    ],
    HOUSE: [
      "Casa em condomínio fechado",
      "Casa 3 quartos com quintal",
      "Casa térrea ampla",
      "Casa geminada",
    ],
    SHOP: ["Loja de esquina", "Ponto comercial", "Loja em via movimentada"],
    COMMERCIAL_ROOM: [
      "Sala comercial",
      "Sala corporativa",
      "Conjunto comercial",
    ],
  };
  const desc =
    "Imóvel bem localizado, próximo a comércio, transporte e áreas verdes. " +
    "Acabamento de qualidade, iluminação natural e ventilação. " +
    "Documentação em dia e pronto para visita. Agende sua visita pelo WhatsApp.";

  let created = 0;
  const totalProperties = 52;
  for (let i = 0; i < totalProperties; i++) {
    const hood = pick(HOODS, i);
    const type = pick(TYPES, i + 1);
    const purpose = pick(PURPOSES, i + 2);
    const isOwnerProp = i % 9 === 0; // alguns do proprietário
    const agency = isOwnerProp ? null : pick(agencies, i + 3);
    const lat = jitter(hood.lat, i + 7);
    const lng = jitter(hood.lng, i + 11);

    // preço conforme tipo/finalidade
    let price: number;
    if (purpose === "RENT") {
      price =
        type === "APARTMENT"
          ? 1800 + (i % 8) * 350
          : type === "HOUSE"
          ? 2500 + (i % 6) * 500
          : 3000 + (i % 5) * 800;
    } else {
      price =
        type === "APARTMENT"
          ? 380000 + (i % 8) * 45000
          : type === "HOUSE"
          ? 620000 + (i % 6) * 90000
          : 450000 + (i % 5) * 80000;
    }

    const titleList = titles[type];
    const title = `${titleList[i % titleList.length]} — ${hood.name}`;

    const bedrooms =
      type === "APARTMENT" || type === "HOUSE" ? ((i % 3) + 1) as number : null;
    const bathrooms =
      type === "APARTMENT" || type === "HOUSE" ? ((i % 2) + 1) as number : (i % 2) + 1;
    const parkingSpaces = (i % 3);
    const area =
      type === "APARTMENT"
        ? 45 + (i % 6) * 15
        : type === "HOUSE"
        ? 120 + (i % 5) * 30
        : 30 + (i % 4) * 20;

    // status: a maioria ativo, alguns pausados/alugados/vendidos
    let status = PROPERTY_STATUS.ACTIVE;
    if (i % 13 === 5) status = PROPERTY_STATUS.PAUSED;
    else if (i % 17 === 3) status = purpose === "RENT" ? PROPERTY_STATUS.RENTED : PROPERTY_STATUS.SOLD;

    const featured = i % 7 === 0;
    const badge = featured ? (i % 2 === 0 ? "OFFER" : "RECOMMENDED") : null;

    const property = await db.property.create({
      data: {
        agencyId: agency?.agency.id ?? null,
        ownerId: isOwnerProp ? owner.id : null,
        title,
        description: desc,
        purpose,
        propertyType: type,
        price,
        condominium: type === "APARTMENT" ? 250 + (i % 5) * 80 : null,
        iptu: 800 + (i % 4) * 300,
        area,
        bedrooms,
        bathrooms,
        parkingSpaces,
        address: `Rua ${pick(["dos Inconfidentes", "Pernambuco", "Bahia", "São Paulo", "Rio de Janeiro", "Antônio de Albuquerque", "Turmalina"], i)}`,
        number: String(100 + i * 7),
        neighborhood: hood.name,
        city: "Belo Horizonte",
        state: "MG",
        postalCode: `30${100 + i * 13}-${(i * 7) % 100 < 10 ? "0" : ""}${(i * 7) % 100}`,
        latitude: lat,
        longitude: lng,
        contactName: isOwnerProp ? "Carlos Proprietário" : agency?.agency.responsibleName,
        whatsapp: isOwnerProp ? "+55 31 97777-2000" : agency?.agency.whatsapp,
        phone: isOwnerProp ? "+55 31 97777-2000" : agency?.agency.whatsapp,
        status,
        featured,
        badge,
        views: Math.floor(Math.random() * 400) + 20,
        lastConfirmedAt: new Date(Date.now() - (i % 20) * 86400000),
      },
    });

    // imagens (3 a 5 por imóvel)
    const imgCount = 3 + (i % 3);
    const startIdx = (i * 3) % IMG.length;
    for (let j = 0; j < imgCount; j++) {
      await db.propertyImage.create({
        data: {
          propertyId: property.id,
          url: img(IMG[(startIdx + j) % IMG.length]),
          sortOrder: j,
          isPrimary: j === 0,
        },
      });
    }
    created++;
  }

  // ---- Alguns favoritos e leads de exemplo ----
  console.log("💬 Criando favoritos e leads de exemplo...");
  const ana = await db.user.findUnique({ where: { email: "user@mapimovel.com" } });
  const activeProps = await db.property.findMany({
    where: { status: "ACTIVE" },
    take: 5,
    orderBy: { createdAt: "asc" },
  });
  if (ana) {
    for (const p of activeProps.slice(0, 3)) {
      await db.favorite.create({ data: { userId: ana.id, propertyId: p.id } });
    }
  }
  // leads nas primeiras 6 propriedades ativas
  for (let i = 0; i < 6 && i < activeProps.length; i++) {
    const p = activeProps[i];
    await db.lead.create({
      data: {
        propertyId: p.id,
        agencyId: p.agencyId,
        advertiserType: p.agencyId ? "AGENCY" : "OWNER",
        source: pick(["WHATSAPP", "PHONE", "INTEREST"], i),
        contact: ana?.phone,
        createdAt: new Date(Date.now() - i * 3600000),
      },
    });
  }

  // ---- Uma denúncia de exemplo ----
  if (activeProps[6] && ana) {
    await db.report.create({
      data: {
        propertyId: activeProps[6].id,
        userId: ana.id,
        reason: "Anúncio desatualizado",
        description: "Acredito que este imóvel já foi alugado.",
        status: "OPEN",
      },
    });
  }

  // ---- Setting institucional ----
  await db.setting.create({
    data: {
      key: "platform_name",
      value: "MapImóvel",
    },
  });

  console.log(`✅ Seed concluído! ${created} imóveis criados.`);
  console.log("   Admin: admin@mapimovel.com / admin123");
  console.log("   Imobiliária: contato@horizonteimoveis.com / imob123");
  console.log("   Proprietário: dono@mapimovel.com / dono123");
  console.log("   Usuário: user@mapimovel.com / user123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
