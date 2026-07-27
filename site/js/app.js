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

