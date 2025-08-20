
const CACHE = 'lanterns-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './manifest.webmanifest',
  './content/map_sewers.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(res => res || fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, copy));
        return resp;
      }).catch(()=>caches.match('./index.html')))
    );
  }
});
