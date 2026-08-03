/* EconPulse service worker — makes the app installable (no browser badge) and
   opens offline showing the last cached app + data. Network-first for freshness. */
const CACHE = "econpulse-v4";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  // Cross-origin (live quote APIs, proxies): always go to network, never cache — keeps data fresh.
  if (!sameOrigin) return;
  // Same-origin app shell: network-first, fall back to cache when offline.
  e.respondWith(
    fetch(req).then(r => {
      if (r && r.status === 200) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return r;
    }).catch(() => caches.match(req).then(m => m || caches.match("./index.html")))
  );
});
