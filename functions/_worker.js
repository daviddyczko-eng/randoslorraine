import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
  async fetch(request) {
    const url = "https://randoslorraine.org/randonnees-a-venir";

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const html = await response.text();
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
};
    } catch (e) {
      // Fallback SPA : toutes les routes renvoient index.html
      const url = new URL(request.url);
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
