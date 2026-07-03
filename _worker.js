export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // -------------------------------------------------------
    // 1) API /api/rando
    // -------------------------------------------------------
    if (url.pathname === "/api/rando") {
      const homeHtml = await fetch("https://www.randoslorraine.org", {
        headers: { "User-Agent": "Mozilla/5.0" }
      }).then(r => r.text());

      const match = homeHtml.match(/href="(\/\d{4}-\d{2}-\d{2}-[^"]+)"/);
      const nextUrl = match ? `https://www.randoslorraine.org${match[1]}` : null;

      if (!nextUrl) {
        return new Response(JSON.stringify({ error: "Aucune randonnée trouvée" }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      const randoHtml = await fetch(nextUrl, {
        headers: { "User-Agent": "Mozilla/5.0" }
      }).then(r => r.text());

      const clean = randoHtml.replace(/\s+/g, " ");
      const extract = (label) => {
        const regex = new RegExp(`${label}\\s*:?\\s*([^<]+)`, "i");
        const m = clean.match(regex);
        return m ? m[1].trim() : "";
      };

      const data = {
        date: extract("Date"),
        lieu: extract("Lieu"),
        heureAccueil: extract("Heure d'accueil"),
        heureDepart: extract("Heure de départ"),
        distance: extract("Distance"),
        denivele: extract("Dénivelé"),
        contact: extract("Contact"),
        gps: extract("GPS")
      };

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // -------------------------------------------------------
    // 2) Service des fichiers statiques SANS kv-asset-handler
    // -------------------------------------------------------
    try {
      const path = url.pathname === "/" ? "/index.html" : url.pathname;

      const file = await env.__STATIC_CONTENT.get(path.slice(1));

      if (file) {
        return new Response(file, {
          headers: { "Content-Type": getContentType(path) }
        });
      }

      // Fallback SPA → index.html
      const indexFile = await env.__STATIC_CONTENT.get("index.html");
      return new Response(indexFile, {
        headers: { "Content-Type": "text/html" }
      });

    } catch (err) {
      return new Response("Erreur interne", { status: 500 });
    }
  }
};

// -------------------------------------------------------
// 3) Détection du type MIME
// -------------------------------------------------------
function getContentType(path) {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webmanifest")) return "application/manifest+json";
  return "application/octet-stream";
}
