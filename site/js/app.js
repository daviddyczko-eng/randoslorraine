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

