/* Steno + TNPSC Drill - service worker
   Change CACHE_VERSION each time you upload a new index.html, so phones pick up the new file. */
const CACHE_VERSION = "steno-drill-2026-11-07-bigimage-1";
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon-192.png",
  "apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // add one by one, so a missing icon never blocks the install
      Promise.all(CORE.map((url) => cache.add(url).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === "navigate" ||
    url.pathname.endsWith("/") || url.pathname.endsWith("index.html");

  if (isPage) {
    // Pages: try the network first so updates show up, use the saved copy when offline.
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() =>
        caches.match(req).then((hit) => hit || caches.match("index.html") || caches.match("./"))
      )
    );
    return;
  }

  // Other files (icons, manifest): use the saved copy fast, refresh it in the background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || fresh;
    })
  );
});
