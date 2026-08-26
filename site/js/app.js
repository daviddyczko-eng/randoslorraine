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

let listeParticipants = [];

let listeParticipantsRando = null;

/* ============================================================
 * Liste des participant·e·s
 * ============================================================
 */

/*
 * Statuts disponibles dans la liste déroulante.
 * L'ordre est volontairement celui demandé.
 */
const PARTICIPANT_STATUSES = [
    "Pilote",
    "Copilote",
    "Adhérent·e",
    "Invité·e 2 €",
    "Alsarando 2 €",
    "Adhésion 24 €",
    "Demi-tarif 12 €"
];

/*
 * Liste des participant·e·s de la randonnée en cours.
 *
 * Chaque participant sera enregistré sous la forme :
 *
 * {
 *     prenom: "Jean",
 *     nom: "Dupont",
 *     statut: "Adhérent·e"
 * }
 */
let participants = [];

/*
 * Informations de la randonnée utilisées
 * par la liste des participant·e·s.
 */
let participantsRando = {
    date: "",
    lieu: "",
    pilote: "",
    copilote: ""
};

/* ============================================================
 * Utilitaires
 * ============================================================
 */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
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
            return renderRandoDetails(options.rando ?? prochaineRando);

        case "participants":
            return renderParticipants();

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
 * Affichage de la randonnée
 * ============================================================ */

function renderRandoDetails(r = null) {

    console.log("renderRandoDetails()", r);

    screenRoot.replaceChildren();

    screenRoot.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="screen screen--center">
            <p class="loading-text">
                Chargement des informations…
            </p>
        </div>
        `
    );

    const show = (rando) => {

        console.log("Affichage randonnée", rando);

        if (!rando || typeof rando !== "object") {

            screenRoot.replaceChildren();

            screenRoot.insertAdjacentHTML(
                "afterbegin",
                `
                <div class="screen screen--center">
                    <p class="alert alert--danger">
                        Aucune randonnée disponible.
                    </p>
                </div>
                `
            );

            return;

        }

        const randoTitle =
            isToday(rando.date)
                ? "Rando du jour"
                : "Prochaine randonnée";

        appBarTitle.textContent = randoTitle;

        const randoUrl = rando.url ?? null;

        const [lat, lng] =
            (rando.gps ?? "")
                .split(",")
                .map(v => Number(v.trim()));

        const mapsUrl =
            Number.isFinite(lat) &&
            Number.isFinite(lng)

                ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

                : null;

        const commune =
            rando.lieu?.commune ??
            "Lieu inconnu";

        const pays =
            rando.lieu?.pays ?? null;

        const departement =
            rando.lieu?.departement ?? null;

        const accueil =
            rando.heureAccueil ??
            rando.lieu?.heureAccueil ??
            "Non précisée";

        const depart =
            rando.heureDepart ??
            rando.lieu?.heureDepart ??
            "Non précisée";

        const pilotes =
            (rando.pilotes ?? "")
                .replace(/&amp;/g, "&")
                .replace(/^Proposé par\s*/i, "")
                .replace(/&/g, ",")
                .split(",")
                .map(p => p.trim())
                .filter(Boolean);

        const telephones =
            rando.telephones ?? [];

        let html = `
<div class="screen">

<div class="detail-list">

<div class="detail-row">
<span class="detail-row__label">Date</span>
<span class="detail-row__value">
${escapeHtml(rando.date ?? "Date inconnue")}
</span>
</div>

<div class="detail-row">
<span class="detail-row__label">Lieu</span>
<span class="detail-row__value">
${escapeHtml(commune)}
</span>
</div>
`;

        if (pays && pays.toLowerCase() !== "france") {

            html += `
<div class="detail-row">
<span class="detail-row__label">
Pays
</span>

<span class="detail-row__value">
${escapeHtml(pays)}
</span>
</div>
`;

            if (departement) {

                html += `
<div class="detail-row">
<span class="detail-row__label">
Département
</span>

<span class="detail-row__value">
${escapeHtml(departement)}
</span>
</div>
`;

            }

        }

        html += `
<div class="detail-row">
<span class="detail-row__label">
Heure d'accueil
</span>

<span class="detail-row__value">
${escapeHtml(accueil)}
</span>
</div>

<div class="detail-row">

<span class="detail-row__label">
Heure de départ
</span>

<span class="detail-row__value">

${escapeHtml(depart)}

${
randoUrl
?
`<button
class="info-button"
onclick="window.open('${randoUrl}','_blank')"
title="Voir la randonnée">

ⓘ

</button>`
:
""
}

</span>

</div>
`;

                if (rando.rendezVous) {

            html += `
<div class="detail-row">

<span class="detail-row__label">
Rendez-vous
</span>

<span class="detail-row__value">

${escapeHtml(rando.rendezVous)}

${
mapsUrl
?
`<button
class="info-button"
onclick="window.open('${mapsUrl}','_blank')"
title="Ouvrir dans Google Maps">

ⓟ

</button>`
:
""
}

</span>

</div>
`;

        }

        telephones.forEach((tel,index)=>{

            const label =
                index===0
                ? (pilotes[0]
                    ? `Proposée par ${escapeHtml(pilotes[0])}`
                    : "Contact")
                : (pilotes[index]
                    ? `& ${escapeHtml(pilotes[index])}`
                    : "Contact");

            html += `
<div class="detail-row">

<span class="detail-row__label">

${label}

</span>

<span class="detail-row__value">

${escapeHtml(tel)}

<button
class="info-button"
onclick="window.location.href='tel:${tel.replace(/\s/g,"")}'"
title="Téléphoner">

✆

</button>

</span>

</div>
`;

        });

        html += `

</div>

<div class="btn-row">

<button
class="btn btn--primary"
id="btn-covoiturage-propose">

Je propose un covoiturage.

</button>

<button
class="btn btn--primary"
id="btn-covoiturage-recherche">

Je recherche un covoiturage.

</button>

</div>

</div>
`;

        screenRoot.replaceChildren();

        screenRoot.insertAdjacentHTML(
            "afterbegin",
            html
        );

        if (typeof initCovoiturageModals === "function") {

            initCovoiturageModals();

        }

        const btnPropose =
            $("#btn-covoiturage-propose");

        if (btnPropose) {

            btnPropose.addEventListener(
                "click",
                ()=>{

                    if(typeof openModal==="function"){

                        openModal(
                            "covoiturage-propose-modal"
                        );

                    }

                }
            );

        }

        const btnRecherche =
            $("#btn-covoiturage-recherche");

        if (btnRecherche) {

            btnRecherche.addEventListener(
                "click",
                ()=>{

                    if(typeof openModal==="function"){

                        openModal(
                            "covoiturage-recherche-modal"
                        );

                    }
                    else{

                        alert(
                            "Fonction en cours de développement."
                        );

                    }

                }
            );

        }

    };

    /* ============================================================
     * Gestion des erreurs
     * ============================================================ */

    const showError = (message) => {

        console.error("renderRandoDetails :", message);

        screenRoot.replaceChildren();

        screenRoot.insertAdjacentHTML(
            "afterbegin",
            `
            <div class="screen screen--center">

                <p class="alert alert--danger">

                    ${escapeHtml(message)}

                </p>

                <button
                    id="btn-retry"
                    class="btn btn--primary">

                    Réessayer

                </button>

            </div>
            `
        );

        const retry = $("#btn-retry");

        if (retry) {

            retry.addEventListener("click", () => {

                renderRandoDetails();

            });

        }

    };

    /* ============================================================
     * Chargement des données
     * ============================================================ */

    if (r && typeof r === "object") {

        prochaineRando = r;

        show(r);

        return;

    }

    fetchRandoDetails()

        .then((data) => {

            if (!data) {

                throw new Error(
                    "Aucune randonnée disponible."
                );

            }

            prochaineRando = data;

            show(data);

        })

        .catch((err) => {

            console.error(err);

            showError(
                "Impossible de charger les informations de la randonnée."
            );

        });

}

/* ============================================================
 * Page d'information
 * ============================================================ */

function renderInfoPage(key) {

    if (!infoContent) {

        screenRoot.replaceChildren();

        screenRoot.insertAdjacentHTML(
            "afterbegin",
            `
            <div class="screen">
                <p>Les informations ne sont pas disponibles.</p>
            </div>
            `
        );

        return;

    }

    const page = infoContent[key];

    if (!page) {

        screenRoot.replaceChildren();

        screenRoot.insertAdjacentHTML(
            "afterbegin",
            `
            <div class="screen">
                <p>Contenu indisponible.</p>
            </div>
            `
        );

        return;

    }

    const chooseStore = (obj) => {

        if (!obj) return "#";

        const ua = navigator.userAgent;

        if (/Android/i.test(ua))
            return obj.store_android ?? obj.url ?? "#";

        if (/iPad|iPhone|iPod/.test(ua))
            return obj.store_ios ?? obj.url ?? "#";

        return obj.url ??
               obj.store_android ??
               obj.store_ios ??
               "#";

    };

    let html = `<div class="screen">`;

    for (const section of page.sections ?? []) {

        html += `
<section class="info-section">

<h3>

${escapeHtml(section.heading)}

</h3>
`;

        /* ---------- Liste ---------- */

        if (section.items?.length) {

            html += "<ul>";

            section.items.forEach((item,index)=>{

                const link = section.links?.[index];

                if (!link) {

                    html += `<li>${escapeHtml(item)}</li>`;

                    return;

                }

                html += `
<li>

${escapeHtml(item)}

:

<a
href="${chooseStore(link)}"
target="_blank"
rel="noopener"
class="info-link">

${escapeHtml(link.label)}

</a>

</li>
`;

            });

            html += "</ul>";

        }

        /* ---------- Texte ---------- */

        if (section.text?.length) {

            section.text.forEach((t)=>{

                if (typeof t === "string") {

                    html += `
<p class="info-text">

${escapeHtml(t)}

</p>
`;

                    return;

                }

                html += `
<p class="info-text">

<a
href="${chooseStore(t)}"
target="_blank"
rel="noopener"
class="app-link">

${escapeHtml(t.label)}

</a>

</p>
`;

            });

        }

        /* ---------- Liens ---------- */

        if (section.links && !section.items) {

            section.links.forEach((l)=>{

                html += `
<p>

<a
href="${chooseStore(l)}"
target="_blank"
rel="noopener"
class="info-link">

${escapeHtml(l.label)}

</a>

</p>
`;

            });

        }

        if (section.footer) {

            html += `
<p class="info-footer">

${escapeHtml(section.footer)}

</p>
`;

        }

        html += `
</section>
`;

    }

    html += `
</div>
`;

    screenRoot.replaceChildren();

    screenRoot.insertAdjacentHTML(
        "afterbegin",
        html
    );

}

/* ============================================================
 * Gestion des modales de covoiturage
 * ============================================================ */

function openModal(id) {

    const modal = document.getElementById(id);

    if (!modal) {

        console.warn(`Modal "${id}" introuvable.`);
        return;

    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

}

function closeModal(id) {

    const modal = document.getElementById(id);

    if (!modal) {

        return;

    }

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");

}

function initCovoiturageModals() {

    document
        .querySelectorAll("[data-close-modal]")
        .forEach(btn => {

            btn.onclick = () => {

                const modal =
                    btn.closest(".modal");

                if (modal) {

                    closeModal(modal.id);

                }

            };

        });

    document
        .querySelectorAll(".modal")
        .forEach(modal => {

            modal.onclick = (e) => {

                if (e.target === modal) {

                    closeModal(modal.id);

                }

            };

        });

    document.onkeydown = (e) => {

        if (e.key !== "Escape") return;

        document
            .querySelectorAll(".modal")
            .forEach(modal => {

                if (!modal.classList.contains("hidden")) {

                    closeModal(modal.id);

                }

            });

    };

}

/* ============================================================
 * Fonctions utilitaires
 * ============================================================ */

/**
 * Retourne vrai si la date correspond à aujourd'hui.
 *
 * Formats acceptés :
 *   "Dimanche 30 août 2026"
 *   "Samedi 15 août 2026"
 *   "15/08/2026"
 *   "2026-08-15"
 *   Date(...)
 */
function isToday(dateValue) {

    if (!dateValue) {
        return false;
    }

    let d = null;

    /* ============================================================
     * Cas 1 : objet Date
     * ============================================================ */
    if (dateValue instanceof Date) {

        d = dateValue;
    }

    /* ============================================================
     * Cas 2 : chaîne de caractères
     * ============================================================ */
    else if (typeof dateValue === "string") {

        const value = dateValue.trim();

        /* --------------------------------------------------------
         * Format français :
         * "Dimanche 30 août 2026"
         * -------------------------------------------------------- */
        const frenchMatch = value.match(
            /^(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})\s+([a-zàâäéèêëîïôöùûüÿç]+)\s+(\d{4})$/i
        );

        if (frenchMatch) {

            const jour = Number(frenchMatch[1]);
            const moisNom = frenchMatch[2].toLowerCase();
            const annee = Number(frenchMatch[3]);

            const mois = {
                janvier: 0,
                février: 1,
                fevrier: 1,
                mars: 2,
                avril: 3,
                mai: 4,
                juin: 5,
                juillet: 6,
                août: 7,
                aout: 7,
                septembre: 8,
                octobre: 9,
                novembre: 10,
                décembre: 11,
                decembre: 11
            };

            if (Object.prototype.hasOwnProperty.call(mois, moisNom)) {

                d = new Date(
                    annee,
                    mois[moisNom],
                    jour
                );
            }
        }

        /* --------------------------------------------------------
         * Format "DD/MM/YYYY"
         * -------------------------------------------------------- */
        else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {

            const p = value.split("/");

            d = new Date(
                Number(p[2]),
                Number(p[1]) - 1,
                Number(p[0])
            );
        }

        /* --------------------------------------------------------
         * Format ISO "YYYY-MM-DD"
         * -------------------------------------------------------- */
        else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {

            const p = value.split("-");

            d = new Date(
                Number(p[0]),
                Number(p[1]) - 1,
                Number(p[2])
            );
        }
    }

    /* ============================================================
     * Date invalide
     * ============================================================ */
    if (!d || isNaN(d.getTime())) {
        return false;
    }

    /* ============================================================
     * Comparaison avec aujourd'hui
     * ============================================================ */

    const today = new Date();

    return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
    );
}

/* ============================================================
 * Ouvre un lien externe
 * ============================================================ */

function openExternal(url) {

    if (!url)
        return;

    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );

}

/* ============================================================
 * Téléphone
 * ============================================================ */

function callPhone(number) {

    if (!number)
        return;

    window.location.href =
        "tel:" + number.replace(/\s/g, "");

}

/* ============================================================
 * SMS
 * ============================================================ */

function sendSMS(number) {

    if (!number)
        return;

    window.location.href =
        "sms:" + number.replace(/\s/g, "");

}

/* ============================================================
 * Google Maps
 * ============================================================ */

function openMaps(lat, lng) {

    if (
        lat == null ||
        lng == null
    )
        return;

    const url =
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    openExternal(url);

}

function renderAccueil(prenom, nom) {
  const rando = prochaineRando;

  let dateText = "Aucune date disponible";
  let lieuText = "Lieu inconnu";
  let randoTitle = "Prochaine randonnée";

  if (rando && typeof rando === 'object') {
    dateText = rando.date || "Date inconnue";
    lieuText = (rando.lieu && rando.lieu.commune) ? rando.lieu.commune : "Lieu inconnu";

    // Vérifier si la date est aujourd'hui
    if (isToday(rando.date)) {
      randoTitle = "Rando du jour";
    }
  }

  screenRoot.innerHTML = `
    <div class="screen">
      <div class="card-list">
        <div class="home-card" id="btn-carte">
          <span class="home-card__title">Bonjour ${escapeHtml(prenom)} !</span>
          <div id="qr-small" style="display: inline-block; margin-left: 10px;"></div>
        </div>

        <div class="home-card" id="btn-rando">
          <span class="home-card__title">${escapeHtml(randoTitle)}</span>
          <span class="home-card__preview">
            ${escapeHtml(dateText)}<br>
            <small>${escapeHtml(lieuText)}</small>
          </span>
        </div>

        <div class="home-card" id="btn-participants">
          <span class="home-card__title">
            Liste des participant·e·s
          </span>
        </div>

        <div class="home-card" id="btn-info-avant">
          <span class="home-card__title">Avant le départ</span>
        </div>

        <div class="home-card" id="btn-info-accident">
          <span class="home-card__title">En cas d'accident</span>
        </div>

        <div class="home-card" id="btn-info-tarifs">
          <span class="home-card__title">Tout sur les tarifs</span>
        </div>

        <div class="home-card home-card--clickable" onclick="window.open('https://randoslorraine.org', '_blank')">
          <span class="home-card__title">Lien internet</span>
        </div>
      </div>
    </div>
  `;

  renderQr($("#qr-small"), qrData(prenom, nom), 60);

  // Écouteurs pour les boutons
  $("#btn-carte").addEventListener("click", () => {
    navigate("carte", { prenom, nom, title: "Ma carte Rando's Lorraine", showBack: true });
  });

  $("#btn-rando").addEventListener("click", () => {
    navigate("rando", {
      rando: prochaineRando,
      title: "Prochaine randonnée",
      showBack: true,
      onBack: () => {
        const user = getUser();
        navigate("accueil", { prenom: user.prenom, nom: user.nom });
      }
    });
  });

  $("#btn-participants").addEventListener("click", () => {
    navigate("participants", {
      title: "Liste des participant·e·s",
      showBack: true,
      onBack: () => {
        const user = getUser();
        navigate("accueil", {
          prenom: user.prenom,
          nom: user.nom
        });
      }
    });
  });
    
  $("#btn-info-avant").addEventListener("click", () => {
    navigate("info", {
      infoKey: "avant-depart",
      title: "Avant le départ",
      showBack: true,
      onBack: () => {
        const user = getUser();
        navigate("accueil", { prenom: user.prenom, nom: user.nom });
      }
    });
  });

  $("#btn-info-accident").addEventListener("click", () => {
    navigate("info", {
      infoKey: "accident",
      title: "En cas d'accident",
      showBack: true,
      onBack: () => {
        const user = getUser();
        navigate("accueil", { prenom: user.prenom, nom: user.nom });
      }
    });
  });

  $("#btn-info-tarifs").addEventListener("click", () => {
    navigate("info", {
      infoKey: "tarifs",
      title: "Tout sur les tarifs",
      showBack: true,
      onBack: () => {
        const user = getUser();
        navigate("accueil", { prenom: user.prenom, nom: user.nom });
      }
    });
  });
}

/* ============================================================
 * Debug
 * ============================================================ */

window.appDebug = {

    navigate,
    getUser,
    saveUser,
    fetchRandoDetails,
    renderAccueil,
    renderRandoDetails,
    renderCarte,
    renderInfoPage

};

console.log(
    "✅ app.js chargé correctement."
);

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
 * Liste des participant·e·s
 * ============================================================
 */

function renderParticipants() {

    console.log("Affichage de la liste des participant·e·s");
    
    const maintenant = new Date();
    
        const jours = [
        "Dimanche",
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi"
    ];

    const mois = [
        "janvier",
        "février",
        "mars",
        "avril",
        "mai",
        "juin",
        "juillet",
        "août",
        "septembre",
        "octobre",
        "novembre",
        "décembre"
    ];

    const dateParticipants =
        `${jours[maintenant.getDay()]} ` +
        `${String(maintenant.getDate()).padStart(2, "0")} ` +
        `${mois[maintenant.getMonth()]} ` +
        `${maintenant.getFullYear()}`;

    const rando = prochaineRando;

    /*
     * ------------------------------------------------------------
     * Date du jour au format :
     *
     * "Dimanche 25 août 2026"
     * ------------------------------------------------------------
     */

    const today = new Date();

    let dateAujourdHui =
        new Intl.DateTimeFormat("fr-FR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(today);

    /*
     * Première lettre en majuscule
     */
    dateAujourdHui =
        dateAujourdHui.charAt(0).toUpperCase() +
        dateAujourdHui.slice(1);


    /*
     * ------------------------------------------------------------
     * Vérification :
     *
     * Est-ce que la randonnée du JSON correspond à aujourd'hui ?
     * ------------------------------------------------------------
     */

    const randoDuJour =
        rando &&
        typeof rando === "object" &&
        isToday(rando.date);


    console.log(
        "Randonnée du jour :",
        randoDuJour
    );


    /*
     * ------------------------------------------------------------
     * Lieu
     *
     * Seulement prérempli si la randonnée du JSON
     * correspond à aujourd'hui.
     * ------------------------------------------------------------
     */

    let lieuInitial = "";

    if (randoDuJour) {

        lieuInitial =
            rando?.lieu?.commune ??
            "";

    }


    /*
     * ------------------------------------------------------------
     * Pilotes
     *
     * Seulement préremplis si la randonnée du JSON
     * correspond à aujourd'hui.
     * ------------------------------------------------------------
     */

let pilote1 = "";
let pilote2 = "";

/*
 * ------------------------------------------------------------
 * Récupération de l'utilisateur de l'application
 * ------------------------------------------------------------
 */

const user = getUser();

const userName =
    user?.prenom && user?.nom
        ? `${user.prenom} ${user.nom}`
        : "";


/*
 * ------------------------------------------------------------
 * Si la randonnée du JSON est celle d'aujourd'hui :
 *
 * Pilote    = premier pilote du JSON
 * Copilote  = deuxième pilote du JSON
 *
 * Sinon :
 *
 * Pilote    = utilisateur de l'application
 * Copilote  = vide
 * ------------------------------------------------------------
 */

if (randoDuJour && rando?.pilotes) {

    const pilotesText =
        String(rando.pilotes)
            .replace(/&amp;/g, "&")
            .replace(/^Proposé par\s*/i, "")
            .replace(/&/g, ",")
            .split(",")
            .map(p => p.trim())
            .filter(Boolean);

    pilote1 = pilotesText[0] ?? "";
    pilote2 = pilotesText[1] ?? "";

} else {

    pilote1 = userName;
    pilote2 = "";

}


console.log("Utilisateur :", userName);
console.log("Pilote :", pilote1);
console.log("Copilote :", pilote2);


    console.log("Date :", dateAujourdHui);
    console.log("Lieu :", lieuInitial);
    console.log("Pilote :", pilote1);
    console.log("Copilote :", pilote2);


    /*
     * ------------------------------------------------------------
     * Affichage
     * ------------------------------------------------------------
     */

    screenRoot.innerHTML = `

        <div class="screen">


            <!-- ==================================================
                 DATE
                 ================================================== -->

<div class="detail-row">

    <span class="detail-row__label">
        Date
    </span>

    <span class="detail-row__value participant-input-wrapper">

        <input
            type="text"
            id="participants-date"
            class="participant-input"
            value="${escapeHtml(dateParticipants)}"
            readonly
        >

        <button
            type="button"
            class="calendar-button"
            id="btn-calendrier"
            title="Choisir une date">
            ✐
        </button>

    </span>

</div>

            <!-- ==================================================
                 LIEU
                 ================================================== -->

<div class="detail-row">
    <span class="detail-row__label">
        Lieu
    </span>

    <span class="detail-row__value participant-input-wrapper">

        <input
            type="text"
            id="participants-lieu"
            class="participant-input"
            value="${escapeHtml(lieuInitial)}"
            placeholder="Lieu"
        >

    </span>
</div>


            <!-- ==================================================
                 PILOTE
                 ================================================== -->

<div class="detail-row">

    <span class="detail-row__label">
        Pilote
    </span>

    <span class="detail-row__value participant-input-wrapper">

        <input
            type="text"
            id="participants-pilote"
            class="participant-input"
            value="${escapeHtml(pilote1)}"
            placeholder="Prénom Nom"
            autocomplete="off"
        >

<button
    type="button"
    class="participant-delete-button"
    id="btn-supprimer-pilote"
    title="Supprimer le pilote">
    ✕
</button>

<button
    type="button"
    class="qr-scan-button"
    id="btn-scan-pilote"
    title="Scanner le QR code du pilote">
    ▣
</button>

    </span>

</div>

            <!-- ==================================================
                 COPILOTE
                 ================================================== -->

<div class="detail-row">

    <span class="detail-row__label">
        Copilote
    </span>

    <span class="detail-row__value participant-input-wrapper">

        <input
            type="text"
            id="participants-copilote"
            class="participant-input"
            value="${escapeHtml(pilote2)}"
            placeholder="Prénom Nom"
            autocomplete="off"
        >

<button
    type="button"
    class="participant-delete-button"
    id="btn-supprimer-copilote"
    title="Supprimer le copilote">
    ✕
</button>

<button
    type="button"
    class="qr-scan-button"
    id="btn-scan-copilote"
    title="Scanner le QR code du copilote">
    ▣
</button>

    </span>

</div>

            <!-- ==================================================
                 FORMULAIRE PARTICIPANT
                 ================================================== -->

<div class="participant-add-box">

    <!-- ==================================================
         LIGNE 1 : PRÉNOM / NOM
         ================================================== -->

    <div class="participant-add-row">

        <div class="participant-field participant-field--half">
            <label for="participant-prenom">
                Prénom
            </label>

            <input
                type="text"
                id="participant-prenom"
                class="participant-input"
                placeholder="Prénom"
                autocomplete="given-name"
            >
        </div>


        <div class="participant-field participant-field--half">
            <label for="participant-nom">
                Nom
            </label>

            <input
                type="text"
                id="participant-nom"
                class="participant-input"
                placeholder="Nom"
                autocomplete="family-name"
            >
        </div>

    </div>


    <!-- ==================================================
         LIGNE 2 : STATUT / AJOUTER / QR
         ================================================== -->

    <div class="participant-add-row participant-add-row--bottom">

        <div class="participant-field participant-field--status">
            <label for="participant-statut">
                Statut
            </label>

            <select
                id="participant-statut"
                class="participant-input">

                <option value="">
                    Choisir un statut
                </option>

                <option value="Pilote">
                    Pilote
                </option>

                <option value="Copilote">
                    Copilote
                </option>

                <option value="Adhérent·e">
                    Adhérent·e
                </option>

                <option value="Invité·e 2 €">
                    Invité·e 2 €
                </option>

                <option value="Alsarando 2 €">
                    Alsarando 2 €
                </option>

                <option value="Adhésion 24 €">
                    Adhésion 24 €
                </option>

                <option value="Demi-tarif 12 €">
                    Demi-tarif 12 €
                </option>

            </select>
        </div>


        <button
            type="button"
            class="btn btn--primary participant-add-button"
            id="btn-ajouter-participant">
            Ajouter
        </button>


        <button
            type="button"
            class="qr-scan-button participant-add-qr"
            id="btn-scan-qr"
            title="Scanner le QR code de l'adhérent·e">
            ▣
        </button>

    </div>

</div>

            <!-- ==================================================
                 LISTE
                 ================================================== -->

            <div
                id="participants-list"
                class="participants-list">
            </div>


            <!-- ==================================================
                 TOTAUX
                 ================================================== -->

            <div
                id="participants-totaux"
                class="participants-totaux">

                <p>
                    Nombre total de participant·e·s :
                    <strong id="participants-count">0</strong>
                </p>

                <p>
                    Somme perçue :
                    <strong id="participants-total">0 €</strong>
                </p>

            </div>


            <!-- ==================================================
                 BOUTONS
                 ================================================== -->

            <div class="btn-row">

                <button
                    type="button"
                    class="btn btn--primary"
                    id="btn-commentaire-participants">

                    Ajouter un commentaire

                </button>


                <button
                    type="button"
                    class="btn btn--primary"
                    id="btn-transmettre-participants">

                    Transmettre la liste

                </button>

            </div>

        </div>
    `;


    /*
     * ------------------------------------------------------------
     * QR CODE
     * ------------------------------------------------------------
     */

    const btnScan =
        $("#btn-scan-qrcode");

    if (btnScan) {

        btnScan.addEventListener("click", () => {

            alert(
                "Lecture du QR code : fonctionnalité à venir."
            );

        });

    }
    
/* ============================================================
 * QR code Pilote
 * ============================================================ */

$("#btn-scan-pilote").addEventListener("click", () => {

    ouvrirScannerQr("pilote");

});

/* ============================================================
 * QR code Copilote
 * ============================================================ */

$("#btn-scan-copilote").addEventListener("click", () => {

    ouvrirScannerQr("copilote");

});
 
/* ============================================================
 * Suppression du Pilote
 * ============================================================ */

$("#btn-supprimer-pilote").addEventListener("click", () => {

    $("#participants-pilote").value = "";

});

/* ============================================================
 * Suppression du Copilote
 * ============================================================ */

$("#btn-supprimer-copilote").addEventListener("click", () => {

    $("#participants-copilote").value = "";

});
    
    /*
     * ------------------------------------------------------------
     * BOUTON AJOUTER
     * ------------------------------------------------------------
     */

    const btnAjouter =
        $("#btn-ajouter-participant");

    if (btnAjouter) {

        btnAjouter.addEventListener("click", () => {

            const prenom =
                $("#participant-prenom")?.value.trim() ?? "";

            const nom =
                $("#participant-nom")?.value.trim() ?? "";

            const statut =
                $("#participant-statut")?.value ?? "";


            if (!prenom || !nom) {

                alert(
                    "Veuillez renseigner le prénom et le nom."
                );

                return;
            }


            if (!statut) {

                alert(
                    "Veuillez sélectionner un statut."
                );

                return;
            }


            console.log(
                "Participant à ajouter :",
                {
                    prenom,
                    nom,
                    statut
                }
            );


            alert(
                `${prenom} ${nom} ajouté(e) — ${statut}`
            );


            $("#participant-prenom").value = "";
            $("#participant-nom").value = "";
            $("#participant-statut").value = "";

        });

    }


    /*
     * ------------------------------------------------------------
     * BOUTON COMMENTAIRE
     * ------------------------------------------------------------
     */

    const btnCommentaire =
        $("#btn-commentaire-participants");

    if (btnCommentaire) {

        btnCommentaire.addEventListener("click", () => {

            alert(
                "Ajout d'un commentaire : fonctionnalité à venir."
            );

        });

    }


    /*
     * ------------------------------------------------------------
     * BOUTON TRANSMETTRE
     * ------------------------------------------------------------
     */

    const btnTransmettre =
        $("#btn-transmettre-participants");

    if (btnTransmettre) {

        btnTransmettre.addEventListener("click", () => {

            alert(
                "Transmission de la liste : fonctionnalité à venir."
            );

        });

    }
}

function renderInscription() {
  screenRoot.innerHTML = `
    <div class="screen">
      <p class="alert alert--danger">
        Tu dois être à jour de ta cotisation pour pouvoir utiliser cette application.
      </p>
      <form id="form-inscription" class="form">
        <div class="field">
          <label for="prenom">Prénom</label>
          <input id="prenom" required autocomplete="given-name">
        </div>
        <div class="field">
          <label for="nom">Nom</label>
          <input id="nom" required autocomplete="family-name">
        </div>
        <div class="field">
          <label for="email">Adresse de messagerie électronique</label>
          <input id="email" type="email" required autocomplete="email" placeholder="ex: votre@email.com">
        </div>
        <div class="field">
          <label for="telephone">Numéro de téléphone (format international)</label>
          <input id="telephone" type="tel" required autocomplete="tel" placeholder="ex: +33612345678">
        </div>
        <div class="btn-row">
          <button type="button" class="btn btn--ghost" id="btn-quit">Quitter l'application</button>
          <button type="submit" class="btn btn--primary">Valider mon inscription</button>
        </div>
      </form>
    </div>
  `;

  $("#btn-quit").addEventListener("click", () => {
    alert("Fermez l'onglet pour quitter.");
  });

  $("#form-inscription").addEventListener("submit", (e) => {
    e.preventDefault();
    console.log("Formulaire d'inscription soumis");

    const prenom = formatName($("#prenom").value);
    const nom = formatName($("#nom").value);
    const email = $("#email").value.trim();
    const telephone = $("#telephone").value.trim();
    const dateInscription = new Date().toISOString();

    // Validation du format du téléphone (optionnel)
    if (telephone && !/^\+\d{10,15}$/.test(telephone)) {
      alert("Le numéro de téléphone doit être au format international (ex: +33612345678).");
      return;
    }

    // Validation du format de l'email (optionnel)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("L'adresse e-mail n'est pas valide.");
      return;
    }

    console.log(`Prénom: ${prenom}, Nom: ${nom}, Email: ${email}, Téléphone: ${telephone}, Date: ${dateInscription}`);

    const success = saveUser({ prenom, nom, email, telephone, dateInscription });
    if (!success) {
      console.error("Échec de la sauvegarde de l'utilisateur.");
      alert("Une erreur est survenue. Veuillez réessayer.");
      return;
    }

    console.log("Navigation vers l'accueil...");
    navigate("accueil", { prenom, nom });
  });
}

function renderCotisation(prenom, nom, dateInscription) {
  const currentYear = new Date().getFullYear();
  screenRoot.innerHTML = `
    <div class="screen">
      <div class="cotisation-box">
        <p>Je déclare sur l'honneur que ma cotisation est à jour pour l'année ${currentYear}.</p>
      </div>
      <div class="btn-row">
        <button class="btn btn--primary" id="btn-cotisation-ok">Je confirme</button>
      </div>
    </div>
  `;

  $("#btn-cotisation-ok").addEventListener("click", () => {
    const user = getUser();
    saveUser({
      ...user,
      cotisationAnnee: currentYear,
      tarif: 0
    });
    navigate("accueil", { prenom, nom });
  });
}

function renderCarte(prenom, nom) {
  const user = getUser();
  const email = user?.email || "";
  const telephone = user?.telephone || "";

  screenRoot.innerHTML = `
    <div class="screen screen--center">
      <div id="qr-large"></div>
      <p class="carte-name">${escapeHtml(prenom)} ${escapeHtml(nom)}</p>
      <button class="btn btn--secondary" id="btn-corriger">Corriger</button>
    </div>
  `;

  renderQr($("#qr-large"), qrData(prenom, nom), 260);

  $("#btn-corriger").addEventListener("click", () => {
    navigate("correction", {
      prenom,
      nom,
      email,
      telephone,
      title: "Corriger mes données",
      showBack: true,
      onBack: () => navigate("accueil", { prenom, nom }),
    });
  });
}

function renderCorrection(prenom, nom, email = "", telephone = "") {
  screenRoot.innerHTML = `
    <div class="screen">
      <form id="form-correction" class="form">
        <div class="field">
          <label for="prenom">Prénom</label>
          <input id="prenom" value="${escapeHtml(prenom)}" required>
        </div>
        <div class="field">
          <label for="nom">Nom</label>
          <input id="nom" value="${escapeHtml(nom)}" required>
        </div>
        <div class="field">
          <label for="email">Adresse e-mail</label>
          <input id="email" type="email" value="${escapeHtml(email)}" required>
        </div>
        <div class="field">
          <label for="telephone">Numéro de téléphone (format international)</label>
          <input id="telephone" type="tel" value="${escapeHtml(telephone)}" required placeholder="+33612345678">
        </div>
        <button class="btn btn--primary btn--block">Valider</button>
      </form>
    </div>
  `;

  $("#form-correction").addEventListener("submit", (e) => {
    e.preventDefault();
    const newPrenom = formatName($("#prenom").value);
    const newNom = formatName($("#nom").value);
    const newEmail = $("#email").value.trim();
    const newTelephone = $("#telephone").value.trim();
    const user = getUser();

    saveUser({
      prenom: newPrenom,
      nom: newNom,
      email: newEmail,
      telephone: newTelephone,
      dateInscription: user?.dateInscription ?? new Date().toISOString(),
    });

    navigate("carte", {
      prenom: newPrenom,
      nom: newNom,
      title: "Ma carte Rando's Lorraine",
      showBack: true,
      onBack: () => navigate("accueil", { prenom: newPrenom, nom: newNom }),
    });
  });
}

/* ============================================================
 * Initialisation
 * ============================================================
 */

async function init(){

    console.log("Initialisation");

    const start=await checkUserAndStart();

    await new Promise(resolve=>setTimeout(resolve,200));

    splashEl.classList.add("hidden");

    navigate(
        start.screen,
        start.options
    );

}

init();
