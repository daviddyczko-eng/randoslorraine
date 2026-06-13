const STORAGE_KEY = "randos_lorraine";

export function getUser() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUser({ prenom, nom, dateInscription }) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ prenom, nom, dateInscription })
  );
}

export function clearUser() {
  localStorage.removeItem(STORAGE_KEY);
}

export function needsCotisation(dateInscription) {
  if (!dateInscription) return true;
  const year = new Date(dateInscription).getFullYear();
  return year !== new Date().getFullYear();
}

export function qrData(prenom, nom) {
  return `${prenom} ${nom} Rando's Lorraine`;
}
