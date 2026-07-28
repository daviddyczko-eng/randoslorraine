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

