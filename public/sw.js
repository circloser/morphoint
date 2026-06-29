// Morphoint service worker — offline-capable app shell via stale-while-revalidate.
// Bump CACHE when you want to drop old cached assets.
const CACHE = "morphoint-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only handle our own origin; never cache cross-origin (ads, model/wasm CDNs).
  if (url.origin !== self.location.origin) return;
  // Dynamic endpoints (uploads, shared media) must always hit the network.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => cached);
      // Serve cache immediately when present, refresh in the background.
      return cached || network;
    })(),
  );
});
