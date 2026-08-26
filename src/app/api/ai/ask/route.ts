import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { serializeProperty, publicWhere, propertyInclude } from "@/lib/property-serializer";
import { haversine, type LatLng } from "@/lib/geo";
import { PURPOSES, PROPERTY_TYPES } from "@/lib/constants";

/**
 * Pergunte ao LOCVIA — IA conversacional que converte linguagem natural
 * (imobiliária) em filtros estruturados e consulta o MESMO banco do mapa.
 *
 * Não cria segundo estoque. Não altera filtros permanentes — retorna contexto
 * temporário que o cliente aplica e pode limpar com "× Limpar busca".
 *
 * Mantém histórico da conversa para refinos contextuais:
 *  "Quero uma loja de 140m² no Eldorado" → 6 opções
 *  "Até R$ 6 mil" → 4 opções (refina o contexto anterior)
 *  "Preciso de estacionamento" → 2 opções
 */

interface AiFilters {
  purpose?: string;
  propertyTypes?: string[];
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  search?: string; // bairro/cidade/endereço
  neighborhood?: string;
  city?: string;
  hasPool?: boolean;
  hasGarage?: boolean;
}

interface AiResponse {
  reply: string;
  filters: AiFilters;
  properties: any[];
  total: number;
  // sugestão de localização para o mapa voar (se IA extrair)
  flyTo?: { lat: number; lng: number; zoom?: number; label?: string };
}

const SYSTEM_PROMPT = `Você é o LOCVIA, um assistente imobiliário que converte pedidos em filtros estruturados para buscar imóveis no banco de dados.

Sua tarefa: analisar o pedido do usuário (e o contexto da conversa anterior) e devolver UM JSON válido com os filtros e uma resposta curta.

Regras:
1. Reconheça termos imobiliários: "loja"=SHOP, "sala comercial"=COMMERCIAL_ROOM, "apartamento"=APARTMENT, "casa"=HOUSE, "alugar"=RENT, "comprar"=SALE.
2. "garagem"/"estacionamento" → parkingSpaces: 1. "piscina" → não há campo (ignore por enquanto).
3. Para área, aceite aproximações ("~140", "uns 150") e use minArea e maxArea com tolerância de 15% (ex: 140 → min 119, max 161).
4. Bairro/cidade/região → coloque em "search" (string).
5. Responda em português, BREVE (1 frase), como especialista imobiliário. NÃO invente imóveis — o sistema consulta o banco e conta quantos encontrou.
6. Se o usuário refinar ("até R$ 6 mil"), mantenha o contexto anterior e ajuste apenas o que mudou.
7. Use null (não undefined) para campos não aplicáveis. NÃO use undefined no JSON.

Devolva APENAS este JSON (sem markdown, sem texto antes ou depois):
{"filters":{"purpose":"RENT"|"SALE"|null,"propertyTypes":["HOUSE"]|null,"minPrice":null,"maxPrice":null,"minArea":null,"maxArea":null,"bedrooms":null,"bathrooms":null,"parkingSpaces":null,"search":null},"reply":"sua resposta curta em português"}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], userLocation } = body as {
      message: string;
      history?: { role: string; content: string }[];
      userLocation?: LatLng;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
    }

    // 1. IA: converter linguagem natural → filtros estruturados
    const zai = await ZAI.create();
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      // histórico (resumido: últimos 6 turnos) para refino contextual
      ...history.slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });

    const raw = completion?.choices?.[0]?.message?.content || "";

    // Extrai JSON (mesmo se vier com markdown acidental)
    let parsed: { filters: AiFilters; reply: string };
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      let jsonStr = jsonMatch ? jsonMatch[0] : raw;
      // sanitiza undefined → null (IA às vezes insere undefined que não é JSON válido)
      jsonStr = jsonStr.replace(/:\s*undefined/g, ": null");
      parsed = JSON.parse(jsonStr);
    } catch {
      // fallback: se IA não devolver JSON válido, responde com texto e sem filtros
      return NextResponse.json({
        reply: raw || "Não entendi bem. Pode reformular?",
        filters: {},
        properties: [],
        total: 0,
      } satisfies AiResponse);
    }

    const filters = parsed.filters || {};
    // normaliza: remove chaves com valor null/undefined (não filtrar por elas)
    Object.keys(filters).forEach((k) => {
      const v = (filters as any)[k];
      if (v === null || v === undefined || (Array.isArray(v) && v.length === 0)) {
        delete (filters as any)[k];
      }
    });
    const reply = parsed.reply || "Buscando imóveis…";

    // 2. Consultar o MESMO banco do mapa (propriedades ativas)
    const where = publicWhere({
      purpose: filters.purpose,
      propertyType: filters.propertyTypes?.length ? filters.propertyTypes : undefined,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      bedrooms: filters.bedrooms,
      bathrooms: filters.bathrooms,
      parkingSpaces: filters.parkingSpaces,
      minArea: filters.minArea,
      search: filters.search,
    });

    const props = await db.property.findMany({
      where,
      include: propertyInclude,
      orderBy: [{ featured: "desc" }, { views: "desc" }, { createdAt: "desc" }],
      take: 100,
    });

    // 3. Serializa com distância (se userLocation disponível) e ordena por proximidade
    const origin = userLocation || undefined;
    const serialized = await Promise.all(props.map((p) => serializeProperty(p, origin)));
    if (origin) serialized.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

    // 4. Se a IA extraiu bairro/cidade, tenta geocode para sugerir flyTo
    let flyTo: AiResponse["flyTo"] = undefined;
    if (filters.search && !origin) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=BR&q=${encodeURIComponent(
            filters.search
          )}`,
          { headers: { "Accept-Language": "pt-BR", "User-Agent": "LOCVIA/1.0" } }
        );
        const geoData = await geoRes.json();
        if (geoData?.[0]) {
          flyTo = {
            lat: parseFloat(geoData[0].lat),
            lng: parseFloat(geoData[0].lon),
            zoom: 14,
            label: geoData[0].display_name?.split(",")[0],
          };
        }
      } catch {
        /* noop — flyTo é opcional */
      }
    }

    return NextResponse.json({
      reply,
      filters,
      properties: serialized,
      total: serialized.length,
      flyTo,
    } satisfies AiResponse);
  } catch (e: any) {
    console.error("[/api/ai/ask] error:", e?.message);
    return NextResponse.json(
      { error: "Tive um problema ao processar. Tente novamente." },
      { status: 500 }
    );
  }
}
