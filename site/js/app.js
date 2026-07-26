/* ==========================================================
   🚫 Désactivation du Service Worker
   ========================================================== */

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

/* ==========================================================
   📦 Import des modules
   ========================================================== */

import {
  getUser,
  saveUser,
  needsCotisation,
  qrData
} from "./storage.js";

/* ==========================================================
   🔧 Raccourci DOM
   ========================================================== */

const $ = (selector) => document.querySelector(selector);

/* ==========================================================
   📌 Références DOM
   ========================================================== */

const splashEl = $("#view-splash");
const mainEl = $("#view-main");
const screenRoot = $("#screen-root");

const appBarTitle = $("#app-bar-title");
const appBarBack = $("#btn-back");
const appBarIcon = $("#app-bar-icon");

/* ==========================================================
   🌍 Etat global de l'application
   ========================================================== */

const app = {

  user: null,

  prochaineRando: null,

  infoContent: null,

  currentScreen: null

};

/* ==========================================================
   🔤 Particules des noms
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

/* ==========================================================
   🚗 Etat du covoiturage
   ========================================================== */

const covoiturage = {

  places: 0,

  lieu: "",

  message: "",

  editing: false

};

/* ==========================================================
   🔤 Formatage des noms
   ========================================================== */

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

/* ==========================================================
   🔒 Protection HTML
   ========================================================== */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

}

/* ==========================================================
   📅 Date du jour ?
   ========================================================== */

function isToday(dateString) {

  if (!dateString) return false;

  const today = new Date();
  const date = new Date(dateString);

  return (

    today.getDate() === date.getDate() &&
    today.getMonth() === date.getMonth() &&
    today.getFullYear() === date.getFullYear()

  );

}

/* ==========================================================
   🔳 Affichage du QR Code
   ========================================================== */

function renderQr(container, text, size = 100) {

  container.innerHTML = "";

  const box = document.createElement("div");

  box.className =
    size > 120
      ? "qr-box qr-box--lg"
      : "qr-box";

  container.appendChild(box);

  new QRCode(box, {

    text,

    width: size,

    height: size,

    colorDark: "#3d7820",

    colorLight: "#ffffff",

    correctLevel: QRCode.CorrectLevel.M

  });

}

/* ==========================================================
   👤 Chargement utilisateur
   ========================================================== */

function loadUser() {

  app.user = getUser();

  return app.user;

}

/* ==========================================================
   💾 Sauvegarde utilisateur
   ========================================================== */

function storeUser(data) {

  saveUser(data);

  app.user = getUser();

}

/* ==========================================================
   📄 Changement d'écran
   ========================================================== */

function setScreen(html) {

  screenRoot.innerHTML = html;

}

/* ==========================================================
   🖥️ Barre d'application
   ========================================================== */

function showMain(title, showBack = false) {

  mainEl.classList.remove("hidden");

  appBarTitle.textContent = title;

  appBarBack.classList.toggle("hidden", !showBack);

  appBarIcon.classList.toggle("hidden", showBack);

}

/* ==========================================================
   ⬅️ Gestion du bouton Retour
   ========================================================== */

appBarBack.addEventListener("click", () => {

  switch (app.currentScreen) {

    case "carte":
      navigate("accueil");
      break;

    case "correction":
      navigate("carte");
      break;

    case "rando":
      navigate("accueil");
      break;

    case "info":
      navigate("accueil");
      break;

    default:
      navigate("accueil");

  }

});

/* ==========================================================
   🧭 Navigation
   ========================================================== */

function navigate(screen, options = {}) {

  app.currentScreen = screen;

  switch (screen) {

    case "inscription":

      showMain("Inscription");

      renderInscription();

      break;

    case "cotisation":

      showMain("Vérification de votre cotisation");

      renderCotisation(
        app.user.prenom,
        app.user.nom,
        app.user.dateInscription
      );

      break;

    case "accueil":

      showMain("Rando's Lorraine");

      renderAccueil(
        app.user.prenom,
        app.user.nom
      );

      break;

    case "carte":

      showMain("Ma carte", true);

      renderCarte(
        app.user.prenom,
        app.user.nom
      );

      break;

    case "correction":

      showMain("Corriger", true);

      renderCorrection(
        app.user.prenom,
        app.user.nom,
        app.user.email,
        app.user.telephone
      );

      break;

    case "rando":

      showMain(

        isToday(app.prochaineRando?.date)
          ? "Rando du jour"
          : "Prochaine randonnée",

        true

      );

      renderRandoDetails(app.prochaineRando);

      break;

    case "info":

      showMain(options.title ?? "Informations", true);

      renderInfoPage(options.infoKey);

      break;

    default:

      navigate("accueil");

  }

}

/* ==========================================================
   🌐 Chargement de la prochaine randonnée
   ========================================================== */

async function fetchRandoDetails() {

  if (!navigator.onLine) {

    const cache = localStorage.getItem("prochaineRando");

    if (cache) {

      app.prochaineRando = JSON.parse(cache);

      return app.prochaineRando;

    }

    throw new Error(
      "Aucune donnée disponible hors connexion."
    );

  }

  try {

    const response = await fetch(

      `https://randoslorraine.pages.dev/api/rando?ts=${Date.now()}`,

      {
        cache: "no-store",

        headers: {

          "Cache-Control": "no-cache",

          Pragma: "no-cache"

        }

      }

    );

    if (!response.ok) {

      throw new Error(

        `Erreur HTTP ${response.status}`

      );

    }

    const data = await response.json();

    app.prochaineRando = data;

    localStorage.setItem(

      "prochaineRando",

      JSON.stringify(data)

    );

    return data;

  }

  catch (error) {

    console.warn(

      "API indisponible, utilisation du cache.",

      error

    );

    const cache = localStorage.getItem("prochaineRando");

    if (cache) {

      app.prochaineRando = JSON.parse(cache);

      return app.prochaineRando;

    }

    throw error;

  }

}

/* ==========================================================
   🚀 Vérification au démarrage
   ========================================================== */

async function checkUserAndStart() {

  try {

    const [info, rando] = await Promise.all([

      fetch("./data/info.json").then((response) => {

        if (!response.ok) {
          throw new Error("Impossible de charger info.json");
        }

        return response.json();

      }),

      fetchRandoDetails().catch(() => null)

    ]);

    app.infoContent = info;
    app.prochaineRando = rando;

  }

  catch (error) {

    console.error(error);

    app.infoContent = {};
    app.prochaineRando = null;

  }

  loadUser();

  if (!app.user) {

    navigate("inscription");

    return;

  }

  if (!app.user.prenom ||
      !app.user.nom ||
      !app.user.dateInscription) {

    navigate("inscription");

    return;

  }

  if (needsCotisation(app.user.dateInscription)) {

    navigate("cotisation");

    return;

  }

  navigate("accueil");

}

/* ==========================================================
   🚀 Initialisation
   ========================================================== */

async function init() {

  splashEl.classList.remove("hidden");

  mainEl.classList.add("hidden");

  await checkUserAndStart();

  await new Promise((resolve) => {

    setTimeout(resolve, 500);

  });

  splashEl.classList.add("hidden");

  mainEl.classList.remove("hidden");

}

/* ==========================================================
   ▶️ Lancement
   ========================================================== */

init();

/* ==========================================================
   📝 Inscription
   ========================================================== */

function renderInscription() {

  setScreen(`
    <div class="screen">

      <p class="alert alert--danger">
        Tu dois être à jour de ta cotisation pour utiliser cette application.
      </p>

      <form id="form-inscription" class="form">

        <div class="field">
          <label>Prénom</label>
          <input id="prenom" required>
        </div>

        <div class="field">
          <label>Nom</label>
          <input id="nom" required>
        </div>

        <div class="field">
          <label>Adresse électronique</label>
          <input id="email"
                 type="email"
                 required>
        </div>

        <div class="field">
          <label>Téléphone</label>
          <input id="telephone"
                 type="tel"
                 placeholder="+33612345678"
                 required>
        </div>

        <div class="btn-row">

          <button
            type="button"
            class="btn btn--ghost"
            id="btn-quit">

            Quitter

          </button>

          <button
            type="submit"
            class="btn btn--primary">

            Valider

          </button>

        </div>

      </form>

    </div>
  `);

  $("#btn-quit").onclick = () =>
    alert("Fermez simplement cette fenêtre.");

  $("#form-inscription").onsubmit = (event) => {

    event.preventDefault();

    const prenom = formatName($("#prenom").value);

    const nom = formatName($("#nom").value);

    const email = $("#email").value.trim();

    const telephone = $("#telephone").value.trim();

    if (!/^\+\d{10,15}$/.test(telephone)) {

      alert(
        "Le téléphone doit être au format international."
      );

      return;

    }

    storeUser({

      prenom,

      nom,

      email,

      telephone,

      dateInscription: new Date().toISOString()

    });

    navigate("accueil");

  };

}

/* ==========================================================
   💳 Vérification cotisation
   ========================================================== */

function renderCotisation() {

  const year = new Date().getFullYear();

  setScreen(`
    <div class="screen">

      <div class="cotisation-box">

        <p>

          Je déclare être à jour de ma cotisation
          pour l'année ${year}.

        </p>

      </div>

      <div class="btn-row">

        <button
          class="btn btn--primary"
          id="btn-cotisation">

          Je confirme

        </button>

      </div>

    </div>
  `);

  $("#btn-cotisation").onclick = () => {

    storeUser({

      ...app.user,

      cotisationAnnee: year,

      tarif: 0

    });

    navigate("accueil");

  };

}

