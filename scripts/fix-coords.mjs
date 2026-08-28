// Diagnóstico + fix: imóveis com bairro no endereço não bate com bairro
// retornado pelo reverse-geocode.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FIX_ID = "cmtdepgim0001jp041zd2a7tr";
// Coordenada correta do Nominatim free-text pra "Rua Bragança, Santa Cruz Industrial, Contagem, MG"
const CORRECT_LAT = -19.9435275;
const CORRECT_LNG = -44.0584562;

async function main() {
  console.log("🔍 Investigando imóveis em Contagem com possível mismatch bairro ↔ coords...\n");

  const contagem = await prisma.property.findMany({
    where: { city: "Contagem" },
    select: {
      id: true,
      title: true,
      address: true,
      number: true,
      neighborhood: true,
      latitude: true,
      longitude: true,
      status: true,
    },
  });

  console.log(`Total imóveis Contagem: ${contagem.length}\n`);

  const suspicious = [];
  for (const p of contagem) {
    if (!p.latitude || !p.longitude) continue;
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=18&lat=${p.latitude}&lon=${p.longitude}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "LOCVIA-diag/1.0" },
      });
      const data = await res.json();
      const a = (data && data.address) || {};
      const hood = a.neighbourhood || a.suburb || a.quarter || a.city_district || "";
      const city = a.city || a.town || a.municipality || "";
      const road = a.road || "";

      const expectedHood = (p.neighborhood || "").toLowerCase();
      const gotHood = hood.toLowerCase();
      const expectedCity = "contagem";
      const gotCity = city.toLowerCase();

      const hoodMatch =
        !expectedHood ||
        gotHood.includes(expectedHood) ||
        expectedHood.includes(gotHood);
      const cityMatch = gotCity.includes(expectedCity);

      // Check de rua: Nominatim nem sempre retorna o road exato pra coord exata
      // mas se o road for totalmente diferente do address salvo, é mismatch
      const expectedRoad = (p.address || "")
        .toLowerCase()
        .replace(/^rua\s+/, "")
        .replace(/^avenida\s+/, "")
        .replace(/^av\.?\s+/, "")
        .trim();
      const gotRoad = (road || "").toLowerCase();
      const roadMatch =
        !expectedRoad ||
        gotRoad.includes(expectedRoad) ||
        expectedRoad.includes(gotRoad);

      const ok = cityMatch && hoodMatch && roadMatch;
      if (!ok) {
        suspicious.push(p);
        console.log(
          `❌ ${p.id} | ${String(p.title).slice(0, 40).padEnd(40)} | bairro salvo: "${p.neighborhood}" | coords dizem: "${hood}" (${road}) [${city}]`
        );
      } else {
        console.log(
          `✅ ${p.id} | ${String(p.title).slice(0, 40).padEnd(40)} | "${p.neighborhood}" → ${road}`
        );
      }
    } catch (e) {
      console.warn(`⚠️  ${p.id} falhou reverse-geocode:`, e.message);
    }
    // Nominatim rate limit 1 req/s
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log(`\n📊 ${suspicious.length} imóveis com bairro/coord não batem.`);

  if (suspicious.find((p) => p.id === FIX_ID)) {
    console.log(`\n🔧 Aplicando fix no imóvel ${FIX_ID}...`);
    const before = await prisma.property.findUnique({
      where: { id: FIX_ID },
      select: { latitude: true, longitude: true, address: true, number: true, neighborhood: true },
    });
    console.log(`   Antes:  lat=${before?.latitude}  lng=${before?.longitude}`);
    console.log(`   Endereço: ${before?.address}, ${before?.number} — ${before?.neighborhood}`);

    await prisma.property.update({
      where: { id: FIX_ID },
      data: { latitude: CORRECT_LAT, longitude: CORRECT_LNG },
    });
    const after = await prisma.property.findUnique({
      where: { id: FIX_ID },
      select: { latitude: true, longitude: true },
    });
    console.log(`   Depois: lat=${after?.latitude}  lng=${after?.longitude}`);

    // Confirma via reverse geocode
    const verify = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${CORRECT_LAT}&lon=${CORRECT_LNG}`,
      { headers: { "User-Agent": "LOCVIA-diag/1.0" } }
    );
    const v = await verify.json();
    console.log(`   Verificação reverse-geocode: ${v.display_name}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
