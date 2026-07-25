/* ==========================================================
   Rando's Lorraine
   app.js
   ========================================================== */

import { getUser, saveUser, needsCotisation, qrData } from "./storage.js";

/* ==========================================================
   Sélecteur DOM
   ========================================================== */

const $ = (selector) => document.querySelector(selector);

/* ==========================================================
   Eléments principaux
   ========================================================== */

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

    currentScreen: null,

    history: [],

    user: null,

    prochaineRando: null,

    infoContent: null

};

/* ==========================================================
   Barre de navigation
   ========================================================== */

function showMain(title = "Rando's Lorraine", showBack = false) {

    mainEl.classList.remove("hidden");

    appBarTitle.textContent = title;

    appBarBack.classList.toggle("hidden", !showBack);

    appBarIcon.classList.toggle("hidden", showBack);

}

/* ==========================================================
   Navigation
   ========================================================== */

function navigate(screen, options = {}, addToHistory = true) {

    if (addToHistory && app.currentScreen !== null) {

        app.history.push({
            screen: app.currentScreen,
            options: structuredClone(options)
        });

    }

    app.currentScreen = screen;

    screenRoot.innerHTML = "";

    switch (screen) {

        case "inscription":

            showMain("Inscription", false);
            renderInscription();
            break;

        case "cotisation":

            showMain("Cotisation", false);
            renderCotisation(
                options.prenom,
                options.nom,
                options.dateInscription
            );
            break;

        case "accueil":

            showMain("Rando's Lorraine", false);
            renderAccueil(
                options.prenom,
                options.nom
            );
            break;

        case "carte":

            showMain("Ma carte", true);
            renderCarte(
                options.prenom,
                options.nom
            );
            break;

        case "correction":

            showMain("Corriger", true);
            renderCorrection(
                options.prenom,
                options.nom,
                options.email,
                options.telephone
            );
            break;

        case "rando":

            showMain("Prochaine randonnée", true);
            renderRandoDetails(options.rando);
            break;

        case "info":

            showMain(options.title, true);
            renderInfoPage(options.infoKey);
            break;

        default:

            console.error("Écran inconnu :", screen);

    }

}

/* ==========================================================
   Retour arrière
   ========================================================== */

function goBack() {

    if (app.history.length === 0) {

        return;

    }

    const previous = app.history.pop();

    navigate(
        previous.screen,
        previous.options,
        false
    );

}

/* ==========================================================
   Utilitaires
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
        .map(word => {

            if (PARTICLES.includes(word.toLowerCase()))
                return word.toLowerCase();

            return word.charAt(0).toUpperCase() +
                   word.slice(1).toLowerCase();

        })
        .join(" ");

}

function escapeHtml(str) {

    return String(str)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;");

}

function renderQr(container,text,size=120){

    container.innerHTML="";

    const box=document.createElement("div");

    box.className=size>120
        ?"qr-box qr-box--lg"
        :"qr-box";

    container.appendChild(box);

    new QRCode(box,{
        text,
        width:size,
        height:size,
        colorDark:"#3d7820",
        colorLight:"#ffffff",
        correctLevel:QRCode.CorrectLevel.M
    });

}

function renderAccueil(prenom, nom) {

  const rando = app.prochaineRando;

  let dateText = "Aucune date disponible";
  let lieuText = "Lieu inconnu";
  let randoTitle = "Prochaine randonnée";

  if (rando && typeof rando === "object") {

    dateText = rando.date || "Date inconnue";

    lieuText =
      rando.lieu?.commune ||
      "Lieu inconnu";

    if (isToday(rando.date)) {
      randoTitle = "Rando du jour";
    }
  }

  screenRoot.innerHTML = `
    <div class="screen">

      <div class="card-list">

        <div class="home-card" id="btn-carte">
          <span class="home-card__title">
            Bonjour ${escapeHtml(prenom)} !
          </span>

          <div id="qr-small"></div>
        </div>

        <div class="home-card" id="btn-rando">

          <span class="home-card__title">
            ${escapeHtml(randoTitle)}
          </span>

          <span class="home-card__preview">
            ${escapeHtml(dateText)}<br>
            <small>${escapeHtml(lieuText)}</small>
          </span>

        </div>

        <div class="home-card" id="btn-info-avant">
          <span class="home-card__title">
            Avant le départ
          </span>
        </div>

        <div class="home-card" id="btn-info-accident">
          <span class="home-card__title">
            En cas d'accident
          </span>
        </div>

        <div class="home-card" id="btn-info-tarifs">
          <span class="home-card__title">
            Tout sur les tarifs
          </span>
        </div>

        <div
          class="home-card home-card--clickable"
          id="btn-site">

          <span class="home-card__title">
            Site internet
          </span>

        </div>

      </div>

    </div>
  `;

  renderQr(
    $("#qr-small"),
    qrData(prenom, nom),
    60
  );

  /* ================================
     Carte
     ================================ */

  $("#btn-carte").addEventListener("click", () => {

    navigate("carte", {
      prenom,
      nom
    });

  });

  /* ================================
     Prochaine randonnée
     ================================ */

  $("#btn-rando").addEventListener("click", () => {

    navigate("rando", {
      rando: app.prochaineRando
    });

  });

  /* ================================
     Avant le départ
     ================================ */

  $("#btn-info-avant").addEventListener("click", () => {

    navigate("info", {
      infoKey: "avant-depart",
      title: "Avant le départ"
    });

  });

  /* ================================
     Accident
     ================================ */

  $("#btn-info-accident").addEventListener("click", () => {

    navigate("info", {
      infoKey: "accident",
      title: "En cas d'accident"
    });

  });

  /* ================================
     Tarifs
     ================================ */

  $("#btn-info-tarifs").addEventListener("click", () => {

    navigate("info", {
      infoKey: "tarifs",
      title: "Tout sur les tarifs"
    });

  });

  /* ================================
     Site Internet
     ================================ */

  $("#btn-site").addEventListener("click", () => {

    window.open(
      "https://randoslorraine.org",
      "_blank"
    );

  });

}

