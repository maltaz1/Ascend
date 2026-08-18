/**
 * Service Worker do Ascend (v5)
 *
 * Base: SW v4 da main (network-first robusto, skip-correções de redirecionamentos
 * SSO/CORS, fallback offline válido).
 * Plus deste PR: pre-cache de assets com hash via asset-list.json (plugin Vite)
 * e handlers base de push/notification click.
 *
 * Estratégia de fetch:
 * - API (/api/ e supabase.co): network-only.
 * - Assets estáticos com hash (/assets/*): cache-first após o primeiro fetch.
 * - Restante: network-first com armazenamento em runtime cache e fallback offline.
 * - Limpeza de caches antigos na ativação.
 */

const CACHE_VERSION = "ascend-v5";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSETS_CACHE = `${CACHE_VERSION}-assets`;

// Assets críticos para o shell do app funcionar offline
const SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-any-192.png",
  "/icons/icon-any-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
];

// ---------------- Install ----------------
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_URLS)),
      // Pre-cache os assets estáticos com hash (JS/CSS) após o build
      fetch("/asset-list.json", { cache: "no-store" })
        .then(res => (res.ok ? res.json() : []))
        .then(assets => {
          if (!Array.isArray(assets) || assets.length === 0) return;
          return caches
            .open(ASSETS_CACHE)
            .then(cache =>
              cache.addAll(assets.filter(url => url.startsWith("/")))
            );
        })
        .catch(() => {
          // asset-list.json ausente (dev ou não configurado) — ok, não fatal
        }),
    ])
  );
});

// ---------------- Activate ----------------
self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(names =>
        Promise.all(
          names
            .filter(name => name !== SHELL_CACHE && name !== ASSETS_CACHE)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------------- Fetch ----------------
self.addEventListener("fetch", event => {
  const { request } = event;

  // Apenas GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Não interceptar requests de outras origens
  if (url.origin !== location.origin) return;

  // Dados do Supabase / API: network-only (segurança + frescor)
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase.co")
  ) {
    event.respondWith(
      fetch(request).catch(() => new Response("{}", { status: 503 }))
    );
    return;
  }

  // Assets estáticos com hash (/assets/*.js, .css, .png): cache-first
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(ASSETS_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Restante do shell e navegação SPA: network-first com fallback offline.
  // Nunca cachear redirecionamentos ou respostas opacas (causam falhas CORS).
  event.respondWith(
    fetch(request)
      .then(async response => {
        // Navegação: atualizar cópia do shell em cache
        if (request.mode === "navigate" && response && response.status === 200) {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then(cache => cache.put("/", clone));
        }
        if (!response.ok || response.redirected || response.type === "opaque") {
          return response;
        }
        try {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put(request, response.clone());
        } catch (_) {
          // ignorar erros de cache
        }
        return response;
      })
      .catch(async () => {
        // Falha de rede: fallback para cache (offline)
        const cached =
          (await caches.match(request)) || (await caches.match("/index.html"));
        if (cached) return cached;
        // Último recurso: Response válido em vez de undefined
        return new Response("Offline", { status: 503 });
      })
  );
});

// ---------------- Notifications push (base para futuras notificações) ----------------
self.addEventListener("push", event => {
  let payload = { title: "Ascend", body: "Você tem atividades para hoje!" };
  try {
    const data = event.data ? event.data.json() : {};
    if (data.title) payload.title = data.title;
    if (data.body) payload.body = data.body;
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-any-192.png",
      badge: "/icons/icon-any-192.png",
      vibrate: [200, 100, 200],
      tag: "ascend-notification",
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});
