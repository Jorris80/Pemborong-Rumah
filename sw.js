/* Service Worker — Housing Contractor ERP (PWA GitHub Pages)
 * - App shell (index.html, manifest, ikon) disimpan di cache → aplikasi tetap terbuka tanpa internet.
 * - Permintaan API (POST ke script.google.com) tidak pernah di-cache; antrean offline ditangani aplikasi (IndexedDB).
 * - Naikkan VERSION setiap kali index.html diperbarui agar pengguna mendapat versi baru.
 */
var VERSION = 'hcerp-v2.2.0';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // API POST → langsung ke jaringan
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    // foto Drive / peta: coba jaringan, jatuh ke cache bila offline
    e.respondWith(fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque') && /googleusercontent|drive\.google/.test(url.host)) {
        var copy = res.clone(); caches.open(VERSION + '-img').then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () { return caches.match(req); }));
    return;
  }
  if (req.mode === 'navigate') {
    // network-first untuk halaman agar update cepat sampai; offline → cache
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put('./index.html', copy); });
      return res;
    }).catch(function () { return caches.match('./index.html'); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
