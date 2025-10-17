# Alforis Favicon Package

## Installation (Next.js)
1. Crée un dossier `public/favicon/` dans ton projet.
2. Copie TOUT le contenu de ce dossier dans `public/favicon/`.
3. Dans `app/layout.tsx` (ou `_document.tsx`), ajoute le contenu de `HEAD_SNIPPET.html` dans `<head>`.

## Fichiers fournis
- `favicon.ico` (16/32/48)
- `favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `favicon-64.png`, `favicon-96.png`, `favicon-128.png`, `favicon-180.png`
- `apple-touch-icon.png` (180×180)
- `android-chrome-192x192.png`, `android-chrome-512x512.png`
- `maskable-icon-512.png`
- `safari-pinned-tab.svg`
- `site.webmanifest`
- `browserconfig.xml` (optionnel)
- `robots.txt`, `humans.txt`
- `HEAD_SNIPPET.html` (balises à coller dans <head>)

## Notes
- Couleurs: orange accent #E39F70, fond anthracite #1D1D1D.
- Tu peux remplacer la géométrie du monogramme en remplaçant `safari-pinned-tab.svg` et en régénérant les PNG si besoin.
