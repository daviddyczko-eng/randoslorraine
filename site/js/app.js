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
