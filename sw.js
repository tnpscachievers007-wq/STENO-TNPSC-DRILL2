// Steno Drill service worker
// Bump VERSION on every release so phones drop the old cache and pick up the new index.html.
const VERSION = "steno-drill-2026-11-06-listen-1";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(CORE.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Page itself: network first (so a new upload shows up at once), cache when offline or the network is slow.
  if (req.mode === "navigate") {
    e.respondWith(
      Promise.race([
        fetch(req),
        new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), 4000)),
      ])
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("index.html", copy)); }
          return res;
        })
        .catch(() => caches.match("index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Everything else (icons, manifest): cache first, refreshed in the background.
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
