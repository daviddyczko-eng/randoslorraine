/* ============================================================
 * Randos Lorraine
 * app.js
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
 * Réinitialisation de l'application
 * ============================================================
 */
function afficherConfirmationReinitialisation() {
    /*
     * Création de la fenêtre
     */
    const overlay =
        document.createElement("div");
    overlay.className =
        "reset-overlay";
    overlay.innerHTML = `
        <div class="reset-modal">
            <div class="reset-modal__title">
                Réinitialiser l'application
            </div>
            <div class="reset-modal__message">
                Voulez-vous effacer toutes vos données
                personnelles de l'application ?
            </div>
            <div class="reset-modal__buttons">
                <button
                    type="button"
                    class="btn btn--cancel"
                    id="reset-non">
                    Non
                </button>
                <button
                    type="button"
                    class="btn btn--primary"
                    id="reset-oui">
                    Oui
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay
        .querySelector("#reset-non")
        .addEventListener("click", () => {
            overlay.remove();
        });
    overlay
        .querySelector("#reset-oui")
        .addEventListener("click", () => {
            reinitialiserApplication();
            overlay.remove();
        });
    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            overlay.remove();
        }
    });
}

/* ============================================================
 * Suppression de toutes les données personnelles
 * ============================================================
 */
function reinitialiserApplication() {
    console.log(
        "Réinitialisation de l'application"
    );
    localStorage.removeItem("randos_lorraine");
    localStorage.removeItem(
        "participantsWarningDisabled"
    );
    const clesASupprimer = [];
    for (
        let i = 0;
        i < localStorage.length;
        i++
    ) {
        const cle =
            localStorage.key(i);
        if (!cle) continue;
        if (
            cle.startsWith("participantsListe_")
        ) {
            clesASupprimer.push(cle);
        }
    }
    clesASupprimer.forEach(cle => {
        localStorage.removeItem(cle);
    });
    currentUser = null;
    participants = [];
    listeParticipants = [];
    listeParticipantsRando = null;
    participantsRando = {
        date: "",
        lieu: "",
        pilote: "",
        copilote: ""
    };
    navigate(
        "inscription",
        {
            title: "Inscription"
        }
    );
}

/* ============================================================
 * Bouton profil / réinitialisation
 * ============================================================
 */
appBarIcon.addEventListener("click", () => {
    if (currentScreen !== "accueil") {
        return;
    }
    afficherConfirmationReinitialisation();
});

/* ============================================================
 * Variables globales
 * ============================================================
 */
let currentUser = getUser();
let currentScreen = "accueil";
let currentRando = null;
let prochaineRando = null;

/* ============================================================
 * Covoiturage / Trésorerie
 * ============================================================
 */

const covoiturage = "+33616904093";
const tresorerie = "+33616904093";
let places = 1;
let etape = "";
let infoContent = null;
let backHandler = null;
let participantsWarningDisabled =
    localStorage.getItem("participantsWarningDisabled") === "true";
let listeParticipants = [];
let listeParticipantsRando = null;
let commentaire =
    localStorage.getItem("participantsCommentaire") || "";

/* ============================================================
 * Liste des participant·e·s
 * ============================================================
 */
const PARTICIPANT_STATUSES = [
    "Pilote",
    "Copilote",
    "Adhérent·e",
    "Invité·e 2 €",
    "Alsarando 2 €",
    "Payant 6 €",
    "Adhésion 24 €",
    "Demi-tarif 12 €"
];
let participants = [];
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
        case "participants-warning":
    renderParticipantsWarning();
    break;         
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
<div class="modal hidden" id="covoiturage-propose-modal" aria-hidden="true">
<div class="modal-content">
<div class="modal-header">Je propose un covoiturage</div>
<div class="modal-body">
<div class="modal-field">
<label for="covoiturage-places">Nombre de places proposées</label>
<select id="covoiturage-places">
${[1, 2, 3, 4, 5, 6].map(n =>
`<option value="${n}"${n === places ? " selected" : ""}>${n}</option>`
).join("")}
</select>
</div>
<div class="modal-field">
<label for="covoiturage-propose-etape">Lieu de rendez-vous pour le covoiturage</label>
<input id="covoiturage-propose-etape" type="text" placeholder="Ex : Nancy, parking de la gare">
</div>
</div>
<div class="modal-footer">
<button type="button" class="btn--cancel" data-close-modal>Annuler</button>
<button type="button" class="btn--confirm" id="btn-covoiturage-proposer">Proposer</button>
</div>
</div>
</div>
<div class="modal hidden" id="covoiturage-recherche-modal" aria-hidden="true">
<div class="modal-content">
<div class="modal-header">Je recherche un covoiturage</div>
<div class="modal-body">
<div class="modal-field">
<label for="covoiturage-recherche-etape">Lieu de rendez-vous souhaité pour le covoiturage</label>
<input id="covoiturage-recherche-etape" type="text" value="${escapeHtml(etape)}">
</div>
</div>
<div class="modal-footer">
<button type="button" class="btn--cancel" data-close-modal>Annuler</button>
<button type="button" class="btn--confirm" id="btn-covoiturage-demander">Demander</button>
</div>
</div>
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
                    const champEtape =
                        $("#covoiturage-recherche-etape");
                    if (champEtape) {
                        champEtape.value = etape;
                    }
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
        /* ============================================================
         * Bouton "Proposer"
         * ============================================================ */
        const btnProposer =
            $("#btn-covoiturage-proposer");
        if (btnProposer) {
            btnProposer.addEventListener(
                "click",
                () => {
                    const champPlaces =
                        $("#covoiturage-places");
                    const champEtape =
                        $("#covoiturage-propose-etape");
                    places = Number(champPlaces?.value) || 1;
                    etape = (champEtape?.value ?? "").trim();
                    const user = getUser();
                    const message =
`Je vous propose ${places} place(s) pour un covoiturage au départ de ${etape} pour la randonnée du ${rando.date ?? ""} à ${commune}. Si cela vous intéresse, merci de me contacter directement au ${user?.telephone ?? ""} ou via l'adresse ${user?.email ?? ""} pour nous mettre d'accord sur les détails (lieu précis du rendez-vous, heure, tarif).
${user?.prenom ?? ""} ${initialeNom(user?.nom)}
Merci`;
                    if (typeof closeModal === "function") {
                        closeModal("covoiturage-propose-modal");
                    }
                    sendSMSWithBody(covoiturage, message);
                }
            );
        }
        /* ============================================================
         * Bouton "Demander"
         * ============================================================ */
        const btnDemander =
            $("#btn-covoiturage-demander");
        if (btnDemander) {
            btnDemander.addEventListener(
                "click",
                () => {
                    const champEtape =
                        $("#covoiturage-recherche-etape");
                    etape = (champEtape?.value ?? "").trim();
                    const user = getUser();
                    const message =
`${user?.prenom ?? ""} ${initialeNom(user?.nom)} souhaite un covoiturage depuis ${etape} pour la randonnée du ${rando.date ?? ""} à ${commune}. Contact direct au ${user?.telephone ?? ""} ou via l'adresse ${user?.email ?? ""}
Merci par avance`;
                    if (typeof closeModal === "function") {
                        closeModal("covoiturage-recherche-modal");
                    }
                    sendSMSWithBody(covoiturage, message);
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
     * Fenêtre pour la transmission de la liste
     * ============================================================ */
function ouvrirFenetreTransmission() {
    const pilote = participants.find(participant => participant.statut === "Pilote");
    if (!pilote) {
        alert("Impossible de transmettre la liste : un pilote est obligatoire.");
        return;
    }
    const csv = creerCsvParticipants();
    const date = participants.length > 0 ? participants[0].date : "";
    // Extraire jour, mois, année pour le nom du fichier
    const dateParts = date.split(/\s+/);
    const day = dateParts[1]; // "26"
    const month = dateParts[2]; // "juillet"
    const year = dateParts[3]; // "2026"
    // Dictionnaire pour convertir les mois en numéros
    const moisEnNumeros = {
        "janvier": "01", "février": "02", "fevrier": "02", "mars": "03",
        "avril": "04", "mai": "05", "juin": "06", "juillet": "07",
        "août": "08", "aout": "08", "septembre": "09", "octobre": "10",
        "novembre": "11", "décembre": "12", "decembre": "12"
    };
    const monthNumber = moisEnNumeros[month.toLowerCase()] || "01";
    const dateForFilename = `${String(day).padStart(2, '0')}-${monthNumber}-${year}`;
    // Créer la fenêtre modale
    const overlay = document.createElement("div");
    overlay.className = "transmission-overlay";
    overlay.innerHTML = `
        <div class="transmission-modal">
            <div class="transmission-title">Liste à transmettre</div>
            <div class="transmission-info">
                <p>Veuillez valider le contenu du fichier CSV avant transmission :</p>
                <textarea class="transmission-csv-content" readonly>${escapeHtml(csv)}</textarea>
            </div>
            <div class="transmission-actions">
                <button type="button" class="btn btn--primary" id="transmission-download">
                    Télécharger le CSV (${dateForFilename}.csv)
                </button>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn--cancel" id="transmission-cancel">Annuler</button>
                <button type="button" class="btn btn--primary" id="transmission-validate">Valider la transmission</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    // Gérer le bouton Annuler
    overlay.querySelector("#transmission-cancel").addEventListener("click", () => {
        overlay.remove();
    });
    // Gérer le bouton Télécharger le CSV
    overlay.querySelector("#transmission-download").addEventListener("click", () => {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${dateForFilename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
    // Gérer le bouton Valider
    overlay.querySelector("#transmission-validate").addEventListener("click", () => {
        // Ouvrir le SMS en premier
        const message = `Bonjour, voici ci-joint la liste de la randonnée du ${date} à ${lieu}.`;
        sendSMSWithBody(tresorerie, message);
        // Télécharger le CSV après un léger délai (pour éviter les blocages)
        setTimeout(() => {
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${dateForFilename}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 500); // Délai de 500 ms
        overlay.remove();
    });
    // Fermer la fenêtre en cliquant en dehors
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            overlay.remove();
        }
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
 * SMS avec message pré-rédigé
 * ============================================================ */
function sendSMSWithBody(number, body) {
    if (!number)
        return;
    const cleanNumber = number.replace(/\s/g, "");
    const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !window.MSStream;
    const separator = isIOS ? "&" : "?";
    window.location.href =
        `sms:${cleanNumber}${separator}body=${encodeURIComponent(body)}`;
}
/* ============================================================
 * Initiale du nom (ex. "Dupont" → "D.")
 * ============================================================ */
function initialeNom(nom) {
    if (!nom)
        return "";
    return nom.trim().charAt(0).toUpperCase() + ".";
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


/* ============================================================
 * Fonction Page d'Accueil
 * ============================================================ */
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
  if (participantsWarningDisabled) {
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
  } else {
    navigate("participants-warning", {
      title: "Important",
      showBack: true,
      onBack: () => {
        const user = getUser();
        navigate("accueil", {
          prenom: user.prenom,
          nom: user.nom
        });
      }
    });
  }
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
 * Page d'avertissement - Liste des participant·e·s
 * ============================================================ */
function renderParticipantsWarning() {
    appBarTitle.textContent = "Important";
    screenRoot.innerHTML = `
        <div class="screen">
            <div class="alert alert--danger">
                <h2>Attention</h2>
                <p>
                    La liste des participant·e·s est sous la
                    responsabilité de la ou du pilote. Il est donc préférable
                    que ce soit cette personne qui l'établisse.
                    Si vous la faites, n'oubliez pas de l'en informer.
                    Merci
                </p>
            </div>
            <div class="warning-option">
                <label class="checkbox-label">
                    <input
                        type="checkbox"
                        id="participants-warning-checkbox"
                    >
                    <span>Ne plus afficher</span>
                </label>
            </div>
            <div class="btn-row">
                <button
                    type="button"
                    class="btn btn--primary"
                    id="btn-participants-warning-ok">
                    J'ai compris.
                </button>
            </div>
        </div>
    `;
    const checkbox = $("#participants-warning-checkbox");
    const button = $("#btn-participants-warning-ok");
    // Bouton "J'ai compris."
button.addEventListener("click", () => {
    if (checkbox.checked) {
        participantsWarningDisabled = true;
        localStorage.setItem(
            "participantsWarningDisabled",
            "true"
        );
    }
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
}

/* ============================================================
 * Calendrier des participants
 * ============================================================
 */
function ouvrirCalendrierParticipants(dateActuelle, onValidate) {
    const moisNoms = [
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
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    const dateMinimum = new Date(
        aujourdHui.getFullYear(),
        aujourdHui.getMonth() - 1,
        1
    );
    let dateSelectionnee = new Date(dateActuelle);
    if (isNaN(dateSelectionnee.getTime())) {
        dateSelectionnee = new Date(aujourdHui);
    }
    dateSelectionnee.setHours(0, 0, 0, 0);
    if (dateSelectionnee < dateMinimum) {
        dateSelectionnee = new Date(dateMinimum);
    }
    if (dateSelectionnee > aujourdHui) {
        dateSelectionnee = new Date(aujourdHui);
    }

    /*
     * ------------------------------------------------------------
     * Fenêtre
     * ------------------------------------------------------------
     */
    const overlay = document.createElement("div");
    overlay.className = "calendar-overlay";
    overlay.innerHTML = `
        <div class="calendar-modal">
            <div class="calendar-title">
                Choisir une date
            </div>
            <div class="calendar-wheels">
                <div class="calendar-wheel">
                    <label for="calendar-day">
                        Jour
                    </label>
                    <select id="calendar-day">
                    </select>
                </div>
                <div class="calendar-wheel">
                    <label for="calendar-month">
                        Mois
                    </label>
                    <select id="calendar-month">
                    </select>
                </div>
                <div class="calendar-wheel">
                    <label for="calendar-year">
                        Année
                    </label>
                    <select id="calendar-year">
                    </select>
                </div>
            </div>
            <div
                class="calendar-selected-date"
                id="calendar-selected-date">
            </div>
            <div class="calendar-buttons">
                <button
                    type="button"
                    class="btn btn--ghost"
                    id="calendar-cancel">
                    Annuler
                </button>
                <button
                    type="button"
                    class="btn btn--primary"
                    id="calendar-ok">
                    Valider
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    const daySelect =
        overlay.querySelector("#calendar-day");
    const monthSelect =
        overlay.querySelector("#calendar-month");
    const yearSelect =
        overlay.querySelector("#calendar-year");
    const selectedDateText =
        overlay.querySelector("#calendar-selected-date");
    /*
     * ------------------------------------------------------------
     * Années disponibles
     * En janvier :
     * année courante + année précédente.
     * ------------------------------------------------------------
     */
    const anneeMinimum =
        dateMinimum.getFullYear();
    const anneeMaximum =
        aujourdHui.getFullYear();
    for (
        let annee = anneeMinimum;
        annee <= anneeMaximum;
        annee++
    ) {
        const option =
            document.createElement("option");
        option.value = annee;
        option.textContent = annee;
        yearSelect.appendChild(option);
    }
    /*
     * ------------------------------------------------------------
     * Mois autorisés
     * ------------------------------------------------------------
     */
    function moisAutorises(annee) {
        const resultat = [];
        for (
            let mois = 0;
            mois < 12;
            mois++
        ) {
            const premierJour =
                new Date(annee, mois, 1);
            const dernierJour =
                new Date(annee, mois + 1, 0);
            if (
                dernierJour >= dateMinimum &&
                premierJour <= aujourdHui
            ) {
                resultat.push(mois);
            }
        }
        return resultat;
    }
    /*
     * ------------------------------------------------------------
     * Nombre de jours dans un mois
     * ------------------------------------------------------------
     */
    function nombreJoursDansMois(annee, mois) {
        return new Date(
            annee,
            mois + 1,
            0
        ).getDate();
    }
    /*
     * ------------------------------------------------------------
     * Mise à jour des molettes
     * ------------------------------------------------------------
     */
    function actualiserMolettes() {
        const annee =
            parseInt(yearSelect.value, 10);
        const moisAvant =
            parseInt(monthSelect.value, 10);
        const moisDisponibles =
            moisAutorises(annee);
        /*
         * --------------------------------------------------------
         * MOIS
         * --------------------------------------------------------
         */
        monthSelect.innerHTML = "";
        moisDisponibles.forEach(mois => {
            const option =
                document.createElement("option");
            option.value = mois;
            option.textContent =
                moisNoms[mois];
            monthSelect.appendChild(option);
        });
        /*
         * Conserver le mois si possible
         */
        if (
            moisDisponibles.includes(moisAvant)
        ) {
            monthSelect.value =
                moisAvant;
        }
        else {
            /*
             * Si le mois n'est plus disponible,
             * prendre le premier mois autorisé.
             */
            monthSelect.value =
                moisDisponibles[0];
        }
        const mois =
            parseInt(monthSelect.value, 10);
        /*
         * --------------------------------------------------------
         * JOURS
         * --------------------------------------------------------
         */
        const ancienJour =
            parseInt(daySelect.value, 10) ||
            dateSelectionnee.getDate();
        const nombreJours =
            nombreJoursDansMois(
                annee,
                mois
            );
        let jourMinimum = 1;
        let jourMaximum =
            nombreJours;
        /*
         * Limite inférieure
         */
        if (
            annee === dateMinimum.getFullYear() &&
            mois === dateMinimum.getMonth()
        ) {
            jourMinimum =
                dateMinimum.getDate();
        }
        /*
         * Limite supérieure
         */
        if (
            annee === aujourdHui.getFullYear() &&
            mois === aujourdHui.getMonth()
        ) {
            jourMaximum =
                aujourdHui.getDate();
        }
        daySelect.innerHTML = "";
        for (
            let jour = jourMinimum;
            jour <= jourMaximum;
            jour++
        ) {
            const option =
                document.createElement("option");
            option.value = jour;
            option.textContent =
                String(jour).padStart(2, "0");
            daySelect.appendChild(option);
        }
        /*
         * Conserver le jour si possible
         */
        if (
            ancienJour >= jourMinimum &&
            ancienJour <= jourMaximum
        ) {
            daySelect.value =
                ancienJour;
        }
        else if (
            ancienJour < jourMinimum
        ) {
            daySelect.value =
                jourMinimum;
        }
        else {
            daySelect.value =
                jourMaximum;
        }
        afficherDateSelectionnee();
    }
    /*
     * ------------------------------------------------------------
     * Affichage de la date sélectionnée
     * ------------------------------------------------------------
     */
    function afficherDateSelectionnee() {
        const jour =
            parseInt(daySelect.value, 10);
        const mois =
            parseInt(monthSelect.value, 10);
        const annee =
            parseInt(yearSelect.value, 10);
        const date =
            new Date(
                annee,
                mois,
                jour
            );
        const texte =
            new Intl.DateTimeFormat(
                "fr-FR",
                {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                }
            ).format(date);
        selectedDateText.textContent =
            texte.charAt(0).toUpperCase() +
            texte.slice(1);
    }
    /*
     * ------------------------------------------------------------
     * Initialisation
     * ------------------------------------------------------------
     */
    yearSelect.value =
        dateSelectionnee.getFullYear();
    actualiserMolettes();
    monthSelect.value =
        dateSelectionnee.getMonth();
    actualiserMolettes();
    daySelect.value =
        dateSelectionnee.getDate();
    afficherDateSelectionnee();
    /*
     * ------------------------------------------------------------
     * Événements
     * ------------------------------------------------------------
     */
    yearSelect.addEventListener(
        "change",
        actualiserMolettes
    );
    monthSelect.addEventListener(
        "change",
        actualiserMolettes
    );
    daySelect.addEventListener(
        "change",
        afficherDateSelectionnee
    );
    /*
     * ------------------------------------------------------------
     * Annuler
     * ------------------------------------------------------------
     */
    overlay.querySelector(
        "#calendar-cancel"
    ).addEventListener(
        "click",
        () => {
            overlay.remove();
        }
    );
    /*
     * ------------------------------------------------------------
     * Valider
     * ------------------------------------------------------------
 */
    overlay.querySelector(
        "#calendar-ok"
    ).addEventListener(
        "click",
        () => {
            const jour =
                parseInt(daySelect.value, 10);
            const mois =
                parseInt(monthSelect.value, 10);
            const annee =
                parseInt(yearSelect.value, 10);
            const dateFinale =
                new Date(
                    annee,
                    mois,
                    jour
                );
            dateFinale.setHours(
                0,
                0,
                0,
                0
            );
            /*
             * Sécurité
             */
            if (
                dateFinale < dateMinimum ||
                dateFinale > aujourdHui
            ) {
                alert(
                    "La date sélectionnée n'est pas autorisée."
                );
                return;
            }
            if (
                typeof onValidate === "function"
            ) {
                onValidate(dateFinale);
            }
            overlay.remove();
        }
    );
    /*
     * ------------------------------------------------------------
     * Cliquer en dehors
     * ------------------------------------------------------------
     */
    overlay.addEventListener(
        "click",
        event => {
            if (
                event.target === overlay
            ) {
                overlay.remove();
            }
        }
    );
}

/* ============================================================
 * Gestion locale de la liste des participant·e·s
 * ============================================================
 */
const PARTICIPANTS_STORAGE_KEY =
    "participantsListe";
function chargerParticipants() {
    try {
        const data =
            localStorage.getItem(
                PARTICIPANTS_STORAGE_KEY
            );
        if (!data) {
            return [];
        }
        const liste =
            JSON.parse(data);
        if (!Array.isArray(liste)) {
            return [];
        }
        return liste;
    }
    catch (err) {
        console.error(
            "Erreur de lecture des participants :",
            err
        );
        return [];
    }
}

/*
 * ------------------------------------------------------------
 * Sauvegarde de la liste
 * ------------------------------------------------------------
 */
function sauvegarderParticipants() {
    try {
        localStorage.setItem(
            PARTICIPANTS_STORAGE_KEY,
            JSON.stringify(participants)
        );
        console.log(
            "Liste des participants sauvegardée.",
            participants
        );
    }
    catch (err) {
        console.error(
            "Impossible de sauvegarder la liste :",
            err
        );
        alert(
            "Impossible d'enregistrer la liste dans la mémoire du téléphone."
        );
    }
}

/*
 * ------------------------------------------------------------
 * Normalisation d'un nom
 * ------------------------------------------------------------
 */
function normaliserNomParticipant(prenom, nom) {
    return (
        `${prenom} ${nom}`
    )
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

/*
 * ------------------------------------------------------------
 * Vérifier si une personne existe déjà
 * ------------------------------------------------------------
 */
function participantExiste(prenom, nom) {
    const cle =
        normaliserNomParticipant(
            prenom,
            nom
        );
    return participants.some(
        participant =>
            normaliserNomParticipant(
                participant.prenom,
                participant.nom
            ) === cle
    );
}

/*
 * ------------------------------------------------------------
 * Ordre des statuts
 * ------------------------------------------------------------
 */
function ordreStatut(statut) {
    const index =
        PARTICIPANT_STATUSES.indexOf(
            statut
        );
    return index === -1
        ? 999
        : index;
}

/*
 * ------------------------------------------------------------
 * Tri de la liste
 * 1. Statut
 * 2. Nom
 * 3. Prénom
 * ------------------------------------------------------------
 */
function trierParticipants() {
    participants.sort(
        (a, b) => {
            const statutA =
                ordreStatut(a.statut);
            const statutB =
                ordreStatut(b.statut);
            if (statutA !== statutB) {
                return statutA - statutB;
            }
            const nomA =
                `${a.nom} ${a.prenom}`
                    .toLocaleLowerCase(
                        "fr"
                    );
            const nomB =
                `${b.nom} ${b.prenom}`
                    .toLocaleLowerCase(
                        "fr"
                    );
            return nomA.localeCompare(
                nomB,
                "fr",
                {
                    sensitivity: "base"
                }
            );
        }
    );
}

/*
 * ------------------------------------------------------------
 * Création du CSV
 * ------------------------------------------------------------
 * Une ligne :
 * Date ; Lieu ; Statut ; Prénom Nom
 * ------------------------------------------------------------
 */
function creerCsvParticipants() {
    trierParticipants();
    const lignes = participants.map(participant => {
        // Appliquer formatName au prénom et au nom
        const prenomFormate = formatName(participant.prenom);
        const nomFormate = formatName(participant.nom);
        const nomComplet = `${prenomFormate} ${nomFormate}`;
        return [
            participant.date,
            participant.lieu,
            participant.statut,
            nomComplet
        ]
        .map(valeur => String(valeur ?? "").replace(/"/g, '""'))
        .map(valeur => `"${valeur}"`)
        .join(" ; ");
    });
    const date = participants.length > 0 ? participants[0].date : "";
    const lieu = participants.length > 0 ? participants[0].lieu : "";
    const ligneNombreParticipants = [
        `"${date.replace(/"/g, '""')}"`,
        `"${lieu.replace(/"/g, '""')}"`,
        `"Nombre de Participant·e·s"`,
        `"${participants.length}"`
    ].join(" ; ");
    const tarifs = {
        "Pilote": 0,
        "Copilote": 0,
        "Adhérent·e": 0,
        "Invité·e 2 €": 2,
        "Alsarando 2 €": 2,
        "Payant 6 €": 6,
        "Adhésion 24 €": 24,
        "Demi-tarif 12 €": 12
    };
    const sommePerçue = participants.reduce(
        (acc, participant) => acc + (tarifs[participant.statut] ?? 0),
        0
    );
    const ligneSommePerçue = [
        `"${date.replace(/"/g, '""')}"`,
        `"${lieu.replace(/"/g, '""')}"`,
        `"Somme perçue"`,
        `"${sommePerçue} €"`
    ].join(" ; ");
    const ligneCommentaire = [
        `"${date.replace(/"/g, '""')}"`,
        `"${lieu.replace(/"/g, '""')}"`,
        `"Commentaire"`,
        `"${commentaire.replace(/"/g, '""')}"`
    ].join(" ; ");
    return [
        ...lignes,
        ligneNombreParticipants,
        ligneSommePerçue,
        ligneCommentaire
    ].join("\n");
}

/*
 * ------------------------------------------------------------
 * Sauvegarde complète :
 * mémoire interne + CSV temporaire
 * ------------------------------------------------------------
 */
function enregistrerParticipants() {
    trierParticipants();
    sauvegarderParticipants();
    const csv =
        creerCsvParticipants();
    /*
     * Le CSV est également conservé en mémoire dans localStorage.
     */
    localStorage.setItem(
        "participantsCsv",
        csv
    );
    console.log(
        "CSV participants mis à jour :\n",
        csv
    );
}

/*
 * ------------------------------------------------------------
 * Formatage d'une date
 * ------------------------------------------------------------
 */
function formaterDateParticipant(date) {
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
    return (
        `${jours[date.getDay()]} ` +
        `${String(date.getDate()).padStart(2, "0")} ` +
        `${mois[date.getMonth()]} ` +
        `${date.getFullYear()}`
    );
}

/* ============================================================
 * Gestion du commentaire
 * ============================================================
 */
function ouvrirFenetreCommentaire() {
    /*
     * Création de la fenêtre
     */
    const overlay =
        document.createElement("div");
    overlay.className =
        "commentaire-overlay";
    overlay.innerHTML = `
        <div
            class="commentaire-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="commentaire-title">
            <div
                class="commentaire-title"
                id="commentaire-title">
                Commentaire
            </div>
            <textarea
                id="commentaire-input"
                class="commentaire-input"
                placeholder="Saisissez votre commentaire..."
                rows="6"
            >${escapeHtml(commentaire)}</textarea>
            <div class="calendar-buttons">
                <button
                    type="button"
                    class="btn btn--ghost"
                    id="commentaire-cancel">
                    Annuler
                </button>
                <button
                    type="button"
                    class="btn btn--primary"
                    id="commentaire-ok">
                    Valider le commentaire
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    const input =
        overlay.querySelector(
            "#commentaire-input"
        );
    /*
     * Donner automatiquement le focus
     */
    input.focus();
    /*
     * ------------------------------------------------------------
     * Annuler
     * ------------------------------------------------------------
     */
    overlay
        .querySelector("#commentaire-cancel")
        .addEventListener("click", () => {
            overlay.remove();
        });
    /*
     * ------------------------------------------------------------
     * Valider le commentaire
     * ------------------------------------------------------------
     */
    overlay
        .querySelector("#commentaire-ok")
        .addEventListener("click", () => {
            commentaire =
                input.value.trim();
            /*
             * Mémorisation dans le téléphone
             */
            localStorage.setItem(
                "participantsCommentaire",
                commentaire
            );
            /*
             * Fermer la fenêtre
             */
            overlay.remove();
            /*
             * Actualiser l'affichage
             */
            afficherCommentaire();
        });
    /*
     * ------------------------------------------------------------
     * Cliquer en dehors de la fenêtre
     * ------------------------------------------------------------
     */
    overlay.addEventListener(
        "click",
        event => {
            if (event.target === overlay) {
                overlay.remove();
            }
        }
    );
}

/* ============================================================
 * Affichage du commentaire
 * ============================================================
 */
function afficherCommentaire() {
    const zone = $("#participants-commentaire");
    if (!zone) return;
    if (!commentaire || !commentaire.trim()) {
        zone.innerHTML = "";
        return;
    }
    zone.innerHTML = `
        <div class="participants-commentaire-box">
            <strong>Commentaire :</strong>
            <p>
                ${escapeHtml(commentaire)}
            </p>
        </div>
    `;
}

/* ============================================================
 * Scanner QR code
 * ============================================================
 */
let qrScannerActif = null;
/*
 * Ouvre le scanner QR code.
 * type peut être :
 *   "pilote"
 *   "copilote"
 *   "participant"
 */
function ouvrirScannerQr(type) {
    /*
     * Vérification de la bibliothèque
     */
    if (typeof Html5Qrcode === "undefined") {
        alert(
            "Le lecteur QR code n'est pas disponible."
        );
        return;
    }
    /*
     * Création de la fenêtre de scan
     */
    const overlay =
        document.createElement("div");
    overlay.className =
        "qr-scanner-overlay";
    overlay.innerHTML = `
        <div class="qr-scanner-modal">
            <div class="qr-scanner-title">
                Scanner le QR code
            </div>
            <div
                id="qr-reader"
                class="qr-reader">
            </div>
            <p
                id="qr-scanner-message"
                class="qr-scanner-message">
                Présentez le QR code devant la caméra.
            </p>
            <button
                type="button"
                class="btn btn--ghost"
                id="qr-scanner-cancel">
                Annuler
            </button>
        </div>
    `;
    document.body.appendChild(overlay);
    const message =
        overlay.querySelector(
            "#qr-scanner-message"
        );
    /*
     * ------------------------------------------------------------
     * Fonction de fermeture
     * ------------------------------------------------------------
     */
    let fermetureEnCours = false;
    let dejaDetecte = false;
    async function fermerScanner() {
        if (fermetureEnCours)
            return;
        fermetureEnCours = true;
        /*
         * Arrêt du scanner
         */
        if (qrScannerActif) {
            try {
                await qrScannerActif.stop();
            }
            catch (e) {
                console.warn(
                    "Erreur lors de l'arrêt du scanner :",
                    e
                );
            }
            qrScannerActif = null;
        }
        /*
         * Suppression de la fenêtre
         */
        overlay.remove();
    }
    /*
     * Bouton Annuler
     */
    overlay
        .querySelector("#qr-scanner-cancel")
        .addEventListener(
            "click",
            fermerScanner
        );
    /*
     * Cliquer en dehors de la fenêtre
     */
    overlay.addEventListener(
        "click",
        event => {
            if (event.target === overlay) {
                fermerScanner();
            }
        }
    );
    /*

     * ------------------------------------------------------------
     * Traitement du QR code
     * ------------------------------------------------------------
     */
    async function qrCodeDetecte(decodedText) {
        /*
         * Empêche tout traitement d'une lecture ultérieure pendant que la fermeture est en cours (le lecteur
         * continue d'analyser des images tant qu'il n'est pas explicitement arrêté).
         */
            if (dejaDetecte) {
            return;
        }
        console.log(
            "QR code détecté :",
            decodedText
        );
        /*
         * Vérification du contenu
         * Le QR généré par storage.js est : "Prénom%20Nom%20RandosLorraine"
         */
        const suffixe =
            "%20RandosLorraine";
        if (
            typeof decodedText !== "string" ||
            !decodedText.endsWith(suffixe)
        ) {
            message.textContent =
                "Ce QR code n'est pas une carte Rando's Lorraine.";
            return;
        }
        /*
         * Suppression du suffixe
         */
        const nomComplet =
            decodedText
                .slice(
                    0,
                    -suffixe.length
                )
                .trim();
        if (!nomComplet) {
            message.textContent =
                "Impossible de lire le nom.";
            return;
        }
        /*
         * Séparation Prénom / Nom
         * On considère que le premier mot est le prénom et que tout ce qui suit constitue le nom.
         */
        const nomCompletDecode = decodeURIComponent(nomComplet);
        const morceaux = nomCompletDecode
                .split(/\s+/)
                .filter(Boolean);
        if (morceaux.length < 2) {
            message.textContent =
                "Le QR code ne contient pas un prénom et un nom valides.";
            return;
        }
        /*
         * Lecture valide : on verrouille immédiatement pour ignorer toute nouvelle image du même QR code, et on fige la caméra (image gelée) pendant la fermeture.
         */
        dejaDetecte = true;
        if (qrScannerActif) {
            try {
                await qrScannerActif.pause(true);
            }
            catch (e) {
                console.warn(
                    "Impossible de figer la caméra :",
                    e
                );
            }
        }
        const prenom =
            formatName(morceaux[0]);
        const nom =
            formatName(
                morceaux
                    .slice(1)
                    .join(" ")
            );
        /*
         * --------------------------------------------------------
         * PILOTE
         * --------------------------------------------------------
         */
        if (type === "pilote") {
            const champ =
                $("#participants-pilote");
            if (champ) {
                champ.value =
                    `${prenom} ${nom}`;
                champ.dispatchEvent(
                    new Event("change", { bubbles: true })
                );
            }
            message.textContent =
                `Pilote : ${prenom} ${nom}`;
        }
        /*
         * --------------------------------------------------------
         * COPILOTE
         * --------------------------------------------------------
         */
        else if (type === "copilote") {
            const champ =
                $("#participants-copilote");
            if (champ) {
                champ.value =
                    `${prenom} ${nom}`;
                champ.dispatchEvent(
                    new Event("change", { bubbles: true })
                );
            }
            message.textContent =
                `Copilote : ${prenom} ${nom}`;
        }
        /*
         * --------------------------------------------------------
         * PARTICIPANT
         * --------------------------------------------------------
         */
        else if (type === "participant") {
            const champPrenom =
                $("#participant-prenom");
            const champNom =
                $("#participant-nom");
            const champStatut =
                $("#participant-statut");
            if (champPrenom) {
                champPrenom.value =
                    prenom;
            }
            if (champNom) {
                champNom.value =
                    nom;
            }
            if (champStatut) {
                champStatut.value =
                    "Adhérent·e";
            }
            message.textContent =
                `${prenom} ${nom} — Adhérent·e`;

            const boutonAjouter =
                $("#btn-ajouter-participant");
            if (boutonAjouter) {
                boutonAjouter.click();
            }
        }
        /*
         * --------------------------------------------------------
         * Fermeture automatique
         * --------------------------------------------------------
         */
        setTimeout(
            fermerScanner,
            500
        );
    }

    /*
     * ------------------------------------------------------------
     * Création du lecteur
     * ------------------------------------------------------------
     */
    qrScannerActif =
        new Html5Qrcode("qr-reader");
    /*
     * Configuration de la caméra
     */
    const configuration = {
        fps: 10,
        qrbox: {
            width: 250,
            height: 250
        }
    };

    /*
     * Démarrage de la caméra arrière
     */
    qrScannerActif
        .start(
            {
                facingMode: "environment"
            },
            configuration,
            qrCodeDetecte,
            () => {
                /*
                 * Les erreurs de lecture sont normales pendant le scan. On ne les affiche donc pas.
                 */
            }
        )
        .catch(error => {
            console.error(
                "Impossible de démarrer le scanner QR :",
                error
            );
            message.textContent =
                "Impossible d'accéder à la caméra.";
            /*
             * On garde le bouton Annuler pour permettre à l'utilisateur de fermer la fenêtre.
             */
        });
}

/*
 * ============================================================
 * Fonction renderParticipants()
 * ============================================================
 */
function renderParticipants() {
    console.log(
        "Affichage de la liste des participant·e·s"
    );
    /*
     * ------------------------------------------------------------
     * Charger les données locales
     * ------------------------------------------------------------
     */
    participants =
        chargerParticipants();
        trierParticipants();
    /*
     * ------------------------------------------------------------
     * Date par défaut
     * ------------------------------------------------------------
     */
    const maintenant =
        new Date();
    maintenant.setHours(
        0,
        0,
        0,
        0
    );
    /*
     * ------------------------------------------------------------
     * Date affichée
     * ------------------------------------------------------------
     */
    let dateSelectionnee =
        new Date(maintenant);
    /*
     * Si une liste existe déjà, utiliser sa date.
     */
    if (
        participants.length &&
        participants[0].date
    ) {
        /*
         * Tentative de récupération de la date depuis la première ligne.
         */
        const dateTexte =
            participants[0].date;
        const match =
            dateTexte.match(
                /(\d{1,2})\s+([a-zàâäéèêëîïôöùûüÿç]+)\s+(\d{4})/i
            );
        if (match) {
            const moisMap = {
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
            const moisNumero =
                moisMap[
                    match[2].toLowerCase()
                ];
            if (
                moisNumero !== undefined
            ) {
                dateSelectionnee =
                    new Date(
                        Number(match[3]),
                        moisNumero,
                        Number(match[1])
                    );
            }
        }
    }
    /*
     * ------------------------------------------------------------
     * Randonnée du jour
     * ------------------------------------------------------------
     */
    const rando =
        prochaineRando;
    const randoDuJour =
        rando &&
        typeof rando === "object" &&
        isToday(rando.date);
    /*
     * ------------------------------------------------------------
     * Lieu
     * ------------------------------------------------------------
     */
    let lieuInitial = "";
    if (randoDuJour) {
        lieuInitial =
            rando?.lieu?.commune ??
            "";
    }
    /*
     * Si une liste existe déjà, conserver son lieu.
     */
    if (
        participants.length &&
        participants[0].lieu
    ) {
        lieuInitial =
            participants[0].lieu;
    }
    /*
     * ------------------------------------------------------------
     * Pilote / copilote
     * ------------------------------------------------------------
     */
    let pilote1 = "";
    let pilote2 = "";
    /*
     * Chercher dans la liste locale
     */
    const participantPilote =
        participants.find(
            participant =>
                participant.statut === "Pilote"
        );
    const participantCopilote =
        participants.find(
            participant =>
                participant.statut === "Copilote"
        );
    if (participantPilote) {
        pilote1 =
            `${participantPilote.prenom} ${participantPilote.nom}`;
    }
    if (participantCopilote) {
        pilote2 =
            `${participantCopilote.prenom} ${participantCopilote.nom}`;
    }
    /*
     * ------------------------------------------------------------
     * Si aucune liste locale : initialisation à partir du JSON / utilisateur
     * ------------------------------------------------------------
     */
    if (!participants.length) {
        const user =
            getUser();
        const userName =
            user?.prenom && user?.nom
                ? `${user.prenom} ${user.nom}`
                : "";
        if (
            randoDuJour &&
            rando?.pilotes
        ) {
            const pilotesText =
                String(rando.pilotes)
                    .replace(
                        /&amp;/g,
                        "&"
                    )
                    .replace(
                        /^Proposé par\s*/i,
                        ""
                    )
                    .replace(
                        /&/g,
                        ","
                    )
                    .split(",")
                    .map(
                        p => p.trim()
                    )
                    .filter(Boolean);
            pilote1 =
                pilotesText[0] ?? "";
            pilote2 =
                pilotesText[1] ?? "";
        }
        else {
            pilote1 =
                userName;
            pilote2 =
                "";
        }
    }
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
                        value="${escapeHtml(
                            formaterDateParticipant(
                                dateSelectionnee
                            )
                        )}"
                        readonly
                    >
                    <button
                        type="button"
                        class="calendar-button"
                        id="btn-calendrier"
                        title="Choisir une date">
                        🗒
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
                 AJOUT PARTICIPANT
                 ================================================== -->
            <div class="participant-add-box">
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
                            ${PARTICIPANT_STATUSES
                                .map(
                                    statut =>
                                        `<option value="${escapeHtml(statut)}">
                                            ${escapeHtml(statut)}
                                        </option>`
                                )
                                .join("")}
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
                    <strong id="participants-count">
                        0
                    </strong>
                </p>
                <p>
                    Somme perçue :
                    <strong id="participants-total">
                        0 €
                    </strong>
                </p>
                <div
    id="participants-commentaire"
    class="participants-commentaire">
</div>
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
     * ============================================================
     * AFFICHAGE DE LA LISTE
     * ============================================================
     */
    function afficherListeParticipants() {
    const liste =
        $("#participants-list");
    if (!liste) return;
    trierParticipants();
    if (!participants.length) {
        liste.innerHTML = "";
        actualiserTotaux();
        return;
    }
    liste.innerHTML =
        participants
            .map(
                (participant, index) => `
                    <div
                        class="participant-list-row"
                        data-index="${index}">
                        <span class="participant-list-name">
                            ${escapeHtml(
                                formatName(participant.prenom)
                            )}
                            ${escapeHtml(
                                formatName(participant.nom)
                            )}
                        </span>
                        <span class="participant-list-status">
                            ${escapeHtml(
                                participant.statut
                            )}
                        </span>
                        <button
                            type="button"
                            class="participant-delete-button"
                            data-delete-index="${index}"
                            title="Supprimer">
                            ✕
                        </button>
                    </div>
                `
            )
            .join("");
    /*
     * ------------------------------------------------------------
     * Boutons de suppression
     * ------------------------------------------------------------
     */
    liste
        .querySelectorAll(
            "[data-delete-index]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const index =
                        Number(
                            button.dataset.deleteIndex
                        );
                    /*
                     * Le pilote ne peut pas être supprimé s'il est le seul pilote.
                     */
                    if (
                        participants[index]?.statut ===
                        "Pilote"
                    ) {
                        alert(
                            "Il doit obligatoirement y avoir un pilote."
                        );
                        return;
                    }
                    participants.splice(
                        index,
                        1
                    );
                    enregistrerParticipants();
                    afficherListeParticipants();
                }
            );
        });
    actualiserTotaux();
    afficherCommentaire();
}
    /*
     * ============================================================
     * TOTAUX
     * ============================================================
     */
    function actualiserTotaux() {
        const count =
            $("#participants-count");
        const total =
            $("#participants-total");
        if (count) {
            count.textContent =
                participants.length;
    afficherCommentaire();
        }
        if (total) {
            const tarifs = {
                "Pilote": 0,
                "Copilote": 0,
                "Adhérent·e": 0,
                "Invité·e 2 €": 2,
                "Alsarando 2 €": 2,
                "Payant 6 €": 6,
                "Adhésion 24 €": 24,
                "Demi-tarif 12 €": 12
            };
            const somme =
                participants.reduce(
                    (acc, participant) =>
                        acc +
                        (
                            tarifs[
                                participant.statut
                            ] ?? 0
                        ),
                    0
                );
            total.textContent =
                `${somme} €`;
        }
    }
    /*
     * ============================================================
     * DATE
     * ============================================================
     */
    $("#btn-calendrier")
        .addEventListener(
            "click",
            () => {
                const champDate =
                    $("#participants-date");
                ouvrirCalendrierParticipants(
                    dateSelectionnee,
                    nouvelleDate => {
                        dateSelectionnee =
                            nouvelleDate;
                        champDate.value =
                            formaterDateParticipant(
                                nouvelleDate
                            );
                        /*
                         * Modifier la date de toutes les lignes existantes.
                         */
                        const nouvelleDateTexte =
                            formaterDateParticipant(
                                nouvelleDate
                            );
                        participants.forEach(
                            participant => {
                                participant.date =
                                    nouvelleDateTexte;
                            }
                        );
                        /*
                         * Sauvegarde immédiate
                         */
                        if (participants.length) {
                            enregistrerParticipants();
                        }
                        afficherListeParticipants();
                    }
                );
            }
        );
    /*
     * ============================================================
     * LIEU
     * Sauvegarde à chaque modification.
     * ============================================================
     */
    const champLieu =
        $("#participants-lieu");
    champLieu.addEventListener(
        "input",
        () => {
            participants.forEach(
                participant => {
                    participant.lieu =
                        champLieu.value.trim();
                }
            );
            if (participants.length) {
                enregistrerParticipants();
            }
        }
    );
    /*
     * ============================================================
     * PILOTE
     * ============================================================
     */
    const champPilote =
        $("#participants-pilote");
    champPilote.addEventListener(
        "change",
        () => {
            const valeur =
                champPilote.value.trim();
            if (!valeur) {
                alert(
                    "Il doit obligatoirement y avoir un pilote."
                );
                /*
                 * Restaurer l'ancien pilote.
                 */
                const ancienPilote =
                    participants.find(
                        participant =>
                            participant.statut ===
                            "Pilote"
                    );
                champPilote.value =
                    ancienPilote
                    ? `${ancienPilote.prenom} ${ancienPilote.nom}`
                    : "";
                return;
            }
            const morceaux =
                valeur.split(/\s+/);
            const prenom =
                morceaux.shift();
            const nom =
                morceaux.join(" ");
            if (!nom) {
                alert(
                    "Veuillez saisir le prénom et le nom du pilote."
                );
                return;
            }
            /*
             * Vérifier si cette personne existe déjà sous un autre statut.
             */
            const personneExistante =
                participants.find(
                    participant =>
                        normaliserNomParticipant(
                            participant.prenom,
                            participant.nom
                        ) ===
                        normaliserNomParticipant(
                            prenom,
                            nom
                        )
                );
            /*
             * Si elle existe déjà, elle devient pilote.
             */
            if (personneExistante) {
                /*
                 * Supprimer l'ancien pilote.
                 */
                participants =
                    participants.filter(
                        participant =>
                            participant.statut !==
                            "Pilote"
                    );
                personneExistante.statut =
                    "Pilote";
            }
            else {
                /*
                 * Supprimer l'ancien pilote.
                 */
                participants =
                    participants.filter(
                        participant =>
                            participant.statut !==
                            "Pilote"
                    );
                participants.push({
                    prenom,
                    nom,
                    statut: "Pilote",
                    date:
                        formaterDateParticipant(
                            dateSelectionnee
                        ),
                    lieu:
                        champLieu.value.trim()
                });
            }
            /*
             * Une même personne ne peut pas être simultanément copilote.
             */
            participants =
                participants.filter(
                    participant =>
                        !(
                            participant.statut ===
                            "Copilote" &&
                            normaliserNomParticipant(
                                participant.prenom,
                                participant.nom
                            ) ===
                            normaliserNomParticipant(
                                prenom,
                                nom
                            )
                        )
                );
            trierParticipants();
            enregistrerParticipants();
            afficherListeParticipants();
        }
    );
    /*
     * ============================================================
     * SUPPRESSION De l'affichage du PILOTE
     * ============================================================
     */
$("#btn-supprimer-pilote").addEventListener("click", () => {
    const champPilote = $("#participants-pilote");
    if (!champPilote) return;
    /*
     * Effacement du nom du pilote
     */
    champPilote.value = "";
    /*
     * Donner immédiatement le focus au champ pour faciliter la nouvelle saisie.
     */
    champPilote.focus();
});
    /*
     * ============================================================
     * COPILOTE
     * ============================================================
     */
    const champCopilote =
        $("#participants-copilote");
    champCopilote.addEventListener(
        "change",
        () => {
            const valeur =
                champCopilote.value.trim();
            /*
             * Suppression du copilote
             */
            if (!valeur) {
                participants =
                    participants.filter(
                        participant =>
                            participant.statut !==
                            "Copilote"
                    );
                enregistrerParticipants();
                afficherListeParticipants();
                return;
            }
            const morceaux =
                valeur.split(/\s+/);
            const prenom =
                morceaux.shift();
            const nom =
                morceaux.join(" ");
            if (!nom) {
                alert(
                    "Veuillez saisir le prénom et le nom du copilote."
                );
                return;
            }
            /*
             * Une personne ne peut pas être simultanément pilote et copilote.
             */
            const estPilote =
                participants.some(
                    participant =>
                        participant.statut === "Pilote" &&
                        normaliserNomParticipant(
                            participant.prenom,
                            participant.nom
                        ) ===
                        normaliserNomParticipant(
                            prenom,
                            nom
                        )
                );
            if (estPilote) {
                alert(
                    "Le pilote ne peut pas être également copilote."
                );
                return;
            }
            /*
             * Supprimer l'ancien copilote.
             */
            participants =
                participants.filter(
                    participant =>
                        participant.statut !==
                        "Copilote"
                );
            /*
             * Supprimer cette personne si elle existe déjà sous un autre statut.
             */
            participants =
                participants.filter(
                    participant =>
                        normaliserNomParticipant(
                            participant.prenom,
                            participant.nom
                        ) !==
                        normaliserNomParticipant(
                            prenom,
                            nom
                        )
                );
            /*
             * Ajouter le nouveau copilote.
             */
            participants.push({
                prenom,
                nom,
                statut: "Copilote",
                date:
                    formaterDateParticipant(
                        dateSelectionnee
                    ),
                lieu:
                    champLieu.value.trim()
            });
            trierParticipants();
            enregistrerParticipants();
            afficherListeParticipants();
        }
    );
    /*
     * ============================================================
     * SUPPRESSION DU COPILOTE
     * ============================================================
     */
    $("#btn-supprimer-copilote")
        .addEventListener(
            "click",
            () => {
                participants =
                    participants.filter(
                        participant =>
                            participant.statut !==
                            "Copilote"
                    );
                champCopilote.value =
                    "";
                enregistrerParticipants();
                afficherListeParticipants();
            }
        );
    /*
     * ============================================================
     * AJOUT D'UN PARTICIPANT
     * ============================================================
     */
    $("#btn-ajouter-participant")
        .addEventListener(
            "click",
            () => {
                const prenom =
                    $("#participant-prenom")
                        ?.value
                        .trim() ?? "";
                const nom =
                    $("#participant-nom")
                        ?.value
                        .trim() ?? "";
                const statut =
                    $("#participant-statut")
                        ?.value ?? "";
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
                /*
                 * ------------------------------------------------
                 * Pilote
                 * ------------------------------------------------
                 */
                if (
                    statut === "Pilote"
                ) {
                    champPilote.value =
                        `${prenom} ${nom}`;

                    champPilote.dispatchEvent(
                        new Event("change")
                    );
                    $("#participant-prenom").value =
                        "";
                    $("#participant-nom").value =
                        "";
                    $("#participant-statut").value =
                        "";
                    return;
                }
                /*
                 * ------------------------------------------------
                 * Copilote
                 * ------------------------------------------------
                 */
                if (
                    statut === "Copilote"
                ) {
                    champCopilote.value =
                        `${prenom} ${nom}`;
                    champCopilote.dispatchEvent(
                        new Event("change")
                    );
                    $("#participant-prenom").value =
                        "";
                    $("#participant-nom").value =
                        "";
                    $("#participant-statut").value =
                        "";
                    return;
                }
                /*
                 * ------------------------------------------------
                 * Vérifier les doublons
                 * ------------------------------------------------
                 */
                if (
                    participantExiste(
                        prenom,
                        nom
                    )
                ) {
                    alert(
                        "Cette personne figure déjà dans la liste."
                    );
                    return;
                }
                /*
                 * ------------------------------------------------
                 * Ajouter
                 * ------------------------------------------------
                 */
                participants.push({
                    prenom,
                    nom,
                    statut,
                    date:
                        formaterDateParticipant(
                            dateSelectionnee
                        ),
                    lieu:
                        champLieu.value.trim()
                });
                /*
                 * Tri + sauvegarde immédiate
                 */
                trierParticipants();
                enregistrerParticipants();
                afficherListeParticipants();
                /*
                 * Vider le formulaire
                 */
                $("#participant-prenom").value =
                    "";
                $("#participant-nom").value =
                    "";
                $("#participant-statut").value =
                    "";
            }
        );
/* ============================================================
 * QR code Pilote
 * ============================================================
 */
$("#btn-scan-pilote").addEventListener("click", () => {
    ouvrirScannerQr("pilote");
});
/* ============================================================
 * QR code Copilote
 * ============================================================
 */
$("#btn-scan-copilote").addEventListener("click", () => {
    ouvrirScannerQr("copilote");
});
/* ============================================================
 * QR code Participant
 * ============================================================
 */
$("#btn-scan-qr").addEventListener("click", () => {
    ouvrirScannerQr("participant");
});
    /*
     * ============================================================
     * COMMENTAIRE
     * ============================================================
     */
    $("#btn-commentaire-participants")
        .addEventListener(
            "click",
            () => {
                ouvrirFenetreCommentaire();
            }
        );
    /*
     * ============================================================
     * TRANSMISSION
     * ============================================================
     */
    $("#btn-transmettre-participants")
        .addEventListener(
            "click",
            () => {
                /*
                 * Avant transmission : vérifier qu'il existe bien un pilote.
                 */
                const pilote =
                    participants.find(
                        participant =>
                            participant.statut ===
                            "Pilote"
                    );
                if (!pilote) {
                    alert(
                        "Impossible de transmettre la liste : un pilote est obligatoire."
                    );
                    return;
                }
                enregistrerParticipants();
                ouvrirFenetreTransmission();
            }
        );
    /*
     * ============================================================
     * INITIALISATION DE LA LISTE
     * ============================================================
     */
    /*
     * Si aucune liste locale n'existe encore, créer automatiquement le pilote initial.
     */
    if (!participants.length && pilote1) {
        const morceaux =
            pilote1
                .trim()
                .split(/\s+/);
        if (morceaux.length >= 2) {
            participants.push({
                prenom:
                    morceaux.shift(),
                nom:
                    morceaux.join(" "),
                statut:
                    "Pilote",
                date:
                    formaterDateParticipant(
                        dateSelectionnee
                    ),
                lieu:
                    lieuInitial
            });
        }
    }
    /*
     * Ajouter le copilote initial si nécessaire.
     */
    if (
        !participants.some(
            participant =>
                participant.statut ===
                "Copilote"
        ) &&
        pilote2
    ) {
        const morceaux =
            pilote2
                .trim()
                .split(/\s+/);
        if (morceaux.length >= 2) {
            participants.push({
                prenom:
                    morceaux.shift(),
                nom:
                    morceaux.join(" "),
                statut:
                    "Copilote",
                date:
                    formaterDateParticipant(
                        dateSelectionnee
                    ),
                lieu:
                    lieuInitial
            });
        }
    }
    /*
     * Sauvegarde initiale.
     */
    if (participants.length) {
        enregistrerParticipants();
    }
    /*
     * Affichage final.
     */
    afficherListeParticipants();
/*
 * Afficher le commentaire mémorisé
 */
afficherCommentaire();
}

/*
* ============================================================
* INSCRIPTION A L'APPLICATION
* ============================================================
*/
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

/*
* ============================================================
* NOUVELLE COTISATION CHAQUE ANNEE
* ============================================================
*/
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

/*
* ============================================================
* GESTION DE LA CARTE D'ADHERENT.E
* ============================================================
*/
function renderCarte(prenom, nom) {
  const user = getUser();
  const email = user?.email || "";
  const telephone = user?.telephone || "";
  screenRoot.innerHTML = `
    <div class="screen screen--center">
      <div id="qr-large"></div>
      <p class="carte-name">${escapeHtml(prenom)} ${escapeHtml(nom)}</p>
      <button class="btn btn--primary" id="btn-corriger">Corriger</button>
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

/*
* ============================================================
* CORRECTION DE LA CARTE
* ============================================================
*/
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

/* ============================================================
 * Sécurité : fermeture des modales après restauration bfcache
 * ============================================================
 *
 * Sur certains navigateurs mobiles (Safari iOS notamment),
 * revenir sur l'application via le bouton "précédent" peut
 * restaurer visuellement le dernier état du DOM (y compris une
 * fenêtre modale ouverte au moment du départ) sans ré-exécuter
 * le JavaScript. On force donc leur fermeture à chaque
 * restauration.
 * ============================================================
 */
window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    document
        .querySelectorAll(".modal")
        .forEach(modal => {
            modal.classList.add("hidden");
            modal.setAttribute("aria-hidden", "true");
        });
});
