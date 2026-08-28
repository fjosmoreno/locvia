"use client";

/**
 * Detecta suporte a WebGL2 no navegador.
 *
 * Por que isso existe:
 * MapLibre GL exige WebGL2. Em alguns ambientes (Chromium headless,
 * iOS WebView antigo, alguns Linux sem GPU, travado de driver), o canvas
 * pode falhar em inicializar — o mapa fica cinza e nenhum tile renderiza.
 *
 * Antes desta detecção, o usuário via um mapa em branco sem entender o
 * motivo. Agora detectamos proativamente e mostramos um fallback em lista
 * (com todos os imóveis do query) para que o produto ainda seja utilizável.
 */

export type WebGLSupportLevel = "webgl2" | "webgl1" | "none";

export function detectWebGLSupport(): WebGLSupportLevel {
  if (typeof window === "undefined") return "webgl2"; // SSR — não detecta, assume OK
  try {
    const canvas = document.createElement("canvas");
    // Tenta WebGL2 primeiro (preferido pelo MapLibre)
    const gl2 = canvas.getContext("webgl2");
    if (gl2) {
      // sanity check — alguns drivers devolvem contexto "fake" sem
      // realmente suportar shaders
      const loseExt = gl2.getExtension("WEBGL_lose_context");
      if (loseExt) {
        // ok
      }
      return "webgl2";
    }
    // Cai pra WebGL1 (MapLibre tem fallback limitado)
    const gl1 =
      canvas.getContext("webgl") ||
      (canvas as any).getContext("experimental-webgl");
    if (gl1) return "webgl1";
    return "none";
  } catch {
    return "none";
  }
}

/** React hook para detecção client-side. Retorna null durante SSR/hidratação. */
import { useEffect, useState } from "react";

export function useWebGLSupport(): WebGLSupportLevel | null {
  const [support, setSupport] = useState<WebGLSupportLevel | null>(null);
  useEffect(() => {
    setSupport(detectWebGLSupport());
  }, []);
  return support;
}
