import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- API Cloudflare : /api/rando ---
    if (url.pathname === "/api/rando") {
      const target = "https://randoslorraine.org/randonnees-a-venir";

      const response = await fetch(target, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const html = await response.text();

      // TODO : parser le HTML ici
      const data = { html };

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // --- Fichiers statiques ---
    try {
      return await getAssetFromKV(
        { request, waitUntil: ctx.waitUntil.bind(ctx) },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: JSON.parse(env.__STATIC_CONTENT_MANIFEST),
        }
      );
    } catch (e) {
      // --- SPA fallback ---
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
