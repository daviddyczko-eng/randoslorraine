const CACHE_NAME = "randos-lorraine-v1";

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
  "/icons/RL-ico192.png",
  "/icons/RL-ico-maskable.png",
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

// Interception des requêtes : Network First, Cache Fallback
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes POST
  if (event.request.method !== "GET") return;

  event.respondWith(
    // On essaie d'abord de récupérer la version actuelle depuis le réseau
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          // On met à jour le cache avec la nouvelle version
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          console.log("[SW] Version réseau utilisée :", event.request.url);
        }

        return response;
      })
      .catch(() => {
        // Si le réseau est indisponible, on utilise le cache
        console.log("[SW] Réseau indisponible, utilisation du cache :", event.request.url);

        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Pour une navigation, on retourne index.html
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }

          // Ressource non disponible ni sur le réseau ni dans le cache
          return new Response(null, { status: 404 });
        });
      })
  );
});
