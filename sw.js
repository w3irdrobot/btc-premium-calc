const CACHE_VERSION = "v3"; // Updated for better request scheme handling
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

// List of supported request schemes
const supportedSchemes = ['http', 'https'];

// Fetch event with stale-while-revalidate strategy
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Skip non-GET requests and unsupported schemes
  if (event.request.method !== "GET" || !supportedSchemes.includes(requestUrl.protocol.replace(':', ''))) {
    return; // Let the browser handle these requests normally
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        // Return cached response if found
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Only cache successful responses and only for supported schemes
            if (networkResponse.ok && supportedSchemes.includes(new URL(networkResponse.url).protocol.replace(':', ''))) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // If fetch fails, return the cached response (if any)
            return response || new Response('Network error', { status: 408 });
          });

        // Return cached response immediately, then update from network
        return response || fetchPromise;
      });
    })
  );
});
