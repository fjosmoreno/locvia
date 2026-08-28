// Investigação profunda do "Apartamento 2 quartos" — verifica filtros
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Lista TODOS os imóveis com title "Apartamento 2 quartos"
  const apts = await prisma.property.findMany({
    where: { title: { contains: "Apartamento 2 quartos" } },
    include: {
      images: true,
      videos: true,
      agency: { include: { user: true } },
      owner: { include: { user: true } },
    },
  });

  console.log(`Encontrados: ${apts.length} imoveis com "Apartamento 2 quartos"\n`);

  for (const p of apts) {
    console.log("=== ID:", p.id, "===");
    console.log("Title:", p.title);
    console.log("Status:", p.status);
    console.log("Purpose:", p.purpose);
    console.log("PropertyType:", p.propertyType);
    console.log("Price:", p.price);
    console.log("Bedrooms:", p.bedrooms);
    console.log("Area:", p.area);
    console.log("Lat/Lng:", p.latitude, p.longitude);
    console.log("Address:", p.address + ",", p.number, "-", p.neighborhood + ",", p.city + "/" + p.state);
    console.log("CEP:", p.postalCode);
    console.log("Featured:", p.featured);
    console.log("Badge:", p.badge);
    console.log("Views:", p.views);
    console.log("Created:", p.createdAt);
    console.log("Updated:", p.updatedAt);
    console.log("Images:", p.images.length, "(primary:", p.images.find((i) => i.isPrimary)?.url || "none", ")");
    console.log("Videos:", p.videos.length);
    console.log("Agency:", p.agency?.name || "—", "(", p.agency?.user?.email || "—", ")");
    console.log("Owner:", p.owner?.user?.name || "—", "(", p.owner?.user?.email || "—", ")");
    console.log();
  }

  // Testa o endpoint público
  console.log("\n=== SIMULAÇÃO: GET /api/properties com filtro padrão ===");
  const publicProps = await prisma.property.findMany({
    where: {
      AND: [
        { status: "ACTIVE" },
        { latitude: { gte: -19.92, lte: -19.88 } },
        { longitude: { gte: -44.05, lte: -44.01 } },
      ],
    },
    select: { id: true, title: true, status: true, latitude: true, longitude: true },
  });
  console.log("Imoveis ACTIVE no bbox ~3km do Fernando:", publicProps.length);
  for (const p of publicProps) {
    console.log("  -", p.title, "(", p.latitude, p.longitude, ")");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
