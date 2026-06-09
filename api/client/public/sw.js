const CACHE_NAME = "Ascend-v2";
const RUNTIME_CACHE = "Ascend-runtime-v2";
const URLS_TO_CACHE = ["/", "/index.html", "/manifest.json", "/logo.png"];

// Install event - cache essential files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone and cache successful responses
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache on network error
          return caches.match(request).then(response => {
            return (
              response ||
              new Response(JSON.stringify({ error: "offline" }), {
                status: 503,
                statusText: "Service Unavailable",
                headers: new Headers({ "Content-Type": "application/json" }),
              })
            );
          });
        })
    );
    return;
  }

  // Static assets - network first
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();

          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseToCache);
          });
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) {
          return cached;
        }

        return caches.match("/index.html");
      })
  );
});

// Background sync for data synchronization
self.addEventListener("sync", event => {
  if (event.tag === "sync-data") {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    // Get pending changes from IndexedDB
    const db = await openDB();
    const pendingChanges = await db.getAll("pendingSync");

    // Send to server
    for (const change of pendingChanges) {
      const response = await fetch(`/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      });

      if (response.ok) {
        await db.delete("pendingSync", change.id);
      }
    }
  } catch (error) {
    console.error("Sync failed:", error);
    throw error;
  }
}

// Helper to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("flowzone", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("pendingSync")) {
        db.createObjectStore("pendingSync", { keyPath: "id" });
      }
    };
  });
}
