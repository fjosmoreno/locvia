// POST /api/auth/signup — alias de /api/auth/register
//
// Por que existe: clientes externos (e testes) costumam esperar um endpoint
// com nome mais convencional `signup` em vez de `register`. Mantemos os dois
// para evitar 400 "ClientAuthError: not supported" do catch-all NextAuth
// quando o cliente POSTa em `/api/auth/signup` (que o [...nextauth]
// não reconhece como uma action válida).

import { POST as registerPOST } from "@/app/api/auth/register/route";
import type { NextRequest } from "next/server";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Mesmo limite do /register: o rate limit fica no handler final,
  // mas por segurança aplicamos aqui também (defesa em profundidade).
  const limited = rateLimitResponse(req, { windowMs: 60_000, max: 10 });
  if (limited) return limited;
  return registerPOST(req);
}
