const CACHE_NAME = "randos-lorraine-v5"; // Changez la version pour forcer la mise à jour

// Liste des fichiers à mettre en cache (chemins absolus depuis la racine)
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
  console.log("[SW] Installation...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // Force le nouveau SW à devenir actif
      .catch((error) => console.error("[SW] Erreur d'installation :", error))
  );
});

// Activation : suppression des anciens caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activation...");
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // Prend le contrôle des clients immédiatement
});

// Interception des requêtes : Cache First, Network Fallback
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes POST
  if (event.request.method !== "GET") return;

  // Stratégie : Cache First
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si la ressource est en cache, on la retourne
      if (cachedResponse) {
        console.log("[SW] Servi depuis le cache :", event.request.url);
        return cachedResponse;
      }

      // Sinon, on essaie de la récupérer depuis le réseau
      console.log("[SW] Non trouvé en cache, chargement depuis le réseau :", event.request.url);
      return fetch(event.request)
        .then((response) => {
          // Si la réponse est valide, on la met en cache
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si le réseau échoue, on essaie de retourner index.html pour les requêtes de navigation
          if (event.request.mode === "navigate") {
            console.log("[SW] Retour de /index.html depuis le cache.");
            return caches.match("/index.html");
          }
          // Sinon, on retourne une réponse vide (404)
          return new Response(null, { status: 404 });
        });
    })
  );
});
