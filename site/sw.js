const CACHE_NAME = "randos-lorraine-v2"; // Changez la version pour forcer la mise à jour

const ASSETS = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/js/app.js",
  "/js/storage.js",
  "/js/qrcode.min.js",
  "/js/html5-qrcode.min.js",
  "/data/info.json",
  "/manifest.webmanifest",
  "/icons/RL-ico.png",
  "/icons/RL-ico192.png",
  "/icons/RL-logo.png",
];

// Installation : mise en cache de toutes les ressources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((error) => {
        console.error("Erreur lors de la mise en cache :", error);
      });
    })
  );
  self.skipWaiting(); // Force le nouveau Service Worker à devenir actif immédiatement
});

// Activation : suppression des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // Prend le contrôle de tous les clients immédiatement
});

// Interception des requêtes
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes POST
  if (event.request.method !== "GET") return;

  // Stratégie : Cache First, Network Fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si la ressource est en cache, on la retourne
      if (cachedResponse) {
        return cachedResponse;
      }

      // Sinon, on la récupère depuis le réseau et on la met en cache
      return fetch(event.request)
        .then((response) => {
          // Si la requête est réussie, on met la réponse en cache
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si la requête échoue (hors ligne), on retourne une page de secours
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
          // Pour les autres requêtes (CSS, JS, etc.), on retourne une réponse vide ou une erreur
          return new Response(null, { status: 404 });
        });
    })
  );
});
