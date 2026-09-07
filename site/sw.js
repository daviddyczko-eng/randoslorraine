const CACHE_NAME = "randos-lorraine-v3"; // Changez la version pour forcer la mise à jour

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

// Installation : mise en cache des ressources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // Force le nouveau SW à devenir actif
      .catch((error) => console.error("Erreur de cache :", error))
  );
});

// Activation : suppression des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // Prend le contrôle des clients immédiatement
});

// Interception des requêtes (stratégie : Cache First, Network Fallback)
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes POST
  if (event.request.method !== "GET") return;

  // Pour les requêtes de navigation (ex: chargement de la page)
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html").then((response) => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // Pour les autres requêtes (CSS, JS, images, etc.)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si la ressource est en cache, on la retourne
      if (cachedResponse) return cachedResponse;

      // Sinon, on la récupère depuis le réseau et on la met en cache
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Si le réseau échoue, on retourne une réponse vide (ou une erreur 404)
        return new Response(null, { status: 404 });
      });
    })
  );
});
