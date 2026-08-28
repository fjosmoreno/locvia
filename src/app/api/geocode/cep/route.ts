// GET /api/geocode/cep?cep=32340-510
// Retorna dados do CEP via ViaCEP: bairro, cidade, UF.
// Usado no formulário de cadastro para auto-preencher endereço.

import { NextRequest, NextResponse } from "next/server";
import { lookupCep } from "@/lib/geocode";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cep = (req.nextUrl.searchParams.get("cep") || "").trim();
  if (cep.replace(/\D/g, "").length !== 8) {
    return NextResponse.json(
      { error: "CEP deve ter 8 dígitos." },
      { status: 400 }
    );
  }
  const data = await lookupCep(cep);
  if (!data) {
    return NextResponse.json(
      { error: "CEP não encontrado." },
      { status: 404 }
    );
  }
  return NextResponse.json({ data });
}
