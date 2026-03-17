const CACHE_NAME = 'discordhunt-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap'
];

// Install — cache assets, lalu langsung aktif (skip waiting)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // langsung gantikan SW lama
  );
});

// Activate — hapus cache lama, ambil alih semua client
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // ambil alih tab/app yang sudah terbuka
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Telegram API — selalu network, jangan cache
  if (url.includes('api.telegram.org')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Google Fonts — network first, fallback cache
  if (url.includes('fonts.googleapis') || url.includes('fonts.gstatic')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // App shell (index.html, manifest, icons) — NETWORK FIRST
  // Selalu coba ambil versi terbaru dari server,
  // fallback ke cache hanya kalau offline
  e.respondWith(
    fetch(e.request).then(res => {
      // Simpan versi terbaru ke cache
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request)) // offline fallback
  );
});

// Push notification support (future)
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  self.registration.showNotification(data.title || 'DiscordHunt Alert!', {
    body: data.body || 'Discord invite link ditemukan!',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'discord-invite',
    renotify: true,
    requireInteraction: true
  });
});
