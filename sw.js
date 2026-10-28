/* בירה על המלצר - Service Worker
   לעדכון גרסה: הגדל את VERSION (למשל 1.0.1) ועלה ל-GitHub. */
const VERSION = '2.0.0';
const CACHE = 'bw-' + VERSION;
const ASSETS = ['./', './index.html', './manifest.webmanifest', './favicon.ico',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png', './icons/favicon-64.png'];

self.addEventListener('install', e => {
  // לא קוראים skipWaiting כאן: הגרסה החדשה ממתינה עד שהמשתמש לוחץ "עדכן עכשיו"
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, {cache: 'reload'})))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('bw-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  if (r.mode === 'navigate') {
    // רשת קודם (כדי לקבל עדכונים), ואם אין אינטרנט או שהוא איטי: מהמטמון
    e.respondWith((async () => {
      try {
        const net = await Promise.race([fetch('./index.html', {cache: 'no-cache'}), new Promise((_, j) => setTimeout(j, 4000))]);
        if (net.ok) { const c = await caches.open(CACHE); c.put('./index.html', net.clone()); return net; }
        throw 0;
      } catch (_) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }
  // שאר הקבצים: מהמטמון קודם
  e.respondWith(caches.match(r, {ignoreSearch: true}).then(m => m || fetch(r).then(n => {
    if (n.ok) { const cp = n.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
    return n;
  })));
});
