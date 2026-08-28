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
};

export default nextConfig;
