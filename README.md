# Rando's Lorraine

Application web installable pour les adhérent.e.s de Rando's Lorraine  

- Inscription (prénom / nom) avec stockage local
- Vérification annuelle de cotisation
- Accueil avec : QR adhérent.e, prochaine rando, infos pratiques
- Permet de s'inscrire sur l'application pour éditer son QR code
- Aide les pilotes à éditer la liste des participant.e.s
- Pages : Avant le départ, En cas d'accident, Liens internet

Dans la console du navigateur sur le téléphone ou le PC :

```javascript
localStorage.removeItem('randos_lorraine');
location.reload();
```

## Structure

```
css

    styles.css

data

    info.json

icons

    RL-logo.svg
    RL-symb.png

js

    app.js
    qrcode.min.js
    storage.js

.assetsignore
README.md
_worker.js
index.html
manifest.webmanifest
sw.js
wrangler.toml
```

## Installer sur l'écran d'accueil

| Appareil | Procédure |
|---|---|
| iPhone | Safari → Partager → Sur l'écran d'accueil |
| Android | Chrome → Installer l'application |

David Dyczko
