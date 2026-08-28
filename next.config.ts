import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone só faz sentido pra self-host (bun .next/standalone/server.js).
  // No Vercel o output "standalone" gera trace files (.nft.json) que o
  // packaging serverless da Vercel não consegue ler — build quebra com
  // ENOENT .next/next-server.js.nft.json. Mantém standalone só fora da Vercel.
  output: process.env.VERCEL ? undefined : "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  /**
   * Security headers — aplicados a TODAS as respostas (incluindo assets).
   *
   * IMPORTANTE: CSP precisa permitir:
   *   - `*.tile.openstreetmap.org` (raster tiles do mapa fallback)
   *   - `*.maptiler.com` (vector tiles premium se MAPTILER_KEY setada)
   *   - `blob:` (previews de upload) e `data:` (imagens inline, GIFs)
   *   - `api.maptiler.com` e Nominatim (geocoding)
   *   - Vercel Blob (`blob.vercel-storage.com`) para mídias
   *   - Pusher (caso venha a ser usado) — comentado, sem uso atual
   *
   * X-Frame-Options SAMEORIGIN permite embedar o app em iframe do mesmo
   * domínio (admin embedado em alguma página institucional, por ex).
   * Trocar pra DENY se não houver caso de uso legítimo.
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.maptiler.com",
      "style-src 'self' 'unsafe-inline' https://api.maptiler.com https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https: wss: blob:",
      "worker-src 'self' blob:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), interest-cohort=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
      // Service Worker: NUNCA cachear (precisa sempre ser fresh pra updates)
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      // Manifest: cache curto (24h) — pode ser cacheado mas atualiza rápido
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, must-revalidate" },
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
      // Ícones PWA: cache longo (immutable) — eles não mudam
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
