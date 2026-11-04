// Steno + TNPSC Drill service worker.
// Bump CACHE_VERSION on every upload so phones and browsers pick up the new index.html.
const CACHE_VERSION = 'steno-drill-v7-reels-voice';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function (c) {
      // add files one by one so a missing icon never blocks the install
      return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf('steno-drill-') === 0 && k !== CACHE_VERSION;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Page itself: network first so a new upload shows up, cache when offline.
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (m) { return m || caches.match(req); });
      })
    );
    return;
  }

  // Everything else: cache first, refresh in the background.
  e.respondWith(
    caches.match(req).then(function (hit) {
      const net = fetch(req).then(function (res) {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); }); }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
