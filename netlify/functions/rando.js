exports.handler = async (event, context) => {
  try {
    const homeResponse = await fetch("https://www.randoslorraine.org/");
    const home = await homeResponse.text();

    const matchUrl = home.match(/href="(\/\d{4}-\d{2}-\d{2}-rando[^"]+)"/);
    if (!matchUrl) {
      return { statusCode: 200, body: JSON.stringify({ error: "Aucune randonnée trouvée" }) };
    }

    const randoUrl = "https://www.randoslorraine.org" + matchUrl[1];
    const randoResponse = await fetch(randoUrl);
    const html = await randoResponse.text();

    function extract(regex) {
      const m = html.match(regex);
      return m ? m[1].trim() : null;
    }

    // ⭐ DATE
    let dateStart = extract(/<span class="date-display-start[^"]*">([\s\S]*?)<\/span>/);
    let dateEnd   = extract(/<span class="date-display-end[^"]*">([\s\S]*?)<\/span>/);
    let date = dateEnd ? `${dateStart} - ${dateEnd}` : dateStart;

    // ⭐ AUTRES CHAMPS
    let lieu = extract(/field-name-field-rando-rv-info[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/);
    let heureAccueil = extract(/field-name-field-rando-info-accueil[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/);
    let heureDepart = extract(/field-name-field-rando-heure[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/);
    let distance = extract(/field-name-field-rando-distance[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/);
    let denivele = extract(/field-name-field-rando-denivele[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/);
    let gps = extract(/Coordonnées GPS[\s\S]*?([0-9\.,\s]+)/);

    // ⭐ CONTACT — méthode hybride
    let contact = extract(/field-name-field-rando-telephone[\s\S]*?<div class="field-item">([\s\S]*?)<\/div>/);

    if (contact) {
      contact = contact.replace(/<br\s*\/?>/g, " / ").replace(/\s+/g, " ").trim();
    } else {
      const phones = html.match(/\b0[1-9](?:[\s\.]?\d{2}){4}\b/g);
      if (phones) {
        contact = phones.join(" / ");
      }
    }

    const data = { url: randoUrl, date, lieu, heureAccueil, heureDepart, distance, denivele, gps, contact };

    return { statusCode: 200, body: JSON.stringify(data) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
