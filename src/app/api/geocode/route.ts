import { NextRequest, NextResponse } from "next/server";
import { searchAddress } from "@/lib/geocode";
import { rateLimitResponse } from "@/lib/rate-limit";

// GET /api/geocode?q=... — busca endereço/bairro/cidade (proxy Nominatim)
export async function GET(req: NextRequest) {
  // Geocoding proxy Nominatim — 30 req/min por IP. Política de uso justo
  // do Nominatim recomenda <1 req/s, então isso é uma margem confortável.
  const limited = rateLimitResponse(req, { windowMs: 60_000, max: 30 });
  if (limited) return limited;

  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.trim().length < 3) return NextResponse.json({ results: [] });
  const results = await searchAddress(q);
  return NextResponse.json({ results });
}
