# 📚 Bibliothèque des README du CRM Alforis

Bienvenue dans le dossier qui centralise les différents guides du projet. Utilisez-le comme point d’entrée unique pour retrouver le bon README en quelques secondes.

---

## Sommaire
- [Vue d'ensemble](#-vue-densemble)
- [Structure du dossier](#-structure-du-dossier)
- [Cartes thématiques](#-cartes-thématiques)
- [Navigation express](#-navigation-express)

---

## 🔎 Vue d'ensemble
- **Objectif :** naviguer rapidement entre tous les README sans fouiller l’arborescence.
- **Organisation :** ce dossier contient un guide principal (ce fichier) et trois fiches thématiques (Racine, Backend, Frontend).
- **Astuce :** ouvrez les fiches thématiques pour une vue détaillée avec les temps de lecture et les usages clés.

---

## 🗂️ Structure du dossier
- `README.md` → accueil de la bibliothèque (ce fichier)
- `racine.md` → références des README au niveau racine du projet
- `backend.md` → documentation READMEs pour le backend FastAPI
- `frontend.md` → documentation READMEs pour le frontend Next.js

💡 Ajoutez ici toute nouvelle fiche thématique si d’autres READMEs apparaissent (ex : Ops, Data, Mobile…).

---

## 🧭 Cartes thématiques
- **README racine :** orientations générales (installation, roadmap). → [`racine.md`](racine.md)
- **Backend :** migrations, tests, architecture, imports. → [`backend.md`](backend.md)
- **Frontend :** scripts de développement, design system. → [`frontend.md`](frontend.md)

---

## 🚀 Navigation express

| Besoin | Fichier | Action rapide |
|--------|---------|---------------|
| Installer / dépanner le CRM | [`sources/root/README.md`](sources/root/README.md) | Suivre la table des matières → section concernée |
| Planifier la transformation sur 6 semaines | [`sources/root/README_AMELIORATIONS.md`](sources/root/README_AMELIORATIONS.md) | Lire la section priorités + checklist |
| Exécuter la migration de données | [`sources/backend/migrations/README.md`](sources/backend/migrations/README.md) | Lancer backup → dry-run → run |
| Mettre en place ou déboguer les tests backend | [`sources/backend/tests/README.md`](sources/backend/tests/README.md) | Copier les commandes adaptées |
| Tester l’API rapidement | [`sources/backend/guides/README.API.md`](sources/backend/guides/README.API.md) | Utiliser les scripts `curl` prêts à l’emploi |
| Comprendre l’architecture backend | [`sources/backend/guides/README.ARCH.md`](sources/backend/guides/README.ARCH.md) | Lire la cartographie visuelle |
| Importer des données en masse | [`sources/backend/guides/README.excel.md`](sources/backend/guides/README.excel.md) | Préparer le CSV modèle puis importer |
| Démarrer proprement le frontend | [`sources/frontend/scripts/README.md`](sources/frontend/scripts/README.md) | Lancer `npm run dev:clean` |
| Respecter le design system | [`sources/frontend/styles/README.md`](sources/frontend/styles/README.md) | Reprendre tokens & classes existantes |

---

**Conseil final :** gardez ce dossier à jour en ajoutant toute nouvelle fiche ou en ajustant les liens dès qu’un README est créé ou déplacé.
