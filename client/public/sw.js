const CACHE_NAME = "Ascend-v3";
const RUNTIME_CACHE = "Ascend-runtime-v3";
const PRECACHE_VERSION = "2026-08-17";
const URLS_TO_CACHE = [
  `/`,
  `/index.html`,
  `/manifest.json?nocache=${PRECACHE_VERSION}`,
  `/logo.png`,
];

// Install event - cache essential files
self.addEventListener("install", event => {
  // Skip waiting immediately so the new SW takes over fast
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Activate event - clean up ALL old caches (including old SW runtime caches)
// This invalidates any manifest.json / resources cached while a redirect
// (e.g. Vercel SSO 302) may have been in flight, preventing CORS errors.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log("[SW] Removing old cache:", cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

function isNavigationalRequest(request) {
  return request.mode === "navigate";
}

// Fetch event - network first, fallback to cache; never cache redirects
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests (e.g. Supabase, Vercel SSO endpoints)
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network only, no caching, pass through to client
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets - network first, cache on success, but NEVER cache
  // responses that redirected (302/301) - they are opaque and can be
  // SSO redirects like vercel.com/sso-api which cause CORS errors when
  // cached/replayed.
  event.respondWith(
    fetch(request)
      .then(response => {
        // If the response is a redirect (e.g. Vercel SSO 302) or an
        // error page, do not cache it and let the client handle it.
        if (response.redirected || response.type === "opaque") {
          return response;
        }
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();

          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseToCache);
          });
        }

        return response;
      })
      .catch(async () => {
        // Serve cached HTML only for navigational requests
        if (isNavigationalRequest(request)) {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          return caches.match("/index.html");
        }
        return undefined;
      })
  );
});
