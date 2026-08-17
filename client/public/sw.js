/**
 * Service Worker do Ascend
 *
 * Estratégia:
 * - Shell do app (HTML, manifest, ícones): pre-cache no install + stale-while-revalidate.
 * - Assets estáticos (JS/CSS com hash): cache-first com cache de longo prazo.
 * - Navegação (SPA): network-first com fallback para /index.html (offline).
 * - Supabase API: network-only (nunca cachear dados sensíveis; offline é tratado
 *   pela camada de persistência local do app em client/src/store).
 * - Limpeza de caches antigos na ativação.
 */

const CACHE_VERSION = "ascend-v3";
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
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_URLS)).then(() => {
      // Pre-cache os assets estáticos com hash (JS/CSS) após o build
      return fetch("/asset-list.json", { cache: "no-store" })
        .then(res => (res.ok ? res.json() : []))
        .then(assets => {
          if (!Array.isArray(assets) || assets.length === 0) return;
          return caches.open(ASSETS_CACHE).then(cache =>
            cache.addAll(assets.filter(url => url.startsWith("/")))
          );
        })
        .catch(() => {
          // asset-list.json ausente (dev ou não configurado) — ok, não fatal
        });
    })
  );
  self.skipWaiting();
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

  // Não interceptar requests de outros origens
  if (url.origin !== location.origin) return;

  // Dados do Supabase / API: network-only (segurança + frescor)
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase.co")) {
    return;
  }

  // Navegação SPA: network-first com fallback offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then(cache => cache.put("/", clone));
          }
          return response;
        })
        .catch(() => caches.match("/index.html"))
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

  // Restante do shell (ícones, manifest, fontes): stale-while-revalidate
  if (SHELL_URLS.some(u => url.pathname === u) || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetched = fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetched;
      })
    );
    return;
  }
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
