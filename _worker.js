import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

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

      const homeHtml = await fetch("https://www.randoslorraine.org", {
        headers: { "User-Agent": "Mozilla/5.0" }
      }).then(r => r.text());

      const nextUrl = extractNextRandoUrl(homeHtml);

      if (!nextUrl) {
        return new Response(JSON.stringify({
          error: "Aucune randonnée trouvée"
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      const randoHtml = await fetch(nextUrl, {
        headers: { "User-Agent": "Mozilla/5.0" }
      }).then(r => r.text());

      const data = parseRandoHtml(randoHtml);

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" }
      });
    }

    /* -------------------------------------------------------
       Service des fichiers statiques (HTML, JS, CSS…)
    ------------------------------------------------------- */
    try {
      return await getAssetFromKV(
        { request, waitUntil: ctx.waitUntil.bind(ctx) },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: JSON.parse(env.__STATIC_CONTENT_MANIFEST),
        }
      );
    } catch (e) {
      const indexRequest = new Request(`${url.origin}/index.html`);
      return await getAssetFromKV(
        { request: indexRequest, waitUntil: ctx.waitUntil.bind(ctx) },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: JSON.parse(env.__STATIC_CONTENT_MANIFEST),
        }
      );
    }
  }
};
