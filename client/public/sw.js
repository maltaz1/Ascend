const CACHE_NAME = "Ascend-v4";
const RUNTIME_CACHE = "Ascend-runtime-v4";

const URLS_TO_CACHE = ["/", "/index.html", "/manifest.json", "/logo.png"];

// Install event - cache essential files and take over immediately.
// skipWaiting MUST be called before waitUntil completes so that the old
// broken SW (v2) is replaced without waiting for all client tabs to close.
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

// Activate event - remove ALL other caches (old SW versions, runtime caches)
// and claim clients immediately.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch event - network first with a robust fallback.
// Every single path MUST return (or resolve to) a Response instance.
self.addEventListener("fetch", event => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Skip cross-origin requests (Supabase, Google Fonts, etc.)
  if (url.origin !== location.origin) {
    return;
  }

  // API requests: pass through to the network without caching.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => new Response("{}", { status: 503 }))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(async response => {
        // Never cache redirects (e.g. Vercel SSO 302 -> vercel.com/sso-api)
        // or opaque responses - they cause CORS failures when replayed.
        if (!response.ok || response.redirected || response.type === "opaque") {
          return response;
        }
        // Cache successful same-origin responses
        try {
          const cache = await caches.open(RUNTIME_CACHE);
          await cache.put(request, response.clone());
        } catch (_) {
          // ignore cache errors
        }
        return response;
      })
      .catch(async () => {
        // Network failure: fall back to cache (offline support)
        const cached =
          (await caches.match(request)) || (await caches.match("/index.html"));
        if (cached) {
          return cached;
        }
        // Last resort: a valid Response instead of undefined
        return new Response("Offline", { status: 503 });
      })
  );
});
