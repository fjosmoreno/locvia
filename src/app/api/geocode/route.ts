import { NextRequest, NextResponse } from "next/server";
import { searchAddress } from "@/lib/geocode";

// GET /api/geocode?q=... — busca endereço/bairro/cidade (proxy Nominatim)
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.trim().length < 3) return NextResponse.json({ results: [] });
  const results = await searchAddress(q);
  return NextResponse.json({ results });
}
