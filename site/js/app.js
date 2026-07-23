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
  backHandler = onBack || (() => {
    const user = getUser();
    if (user?.prenom && user?.nom) {
      navigate("accueil", { prenom: user.prenom, nom: user.nom });
    } else {
      navigate("accueil", { title: "Rando's Lorraine" });
    }
  });
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
  console.log("fetchRandoDetails appelé");

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
    console.log("Tentative de chargement depuis l'API...");
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
    console.log("Données reçues de l'API:", data);

    localStorage.setItem("prochaineRando", JSON.stringify(data));
    console.log("Données sauvegardées dans localStorage.");

    return data;

  } catch (apiError) {
    console.warn("L'API a échoué, tentative de chargement depuis localStorage...", apiError);

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
   📄 Fonctions de rendu
------------------------------------------------------- */

function renderAccueil(prenom, nom) {
  const rando = prochaineRando;

  let dateText = "Aucune date disponible";
  let lieuText = "Lieu inconnu";

  if (rando && typeof rando === 'object') {
    dateText = rando.date || "Date inconnue";
    lieuText = (rando.lieu && rando.lieu.commune) ? rando.lieu.commune : "Lieu inconnu";
  }

  screenRoot.innerHTML = `
    <div class="screen">
      <div class="card-list">
        <div class="home-card" id="btn-carte">
          <span class="home-card__title">Bonjour ${escapeHtml(prenom)} !</span>
          <div id="qr-small" style="display: inline-block; margin-left: 10px;"></div>
        </div>

        <div class="home-card" id="btn-rando">
          <span class="home-card__title">Prochaine randonnée</span>
          <span class="home-card__preview">
            ${escapeHtml(dateText)}<br>
            <small>${escapeHtml(lieuText)}</small>
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

  $("#btn-carte").addEventListener("click", () => {
    navigate("carte", { prenom, nom, title: "Ma carte", showBack: true });
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

  $("#btn-quit").addEventListener("click", () => {
    alert("Fermez l'onglet pour quitter.");
  });

  $("#form-inscription").addEventListener("submit", (e) => {
    e.preventDefault();
    console.log("Formulaire d'inscription soumis");

    const prenom = formatName($("#prenom").value);
    const nom = formatName($("#nom").value);
    const dateInscription = new Date().toISOString();

    console.log(`Prénom: ${prenom}, Nom: ${nom}, Date: ${dateInscription}`);

    const success = saveUser({ prenom, nom, dateInscription });
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

function renderRandoDetails(r) {
  console.log("renderRandoDetails appelé avec:", r);

  screenRoot.innerHTML = `
    <div class="screen screen--center">
      <p class="loading-text">Chargement des informations…</p>
    </div>
  `;

  const show = (rando) => {
    console.log("Affichage des détails pour:", rando);

    if (!rando || typeof rando !== 'object') {
      console.error("Données de randonnée invalides:", rando);
      screenRoot.innerHTML = `
        <div class="screen screen--center">
          <p class="alert alert--danger">Aucune donnée de randonnée disponible.</p>
        </div>
      `;
      return;
    }

    let lat, lng;
    if (rando.gps) {
      const coords = rando.gps.split(',').map(coord => parseFloat(coord.trim()));
      lat = coords[0];
      lng = coords[1];
    }

    const mapsUrl = lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;

    const commune = (rando.lieu && rando.lieu.commune) ? rando.lieu.commune : "Lieu inconnu";
    const pays = (rando.lieu && rando.lieu.pays) ? rando.lieu.pays : null;
    const departement = (rando.lieu && rando.lieu.departement) ? rando.lieu.departement : null;

    const accueil = rando.heureAccueil || rando.lieu?.heureAccueil || "Heure d'accueil non spécifiée";
    const depart = rando.heureDepart || rando.lieu?.heureDepart || "Heure de départ non spécifiée";

    let pilotes = [];
    if (rando.pilotes) {
      const pilotesText = rando.pilotes
        .replace(/&amp;/g, '&')
        .replace(/^Proposé par\s*/i, '')
        .replace(/&/g, ',')
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      pilotes = pilotesText;
    }

    const tel0 = (rando.telephones && rando.telephones[0]) ? rando.telephones[0] : null;
    const tel1 = (rando.telephones && rando.telephones[1]) ? rando.telephones[1] : null;

    let html = `
      <div class="screen">
        <div class="detail-list">
          <div class="detail-row">
            <span class="detail-row__label">Date</span>
            <span class="detail-row__value">${escapeHtml(rando.date || "Date inconnue")}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Lieu</span>
            <span class="detail-row__value">${escapeHtml(commune)}</span>
          </div>
    `;

    if (pays && pays.toLowerCase() !== "france") {
      html += `
          <div class="detail-row">
            <span class="detail-row__label">Pays</span>
            <span class="detail-row__value">${escapeHtml(pays)}</span>
          </div>
      `;
      if (departement) {
        html += `
          <div class="detail-row">
            <span class="detail-row__label">Département</span>
            <span class="detail-row__value">${escapeHtml(departement)}</span>
          </div>
        `;
      }
    }

    html += `
          <div class="detail-row">
            <span class="detail-row__label">Heure d'accueil</span>
            <span class="detail-row__value">${escapeHtml(accueil)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Heure de départ</span>
            <span class="detail-row__value">${escapeHtml(depart)}</span>
          </div>
    `;

    if (rando.rendezVous) {
      html += `
          <div class="detail-row detail-row--clickable" onclick="window.open('${mapsUrl}', '_blank')">
            <span class="detail-row__label">Rendez-vous</span>
            <span class="detail-row__value">
              ${escapeHtml(rando.rendezVous)} 📍
            </span>
          </div>
      `;
    }

    if (tel0) {
      const pilote1 = pilotes[0] ? `Proposé par ${escapeHtml(pilotes[0])}` : "Contact";
      html += `
        <div class="detail-row detail-row--clickable" onclick="window.location.href='tel:${tel0.replace(/\s/g, "")}'">
          <span class="detail-row__label">${pilote1}</span>
          <span class="detail-row__value">📞 ${escapeHtml(tel0)}</span>
        </div>
      `;
    }

    if (tel1) {
      const pilote2 = pilotes[1] ? `& ${escapeHtml(pilotes[1])}` : "";
      html += `
        <div class="detail-row detail-row--clickable" onclick="window.location.href='tel:${tel1.replace(/\s/g, "")}'">
          <span class="detail-row__label">${pilote2}</span>
          <span class="detail-row__value">📞 ${escapeHtml(tel1)}</span>
        </div>
      `;
    }

    html += `
        </div>
        <div class="btn-row">
          <button class="btn btn--primary" id="btn-covoiturage-propose">Je propose un covoiturage.</button>
          <button class="btn btn--primary" id="btn-covoiturage-recherche">Je voudrais un covoiturage.</button>
        </div>
      </div>
    `;

    screenRoot.innerHTML = html;

    $("#btn-covoiturage-propose").addEventListener("click", () => {
      alert("Fonctionnalité 'Je propose un covoiturage' à implémenter.");
    });

    $("#btn-covoiturage-recherche").addEventListener("click", () => {
      alert("Fonctionnalité 'Je voudrais un covoiturage' à implémenter.");
    });
  };

  const showError = (message) => {
    console.error("Erreur dans renderRandoDetails:", message);
    screenRoot.innerHTML = `
      <div class="screen screen--center">
        <p class="alert alert--danger">${escapeHtml(message)}</p>
        <button class="btn btn--primary" id="btn-retry">Réessayer</button>
      </div>
    `;
    $("#btn-retry").addEventListener("click", () => {
      console.log("Bouton Réessayer cliqué");
      renderRandoDetails(r);
    });
  };

  if (r) {
    console.log("Données déjà disponibles, affichage direct.");
    show(r);
  } else {
    console.log("Aucune donnée disponible, chargement depuis l'API...");
    fetchRandoDetails()
      .then((data) => {
        console.log("Données chargées avec succès:", data);
        prochaineRando = data;
        show(data);
      })
      .catch((error) => {
        console.error("Erreur lors du chargement des données:", error);
        showError("Impossible de charger les informations. " + error.message);
      });
  }
}

function renderInfoPage(key) {
  if (!infoContent) {
    console.error("infoContent n'est pas défini !");
    screenRoot.innerHTML = `<div class="screen"><p>Contenu indisponible (données non chargées).</p></div>`;
    return;
  }

  // ✅ Cas spécial pour "lien-internet"
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

   // ✅ Gérer les items et links côte-à-côte (même si les tableaux n'ont pas la même longueur)
   if (section.items && section.links) {
     html += `<ul>`;
     for (let i = 0; i < section.items.length; i++) {
       const item = section.items[i];
       const link = section.links[i]; // ✅ link peut être undefined si i >= section.links.length
   
       if (link) {
         // ✅ Si un lien existe pour cet item, l'afficher à côté
         html += `
           <li>
             ${escapeHtml(item)} :
             <a href="${link.url}" class="info-link">${escapeHtml(link.label)}</a>
           </li>
         `;
       } else {
         // ✅ Sinon, afficher l'item seul (ex: "sociétaire MAIF 3163163A")
         html += `<li>${escapeHtml(item)}</li>`;
       }
     }
     html += `</ul>`;
   }
    // ✅ Gérer les items avec des liens HTML intégrés (ex: "<a href="tel:...">")
    else if (section.items && section.items.some(i => i.includes('<a href='))) {
      html += `<ul>`;
      section.items.forEach((i) => {
        if (i.includes('<a href="tel:') || i.includes('<a href="sms:')) {
          html += `<li>${i}</li>`; // ✅ Garder le HTML tel quel
        } else {
          html += `<li>${escapeHtml(i)}</li>`; // ✅ Sinon, échapper normalement
        }
      });
      html += `</ul>`;
    }
    // ✅ Gérer les items simples (sans liens)
    else if (section.items) {
      html += `<ul>${section.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
    }

    // ✅ Gérer les liens vers les stores (Trash Spotter, Clean 4 Green, etc.)
    if (section.text) {
      html += section.text
        .map((t) => {
          if (typeof t === "string") {
            return `<p class="info-text">${escapeHtml(t)}</p>`;
          }
          // ✅ Gérer les liens avec store_android et store_ios
          if (t.store_android || t.store_ios) {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            let url = "#";

            // Détecter si l'utilisateur est sur Android ou iOS
            if (/android/i.test(userAgent)) {
              url = t.store_android || "#";
            } else if (/iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
              url = t.store_ios || "#";
            } else {
              // Par défaut, ouvrir le store Android
              url = t.store_android || t.store_ios || "#";
            }

            return `
              <p class="info-text">
                <a href="${url}" target="_blank" rel="noopener" class="info-link">
                  ${escapeHtml(t.label)}
                </a>
              </p>
            `;
          }
          // ✅ Gérer les liens avec scheme
          return `
            <p class="info-text">
              <a href="${t.scheme || '#'}" class="info-link">
                ${escapeHtml(t.label)}
              </a>
            </p>
          `;
        })
        .join("");
    }

    // ✅ Gérer les liens simples (ex: liens dans la section "lien-internet")
    if (section.links && !section.items) {
      html += section.links
        .map(
          (l) => {
            if (l.url.startsWith("http://") || l.url.startsWith("https://")) {
              return `<p><a href="${l.url}" target="_blank" rel="noopener" class="info-link">${escapeHtml(l.label)}</a></p>`;
            }
            if (l.url.startsWith("tel:")) {
              return `<p><a href="${l.url}" class="info-link">${escapeHtml(l.label)}</a></p>`;
            }
            if (l.url.startsWith("sms:")) {
              return `<p><a href="${l.url}" class="info-link">${escapeHtml(l.label)}</a></p>`;
            }
            return `<p><a href="${l.url}" target="_blank" rel="noopener" class="info-link">${escapeHtml(l.label)}</a></p>`;
          }
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
}

/* -------------------------------------------------------
   📄 Navigation
------------------------------------------------------- */
function navigate(screen, options = {}) {
  console.log(`Navigation vers: ${screen} avec options:`, options);
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
    default:
      console.error(`Écran inconnu: ${screen}`);
      const user = getUser();
      return renderAccueil(user?.prenom, user?.nom);
  }
}

/* -------------------------------------------------------
   🔧 Fonction manquante : openAppOrStore
------------------------------------------------------- */
function openAppOrStore(scheme, androidUrl, iosUrl) {
  if (!scheme && !androidUrl && !iosUrl) {
    alert("L'application n'est pas encore disponible sur les stores.");
    return;
  }

  if (scheme) {
    window.location.href = scheme;
    setTimeout(() => {
      if (androidUrl && /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        window.location.href = androidUrl;
      } else if (iosUrl) {
        window.location.href = iosUrl;
      }
    }, 500);
  } else if (androidUrl && /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    window.location.href = androidUrl;
  } else if (iosUrl) {
    window.location.href = iosUrl;
  }
}

/* -------------------------------------------------------
   🚀 Démarrage
------------------------------------------------------- */
async function checkUserAndStart() {
  try {
    console.log("checkUserAndStart appelé");

    const [infoRes, randoRes] = await Promise.all([
      fetch("./data/info.json")
        .then((r) => {
          if (!r.ok) throw new Error(`Erreur HTTP ${r.status} pour info.json`);
          return r.json();
        })
        .catch((error) => {
          console.error("Erreur lors du chargement de info.json:", error);
          return {};
        }),
      fetchRandoDetails().catch((error) => {
        console.warn("Erreur lors du chargement des données de rando:", error);
        return null;
      })
    ]);

    infoContent = infoRes;
    prochaineRando = randoRes;

    const user = getUser();
    console.log("Utilisateur actuel:", user);

    if (!user?.prenom || !user?.nom || !user?.dateInscription) {
      console.log("Aucun utilisateur trouvé, navigation vers inscription");
      navigate("inscription", { title: "Inscription" });
      return;
    }

    if (needsCotisation(user.dateInscription)) {
      console.log("Cotisation nécessaire, navigation vers cotisation");
      navigate("cotisation", {
        prenom: user.prenom,
        nom: user.nom,
        dateInscription: user.dateInscription,
        title: "Vérification de votre cotisation",
      });
      return;
    }

    console.log("Navigation vers accueil avec utilisateur:", user.prenom, user.nom);
    navigate("accueil", {
      prenom: user.prenom,
      nom: user.nom,
      title: "Rando's Lorraine",
    });

  } catch (error) {
    console.error("Erreur lors du démarrage :", error);
    navigate("inscription", { title: "Inscription" });
  }
}

/* -------------------------------------------------------
   🔧 Init
------------------------------------------------------- */
async function init() {
  console.log("Initialisation de l'application");

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => reg.unregister());
    });
  }

  appBarBack.addEventListener("click", () => {
    if (typeof backHandler === "function") {
      backHandler();
    } else {
      const user = getUser();
      navigate("accueil", { prenom: user?.prenom, nom: user?.nom });
    }
  });

  await checkUserAndStart();
}

init();
