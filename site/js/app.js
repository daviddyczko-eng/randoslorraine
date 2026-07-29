/* ============================================================
 * Randos Lorraine
 * app.js
 * Bloc 1 : Initialisation
 * ============================================================
 */

import {
    getUser,
    saveUser,
    needsCotisation,
    qrData
} from "./storage.js";

/* ============================================================
 * Désactivation du Service Worker (développement)
 * ============================================================
 */

if ("serviceWorker" in navigator) {

    navigator.serviceWorker.getRegistrations()
        .then(registrations => {

            registrations.forEach(reg => reg.unregister());

        });

}

if ("caches" in window) {

    caches.keys().then(keys => {

        keys.forEach(key => caches.delete(key));

    });

}

/* ============================================================
 * Constantes
 * ============================================================
 */

const $ = selector => document.querySelector(selector);

const $$ = selector => [...document.querySelectorAll(selector)];

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

/* ============================================================
 * Eléments du DOM
 * ============================================================
 */

const splashEl = $("#view-splash");
const mainEl = $("#view-main");

const screenRoot = $("#screen-root");

const appBarTitle = $("#app-bar-title");

const appBarBack = $("#btn-back");

const appBarIcon = $("#app-bar-icon");

/* ============================================================
 * Variables globales
 * ============================================================
 */

let currentUser = getUser();

let currentScreen = "accueil";

let currentRando = null;

let prochaineRando = null;

let infoContent = null;

let backHandler = null;

/* ============================================================
 * Utilitaires
 * ============================================================
 */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;");

}

function formatName(name="") {

    return name
        .trim()
        .split(/\s+/)
        .map(word=>{

            if(PARTICLES.includes(word.toLowerCase()))
                return word.toLowerCase();

            return word.charAt(0).toUpperCase() +
                   word.slice(1).toLowerCase();

        })
        .join(" ");

}

/* ============================================================
 * Affichage principal
 * ============================================================
 */

function showMain(showBack,title,onBack=null){

    screenRoot.replaceChildren();

    mainEl.classList.remove("hidden");

    appBarTitle.textContent=title;

    appBarBack.classList.toggle("hidden",!showBack);

    appBarIcon.classList.toggle("hidden",showBack);

    backHandler=onBack ?? (()=>{

        currentUser=getUser();

        navigate(
            "accueil",
            currentUser
        );

    });

}

/* ============================================================
 * Bouton Retour
 * ============================================================
 */

appBarBack.addEventListener("click",()=>{

    if(backHandler){

        backHandler();

        return;

    }

    history.back();

});

/* ============================================================
 * QR Code
 * ============================================================
 */

function renderQr(container,text,size=120){

    if(!container) return;

    container.replaceChildren();

    const qr=document.createElement("div");

    qr.className=size>120
        ?"qr-box qr-box--lg"
        :"qr-box";

    container.appendChild(qr);

    new QRCode(qr,{

        text,

        width:size,

        height:size,

        colorDark:"#3d7820",

        colorLight:"#ffffff",

        correctLevel:QRCode.CorrectLevel.M

    });

}

/* ============================================================
 * Chargement de la prochaine randonnée
 * ============================================================
 */

async function fetchRandoDetails(){

    const cache=localStorage.getItem("prochaineRando");

    if(!navigator.onLine){

        if(cache)
            return JSON.parse(cache);

        throw new Error("Mode hors ligne.");

    }

    const url=
        "https://randoslorraine.pages.dev/api/rando?v="+Date.now();

    try{

        const response=await fetch(url,{

            cache:"no-store"

        });

        if(!response.ok)
            throw new Error(response.status);

        const data=await response.json();

        localStorage.setItem(
            "prochaineRando",
            JSON.stringify(data)
        );

        prochaineRando=data;

        return data;

    }

    catch(err){

        if(cache){

            prochaineRando=JSON.parse(cache);

            return prochaineRando;

        }

        throw err;

    }

}

/* ============================================================
 * Navigation
 * ============================================================
 */

function navigate(screen, options = {}) {

    console.log("navigate →", screen, options);

    currentScreen = screen;

    currentUser = getUser();

    showMain(
        options.showBack ?? false,
        options.title ?? "Rando's Lorraine",
        options.onBack
    );

    screenRoot.replaceChildren();

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
            return renderRando(options.rando ?? prochaineRando);

        case "info":
            return renderInfoPage(options.infoKey);

        default:

            console.warn("Écran inconnu :", screen);

            return renderAccueil(
                currentUser?.prenom,
                currentUser?.nom
            );
    }

}

/* ============================================================
 * Ouverture application / Store
 * ============================================================
 */

function openAppOrStore(scheme, androidUrl, iosUrl) {

    if (!scheme && !androidUrl && !iosUrl) {

        alert("Application indisponible.");

        return;

    }

    const isAndroid =
        /Android|webOS|BlackBerry|IEMobile|Opera Mini/i
        .test(navigator.userAgent);

    if (scheme) {

        window.location.href = scheme;

        setTimeout(() => {

            if (isAndroid && androidUrl)
                window.location.href = androidUrl;

            else if (iosUrl)
                window.location.href = iosUrl;

        },500);

        return;

    }

    if (isAndroid && androidUrl)
        window.location.href = androidUrl;

    else if (iosUrl)
        window.location.href = iosUrl;

}

/* ============================================================
 * Chargement des données
 * ============================================================
 */

async function checkUserAndStart() {

    console.log("checkUserAndStart()");

    try{

        const [info,rando]=await Promise.all([

            fetch("./data/info.json")
            .then(r=>{

                if(!r.ok)
                    throw new Error(r.status);

                return r.json();

            }),

            fetchRandoDetails()

        ]);

        infoContent=info;

        prochaineRando=rando;

    }

    catch(err){

        console.error(err);

    }

    currentUser=getUser();

    if(
        !currentUser?.prenom ||
        !currentUser?.nom ||
        !currentUser?.dateInscription
    ){

        return{

            screen:"inscription",

            options:{

                title:"Inscription"

            }

        };

    }

    if(
        needsCotisation(
            currentUser.dateInscription
        )
    ){

        return{

            screen:"cotisation",

            options:{

                prenom:currentUser.prenom,

                nom:currentUser.nom,

                dateInscription:
                    currentUser.dateInscription,

                title:"Cotisation"

            }

        };

    }

    return{

        screen:"accueil",

        options:{

            prenom:currentUser.prenom,

            nom:currentUser.nom,

            title:"Rando's Lorraine"

        }

    };

}

/* ============================================================
 * Initialisation
 * ============================================================
 */

async function init(){

    console.log("Initialisation");

    const start=await checkUserAndStart();

    await new Promise(resolve=>setTimeout(resolve,500));

    splashEl.classList.add("hidden");

    navigate(
        start.screen,
        start.options
    );

}

init();

