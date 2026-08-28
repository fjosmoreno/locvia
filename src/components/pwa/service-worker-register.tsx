"use client";

import { useEffect } from "react";

/**
 * Registra o service worker e captura o evento `beforeinstallprompt`
 * pra permitir um botão customizado "Instalar app" no futuro.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    // Escuta o prompt de instalação (Android/Chrome)
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      (window as unknown as { __pwaPrompt?: Event }).__pwaPrompt = e;
      window.dispatchEvent(new CustomEvent("pwa-installable"));
    });

    // Detecta app já instalado
    window.addEventListener("appinstalled", () => {
      (window as unknown as { __pwaPrompt?: Event }).__pwaPrompt = undefined;
      window.dispatchEvent(new CustomEvent("pwa-installed"));
    });

    // Registra o SW
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Força update check
        reg.update().catch(() => null);
      })
      .catch(() => null);
  }, []);

  return null;
}
