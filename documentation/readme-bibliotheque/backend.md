# 🛠 README Backend

Fiches dédiées au backend FastAPI : migrations, tests, architecture et outils d’import de données.

---

## Migrations
- **Fichier :** [`sources/backend/migrations/README.md`](sources/backend/migrations/README.md)
- **Focus :** scripts `unify_architecture.py` et `cleanup_old_tables.py`.
- **À retenir :**
  - Ordre d’exécution (backup → dry-run → run → nettoyage).
  - Rappels de sécurité avant toute migration.
  - Lien direct vers le guide complet de migration.
- **Temps de lecture :** 5 min avant d’exécuter les scripts.

---

## Tests backend
- **Fichier :** [`sources/backend/tests/README.md`](sources/backend/tests/README.md)
- **Focus :** stratégie de tests FastAPI (pytest, coverage, fixtures).
- **À retenir :**
  - Commandes rapides pour lancer/filtrer les tests.
  - Structure du dossier `tests/` détaillée.
  - Tips de troubleshooting (database lock, lenteurs).
- **Temps de lecture :** 10-12 min pour un onboarding QA.

---

## Guides spécialisés
- **API :** [`sources/backend/guides/README.API.md`](sources/backend/guides/README.API.md)
  - Recettes `curl`/Postman, workflows end-to-end, snippets Python.
  - Lecture recommandée : 10 min avant une démo ou un audit API.

- **Architecture :** [`sources/backend/guides/README.ARCH.md`](sources/backend/guides/README.ARCH.md)
  - Cartographie complète : layers FastAPI, dépendances, principes d’architecture.
  - Lecture recommandée : 15 min pour comprendre la structure du backend.

- **Import Excel :** [`sources/backend/guides/README.excel.md`](sources/backend/guides/README.excel.md)
  - Procédure pour importer les investisseurs via Excel/CSV, checklist et erreurs courantes.
  - Lecture recommandée : 8 min avant d’activer l’import en masse.

---

**Astuce :** gardez ce volet ouvert pendant une migration ou une session de tests : les liens sont prêts à l’emploi pour basculer vers les scripts ou les commandes `pytest`.
