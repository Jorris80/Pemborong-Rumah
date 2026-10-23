/* Service Worker — Housing Contractor ERP (PWA GitHub Pages)
 * - App shell (index.html, manifest, ikon) disimpan di cache → aplikasi tetap terbuka tanpa internet.
 * - Permintaan API (POST ke script.google.com) tidak pernah di-cache; antrean offline ditangani aplikasi (IndexedDB).
 * - Background Sync: antrean offline (IndexedDB 'hcerp' → outbox) dikirim walau aplikasi sudah ditutup, begitu sinyal kembali.
 * - Naikkan VERSION setiap kali index.html diperbarui agar pengguna mendapat versi baru.
 */
var VERSION = 'hcerp-v2.3.0';
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

/* ---------------- Background Sync: kirim antrean offline ---------------- */
function idb() {
  return new Promise(function (res, rej) { var r = indexedDB.open('hcerp', 1); r.onupgradeneeded = function () { var db = r.result; if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv'); if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; });
}
function idbReq(db, store, mode, fn) { return new Promise(function (res, rej) { var t = db.transaction(store, mode), q = fn(t.objectStore(store)); t.oncomplete = function () { res(q && q.result); }; t.onerror = function () { rej(t.error); }; }); }
function flushOutbox() {
  return idb().then(function (db) {
    return idbReq(db, 'kv', 'readonly', function (s) { return s.get('auth'); }).then(function (auth) {
      if (!auth || !auth.token || !auth.api) return 0;
      return idbReq(db, 'outbox', 'readonly', function (s) { return s.getAll(); }).then(function (items) {
        items = (items || []).filter(function (x) { return x.status === 'PENDING'; }).sort(function (a, b) { return a.createdAt.localeCompare(b.createdAt); });
        var sent = 0;
        return items.reduce(function (p, it) {
          return p.then(function (stop) {
            if (stop) return true;
            return fetch(auth.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: it.action, payload: it.payload, token: auth.token, opId: it.opId }) })
              .then(function (r) { return r.json(); })
              .then(function (r) {
                if (r && r.ok) { sent++; return idbReq(db, 'outbox', 'readwrite', function (s) { return s.delete(it.opId); }).then(function () { return false; }); }
                if (r && r.error && /^AUTH/.test(r.error.code)) return true;   // sesi habis: biarkan aplikasi yang menangani
                it.status = 'FAILED'; it.error = (r && r.error && r.error.message) || 'Ditolak server';
                return idbReq(db, 'outbox', 'readwrite', function (s) { return s.put(it, it.opId); }).then(function () { return false; });
              });
          });
        }, Promise.resolve(false)).then(function () { return sent; });
      });
    });
  });
}
self.addEventListener('sync', function (e) {
  if (e.tag !== 'hc-outbox') return;
  e.waitUntil(flushOutbox().then(function (sent) {
    return self.clients.matchAll({ includeUncontrolled: true }).then(function (cs) { cs.forEach(function (c) { c.postMessage({ type: 'outbox-synced', sent: sent }); }); });
  }));   // galat jaringan → promise ditolak → browser mencoba lagi nanti
});
