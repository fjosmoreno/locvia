// Rate limiter em memória — proteção básica contra abuso/DDoS em endpoints
// sensíveis (auth, geocode, busca, IA).
//
// IMPORTANTE: esse é um limiter em-memória. Em produção multi-instância
// (Vercel escala em várias regiões), cada instância tem seu próprio Map
// — o limite efetivo é (N_instancias × window_size). Pra aplicações
// maiores, usar Upstash/Redis. Pra MVP, é defesa suficiente contra
// abuso manual de um único IP.

import type { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number; // ms epoch
}

interface RateLimitOptions {
  /** Janela em ms (ex: 60_000 = 1 minuto) */
  windowMs: number;
  /** Máximo de requests permitidas por janela */
  max: number;
  /** Identificador customizado (default: IP) */
  key?: (req: NextRequest) => string;
}

const buckets = new Map<string, Bucket>();

// Limpa entradas expiradas a cada 5 min pra não crescer indefinidamente.
if (typeof setInterval !== "undefined") {
  // guarda o ID pra evitar múltiplos intervals em HMR
  const globalAny = globalThis as any;
  if (!globalAny.__locviaRateLimitSweep) {
    globalAny.__locviaRateLimitSweep = setInterval(
      () => {
        const now = Date.now();
        for (const [k, b] of buckets.entries()) {
          if (b.resetAt <= now) buckets.delete(k);
        }
      },
      5 * 60_000
    );
  }
}

/** Extrai o IP do request, respeitando o header `x-forwarded-for` da Vercel. */
function getIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Verifica se o request está dentro do limite.
 *
 * Retorna:
 *   { allowed: true, remaining, resetAt } — pode prosseguir
 *   { allowed: false, remaining: 0, resetAt, retryAfterMs } — bloquear
 */
export function checkRateLimit(
  req: NextRequest,
  opts: RateLimitOptions
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
} {
  const keyFn = opts.key || ((r) => `ip:${getIp(r)}`);
  const key = keyFn(req);
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.max - 1, resetAt };
  }

  if (existing.count >= opts.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterMs: existing.resetAt - now,
    };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: opts.max - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Helper para usar em route handlers:
 *
 *   export async function POST(req: NextRequest) {
 *     const limited = rateLimitResponse(req, { windowMs: 60_000, max: 10 });
 *     if (limited) return limited;
 *     // ... handler normal
 *   }
 *
 * Retorna uma NextResponse 429 (Too Many Requests) se excedeu, ou null
 * se pode prosseguir.
 */
export function rateLimitResponse(
  req: NextRequest,
  opts: RateLimitOptions
): Response | null {
  const r = checkRateLimit(req, opts);
  if (r.allowed) return null;
  const seconds = Math.ceil((r.retryAfterMs ?? opts.windowMs) / 1000);
  return new Response(
    JSON.stringify({
      error: "Muitas requisições. Tente novamente em alguns instantes.",
      retryAfterSeconds: seconds,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(seconds),
        "X-RateLimit-Limit": String(opts.max),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.floor(r.resetAt / 1000)),
      },
    }
  );
}
