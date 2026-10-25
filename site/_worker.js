export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Route de debug HTML
    if (url.pathname === "/api/debug") {
      const resp = await fetch(
        "https://www.randoslorraine.org/randonnees-a-venir"
      );
      const html = await resp.text();

      return new Response(html, {
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
    }

    // 2. Route API principale
    if (url.pathname === "/api/rando") {
      return await getFullRando();
    }

    // 3. Servir le site statique Cloudflare Pages
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

  // 1. Charger la liste des randonnées
  const resp = await fetch(listUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (RandosLorraineWorker)"
    }
  });

  if (!resp.ok) {
    return json(
      { error: "Erreur lors de la récupération de la liste." },
      resp.status
    );
  }

  const html = await resp.text();

  // 2. Extraire les blocs views-row
  const rows = [
    ...html.matchAll(
      /<div class="views-row\b[\s\S]*?(?=<div class="views-row\b|$)/gi
    )
  ];

  if (rows.length === 0) {
    return json({ error: "Aucune randonnée trouvée." }, 404);
  }

  // 3. Chercher la première randonnée non annulée
  let randoUrl = null;
  let annulee = false;

  for (const row of rows) {
    const block = row[0];

    const annulationText = extract(
      block,
      /field-name-field-rando-annulee[^>]*>[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/i
    );

    const estAnnulee = /annulée/i.test(annulationText || "");

    // Ignorer cette randonnée si elle est annulée
    if (estAnnulee) {
      continue;
    }

    // Récupérer le lien de la randonnée
    const hrefMatch = block.match(/href="([^"]+)"/i);

    if (!hrefMatch) {
      continue;
    }

    randoUrl = new URL(hrefMatch[1], base).href;
    annulee = false;
    break;
  }

  if (!randoUrl) {
    return json(
      { error: "Aucune randonnée non annulée trouvée." },
      404
    );
  }

  // 4. Charger la fiche individuelle
  const page = await fetch(randoUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (RandosLorraineWorker)"
    }
  });

  if (!page.ok) {
    return json(
      { error: "Erreur lors de la récupération de la fiche." },
      page.status
    );
  }

  const fiche = await page.text();

  // 5. Extraire les champs
  const title = extract(
    fiche,
    /<h1[^>]*>([^<]+)<\/h1>/
  );

  const date = extract(
    fiche,
    /field-name-field-rando-date[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i
  );

  const commune = extract(
    fiche,
    /field-name-field-rando-lieu-commune[^>]*>\s*([^<]+)</i
  );

  const pays = extract(
    fiche,
    /field-name-field-rando-lieu-pays[^>]*>\s*([^<]+)</i
  );

  const departement = extract(
    fiche,
    /field-name-field-rando-lieu-departement[^>]*>\s*([^<]+)</i
  );

  const rdv = extract(
    fiche,
    /field-name-field-rando-rv-info[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/i
  );

  const heureAccueil = extract(
    fiche,
    /field-name-field-rando-info-accueil[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/i
  );

  const heureDepart = extract(
    fiche,
    /field-name-field-rando-heure[^>]*>\s*([^<]+)</i
  );

  const pilotes = extract(
    fiche,
    /field-name-field-rando-pilotes[^>]*>([\s\S]*?)<\/div>/i
  );

  const telephones = [
    ...fiche.matchAll(
      /field-name-field-rando-telephone[^>]*>\s*([^<]+)</gi
    )
  ].map(m => m[1].trim());

  const gps = extract(
    fiche,
    /Coordonnées GPS\s*:\s*([^<]+)/i
  );

  // 6. Retourner le JSON complet
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
