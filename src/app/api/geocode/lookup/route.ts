// POST /api/geocode/lookup — converte endereço estruturado em lat/lng
// Body: { address, number, neighborhood, city, state, postalCode }
// Resposta: { result: { lat, lng, displayName } } | 404
//
// Usado pelo formulário quando o usuário preencheu os campos de endereço
// e quer gerar a localização automaticamente (botão "📍 Buscar coordenadas").
//
// Se o usuário só informou CEP, enriquecemos via ViaCEP (logradouro, bairro,
// cidade, UF) e depois geocodificamos com Nominatim.

import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress, lookupCep } from "@/lib/geocode";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Geocoding lookup — bate em Nominatim + ViaCEP. Limite menor por ser
  // lookup estruturado (não free-text), tipicamente usado em formulários.
  const limited = rateLimitResponse(req, { windowMs: 60_000, max: 20 });
  if (limited) return limited;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parts = {
    street: typeof body.address === "string" ? body.address : undefined,
    number: typeof body.number === "string" ? body.number : undefined,
    neighborhood:
      typeof body.neighborhood === "string" ? body.neighborhood : undefined,
    city: typeof body.city === "string" ? body.city : undefined,
    state: typeof body.state === "string" ? body.state : undefined,
    postalCode:
      typeof body.postalCode === "string" ? body.postalCode : undefined,
  };
  if (!parts.street && !parts.postalCode && !parts.city) {
    return NextResponse.json(
      { error: "Informe pelo menos endereço, CEP ou cidade." },
      { status: 400 }
    );
  }

  // Enriquece com ViaCEP se temos CEP — transforma CEP puro em endereço
  // estruturado completo (logradouro, bairro, cidade, UF) que Nominatim
  // consegue geocodificar.
  const enriched = { ...parts };
  const cepDigits =
    typeof parts.postalCode === "string"
      ? parts.postalCode.replace(/\D/g, "")
      : "";
  if (cepDigits.length === 8) {
    const viaCep = await lookupCep(cepDigits);
    if (viaCep) {
      enriched.street = enriched.street || viaCep.logradouro || undefined;
      enriched.neighborhood =
        enriched.neighborhood || viaCep.bairro || undefined;
      enriched.city = enriched.city || viaCep.localidade || undefined;
      enriched.state = enriched.state || viaCep.uf || undefined;
    }
  }

  const result = await geocodeAddress(enriched);
  if (!result) {
    return NextResponse.json(
      { error: "Não foi possível localizar esse endereço." },
      { status: 404 }
    );
  }
  return NextResponse.json({ result });
}
