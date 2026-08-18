/* KankaChat service worker — çevrimdışı kabuk + hızlı açılış */
const CACHE = 'kankachat-v3';
const SHELL = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json', '/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname === '/ws') return; // websocket asla cache'lenmez
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const fetchP = fetch(e.request)
        .then((res) => {
          if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); }
          return res;
        })
        .catch(() => hit);
      return hit || fetchP;
    })
  );
});
