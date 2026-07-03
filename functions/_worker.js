import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1) API pour la prochaine rando
    if (url.pathname.startsWith("/api/rando")) {
      const target = "https://randoslorraine.org/randonnees-a-venir";

      const response = await fetch(target, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });

      const html = await response.text();
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // 2) Fichiers statiques (HTML, JS, CSS, images…)
    try {
      return await getAssetFromKV(
        { request, waitUntil: ctx.waitUntil.bind(ctx) },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: JSON.parse(env.__STATIC_CONTENT_MANIFEST),
        }
      );
    } catch (e) {
      // 3) SPA fallback → index.html
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
