// GET /api/properties/search — alias de GET /api/properties
//
// Por que existe: clientes externos (testes E2E, scrapers, integrações)
// costumam chamar `/api/properties/search?q=...`. Mantemos um alias que
// re-exporta o handler GET original para que ambos funcionem.
//
// Também aceita os mesmos query params que `/api/properties` (filtros,
// bbox, originLat/Lng, limit, offset) — apenas é uma URL mais "RESTful"
// para o caso de uso de busca.

import { GET as propertiesGET } from "@/app/api/properties/route";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return propertiesGET(req);
}
