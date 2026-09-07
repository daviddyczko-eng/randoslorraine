const CACHE_NAME = "randos-lorraine-v4"; // Changez la version pour forcer la mise à jour

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
  "/icons/RL-logo.png",
];

// Installation : mise en cache des ressources
self.addEventListener("install", (event) => {
  console.log("[SW] Installation du Service Worker...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Ouverture du cache :", CACHE_NAME);
        return cache.addAll(ASSETS);
      })
      .then(() => {
        console.log("[SW] Toutes les ressources sont en cache.");
        return self.skipWaiting(); // Force le nouveau SW à devenir actif
      })
      .catch((error) => {
        console.error("[SW] Erreur lors de la mise en cache :", error);
      })
  );
});

// Activation : suppression des anciens caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activation du Service Worker...");
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log("[SW] Suppression de l'ancien cache :", key);
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim(); // Prend le contrôle de tous les clients immédiatement
  console.log("[SW] Le Service Worker est maintenant actif et contrôle les clients.");
});

// Interception des requêtes
self.addEventListener("fetch", (event) => {
  console.log("[SW] Requête interceptée :", event.request.url);

  // Ignorer les requêtes POST
  if (event.request.method !== "GET") return;

  // Stratégie : Cache First, Network Fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log("[SW] Ressource servie depuis le cache :", event.request.url);
        return cachedResponse;
      }

      // Si pas en cache, on récupère depuis le réseau
      console.log("[SW] Ressource non trouvée en cache, chargement depuis le réseau :", event.request.url);
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              console.log("[SW] Mise en cache de :", event.request.url);
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          console.log("[SW] Échec du chargement depuis le réseau pour :", event.request.url);
          // Si la requête est une navigation (ex: chargement de la page), on retourne index.html
          if (event.request.mode === "navigate") {
            console.log("[SW] Retour de /index.html depuis le cache.");
            return caches.match("/index.html");
          }
          // Sinon, on retourne une réponse vide
          return new Response(null, { status: 404 });
        });
    })
  );
});
