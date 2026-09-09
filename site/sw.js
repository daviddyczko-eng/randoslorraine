const CACHE_NAME = "randos-lorraine-v6";

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

  const url = new URL(event.request.url);

  // ============================================================
  // CAS PARTICULIER : API des randonnées
  // ============================================================
  // Le paramètre "v" sert uniquement à forcer le rafraîchissement.
  // Il ne doit donc pas créer une nouvelle entrée dans le cache.
  if (url.pathname === "/api/rando") {
    event.respondWith(
      (async () => {
        // Création d'une URL de cache sans le paramètre "v"
        const cacheUrl = new URL(url);
        cacheUrl.searchParams.delete("v");

        const cacheRequest = new Request(cacheUrl.toString(), {
          method: "GET"
        });

        try {
          // ------------------------------------------------------
          // 1. Réseau d'abord
          // ------------------------------------------------------
          const response = await fetch(event.request);

          if (response.ok) {
            const responseClone = response.clone();

            const cache = await caches.open(CACHE_NAME);

            // On remplace l'ancienne version des données
            // par la nouvelle version.
            await cache.put(cacheRequest, responseClone);

            console.log(
              "[SW] API réseau utilisée et cache mis à jour :",
              cacheUrl.pathname + cacheUrl.search
            );
          }

          return response;

        } catch (error) {
          // ------------------------------------------------------
          // 2. Si le réseau est indisponible : cache
          // ------------------------------------------------------
          console.log(
            "[SW] API hors ligne, utilisation du cache :",
            cacheUrl.pathname + cacheUrl.search
          );

          const cachedResponse = await caches.match(cacheRequest);

          if (cachedResponse) {
            return cachedResponse;
          }

          // Aucune donnée disponible hors ligne
          return new Response(
            JSON.stringify({
              error: "Données des randonnées indisponibles hors ligne."
            }),
            {
              status: 503,
              headers: {
                "Content-Type": "application/json"
              }
            }
          );
        }
      })()
    );

    return;
  }

  // ============================================================
  // AUTRES REQUÊTES : Network First classique
  // ============================================================

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          console.log(
            "[SW] Version réseau utilisée :",
            event.request.url
          );
        }

        return response;
      })
      .catch(() => {
        console.log(
          "[SW] Réseau indisponible, utilisation du cache :",
          event.request.url
        );

        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Pour une navigation, on retourne index.html
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }

          // Ressource non disponible
          return new Response(null, { status: 404 });
        });
      })
  );
});
