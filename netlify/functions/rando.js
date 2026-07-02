exports.handler = async (event, context) => {
  try {
    // 1) Télécharger la page d'accueil
    const homeResponse = await fetch("https://www.randoslorraine.org/");
    const home = await homeResponse.text();

    // 2) Trouver l'URL de la prochaine vraie rando (éviter les pages calendrier)
    const matchUrl = home.match(/href="(\/\d{4}-\d{2}-\d{2}-rando[^"]+)"/);

    if (!matchUrl) {
      return {
        statusCode: 200,
        body: JSON.stringify({ error: "Aucune randonnée trouvée" })
      };
    }

    const randoUrl = "https://www.randoslorraine.org" + matchUrl[1];

    // 3) Télécharger la fiche détaillée
    const randoResponse = await fetch(randoUrl);
    const html = await randoResponse.text();

    // Fonction utilitaire
    function extract(regex) {
      const m = html.match(regex);
      return m ? m[1].trim() : null;
    }

    // ⭐ 4) Extraction de la date (span vert sous le titre)
    let date = extract(/<span class="date-display[^"]*">([\s\S]*?)<\/span>/);

    // ⭐ 5) Extraction du lieu
    let lieu = extract(/field-name-field-rando-rv-info[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/);

    // ⭐ 6) Heure accueil
    let heureAccueil = extract(/field-name-field-rando-info-accueil[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/);

    // ⭐ 7) Heure départ
    let heureDepart = extract(/field-name-field-rando-heure[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/);

    // ⭐ 8) Distance
    let distance = extract(/field-name-field-rando-distance[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/);

    // ⭐ 9) Dénivelé
    let denivele = extract(/field-name-field-rando-denivele[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/);

    // ⭐ 10) Coordonnées GPS
    let gps = extract(/Coordonnées GPS[\s\S]*?([0-9\.,\s]+)/);

    // ⭐ 11) Contact — capture TOUT le bloc
    let contact = extract(/field-name-field-rando-telephone[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/);

    if (contact) {
      contact = contact
        .replace(/<br\s*\/?>/g, " / ")  // remplace les sauts de ligne
        .replace(/\s+/g, " ")           // normalise les espaces
        .trim();
    }

    const data = {
      url: randoUrl,
      date,
      lieu,
      heureAccueil,
      heureDepart,
      distance,
      denivele,
      gps,
      contact
    };

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
