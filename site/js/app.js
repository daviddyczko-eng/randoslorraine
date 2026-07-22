/* -------------------------------------------------------
   🚫 Désactivation complète du Service Worker
------------------------------------------------------- */

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => {
      reg.unregister();
    });
  });
}

// 🔥 On supprime aussi l’ancienne rando stockée
localStorage.removeItem("prochaineRando");

import { getUser, saveUser, needsCotisation, qrData } from "./storage.js";

const $ = (sel) => document.querySelector(sel);

const splashEl = $("#view-splash");
const mainEl = $("#view-main");
const screenRoot = $("#screen-root");
const appBarTitle = $("#app-bar-title");
const appBarBack = $("#btn-back");
const appBarIcon = $("#app-bar-icon");

let currentScreen = null;
let backHandler = null;
let prochaineRando = null;
let infoContent = null;

/* -------------------------------------------------------
   🔤 Formatage du nom
------------------------------------------------------- */
const PARTICLES = ["de", "la", "du", "le", "les", "des", "d'", "l'", "von"];

function formatName(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (PARTICLES.includes(word.toLowerCase())) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* -------------------------------------------------------
   🖥️ Gestion des écrans
------------------------------------------------------- */
function showMain(showBack, title, onBack) {
  splashEl.classList.add("hidden");
  mainEl.classList.remove("hidden");
  appBarTitle.textContent = title;
  appBarBack.classList.toggle("hidden", !showBack);
  appBarIcon.classList.toggle("hidden", showBack);
  backHandler = onBack || null;
}

/* -------------------------------------------------------
   🔳 QR Code
------------------------------------------------------- */
function renderQr(container, text, size = 100) {
  container.innerHTML = "";
  const box = document.createElement("div");
  box.className = size > 120 ? "qr-box qr-box--lg" : "qr-box";
  container.appendChild(box);
  new QRCode(box, {
    text,
    width: size,
    height: size,
    colorDark: "#3d7820",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M,
  });
}

/* -------------------------------------------------------
   🌐 API Rando (cache contourné)
------------------------------------------------------- */
async function fetchRandoDetails() {
  // 1️⃣ Vérifier si on est hors ligne
  if (!navigator.onLine) {
    const saved = localStorage.getItem("prochaineRando");
    if (saved) {
      console.log("Hors ligne : chargement des données depuis localStorage.");
      return JSON.parse(saved);
    } else {
      throw new Error("Aucune donnée disponible hors-ligne.");
    }
  }

  try {
    // 2️⃣ Essayer de charger depuis l'API Cloudflare Worker
    const res = await fetch(
      "https://randoslorraine.pages.dev/api/rando?ts=" + Date.now(),
      {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      }
    );

    if (!res.ok) {
      throw new Error(`Erreur HTTP ${res.status}`);
    }

    const data = await res.json();

    // 3️⃣ Sauvegarder dans localStorage pour une utilisation hors ligne
    localStorage.setItem("prochaineRando", JSON.stringify(data));
    console.log("Données sauvegardées dans localStorage.");

    return data;

  } catch (apiError) {
    console.warn("L'API a échoué, tentative de chargement depuis localStorage...", apiError);

    // 4️⃣ Fallback : Charger depuis localStorage
    const saved = localStorage.getItem("prochaineRando");
    if (saved) {
      console.log("Fallback : données chargées depuis localStorage.");
      return JSON.parse(saved);
    } else {
      throw new Error("Aucune donnée disponible (ni en ligne, ni hors ligne).");
    }
  }
}

/* -------------------------------------------------------
   📄 Navigation
------------------------------------------------------- */
function navigate(screen, options = {}) {
  currentScreen = screen;
  showMain(options.showBack ?? false, options.title ?? "Rando's Lorraine", options.onBack);

  switch (screen) {
    case "inscription":
      return renderInscription();
    case "cotisation":
      return renderCotisation(options.prenom, options.nom, options.dateInscription);
    case "accueil":
      return renderAccueil(options.prenom, options.nom);
    case "carte":
      return renderCarte(options.prenom, options.nom);
    case "correction":
      return renderCorrection(options.prenom, options.nom);
    case "rando":
      return renderRandoDetails(options.rando);
    case "info":
      return renderInfoPage(options.infoKey);
  }
}

/* -------------------------------------------------------
   📝 Inscription
------------------------------------------------------- */
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
        <div class="btn-row">
          <button type="button" class="btn btn--ghost" id="btn-quit">Quitter l'application</button>
          <button type="submit" class="btn btn--primary">Valider mon inscription</button>
        </div>
      </form>
    </div>
  `;

  $("#btn-quit").addEventListener("click", () => alert("Fermez l'onglet pour quitter."));

  $("#form-inscription").addEventListener("submit", (e) => {
    e.preventDefault();
    const prenom = formatName($("#prenom").value);
    const nom = formatName($("#nom").value);
    const dateInscription = new Date().toISOString();
    saveUser({ prenom, nom, dateInscription });
    navigate("accueil", { prenom, nom });
  });
}

/* -------------------------------------------------------
   🗺️ Carte
------------------------------------------------------- */
function renderCarte(prenom, nom) {
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
      title: "Corriger",
      showBack: true,
      onBack: () => navigate("carte", { prenom, nom }),
    });
  });
}

/* -------------------------------------------------------
   ✏️ Correction
------------------------------------------------------- */
function renderCorrection(prenom, nom) {
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
        <button class="btn btn--primary btn--block">Valider</button>
      </form>
    </div>
  `;

  $("#form-correction").addEventListener("submit", (e) => {
    e.preventDefault();
    const newPrenom = formatName($("#prenom").value);
    const newNom = formatName($("#nom").value);
    const user = getUser();

    saveUser({
      prenom: newPrenom,
      nom: newNom,
      dateInscription: user?.dateInscription ?? new Date().toISOString(),
    });

    navigate("carte", {
      prenom: newPrenom,
      nom: newNom,
      title: "Ma carte",
      showBack: true,
      onBack: () => navigate("accueil", { prenom: newPrenom, nom: newNom }),
    });
  });
}

/* -------------------------------------------------------
   🥾 Détails de la rando
------------------------------------------------------- */
function renderRandoDetails(r) {
  screenRoot.innerHTML = `
    <div class="screen screen--center">
      <p class="loading-text">Chargement des informations…</p>
    </div>
  `;

  const show = (rando) => {
    // Vérifie que rando est un objet valide
    if (!rando || typeof rando !== 'object') {
      screenRoot.innerHTML = `
        <div class="screen screen--center">
          <p class="alert alert--danger">Aucune donnée de randonnée disponible.</p>
        </div>
      `;
      return;
    }

    // Extraire les coordonnées GPS
    let lat, lng;
    if (rando.gps) {
      const coords = rando.gps.split(',').map(coord => parseFloat(coord.trim()));
      lat = coords[0];
      lng = coords[1];
    }

    const mapsUrl = lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;

    // Extraire les téléphones
    const tel0 = (rando.telephones && rando.telephones[0]) ? rando.telephones[0] : null;
    const tel1 = (rando.telephones && rando.telephones[1]) ? rando.telephones[1] : null;

    // Extraire les informations de lieu
    const commune = (rando.lieu && rando.lieu.commune) ? rando.lieu.commune : "Lieu inconnu";
    const pays = (rando.lieu && rando.lieu.pays) ? rando.lieu.pays : null;
    const departement = (rando.lieu && rando.lieu.departement) ? rando.lieu.departement : null;

    // Extraire les heures
    const accueil = rando.heureAccueil || rando.lieu?.heureAccueil || "Heure d'accueil non spécifiée";
    const depart = rando.heureDepart || rando.lieu?.heureDepart || "Heure de départ non spécifiée";

    // Construire le HTML
    let html = `
      <div class="screen">
        <div class="detail-list">
          <div class="detail-row"><span>Date</span><span>${escapeHtml(rando.date || "Date inconnue")}</span></div>
          <div class="detail-row"><span>Lieu</span><span>${escapeHtml(commune)}</span></div>
    `;

    // ✅ NOUVEAU : Afficher Pays et Département UNIQUEMENT si Pays ≠ "France"
    if (pays && pays.toLowerCase() !== "france") {
      html += `
        <div class="detail-row"><span>Pays</span><span>${escapeHtml(pays)}</span></div>
      `;
      if (departement) {
        html += `
          <div class="detail-row"><span>Département</span><span>${escapeHtml(departement)}</span></div>
        `;
      }
    }

    // Suite du HTML
    html += `
          <div class="detail-row"><span>Heure d'accueil</span><span>${escapeHtml(accueil)}</span></div>
          <div class="detail-row"><span>Heure de départ</span><span>${escapeHtml(depart)}</span></div>
          ${rando.rendezVous ? `<div class="detail-row"><span>Rendez-vous</span><span>${escapeHtml(rando.rendezVous)}</span></div>` : ''}
          ${tel0 ? `<div class="detail-row"><span>Contact</span><span>${escapeHtml(tel0)}</span></div>` : ''}
          ${tel1 ? `<div class="detail-row"><span></span><span>${escapeHtml(tel1)}</span></div>` : ''}
        </div>
    `;

    // Ajouter les boutons
    if (mapsUrl || tel0 || tel1) {
      html += `<div class="btn-row">`;
      if (mapsUrl) {
        html += `<a class="btn btn--primary" href="${mapsUrl}" target="_blank" rel="noopener">M'y rendre</a>`;
      }
      if (tel0) {
        html += `<a class="btn btn--secondary" href="tel:${tel0.replace(/\s/g, "")}">Appeler</a>`;
      }
      if (tel1) {
        html += `<a class="btn btn--secondary" href="tel:${tel1.replace(/\s/g, "")}">Appeler</a>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
    screenRoot.innerHTML = html;
  };

  const showError = (message) => {
    screenRoot.innerHTML = `
      <div class="screen screen--center">
        <p class="alert alert--danger">${escapeHtml(message)}</p>
        <button class="btn btn--primary" id="btn-retry">Réessayer</button>
      </div>
    `;
    $("#btn-retry").addEventListener("click", () => renderRandoDetails(r));
  };

  if (r) {
    show(r);
  } else {
    fetchRandoDetails()
      .then((data) => {
        prochaineRando = data;
        show(data);
      })
      .catch((error) => {
        showError("Impossible de charger les informations. " + error.message);
      });
  }
}

/* -------------------------------------------------------
   🌐 Page d'information
------------------------------------------------------- */
function renderInfoPage(key) {
  if (key === "lien-internet") {
    const lienInternet = infoContent["lien-internet"];
    if (lienInternet?.links?.length > 0) {
      const url = lienInternet.links[0].url;
      screenRoot.innerHTML = `
        <div class="screen">
          <div class="section clickable-section" onclick="window.open('${url}', '_blank')">
            <h3>${escapeHtml(lienInternet.title)}</h3>
          </div>
        </div>
      `;
      return;
    }
  }

  const page = infoContent?.[key];
  if (!page) {
    screenRoot.innerHTML = `<div class="screen"><p>Contenu indisponible.</p></div>`;
    return;
  }

  let html = `<div class="screen">`;

  for (const section of page.sections) {
    html += `<section class="info-section"><h3>${escapeHtml(section.heading)}</h3>`;

    if (section.items) {
      html += `<ul>${section.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
    }

    if (section.text) {
      html += section.text
        .map((t) =>
          typeof t === "string"
            ? `<p class="info-text">${escapeHtml(t)}</p>`
            : `<p class="info-text">
                 <a href="#" class="open-app"
                    data-scheme="${t.scheme ?? ""}"
                    data-android="${t.store_android ?? ""}"
                    data-ios="${t.store_ios ?? ""}">
                    ${escapeHtml(t.label)}
                 </a>
               </p>`
        )
        .join("");
    }

    if (section.links) {
      html += section.links
        .map(
          (l) =>
            `<p><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a></p>`
        )
        .join("");
    }

    if (section.footer) {
      html += `<p class="info-footer">${escapeHtml(section.footer)}</p>`;
    }

    html += `</section>`;
  }

  html += `</div>`;
  screenRoot.innerHTML = html;

  screenRoot.querySelectorAll(".open-app").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openAppOrStore(link.dataset.scheme, link.dataset.android, link.dataset.ios);
    });
  });
}

/* -------------------------------------------------------
   🚀 Démarrage
------------------------------------------------------- */
async function checkUserAndStart() {
  try {
    // Charger les données de l'utilisateur et les infos en parallèle
    const [infoRes, randoRes] = await Promise.all([
      fetch("./data/info.json").then((r) => r.json()),
      fetchRandoDetails().catch(() => null) // Ne pas bloquer si les données de rando échouent
    ]);

    infoContent = infoRes;
    prochaineRando = randoRes; // Peut être null si hors ligne et pas de cache

    const user = getUser();

    if (!user?.prenom || !user?.nom || !user?.dateInscription) {
      navigate("inscription", { title: "Inscription" });
      return;
    }

    if (needsCotisation(user.dateInscription)) {
      navigate("cotisation", {
        prenom: user.prenom,
        nom: user.nom,
        dateInscription: user.dateInscription,
        title: "Vérification de votre cotisation",
      });
      return;
    }

    navigate("accueil", {
      prenom: user.prenom,
      nom: user.nom,
      title: "Rando's Lorraine",
    });

  } catch (error) {
    console.error("Erreur lors du démarrage :", error);
    // Afficher un message d'erreur et naviguer vers l'inscription
    navigate("inscription", { title: "Inscription" });
  }
}

function renderAccueil(prenom, nom) {
  // Récupérer la prochaine rando depuis la variable globale
  const rando = prochaineRando;

  // Formater la date si elle existe
  let dateText = "Aucune date disponible";
  let lieuText = "Lieu inconnu";

  if (rando && typeof rando === 'object') {
    dateText = rando.date || "Date inconnue";
    lieuText = (rando.lieu && rando.lieu.commune) ? rando.lieu.commune : "Lieu inconnu";
  }

  screenRoot.innerHTML = `
    <div class="screen">
      <div class="welcome">
        <p>Bonjour ${escapeHtml(prenom)} ${escapeHtml(nom)} !</p>
      </div>

      <div class="menu">
        <button class="menu-btn" id="btn-carte">
          <span>Ma carte</span>
        </button>

        <button class="menu-btn" id="btn-rando">
          <span>Prochaine randonnée</span>
          <span class="rando-preview">
            ${escapeHtml(dateText)}<br>
            <small>${escapeHtml(lieuText)}</small>
          </span>
        </button>

        <button class="menu-btn" id="btn-info-avant">
          <span>Avant le départ</span>
        </button>

        <button class="menu-btn" id="btn-info-accident">
          <span>En cas d'accident</span>
        </button>

        <button class="menu-btn" id="btn-info-tarifs">
          <span>Tout sur les tarifs</span>
        </button>

        <button class="menu-btn" id="btn-info-lien">
          <span>Lien internet</span>
        </button>
      </div>
    </div>
  `;

  // Ajouter les écouteurs d'événements
  $("#btn-carte").addEventListener("click", () => {
    navigate("carte", { prenom, nom, title: "Ma carte", showBack: true });
  });

  $("#btn-rando").addEventListener("click", () => {
    navigate("rando", { rando: prochaineRando, title: "Prochaine randonnée", showBack: true });
  });

  $("#btn-info-avant").addEventListener("click", () => {
    navigate("info", { infoKey: "avant-depart", title: "Avant le départ", showBack: true });
  });

  $("#btn-info-accident").addEventListener("click", () => {
    navigate("info", { infoKey: "en-cas-accident", title: "En cas d'accident", showBack: true });
  });

  $("#btn-info-tarifs").addEventListener("click", () => {
    navigate("info", { infoKey: "tarifs", title: "Tout sur les tarifs", showBack: true });
  });

  $("#btn-info-lien").addEventListener("click", () => {
    navigate("info", { infoKey: "lien-internet", title: "Lien internet", showBack: true });
  });
}

/* -------------------------------------------------------
   🔧 Init
------------------------------------------------------- */
async function init() {
  // Service worker désactivé (bloc 1)
  // navigator.serviceWorker.register("./sw.js");

  appBarBack.addEventListener("click", () => backHandler?.());

  await checkUserAndStart();
}

init();
