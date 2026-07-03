import { serveStatic } from "cloudflare:workers";

/* -------------------------------------------------------
   1) Trouver automatiquement l’URL de la prochaine rando
------------------------------------------------------- */
function extractNextRandoUrl(html) {
  const match = html.match(/href="(\/\d{4}-\d{2}-\d{2}-[^"]+)"/);
  return match ? `https://www.randoslorraine.org${match[1]}` : null;
}

/* -------------------------------------------------------
   2) Parser la page de la randonnée
------------------------------------------------------- */
function parseRandoHtml(html) {
  const clean = html.replace(/\s+/g, " ");

  const extract = (label) => {
    const regex = new RegExp(`${label}\\s*:?\\s*([^<]+)`, "i");
    const match = clean.match(regex);
    return match ? match[1].trim() : "";
  };

  return {
    date: extract("Date"),
    lieu: extract("Lieu"),
    heureAccueil: extract("Heure d'accueil"),
    heureDepart: extract("Heure de départ"),
    distance: extract("Distance"),
    denivele: extract("Dénivelé"),
    contact: extract("Contact"),
    gps: extract("GPS")
  };
}

/* -------------------------------------------------------
   3) Worker principal
------------------------------------------------------- */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    /* -------------------------------------------------------
       API Cloudflare : /api/rando
    ------------------------------------------------------- */
    if (url.pathname === "/api/rando") {

      // 1) Télécharger la page d’accueil
      const homeHtml = await fetch("https://www.randoslorraine.org", {
        headers: { "User-Agent": "Mozilla/5.0" }
      }).then(r => r.text());

      // 2) Extraire automatiquement l’URL de la prochaine rando
      const nextUrl = extractNextRandoUrl(homeHtml);

      if (!nextUrl) {
        return new Response(JSON.stringify({
          error: "Aucune randonnée trouvée"
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // 3) Télécharger la page de la rando
      const randoHtml = await fetch(nextUrl, {
        headers: { "User-Agent": "Mozilla/5.0" }
      }).then(r => r.text());

      // 4) Parser les données
      const data = parseRandoHtml(randoHtml);

      // 5) Retourner le JSON attendu par app.js
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" }
      });
    }

    /* -------------------------------------------------------
       Service des fichiers statiques (HTML, JS, CSS…)
       Nouvelle API Cloudflare Workers
    ------------------------------------------------------- */
    return serveStatic(request, {
      root: "",
      tryFiles: ["index.html"]
    });
  }
};
