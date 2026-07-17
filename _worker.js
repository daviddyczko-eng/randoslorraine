export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors(),
      });
    }

    // ------------------------------
    // API : prochaine rando
    // ------------------------------
    if (url.pathname === "/api/rando") {
      try {
        const homeHtml = await fetchHtml("https://www.randoslorraine.org/");
        const nextUrl = extractNextRandoUrl(homeHtml);

        if (!nextUrl) {
          return json({ error: "Impossible de trouver la prochaine rando." }, 500);
        }

        const randoHtml = await fetchHtml(nextUrl);
        const data = parseRandoHtml(randoHtml, nextUrl);

        return json(data);
      } catch (err) {
        return json({ error: "Erreur interne Worker", details: err.toString() }, 500);
      }
    }

    // ------------------------------
    // Fallback
    // ------------------------------
    return new Response("Not found", {
      status: 404,
      headers: cors(),
    });
  },
};

// ------------------------------
// Utilitaires
// ------------------------------

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...cors(),
    },
  });
}

async function fetchHtml(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fetch failed: " + url);
  return await res.text();
}

// ------------------------------
// Extraction du lien de la prochaine rando
// ------------------------------

function extractNextRandoUrl(html) {
  // On cherche le premier lien de type /YYYY-MM-DD-quelque-chose
  const match = html.match(/href="(\/\d{4}-\d{2}-\d{2}[^"]+)"/);
  if (!match) return null;
  return "https://www.randoslorraine.org" + match[1];
}

// ------------------------------
// Parsing de la page de rando
// ------------------------------

function parseRandoHtml(html, url) {
  const title = extract(html, /<h2[^>]*class="node-title"[^>]*>\s*<a[^>]*>(.*?)<\/a>/);
  const date = extract(html, /<span class="date-display-single">(.*?)<\/span>/);

  // Description : on prend le premier bloc de texte riche
  const description = extract(html, /<div class="field[^>]*field-name-body[^>]*>([\s\S]*?)<\/div>/);

  return {
    url,
    title,
    date,
    description,
  };
}

function extract(html, regex) {
  const m = html.match(regex);
  return m ? clean(m[1]) : null;
}

function clean(str) {
  return str.replace(/<[^>]+>/g, "").trim();
}
