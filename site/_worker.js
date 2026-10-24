export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1️⃣ Route de debug HTML
    if (url.pathname === "/api/debug") {
      const resp = await fetch("https://www.randoslorraine.org/randonnees-a-venir");
      const html = await resp.text();
      return new Response(html, {
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
    }

    // 2️⃣ Route API principale
    if (url.pathname === "/api/rando") {
      return await getFullRando();
    }

    // 3️⃣ Sinon → servir le site statique Cloudflare Pages
    return env.ASSETS.fetch(request);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function extract(html, regex) {
  const m = html.match(regex);
  return m ? m[1].trim() : null;
}

async function getFullRando() {
  const base = "https://www.randoslorraine.org";
  const listUrl = `${base}/randonnees-a-venir`;

  // 1️⃣ Charger la liste des randos
  const resp = await fetch(listUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (RandosLorraineWorker)" }
  });

  if (!resp.ok) {
    return json({ error: "Erreur lors de la récupération de la liste." }, resp.status);
  }

  const html = await resp.text();

  if (annulee) {
    continue;
  }

  // Récupérer le lien de cette randonnée
  const hrefMatch = block.match(/href="([^"]+)"/);

  if (!hrefMatch) {
    continue;
  }

  firstBlock = block;
  randoUrl = new URL(hrefMatch[1], base).href;
  break;
}

if (!randoUrl) {
  return json({
    error: "Aucune randonnée non annulée trouvée."
  }, 404);
}

  // 4️⃣ Charger la fiche individuelle
  const page = await fetch(randoUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (RandosLorraineWorker)" }
  });

  if (!page.ok) {
    return json({ error: "Erreur lors de la récupération de la fiche." }, page.status);
  }

  const fiche = await page.text();

  // 5️⃣ Extraire les champs
  const title = extract(fiche, /<h1[^>]*>([^<]+)<\/h1>/);
  const date = extract(fiche, /field-name-field-rando-date[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/);

  const commune = extract(fiche, /field-name-field-rando-lieu-commune[^>]*>\s*([^<]+)</);
  const pays = extract(fiche, /field-name-field-rando-lieu-pays[^>]*>\s*([^<]+)</);
  const departement = extract(fiche, /field-name-field-rando-lieu-departement[^>]*>\s*([^<]+)</);

  const rdv = extract(
    fiche,
    /field-name-field-rando-rv-info[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/
  );

  const heureAccueil = extract(
    fiche,
    /field-name-field-rando-info-accueil[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/
  );

  const heureDepart = extract(
    fiche,
    /field-name-field-rando-heure[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/
  );

  const pilotes = extract(
    fiche,
    /field-name-field-rando-pilotes[^>]*>([\s\S]*?)<\/div>/
  );

  const telephones = [...fiche.matchAll(
    /field-name-field-rando-telephone[^>]*>\s*([^<]+)</g
  )].map(m => m[1].trim());

  const gps = extract(
    fiche,
    /Coordonnées GPS\s*:\s*([^<]+)/
  );

  // 6️⃣ Retourner le JSON complet
  return json({
    url: randoUrl,
    titre: title,
    date,
    annulee,
    lieu: {
      commune,
      pays,
      departement
    },
    rendezVous: rdv,
    heureAccueil,
    heureDepart,
    pilotes,
    telephones,
    gps
  });
}
