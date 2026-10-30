// Hermes CRM: aplikacja instalowana na telefonie i komputerze. Szkielet aplikacji jest w pamięci podręcznej,
// żeby otwierał się szybko także przy słabym zasięgu. Dane (/api) zawsze idą prosto do serwera.
const CACHE = 'hermes-v1';
const SHELL = ['/', '/assets/icon-192.png', '/assets/icon-512.png', '/manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') {
    /* najpierw sieć, żeby zawsze była najnowsza wersja; bez sieci ostatnia zapisana */
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('/', copy)); return r; }).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
