/* =========================================================
   XP Tasks PWA - sw.js
   Version: 6.2 (cache bust)
   ========================================================= */

const CACHE_NAME = "xp-tasks-cache-v6.2";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=6.2",
  "./app.js?v=6.2",
  "./manifest.webmanifest",

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
  "./assets/lvl9_dieu.png",
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
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  event.respondWith((async () => {
    // cache-first pour fichiers
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      return fresh;
    } catch (e) {
      // fallback index si offline
      const fallback = await caches.match("./index.html");
      return fallback || new Response("Offline", { status: 503 });
    }
  })());
});