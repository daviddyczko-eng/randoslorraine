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
