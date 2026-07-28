/* ============================================================
 * Randos Lorraine
 * app.js
 * Initialisation
 * ============================================================
 */

import {
    getUser,
    saveUser,
    needsCotisation,
    qrData
} from "./storage.js";

/* ============================================================
 * Constantes
 * ============================================================
 */

const VERSION = "2.0";

const API = {
    rando:
        "https://script.google.com/macros/s/xxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec"
};

const SCREENS = Object.freeze({
    HOME: "home",
    INFO: "info",
    RANDO: "rando",
    MAP: "map",
    PROFILE: "profile",
    CARPOOL: "carpool"
});

/* ============================================================
 * Variables globales
 * ============================================================
 */

let currentScreen = SCREENS.HOME;
let currentRando = null;

let historyStack = [];

let user = getUser();

let backHandler = null;

/* ============================================================
 * Raccourcis DOM
 * ============================================================
 */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => [...document.querySelectorAll(selector)];

const appTitle = $("#app-title");
const appBarBack = $("#app-back");
const main = $("#main");

/* ============================================================
 * Gestion de l'AppBar
 * ============================================================
 */

function setTitle(title) {
    appTitle.textContent = title;
}

function showBack(show = true) {
    appBarBack.hidden = !show;
}

function setBackHandler(handler = null) {
    backHandler = handler;
}

appBarBack.onclick = () => {

    if (backHandler) {
        backHandler();
        return;
    }

    history.back();

};

/* ============================================================
 * Navigation
 * ============================================================
 */

function navigate(screen, options = {}) {

    historyStack.push({
        screen,
        options
    });

    currentScreen = screen;

    switch (screen) {

        case SCREENS.HOME:
            renderAccueil();
            break;

        case SCREENS.INFO:
            renderInfoPage(options.infoKey);
            break;

        case SCREENS.RANDO:
            renderRando(options.id);
            break;

        case SCREENS.MAP:
            renderMap();
            break;

        case SCREENS.PROFILE:
            renderProfile();
            break;

        case SCREENS.CARPOOL:
            renderCarpool(options.id);
            break;

    }

}

/* ============================================================
 * Splash Screen
 * ============================================================
 */

function hideSplash() {

    const splash = $("#splash");

    if (splash)
        splash.remove();

}

/* ============================================================
 * Initialisation
 * ============================================================
 */

async function init() {

    hideSplash();

    await checkUserAndStart();

}

document.addEventListener("DOMContentLoaded", init);

/* ============================================================
 * AFFICHAGE PRINCIPAL
 * ============================================================
 */

function showMain(html) {

    main.innerHTML = html;

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });

}

/* ============================================================
 * QR CODE
 * ============================================================
 */

function renderQr(container, text, size = 180) {

    if (!container) return;

    container.innerHTML = "";

    new QRCode(container, {
        text,
        width: size,
        height: size,
        correctLevel: QRCode.CorrectLevel.M
    });

}

/* ============================================================
 * ACCUEIL
 * ============================================================
 */

function renderAccueil() {

    setTitle("Randos Lorraine");

    showBack(false);

    showMain(`
        <section class="home">

            <h2>Bienvenue ${user?.prenom ?? ""}</h2>

            <div id="qr-small" class="qr"></div>

            <div class="cards">

                <button id="btn-rando">
                    🥾 Randonnée
                </button>

                <button id="btn-carte">
                    🗺 Carte
                </button>

                <button id="btn-info">
                    ℹ Informations
                </button>

                <button id="btn-covoit">
                    🚗 Covoiturage
                </button>

                <button id="btn-profil">
                    👤 Mon profil
                </button>

            </div>

        </section>
    `);

    renderQr(
        $("#qr-small"),
        qrData(user),
        160
    );

    $("#btn-rando").onclick = () => navigate(SCREENS.RANDO);

    $("#btn-carte").onclick = () => navigate(SCREENS.MAP);

    $("#btn-info").onclick = () =>
        navigate(SCREENS.INFO, {
            infoKey: "avant-depart"
        });

    $("#btn-covoit").onclick = () =>
        navigate(SCREENS.CARPOOL);

    $("#btn-profil").onclick = () =>
        navigate(SCREENS.PROFILE);

}

/* ============================================================
 * PROFIL
 * ============================================================
 */

function renderProfile() {

    setTitle("Mon profil");

    showBack(true);

    showMain(`

        <section class="profile">

            <div id="qr-large"></div>

            <table class="profil">

                <tr>
                    <th>Nom</th>
                    <td>${user.nom}</td>
                </tr>

                <tr>
                    <th>Prénom</th>
                    <td>${user.prenom}</td>
                </tr>

                <tr>
                    <th>Email</th>
                    <td>${user.email}</td>
                </tr>

                <tr>
                    <th>Téléphone</th>
                    <td>${user.telephone}</td>
                </tr>

            </table>

        </section>

    `);

    renderQr(
        $("#qr-large"),
        qrData(user),
        260
    );

}

/* ============================================================
 * INFORMATIONS
 * ============================================================
 */

function renderInfoPage(key) {

    setTitle("Informations");

    showBack(true);

    const page = INFO_PAGES[key];

    if (!page) {

        showMain("<p>Contenu indisponible.</p>");

        return;

    }

    showMain(page);

}

/* ============================================================
 * PAGE EN COURS DE CHARGEMENT
 * ============================================================
 */

function renderLoading(message = "Chargement...") {

    showMain(`
        <div class="loading">

            <div class="spinner"></div>

            <p>${message}</p>

        </div>
    `);

}

