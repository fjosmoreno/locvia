import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";
import { PROPERTY_STATUS } from "../src/lib/constants";

/**
 * Seed de imóveis em Contagem/MG distribuídos nos bairros:
 * - Santa Cruz Industrial
 * - Eldorado
 * - Riacho
 * - Centro de Contagem
 *
 * Cria (ou reusa) uma imobiliária "LOCVIA (Admin)" já aprovada e cadastra
 * ~40 imóveis com coordenadas reais jitteradas, preços/tipos variados,
 * fotos do Unsplash. Todos como ACTIVE (já aprovados pelo admin) para
 * aparecerem no mapa público imediatamente.
 *
 * Executar: bun run tsx scripts/seed-contagem.ts
 */

// Coordenadas-base reais dos bairros de Contagem (aproximadas via OSM)
const HOODS = [
  { name: "Santa Cruz Industrial", lat: -19.9308, lng: -44.0719 },
  { name: "Eldorado", lat: -19.9517, lng: -44.0536 },
  { name: "Riacho", lat: -19.9619, lng: -44.0722 },
  { name: "Centro", lat: -19.9317, lng: -44.0536 },
];

const TYPES = ["APARTMENT", "HOUSE", "SHOP", "COMMERCIAL_ROOM"];
const PURPOSES = ["RENT", "SALE"];

// Imagens Unsplash (estáveis)
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
  "photo-1512917774080-9991f1c4c750",
  "photo-1486406146926-c627a92ad1ab",
  "photo-1577415124269-fc1140a69e91",
];
const img = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

function jitter(base: number, seed: number, amt = 0.006) {
  return base + (((seed * 9301 + 49297) % 1000) / 1000) * amt - amt / 2;
}

const TITLES: Record<string, string[]> = {
  APARTMENT: [
    "Apartamento 2 quartos",
    "Apto 3 quartos com varanda",
    "Apartamento compacto",
    "Apartamento recém reformado",
    "Kitnet mobiliado",
  ],
  HOUSE: [
    "Casa em condomínio",
    "Casa 3 quartos com quintal",
    "Casa térrea ampla",
    "Casa geminada",
    "Casa com garagem",
  ],
  SHOP: [
    "Loja de esquina",
    "Ponto comercial",
    "Loja em via movimentada",
    "Loja com mezanino",
  ],
  COMMERCIAL_ROOM: [
    "Sala comercial",
    "Sala corporativa",
    "Conjunto comercial",
    "Sala com recepção",
  ],
};

const STREETS = [
  "Rua das Flores", "Avenida João César de Oliveira", "Rua Tupis",
  "Avenida Carlos Luz", "Rua João Pinheiro", "Rua dos Inconfidentes",
  "Avenida Amazonas", "Rua Pernambuco", "Rua Bahia",
  "Rua da Bahia", "Avenida Cristiano Machado", "Rua Itajubá",
];

async function main() {
  console.log("🏭 Cadastrando imóveis em Contagem/MG...\n");

  // Admin já configurado como imobiliária aprovada (script setup-admin-advertiser)
  const admin = await db.user.findUnique({
    where: { email: "admin@mapimovel.com" },
    include: { agency: true },
  });
  if (!admin?.agency) {
    console.error("❌ Admin sem perfil de imobiliária. Rode: bun run tsx scripts/setup-admin-advertiser.ts");
    process.exit(1);
  }

  // Remove imóveis anteriores do admin em Contagem (para permitir re-rodar)
  const deleted = await db.property.deleteMany({
    where: { agencyId: admin.agency.id, city: "Contagem" },
  });
  console.log(`🧹 Removidos ${deleted.count} imóveis anteriores do admin em Contagem.\n`);

  let created = 0;
  const total = 44; // ~11 por bairro

  for (let i = 0; i < total; i++) {
    const hood = HOODS[i % HOODS.length];
    const type = TYPES[(i + 1) % TYPES.length];
    // Alterna propósito de forma mais equilibrada: metade RENT, metade SALE,
    // garantindo que cada tipo tenha imóveis em ambas as finalidades.
    const purpose = (i + Math.floor(i / TYPES.length)) % 2 === 0 ? "RENT" : "SALE";
    const lat = jitter(hood.lat, i + 7);
    const lng = jitter(hood.lng, i + 11);

    // Preços realistas para Contagem (2024)
    let price: number;
    if (purpose === "RENT") {
      price =
        type === "APARTMENT"
          ? 900 + (i % 8) * 250 // 900–2650
          : type === "HOUSE"
          ? 1500 + (i % 7) * 400 // 1500–3900
          : type === "SHOP"
          ? 2500 + (i % 6) * 700 // 2500–6000
          : 1200 + (i % 5) * 500; // 1200–3200 sala
    } else {
      price =
        type === "APARTMENT"
          ? 180000 + (i % 8) * 35000 // 180k–425k
          : type === "HOUSE"
          ? 280000 + (i % 7) * 60000 // 280k–640k
          : type === "SHOP"
          ? 350000 + (i % 6) * 80000 // 350k–750k
          : 150000 + (i % 5) * 45000; // 150k–330k sala
    }

    const titleList = TITLES[type];
    const title = `${titleList[i % titleList.length]} — ${hood.name}`;

    const isResidential = type === "APARTMENT" || type === "HOUSE";
    const bedrooms = isResidential ? ((i % 3) + 1) : null; // 1-3
    const bathrooms = isResidential ? ((i % 2) + 1) : ((i % 2) + 1); // 1-2
    const parkingSpaces = (i % 3); // 0-2
    // Áreas variadas; para SHOP inclui algumas ~140m² (exemplo do prompt)
    const area =
      type === "APARTMENT"
        ? 38 + (i % 6) * 12 // 38–98
        : type === "HOUSE"
        ? 90 + (i % 5) * 25 // 90–190
        : type === "SHOP"
        ? [40, 60, 80, 100, 120, 138, 140, 142, 150, 160][(i % 10)] // 40–160, inclui ~140
        : 25 + (i % 4) * 15; // 25–70 sala

    // ~80% ativos, alguns pausados/alugados/vendidos para realismo
    let status = PROPERTY_STATUS.ACTIVE;
    if (i % 13 === 5) status = PROPERTY_STATUS.PAUSED;
    else if (i % 17 === 3) status = purpose === "RENT" ? PROPERTY_STATUS.RENTED : PROPERTY_STATUS.SOLD;

    const featured = i % 6 === 0;
    const badge = featured ? (i % 2 === 0 ? "OFFER" : "RECOMMENDED") : null;

    const street = STREETS[i % STREETS.length];
    const number = String(50 + i * 13);

    const desc =
      `Imóvel bem localizado em ${hood.name}, Contagem. ` +
      `Próximo a comércio, transporte público, escolas e fácil acesso à BR-381. ` +
      (isResidential
        ? `Residencial com ${bedrooms} quarto(s), ${bathrooms} banheiro(s) e ${parkingSpaces} vaga(s). `
        : `Ponto comercial com ${area}m², vitrine para a rua e excelente fluxo de clientes. `) +
      `Documentação em dia. Agende sua visita pelo WhatsApp.`;

    const property = await db.property.create({
      data: {
        agencyId: admin.agency.id,
        title,
        description: desc,
        purpose,
        propertyType: type,
        price,
        condominium: type === "APARTMENT" ? 180 + (i % 5) * 60 : null,
        iptu: 600 + (i % 4) * 250,
        area,
        bedrooms,
        bathrooms,
        parkingSpaces,
        address: street,
        number,
        neighborhood: hood.name,
        city: "Contagem",
        state: "MG",
        postalCode: `32${100 + i * 7}-${(i * 11) % 100 < 10 ? "0" : ""}${(i * 11) % 100}`,
        latitude: lat,
        longitude: lng,
        contactName: "LOCVIA (Admin)",
        whatsapp: "+55 31 99999-0000",
        phone: "+55 31 99999-0000",
        status,
        featured,
        badge,
        views: Math.floor(Math.random() * 250) + 15,
        lastConfirmedAt: new Date(Date.now() - (i % 15) * 86400000),
      },
    });

    // 3-5 imagens por imóvel
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
    if (created % 10 === 0) console.log(`  ...${created}/${total} cadastrados`);
  }

  // Resumo por bairro
  console.log("\n📊 Resumo por bairro:");
  for (const hood of HOODS) {
    const c = await db.property.count({
      where: { agencyId: admin.agency.id, city: "Contagem", neighborhood: hood.name },
    });
    console.log(`   ${hood.name}: ${c} imóveis`);
  }
  const activeCount = await db.property.count({
    where: { agencyId: admin.agency.id, city: "Contagem", status: "ACTIVE" },
  });
  console.log(`\n✅ Total: ${created} imóveis cadastrados em Contagem (${activeCount} ativos no mapa).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
