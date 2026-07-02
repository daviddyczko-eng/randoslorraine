exports.handler = async (event, context) => {
  try {
    // 1) Télécharger la page d'accueil
    const homeResponse = await fetch("https://www.randoslorraine.org/");
    const home = await homeResponse.text();

    // 2) Trouver l'URL de la prochaine rando
    const matchUrl = home.match(/href="(\/\d{4}-\d{2}-\d{2}[^"]+)"/);

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

    const data = {
      url: randoUrl,
      date: extract(/field-name-field-rando-date[\s\S]*?<div class="field-item">(.*?)<\/div>/),
      lieu: extract(/field-name-field-rando-rv-info[\s\S]*?<div class="field-item">(.*?)<\/div>/),
      heureAccueil: extract(/field-name-field-rando-info-accueil[\s\S]*?<div class="field-item">(.*?)<\/div>/),
      heureDepart: extract(/field-name-field-rando-heure[\s\S]*?<div class="field-item">(.*?)<\/div>/),
      distance: extract(/field-name-field-rando-distance[\s\S]*?<div class="field-item">(.*?)<\/div>/),
      denivele: extract(/field-name-field-rando-denivele[\s\S]*?<div class="field-item">(.*?)<\/div>/),
      gps: extract(/Coordonnées GPS\s*:\s*([0-9\.,\s]+)/),
      contact: extract(/field-name-field-rando-telephone">(\d+)/)
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
