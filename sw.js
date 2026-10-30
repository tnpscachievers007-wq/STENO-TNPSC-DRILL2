// Steno + TNPSC Drill service worker.
// Network first: when you are online you always get the newest index.html.
// When you are offline the last saved copy is used. Change CACHE to force a clean start.
var CACHE = "steno-drill-2026-10-30-plan-v2";

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(
        ["./", "./index.html", "./manifest.webmanifest"].map(function (u) {
          return c.add(u).catch(function () {});
        })
      );
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      });
    })
  );
});
