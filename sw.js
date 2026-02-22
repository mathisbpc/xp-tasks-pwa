/* XP Tasks - Service Worker */
const SW_VERSION = "7.1.0";
const CACHE_NAME = `xp-tasks-cache-${SW_VERSION}`;

const ASSETS = [
  "./",
  "./index.html?v=7.1.0",
  "./styles.css?v=7.1.0",
  "./app.js?v=7.1.0",
  "./manifest.webmanifest?v=7.1.0",

  "./assets/icon-192.png",
  "./assets/icon-512.png",

  "./assets/lvl1_larve.png",
  "./assets/lvl2_larve_disciplinee.png",
  "./assets/lvl3_soldat.png",
  "./assets/lvl4_slayer.png",
  "./assets/lvl5_pirate.png",
  "./assets/lvl6_apothicaaire.png",
  "./assets/lvl7_samurai.png",
  "./assets/lvl8_reussite.png",
  "./assets/lvl9_dieu.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // HTML => réseau d'abord (évite version bloquée)
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put("./", fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match("./");
        return cached || Response.error();
      }
    })());
    return;
  }

  // cache-first pour le reste
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    const res = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, res.clone());
    return res;
  })());
});