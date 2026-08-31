import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LOCVIA — Imóveis no mapa, ao seu redor",
  description:
    "O aplicativo de mapas especializado em imóveis. Abra o mapa e descubra casas, apartamentos, lojas e salas comerciais disponíveis ao seu redor, em tempo real.",
  keywords: [
    "imóveis", "mapa imobiliário", "alugar", "comprar", "apartamento", "casa",
    "loja", "sala comercial", "Belo Horizonte", "imobiliária", "LOCVIA",
  ],
  authors: [{ name: "LOCVIA" }],
  applicationName: "LOCVIA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "LOCVIA",
    statusBarStyle: "black-translucent",
    startupImage: [
      { url: "/icons/apple-splash-1170-2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/icons/apple-splash-1179-2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/icons/apple-splash-1290-2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/icons/apple-splash-1242-2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/icons/apple-splash-1125-2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/icons/apple-splash-750-1334.png",  media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/icons/apple-splash-2048-2732.png", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" },
    ],
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-touch-icon-167.png", sizes: "167x167", type: "image/png" },
      { url: "/icons/apple-touch-icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/apple-touch-icon-120.png", sizes: "120x120", type: "image/png" },
    ],
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "LOCVIA — Imóveis no mapa, ao seu redor",
    description: "O mapa é o produto. Descubra imóveis disponíveis ao seu redor, em tempo real.",
    siteName: "LOCVIA",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/locvia-logo.png", width: 1200, height: 630, alt: "LOCVIA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LOCVIA",
    description: "Encontre imóveis no mapa, ao seu redor.",
    images: ["/locvia-logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b1120",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Mobile-web-app-capable legacy (Android Chrome) */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iOS Safari — ativa fullscreen mode (sem barra de endereço) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Cor da barra de status no Android (dark mode default) */}
        <meta name="theme-color" content="#0b1120" media="(prefers-color-scheme: dark)" />
        {/* Status bar translucent no iOS (cobre atrás do notch) */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Bloqueia detecção automática de telefones em <a href="tel:"> */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          {/* position "bottom-center" pra não cobrir a fileira de chips (z-1050)
              que fica no topo — o toast anterior em "top-center" criava um
              "borrão" sobre os botões Quartos/Tipo/Preço quando o location
              error disparava. */}
          <SonnerToaster position="bottom-center" richColors toastOptions={{ style: { borderRadius: "12px" } }} />
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
