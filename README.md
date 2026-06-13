# Rando's Lorraine — PWA

Application web installable pour les adhérents de Rando's Lorraine.  
Adaptée depuis le prototype Flutter, sans Node.js ni droits administrateur.

**Couleur officielle :** `#63B632`

## Fonctionnalités

- Inscription (prénom / nom) avec stockage local
- Vérification annuelle de cotisation
- Accueil avec cartes : QR adhérent, prochaine rando, infos pratiques
- Carte adhérent avec QR code
- Correction du nom
- Détails de la prochaine randonnée + itinéraire GPS
- Pages : Avant le départ, En cas d'accident, Liens internet
- Mode hors ligne (service worker)

## Déploiement GitHub Pages

1. Uploadez **tous** les fichiers (y compris `js/qrcode.min.js`)
2. Settings → Pages → branche `main`, dossier `/ (root)`
3. URL : `https://VOTRE-COMPTE.github.io/NOM-DU-DEPOT/`

Après une mise à jour, videz le cache du navigateur ou attendez le rafraîchissement du service worker (version v2).

## Personnaliser la prochaine rando

Éditez `data/rando-prochaine.json`.

Quand l'API sera prête, décommentez l'appel dans `js/app.js` (`fetchRandoDetails`).

## Réinitialiser l'inscription (test)

Dans la console du navigateur sur le téléphone ou le PC :

```javascript
localStorage.removeItem('randos_lorraine');
location.reload();
```

## Structure

```
index.html
manifest.webmanifest
sw.js
css/styles.css
js/app.js
js/storage.js
js/qrcode.min.js
data/rando-prochaine.json
data/info.json
icons/icon.svg
```

## Installer sur l'écran d'accueil

| Appareil | Procédure |
|---|---|
| iPhone | Safari → Partager → Sur l'écran d'accueil |
| Android | Chrome → Installer l'application |
