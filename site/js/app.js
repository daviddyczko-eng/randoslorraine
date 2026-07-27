/* ==========================================================
   Rando's Lorraine
   Application principale
   ========================================================== */

import {
  getUser,
  saveUser,
  needsCotisation,
  qrData
} from "./storage.js";

/* ==========================================================
   Désactivation du Service Worker
   ========================================================== */

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

/* ==========================================================
   Raccourcis DOM
   ========================================================== */

const $ = (selector) => document.querySelector(selector);

const splashEl = $("#view-splash");
const mainEl = $("#view-main");
const screenRoot = $("#screen-root");

const appBarTitle = $("#app-bar-title");
const appBarBack = $("#btn-back");
const appBarIcon = $("#app-bar-icon");

/* ==========================================================
   Etat global de l'application
   ========================================================== */

const app = {

  user: null,

  prochaineRando: null,

  infoContent: null,

  currentScreen: "splash",

  history: []

};

/* ==========================================================
   Chargement utilisateur
   ========================================================== */

function loadUser() {
  app.user = getUser();
}

function storeUser(data) {

  saveUser(data);

  loadUser();

}

/* ==========================================================
   Gestion de l'historique
   ========================================================== */

function pushHistory(screen) {

  if (
    app.history.length === 0 ||
    app.history[app.history.length - 1] !== screen
  ) {

    app.history.push(screen);

  }

}

function popHistory() {

  app.history.pop();

  return app.history[app.history.length - 1] || "accueil";

}

/* ==========================================================
   Outils
   ========================================================== */

const PARTICLES = [
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "d'",
  "l'",
  "von"
];

function formatName(name) {

  return name
    .trim()
    .split(/\s+/)
    .map((word) => {

      if (PARTICLES.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }

      return (
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
      );

    })
    .join(" ");

}

function escapeHtml(text) {

  return String(text)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;");

}

function setScreen(html) {

  screenRoot.innerHTML = html;

}

function setTitle(title) {

  appBarTitle.textContent = title;

}

function showBackButton(show) {

  appBarBack.classList.toggle("hidden", !show);

  appBarIcon.classList.toggle("hidden", show);

}

/* ==========================================================
   Navigation
   ========================================================== */

const SCREEN_TITLES = {

  inscription: "Inscription",

  cotisation: "Vérification de votre cotisation",

  accueil: "Rando's Lorraine",

  carte: "Ma carte",

  correction: "Corriger",

  rando: "Prochaine randonnée",

  info: "Informations"

};

function showScreen(screen) {

  app.currentScreen = screen;

  pushHistory(screen);

  const title = SCREEN_TITLES[screen] ?? "Rando's Lorraine";

  setTitle(title);

  showBackButton(screen !== "accueil");

}

function navigate(screen, data = null) {

  showScreen(screen);

  switch (screen) {

    case "inscription":
      renderInscription();
      break;

    case "cotisation":
      renderCotisation();
      break;

    case "accueil":
      renderAccueil();
      break;

    case "carte":
      renderCarte();
      break;

    case "correction":
      renderCorrection();
      break;

    case "rando":
      renderRandoDetails(data ?? app.prochaineRando);
      break;

    case "info":
      renderInfoPage(data);
      break;

    default:
      renderAccueil();

  }

}

/* ==========================================================
   Bouton retour
   ========================================================== */

appBarBack.onclick = () => {

  if (app.history.length <= 1) {

    navigate("accueil");

    return;

  }

  app.history.pop();

  const previous = popHistory();

  switch (previous) {

    case "accueil":
      renderAccueil();
      break;

    case "carte":
      renderCarte();
      break;

    case "correction":
      renderCorrection();
      break;

    case "rando":
      renderRandoDetails(app.prochaineRando);
      break;

    case "info":
      renderInfoPage();
      break;

    default:
      renderAccueil();

  }

  showScreen(previous);

};

/* ==========================================================
   Accueil
   ========================================================== */

function renderAccueil() {

  const user = app.user;

  const rando = app.prochaineRando;

  let titreRando = "Prochaine randonnée";
  let date = "Aucune date";
  let commune = "";

  if (rando) {

    if (isToday(rando.date)) {
      titreRando = "Rando du jour";
    }

    date = rando.date ?? "Date inconnue";

    commune = rando.lieu?.commune ?? "";

  }

  setScreen(`

    <div class="screen">

      <div class="card-list">

        <div class="home-card" id="btn-carte">

          <div>

            <div class="home-card__title">
              Bonjour ${escapeHtml(user.prenom)} !
            </div>

          </div>

          <div id="qr-small"></div>

        </div>


        <div class="home-card" id="btn-rando">

          <div class="home-card__title">

            ${titreRando}

          </div>

          <div class="home-card__preview">

            ${escapeHtml(date)}

            <br>

            <small>${escapeHtml(commune)}</small>

          </div>

        </div>


        <div class="home-card" id="btn-avant">

          <div class="home-card__title">

            Avant le départ

          </div>

        </div>


        <div class="home-card" id="btn-accident">

          <div class="home-card__title">

            En cas d'accident

          </div>

        </div>


        <div class="home-card" id="btn-tarifs">

          <div class="home-card__title">

            Tout sur les tarifs

          </div>

        </div>


        <div
          class="home-card"
          id="btn-site">

          <div class="home-card__title">

            Site internet

          </div>

        </div>

      </div>

    </div>

  `);

  renderQr(

    $("#qr-small"),

    qrData(user.prenom, user.nom),

    60

  );

  $("#btn-carte").onclick = () => {

    navigate("carte");

  };

  $("#btn-rando").onclick = () => {

    navigate("rando");

  };

  $("#btn-avant").onclick = () => {

    navigate("info", "avant-depart");

  };

  $("#btn-accident").onclick = () => {

    navigate("info", "accident");

  };

  $("#btn-tarifs").onclick = () => {

    navigate("info", "tarifs");

  };

  $("#btn-site").onclick = () => {

    window.open(
      "https://randoslorraine.org",
      "_blank"
    );

  };

}

/* ==========================================================
   Carte d'adhérent
   ========================================================== */

function renderCarte() {

  const user = app.user;

  setScreen(`
    <div class="screen screen--center">

      <div id="qr-large"></div>

      <p class="carte-name">
        ${escapeHtml(user.prenom)} ${escapeHtml(user.nom)}
      </p>

      <button
        id="btn-corriger"
        class="btn btn--secondary">
        Corriger
      </button>

    </div>
  `);

  renderQr(
    $("#qr-large"),
    qrData(user.prenom, user.nom),
    260
  );

  $("#btn-corriger").onclick = () => {
    navigate("correction");
  };

}


/* ==========================================================
   Correction des informations
   ========================================================== */

function renderCorrection() {

  const user = app.user;

  setScreen(`
    <div class="screen">

      <form id="form-correction" class="form">

        <div class="field">
          <label>Prénom</label>
          <input
            id="prenom"
            value="${escapeHtml(user.prenom)}"
            required>
        </div>

        <div class="field">
          <label>Nom</label>
          <input
            id="nom"
            value="${escapeHtml(user.nom)}"
            required>
        </div>

        <div class="field">
          <label>Adresse e-mail</label>
          <input
            id="email"
            type="email"
            value="${escapeHtml(user.email ?? "")}"
            required>
        </div>

        <div class="field">
          <label>Téléphone</label>
          <input
            id="telephone"
            type="tel"
            value="${escapeHtml(user.telephone ?? "")}"
            placeholder="+33612345678"
            required>
        </div>

        <div class="btn-row">

          <button
            type="submit"
            class="btn btn--primary">

            Enregistrer

          </button>

        </div>

      </form>

    </div>
  `);

  $("#form-correction").onsubmit = (e) => {

    e.preventDefault();

    const prenom = formatName($("#prenom").value);

    const nom = formatName($("#nom").value);

    const email = $("#email").value.trim();

    const telephone = $("#telephone").value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

      alert("Adresse e-mail invalide.");

      return;

    }

    if (!/^\+\d{10,15}$/.test(telephone)) {

      alert("Le téléphone doit être au format international.");

      return;

    }

    app.user = {

      ...app.user,

      prenom,

      nom,

      email,

      telephone,

      // IMPORTANT : on conserve la date d'inscription
      dateInscription: app.user.dateInscription

    };

    saveUser(app.user);

    navigate("carte");

  };

}

/* ==========================================================
   Affichage de la randonnée
   ========================================================== */

function renderRandoDetails(r = app.prochaineRando) {

  setScreen(`
    <div class="screen screen--center">
      <p class="loading-text">Chargement des informations…</p>
    </div>
  `);

  const show = (rando) => {

    if (!rando) {

      screenRoot.innerHTML = `
        <div class="screen screen--center">
          <p class="alert alert--danger">
            Aucune randonnée disponible.
          </p>
        </div>
      `;

      return;
    }

    app.prochaineRando = rando;

    setTitle(
      isToday(rando.date)
        ? "Rando du jour"
        : "Prochaine randonnée"
    );

    /* ----------------------------
       Coordonnées GPS
    ----------------------------- */

    let mapsUrl = null;

    if (rando.gps) {

      const [lat, lng] = rando.gps
        .split(",")
        .map(v => parseFloat(v.trim()));

      if (!isNaN(lat) && !isNaN(lng)) {

        mapsUrl =
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      }

    }

    /* ----------------------------
       Informations générales
    ----------------------------- */

    const commune =
      rando.lieu?.commune ?? "Lieu inconnu";

    const pays =
      rando.lieu?.pays ?? null;

    const departement =
      rando.lieu?.departement ?? null;

    const accueil =
      rando.heureAccueil ??
      rando.lieu?.heureAccueil ??
      "Non précisée";

    const depart =
      rando.heureDepart ??
      rando.lieu?.heureDepart ??
      "Non précisée";

    const randoUrl = rando.url ?? null;

    /* ----------------------------
       Pilotes
    ----------------------------- */

    let pilotes = [];

    if (rando.pilotes) {

      pilotes = rando.pilotes
        .replace(/&amp;/g, "&")
        .replace(/^Proposé par\s*/i, "")
        .replace(/&/g, ",")
        .split(",")
        .map(p => p.trim())
        .filter(Boolean);

    }

    const tel0 = rando.telephones?.[0] ?? null;
    const tel1 = rando.telephones?.[1] ?? null;

    /* Le HTML commence dans le Bloc 6B */

    let html = `
      <div class="screen">

        <div class="detail-list">

           <div class="detail-row">
          <span class="detail-row__label">
            Date
          </span>

          <span class="detail-row__value">
            ${escapeHtml(rando.date ?? "Date inconnue")}
          </span>
        </div>

        <div class="detail-row">
          <span class="detail-row__label">
            Lieu
          </span>

          <span class="detail-row__value">
            ${escapeHtml(commune)}
          </span>
        </div>
`;

    if (pays && pays.toLowerCase() !== "france") {

      html += `

        <div class="detail-row">

          <span class="detail-row__label">

            Pays

          </span>

          <span class="detail-row__value">

            ${escapeHtml(pays)}

          </span>

        </div>

      `;

      if (departement) {

        html += `

          <div class="detail-row">

            <span class="detail-row__label">

              Département

            </span>

            <span class="detail-row__value">

              ${escapeHtml(departement)}

            </span>

          </div>

        `;

      }

    }

    html += `

        <div class="detail-row">

          <span class="detail-row__label">

            Heure d'accueil

          </span>

          <span class="detail-row__value">

            ${escapeHtml(accueil)}

          </span>

        </div>

        <div class="detail-row">

          <span class="detail-row__label">

            Heure de départ

          </span>

          <span class="detail-row__value">

            ${escapeHtml(depart)}

            ${randoUrl
              ? `<button
                    class="info-button"
                    title="Voir la page de la randonnée"
                    onclick="window.open('${randoUrl}','_blank')">
                    ⓘ
                 </button>`
              : ""}

          </span>

        </div>

    `;

    if (rando.rendezVous) {

      html += `

        <div class="detail-row">

          <span class="detail-row__label">

            Rendez-vous

          </span>

          <span class="detail-row__value">

            ${escapeHtml(rando.rendezVous)}

            ${mapsUrl
              ? `<button
                    class="info-button"
                    title="Ouvrir Google Maps"
                    onclick="window.open('${mapsUrl}','_blank')">
                    ⓟ
                 </button>`
              : ""}

          </span>

        </div>

      `;

    }

         /* ----------------------------
       Pilotes
    ----------------------------- */

    if (tel0) {

      html += `

        <div class="detail-row">

          <span class="detail-row__label">

            ${pilotes[0]
              ? "Proposé par " + escapeHtml(pilotes[0])
              : "Contact"}

          </span>

          <span class="detail-row__value">

            ${escapeHtml(tel0)}

            <button
              class="info-button"
              title="Appeler"
              onclick="window.location.href='tel:${tel0.replace(/\s/g,'')}'">

              ✆

            </button>

          </span>

        </div>

      `;

    }


    if (tel1) {

      html += `

        <div class="detail-row">

          <span class="detail-row__label">

            ${pilotes[1]
              ? "&nbsp;" + escapeHtml(pilotes[1])
              : ""}

          </span>

          <span class="detail-row__value">

            ${escapeHtml(tel1)}

            <button
              class="info-button"
              title="Appeler"
              onclick="window.location.href='tel:${tel1.replace(/\s/g,'')}'">

              ✆

            </button>

          </span>

        </div>

      `;

    }


    /* ----------------------------
       Boutons
    ----------------------------- */

    html += `

        </div>

        <div class="btn-row">

          <button
            id="btn-covoiturage-propose"
            class="btn btn--primary">

            Je propose un covoiturage

          </button>

          <button
            id="btn-covoiturage-recherche"
            class="btn btn--secondary">

            Je voudrais un covoiturage

          </button>

        </div>

      </div>

    `;

    screenRoot.innerHTML = html;


    /* ----------------------------
       Initialisation
    ----------------------------- */

    initCovoiturageModals();


    $("#btn-covoiturage-propose").onclick = () => {

      openModal("covoiturage-propose-modal");

    };


    $("#btn-covoiturage-recherche").onclick = () => {

      alert("Fonction en cours de développement.");

    };

       }; // fin de show()


  /* =====================================================
     Affichage d'une erreur
     ===================================================== */

  const showError = (message) => {

    screenRoot.innerHTML = `

      <div class="screen screen--center">

        <p class="alert alert--danger">

          ${escapeHtml(message)}

        </p>

        <button
          id="btn-retry"
          class="btn btn--primary">

          Réessayer

        </button>

      </div>

    `;

    $("#btn-retry").onclick = () => {

      renderRandoDetails();

    };

  };


  /* =====================================================
     Affichage ou chargement des données
     ===================================================== */

  if (r) {

    show(r);

    return;

  }


  fetchRandoDetails()

    .then((data) => {

      app.prochaineRando = data;

      show(data);

    })

    .catch((err) => {

      console.error(err);

      showError(

        "Impossible de charger les informations de la randonnée."

      );

    });

}   // ← fin de renderRandoDetails

/* ==========================================================
   Pages d'information
   ========================================================== */

function renderInfoPage(key) {

  const page = app.infoContent?.[key];

  if (!page) {

    setScreen(`
      <div class="screen screen--center">
        <p class="alert alert--danger">
          Contenu indisponible.
        </p>
      </div>
    `);

    return;

  }

  let html = `<div class="screen">`;

  for (const section of page.sections) {

    html += `
      <section class="info-section">

        <h3>${escapeHtml(section.heading)}</h3>
    `;

    /* ------------------------
       Liste simple
    ------------------------- */

    if (section.items) {

      html += "<ul>";

      section.items.forEach(item => {

        html += `<li>${escapeHtml(item)}</li>`;

      });

      html += "</ul>";

    }

    /* ------------------------
       Texte
    ------------------------- */

    if (section.text) {

      section.text.forEach(t => {

        if (typeof t === "string") {

          html += `
            <p class="info-text">
              ${escapeHtml(t)}
            </p>
          `;

        }

        else {

          let url = "#";

          if (t.url) {

            url = t.url;

          }

          else if (t.store_android || t.store_ios) {

            const ua = navigator.userAgent;

            if (/Android/i.test(ua))

              url = t.store_android;

            else

              url = t.store_ios;

          }

          html += `
            <p class="info-text">

              <a
                class="app-link"
                href="${url}"
                target="_blank"
                rel="noopener">

                ${escapeHtml(t.label)}

              </a>

            </p>
          `;

        }

      });

    }

    /* ------------------------
       Liens
    ------------------------- */

    if (section.links) {

      section.links.forEach(link => {

        let url = link.url;

        if (!url && (link.store_android || link.store_ios)) {

          const ua = navigator.userAgent;

          url =

            /Android/i.test(ua)

            ? link.store_android

            : link.store_ios;

        }

        html += `
          <p>

            <a
              class="info-link"
              href="${url}"
              target="_blank"
              rel="noopener">

              ${escapeHtml(link.label)}

            </a>

          </p>
        `;

      });

    }

    if (section.footer) {

      html += `
        <p class="info-footer">

          ${escapeHtml(section.footer)}

        </p>
      `;

    }

    html += `</section>`;

  }

  html += `</div>`;

  setScreen(html);

}

/* ==========================================================
   Navigation
   ========================================================== */

function navigate(screen, options = {}) {

  app.currentScreen = screen;

  showMain(
    options.showBack ?? false,
    options.title ?? "Rando's Lorraine",
    options.onBack
  );

  switch (screen) {

    case "inscription":
      return renderInscription();

    case "cotisation":
      return renderCotisation(
        options.prenom,
        options.nom,
        options.dateInscription
      );

    case "accueil":
      return renderAccueil(
        options.prenom,
        options.nom
      );

    case "carte":
      return renderCarte(
        options.prenom,
        options.nom
      );

    case "correction":
      return renderCorrection(
        options.prenom,
        options.nom,
        options.email,
        options.telephone
      );

    case "rando":
      return renderRandoDetails(
        app.prochaineRando
      );

    case "info":
      return renderInfoPage(
        options.infoKey
      );

    default:

      console.warn("Ecran inconnu :", screen);

      navigate("accueil", {
        prenom: app.user.prenom,
        nom: app.user.nom
      });

  }

}


/* ==========================================================
   Chargement initial
   ========================================================== */

async function checkUserAndStart() {

  try {

    const [info, rando] = await Promise.all([

      fetch("./data/info.json")
        .then(r => r.json()),

      fetchRandoDetails()

    ]);

    app.infoContent = info;
    app.prochaineRando = rando;

  }

  catch(e){

    console.error(e);

  }


  app.user = getUser();


  if (!app.user) {

    navigate("inscription", {

      title: "Inscription"

    });

    return;

  }


  if (needsCotisation(app.user.dateInscription)) {

    navigate("cotisation", {

      prenom: app.user.prenom,
      nom: app.user.nom,
      dateInscription: app.user.dateInscription,
      title: "Cotisation"

    });

    return;

  }


  navigate("accueil", {

    prenom: app.user.prenom,
    nom: app.user.nom,
    title: "Rando's Lorraine"

  });

}


/* ==========================================================
   Initialisation
   ========================================================== */

function init() {

  appBarBack.onclick = () => {

    if (typeof backHandler === "function") {

      backHandler();

    }

    else {

      navigate("accueil", {

        prenom: app.user.prenom,
        nom: app.user.nom

      });

    }

  };


  setTimeout(() => {

    splashEl.classList.add("hidden");

    checkUserAndStart();

  }, 600);

}


init();
