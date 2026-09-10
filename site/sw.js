const CACHE_NAME = "randos-lorraine-v1";

// Ressources nécessaires au fonctionnement hors ligne
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

// ============================================================
// INSTALLATION
// ============================================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error("[SW] Erreur d'installation :", error);
        throw error;
      })
  );
});

// ============================================================
// ACTIVATION
// ============================================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ============================================================
// INTERCEPTION DES REQUÊTES
// Network First + Cache Fallback
// ============================================================

self.addEventListener("fetch", (event) => {
  // Les requêtes POST ne sont pas gérées par le Service Worker.
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // ==========================================================
  // API DES RANDONNÉES
  // ==========================================================

  if (url.pathname === "/api/rando") {
    event.respondWith(handleRandoApi(event.request));
    return;
  }

  // ==========================================================
  // AUTRES RESSOURCES
  // ==========================================================

  event.respondWith(handleRequest(event.request));
});

// ============================================================
// GESTION DE L'API /api/rando
// ============================================================

async function handleRandoApi(request) {
  const url = new URL(request.url);

  // Le paramètre "v" sert uniquement à forcer le rafraîchissement.
  // Il ne doit pas créer une nouvelle entrée dans le cache.
  url.searchParams.delete("v");

  const cacheRequest = new Request(url.toString(), {
    method: "GET"
  });

  try {
    // --------------------------------------------------------
    // 1. Réseau d'abord
    // --------------------------------------------------------

    const response = await fetch(request);

    if (response.ok) {
      const responseClone = response.clone();
      const cache = await caches.open(CACHE_NAME);

      await cache.put(cacheRequest, responseClone);
    }

    return response;

  } catch (error) {
    // --------------------------------------------------------
    // 2. Réseau indisponible : cache
    // --------------------------------------------------------

    const cachedResponse = await caches.match(cacheRequest);

    if (cachedResponse) {
      return cachedResponse;
    }

    // --------------------------------------------------------
    // 3. Aucune donnée disponible
    // --------------------------------------------------------

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
}

// ============================================================
// GESTION DES AUTRES REQUÊTES
// ============================================================

async function handleRequest(request) {
  try {
    // --------------------------------------------------------
    // 1. Réseau d'abord
    // --------------------------------------------------------

    const response = await fetch(request);

    if (response.ok) {
      const responseClone = response.clone();
      const cache = await caches.open(CACHE_NAME);

      await cache.put(request, responseClone);
    }

    return response;

  } catch (error) {
    // --------------------------------------------------------
    // 2. Réseau indisponible : cache
    // --------------------------------------------------------

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // --------------------------------------------------------
    // 3. Navigation : retour vers l'application
    // --------------------------------------------------------

    if (request.mode === "navigate") {
      const cachedIndex = await caches.match("/index.html");

      if (cachedIndex) {
        return cachedIndex;
      }
    }

    // --------------------------------------------------------
    // 4. Ressource indisponible
    // --------------------------------------------------------

    return new Response(null, {
      status: 404
    });
  }
}
