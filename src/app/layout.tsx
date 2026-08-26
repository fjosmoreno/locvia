import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MapImóvel — Imóveis no mapa, ao seu redor",
  description:
    "A plataforma imobiliária map-first. Abra o mapa e descubra casas, apartamentos, lojas e salas comerciais disponíveis ao seu redor, em tempo real.",
  keywords: [
    "imóveis", "mapa imobiliário", "alugar", "comprar", "apartamento", "casa",
    "loja", "sala comercial", "Belo Horizonte", "imobiliária",
  ],
  authors: [{ name: "MapImóvel" }],
  openGraph: {
    title: "MapImóvel — Imóveis no mapa, ao seu redor",
    description:
      "O mapa é o produto. Descubra imóveis disponíveis ao seu redor, em tempo real.",
    siteName: "MapImóvel",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "MapImóvel",
    description: "Encontre imóveis no mapa, ao seu redor.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f3d2e",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster position="top-center" richColors toastOptions={{ style: { borderRadius: "12px" } }} />
        </Providers>
      </body>
    </html>
  );
}
