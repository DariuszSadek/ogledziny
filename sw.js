// Service worker – generowany/aktualizowany przez tools/build.py (lista plików i wersja cache).
/*BUILD:BEGIN*/
const CACHE = 'ogledziny-0.4.0-4296a99418';
const ASSETS = ["./", "assets/fonts/LibreBaskerville-Italic.ttf", "assets/fonts/LibreBaskerville.ttf", "assets/fonts/OFL.txt", "assets/icon-180.png", "assets/icon-192.png", "assets/icon-512.png", "css/app.css", "forms/00.json", "forms/01.json", "forms/02.json", "forms/03.json", "forms/04.json", "forms/05.json", "forms/06.json", "forms/07.json", "forms/08.json", "forms/09.json", "index.html", "js/app.js", "js/defs.js", "js/engine.js", "js/export.js", "js/migrate.js", "js/sketch.js", "js/store.js", "js/version.js", "manifest.webmanifest"];
/*BUILD:END*/
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('ogledziny-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') { const idx = await c.match('./') || await c.match('index.html'); if (idx) return idx; }
    try { return await fetch(req); } catch { return new Response('Offline', { status: 503 }); }
  })());
});
