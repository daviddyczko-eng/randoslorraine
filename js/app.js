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

const PARTICLES = ["de", "la", "du", "le", "les", "des"];

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

function showMain(showBack, title, onBack) {
  splashEl.classList.add("hidden");
  mainEl.classList.remove("hidden");
  appBarTitle.textContent = title;
  appBarBack.classList.toggle("hidden", !showBack);
  appBarIcon.classList.toggle("hidden", showBack);
  backHandler = onBack || null;
}

function renderQr(container, text, size = 100) {
  container.innerHTML = "";
  const box = document.createElement("div");
  box.className = size > 120 ? "qr-box qr-box--lg" : "qr-box";
  container.appendChild(box);
  /* global QRCode */
  new QRCode(box, {
    text,
    width: size,
    height: size,
    colorDark: "#3d7820",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M,
  });
}

async function fetchRandoDetails() {
  await new Promise((r) => setTimeout(r, 400));

  // Décommenter quand l'API sera disponible :
  // const response = await fetch("https://randoslorraine.org/api/rando");
  // if (response.ok) return response.json();
  // throw new Error("Échec de la récupération des données");

  const response = await fetch("./data/rando-prochaine.json");
  if (!response.ok) throw new Error("Données indisponibles");
  return response.json();
}

async function sendEmail() {
  const email = "tresorier@randoslorraine.org";
  const subject = "Liste des participant.e.s";
  const body = "Voici la liste des participant.e.s : ";
  const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}

function showModal(title, onClose) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h2>${escapeHtml(title)}</h2>
      <button type="button" class="btn btn--primary">OK</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("button").addEventListener("click", () => {
    overlay.remove();
    onClose?.();
  });
}

function navigate(screen, options = {}) {
  currentScreen = screen;
  showMain(options.showBack ?? false, options.title ?? "Rando's Lorraine", options.onBack);

  switch (screen) {
    case "inscription":
      renderInscription();
      break;
    case "cotisation":
      renderCotisation(options.prenom, options.nom, options.dateInscription);
      break;
    case "accueil":
      renderAccueil(options.prenom, options.nom);
      break;
    case "carte":
      renderCarte(options.prenom, options.nom);
      break;
    case "correction":
      renderCorrection(options.prenom, options.nom);
      break;
    case "rando":
      renderRandoDetails();
      break;
    case "info":
      renderInfoPage(options.infoKey);
      break;
    default:
      break;
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
          <input id="prenom" name="prenom" required autocomplete="given-name">
        </div>
        <div class="field">
          <label for="nom">Nom</label>
          <input id="nom" name="nom" required autocomplete="family-name">
        </div>
        <div class="btn-row">
          <button type="button" class="btn btn--ghost" id="btn-quit">Quitter l'application</button>
          <button type="submit" class="btn btn--primary">Valider mon inscription</button>
        </div>
      </form>
    </div>
  `;

  $("#btn-quit").addEventListener("click", () => {
    alert("Fermez l'onglet ou l'application pour quitter.");
  });

  $("#form-inscription").addEventListener("submit", (e) => {
    e.preventDefault();
    const prenom = formatName($("#prenom").value);
    const nom = formatName($("#nom").value);
    const dateInscription = new Date().toISOString();
    saveUser({ prenom, nom, dateInscription });
    navigate("accueil", { prenom, nom, title: "Rando's Lorraine" });
  });
}

function renderCotisation(prenom, nom, dateInscription) {
  screenRoot.innerHTML = `
    <div class="screen screen--center">
      <p style="font-size:1.1rem; max-width:320px;">
        As-tu bien pensé à renouveler ton adhésion à Rando's Lorraine ?
      </p>
      <div class="btn-row">
        <button type="button" class="btn btn--ghost" id="btn-non">Non, pas encore</button>
        <button type="button" class="btn btn--primary" id="btn-oui">Oui, c'est fait</button>
      </div>
    </div>
  `;

  $("#btn-non").addEventListener("click", () => {
    showModal("À très bientôt !");
  });

  $("#btn-oui").addEventListener("click", () => {
    saveUser({
      prenom,
      nom,
      dateInscription: new Date().toISOString(),
    });
    navigate("accueil", { prenom, nom, title: "Rando's Lorraine" });
  });
}

function renderAccueil(prenom, nom) {
  const qrPreview = document.createElement("div");
  renderQr(qrPreview, qrData(prenom, nom), 80);

  const randoPreview = prochaineRando
    ? `<span>${escapeHtml(prochaineRando.lieu)}<br>${escapeHtml(prochaineRando.date)}</span>`
    : `<span class="loading-text">Chargement…</span>`;

  screenRoot.innerHTML = `
    <div class="screen">
      <div class="card-list">
        <button type="button" class="home-card" data-go="carte">
          <span class="home-card__title">Bonjour ${escapeHtml(prenom)}</span>
          <span class="home-card__preview" id="qr-preview"></span>
        </button>
        <button type="button" class="home-card" data-go="rando">
          <span class="home-card__title">Prochaine rando</span>
          <span class="home-card__preview">${randoPreview}</span>
        </button>
        <button type="button" class="home-card" data-go="avant-depart">
          <span class="home-card__title">Avant le départ</span>
          <span class="home-card__preview"></span>
        </button>
        <button type="button" class="home-card" data-go="accident">
          <span class="home-card__title">En cas d'accident</span>
          <span class="home-card__preview"></span>
        </button>
        <button type="button" class="home-card" data-go="tarifs">
          <span class="home-card__title">Tout sur les tarifs</span>
          <span class="home-card__preview"></span>
        </button>
        <button type="button" class="home-card" data-go="lien-internet">
          <span class="home-card__title">Lien internet</span>
          <span class="home-card__preview"></span>
        </button>
      </div>
    </div>
  `;

  $("#qr-preview").appendChild(qrPreview.firstChild);

  screenRoot.querySelectorAll(".home-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const go = btn.dataset.go;
      if (go === "carte") {
        navigate("carte", {
          prenom,
          nom,
          title: "Ma carte",
          showBack: true,
          onBack: () => navigate("accueil", { prenom, nom, title: "Rando's Lorraine" }),
        });
      } else if (go === "rando") {
        navigate("rando", {
          title: "Prochaine rando",
          showBack: true,
          onBack: () => navigate("accueil", { prenom, nom, title: "Rando's Lorraine" }),
        });
      } else {
        navigate("info", {
          infoKey: go,
          title: infoContent?.[go]?.title ?? go,
          showBack: true,
          onBack: () => navigate("accueil", { prenom, nom, title: "Rando's Lorraine" }),
        });
      }
    });
  });

  if (!prochaineRando) {
    fetchRandoDetails()
      .then((data) => {
        prochaineRando = data;
        if (currentScreen === "accueil") renderAccueil(prenom, nom);
      })
      .catch(() => {
        if (currentScreen === "accueil") {
          const card = screenRoot.querySelector('[data-go="rando"] .home-card__preview');
          if (card) card.innerHTML = `<span class="loading-text">Indisponible</span>`;
        }
      });
  }
}

function renderCarte(prenom, nom) {
  screenRoot.innerHTML = `
    <div class="screen screen--center">
      <div id="qr-large"></div>
      <p class="carte-name">${escapeHtml(prenom)} ${escapeHtml(nom)}</p>
      <button type="button" class="btn btn--secondary" id="btn-corriger">Corriger</button>
    </div>
  `;

  renderQr($("#qr-large"), qrData(prenom, nom), 260);

  $("#btn-corriger").addEventListener("click", () => {
    navigate("correction", {
      prenom,
      nom,
      title: "Corriger",
      showBack: true,
      onBack: () =>
        navigate("carte", {
          prenom,
          nom,
          title: "Ma carte",
          showBack: true,
          onBack: () => {
            const user = getUser();
            navigate("accueil", {
              prenom: user.prenom,
              nom: user.nom,
              title: "Rando's Lorraine",
            });
          },
        }),
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
        <button type="submit" class="btn btn--primary btn--block">Valider</button>
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
      onBack: () => {
        navigate("accueil", {
          prenom: newPrenom,
          nom: newNom,
          title: "Rando's Lorraine",
        });
      },
    });
  });
}

function renderRandoDetails() {
  screenRoot.innerHTML = `
    <div class="screen screen--center">
      <p class="loading-text">Chargement des informations…</p>
    </div>
  `;

  const show = (r) => {
    const [lat, lng] = r.gps.split(",").map((v) => v.trim());
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    screenRoot.innerHTML = `
      <div class="screen">
        <div class="detail-list">
          <div class="detail-row"><span class="detail-row__label">Date</span><span class="detail-row__value">${escapeHtml(r.date)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Lieu</span><span class="detail-row__value">${escapeHtml(r.lieu)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Heure d'accueil</span><span class="detail-row__value">${escapeHtml(r.heureAccueil)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Heure de départ</span><span class="detail-row__value">${escapeHtml(r.heureDepart)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Distance</span><span class="detail-row__value">${escapeHtml(r.distance)} km</span></div>
          <div class="detail-row"><span class="detail-row__label">Dénivelé</span><span class="detail-row__value">${escapeHtml(r.denivele)} m</span></div>
          <div class="detail-row"><span class="detail-row__label">Contact</span><span class="detail-row__value">${escapeHtml(r.contact)}</span></div>
        </div>
        <div class="btn-row">
          <a class="btn btn--primary" href="${mapsUrl}" target="_blank" rel="noopener">M'y rendre</a>
          <a class="btn btn--secondary" href="tel:${r.contact.replace(/\s/g, "")}">Appeler</a>
        </div>
        <button type="button" class="btn btn--ghost btn--block" id="btn-email" style="margin-top:12px">Envoyer un e-mail</button>
      </div>
    `;

    $("#btn-email").addEventListener("click", sendEmail);
  };

  if (prochaineRando) {
    show(prochaineRando);
  } else {
    fetchRandoDetails()
      .then((data) => {
        prochaineRando = data;
        if (currentScreen === "rando") show(data);
      })
      .catch(() => {
        screenRoot.innerHTML = `
          <div class="screen screen--center">
            <p>Impossible de charger les informations de la prochaine randonnée.</p>
          </div>
        `;
      });
  }
}

function renderInfoPage(key) {
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
      if (Array.isArray(section.text)) {
        html += section.text
          .map(t => {
            if (typeof t === "string") {
              return `<p class="info-text">${escapeHtml(t)}</p>`;
            } else if (t.url) {
              return `<p class="info-text"><a href="${escapeHtml(t.url)}">${escapeHtml(t.label)}</a></p>`;
            }
          })
          .join("");
      } else {
        html += `<p class="info-text">${escapeHtml(section.text)}</p>`;
      }
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
}

async function checkUserAndStart() {
  const [infoRes] = await Promise.all([
    fetch("./data/info.json").then((r) => r.json()),
    new Promise((r) => setTimeout(r, 600)),
  ]);
  infoContent = infoRes;

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

  try {
    prochaineRando = await fetchRandoDetails();
  } catch {
    prochaineRando = null;
  }

  navigate("accueil", {
    prenom: user.prenom,
    nom: user.nom,
    title: "Rando's Lorraine",
  });
}

async function init() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch {
      /* optional */
    }
  }

  appBarBack.addEventListener("click", () => backHandler?.());

  await checkUserAndStart();
}

init();
