const CACHE_VERSION = "v2";
const CACHE_NAME = `btc-premium-calc-${CACHE_VERSION}`;
const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/manifest.json",
];

// Install service worker and cache assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching assets...");
      return cache.addAll(ASSETS);
    })
  );
  // Activate the new service worker immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches that don't match the current version
          if (
            !cacheName.startsWith("btc-premium-calc-") ||
            !cacheName.endsWith(CACHE_VERSION)
          ) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      ).then(() => {
        // Take control of all clients (tabs) immediately
        return self.clients.claim();
      });
    })
  );
});

// Fetch event with stale-while-revalidate strategy
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        // Return cached response if found
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Update cache with fresh response
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // If fetch fails, return the cached response (if any)
            return response;
          });

        // Return cached response immediately, then update from network
        return response || fetchPromise;
      });
    })
  );
});
