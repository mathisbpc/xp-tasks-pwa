/* ===========================
   XP Tasks PWA - sw.js (V6)
   Cache busting + auto clean
   =========================== */

const SW_VERSION = "v6.1";                 // <-- incrémente à chaque update
const CACHE_NAME = `xp-tasks-${SW_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",

  // images (mets ici celles que tu utilises)
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

// Install: cache tout
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: supprime les anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null))
    );
    await self.clients.claim();
  })());
});

// Fetch:
// - navigation => réseau d'abord (pour choper les updates)
// - assets => cache d'abord, et MAJ en background
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // HTML / navigation: Network-first
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  // autres fichiers: Cache-first + refresh
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) {
      event.waitUntil(
        fetch(req).then((fresh) => cache.put(req, fresh)).catch(() => {})
      );
      return cached;
    }

    try {
      const fresh = await fetch(req);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      return Response.error();
    }
  })());
});
