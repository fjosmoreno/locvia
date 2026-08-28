/**
 * LOCVIA Service Worker
 * - Cache-first pra assets estáticos (_next/static, ícones)
 * - Network-first pra navegação HTML (com fallback pro cache)
 * - Stale-while-revalidate pra imagens
 * - Background sync não implementado (sem uso por enquanto)
 */

const VERSION = "locvia-v1.0.0";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const IMAGE_CACHE = `${VERSION}-images`;

const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/locvia-icon.png",
  "/locvia-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

// Install: pre-cache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

// Activate: limpa caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: routing por tipo
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora métodos não-GET e cross-origin (analytics, fonts.googleapis, etc)
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Ignora chamadas de API: sempre network
  if (url.pathname.startsWith("/api/")) return;

  // Navegação HTML: network-first com fallback pro cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clona e cacheia a versão atual
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              caches.match("/").then(
                (root) =>
                  root ||
                  new Response(
                    "<h1>Offline</h1><p>Verifique sua conexão e tente novamente.</p>",
                    { headers: { "Content-Type": "text/html; charset=utf-8" } }
                  )
              )
          )
        )
    );
    return;
  }

  // Assets do Next (_next/static): cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Imagens: stale-while-revalidate
  if (request.destination === "image") {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request)
            .then((response) => {
              cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Default: network-first com cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Mensagens do client (skip waiting etc)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
