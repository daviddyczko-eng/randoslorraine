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

