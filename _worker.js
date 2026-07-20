export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Debug HTML Cloudflare
    if (url.pathname === "/api/debug") {
      const resp = await fetch("https://www.randoslorraine.org/randonnees-a-venir");
      const html = await resp.text();
      return new Response(html, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }

    // API principale
    if (url.pathname === "/api/rando") {
      return await getFullRando();
    }

    return new Response("Worker randoslorraine actif");
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

  // 2️⃣ Capturer le premier bloc views-row ENTIER
  const rows = [...html.matchAll(/<div class="views-row[\s\S]*?(?=<div class="views-row|\Z)/g)];

  if (rows.length === 0) {
    return json({ error: "Aucune randonnée trouvée." }, 404);
  }

  const firstBlock = rows[0][0];

  // 3️⃣ Trouver le premier lien de la rando
  const hrefMatch = firstBlock.match(/href="([^"]+)"/);

  if (!hrefMatch) {
    return json({ error: "Aucun lien de randonnée trouvé." }, 404);
  }

  const randoUrl = base + hrefMatch[1];

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
