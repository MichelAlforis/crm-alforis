# 📘 Documentation API – OpenAPI & Postman

Ce dossier regroupe la documentation technique de l’API CRM Alforis conformément au chantier **« Documentation API (OpenAPI + Postman) »** décrit dans `documentation/roadmap/PLAN_AMELIORATIONS_CRM.md` (Semaine 6 – Polish & Documentation).

## 🗂️ Fichiers livrés

- `openapi.json` – Spécification **OpenAPI 3.0.3** couvrant les endpoints principaux (auth, organisations, personnes, tâches, mandats, recherche, webhooks).
- `postman_collection.json` – Collection **Postman v2.1** dérivée de la spec, prête à l’emploi pour les scénarios courants.

## 🚀 Utilisation rapide

### 1. Spécification OpenAPI
- Ouvrir `openapi.json` dans **Swagger UI**, **Stoplight**, **Hoppscotch**, ou n’importe quel outil compatible.
- Les serveurs prédéfinis:
  - `https://crm.alforis-finance.com` (production)
  - `http://localhost:8000` (environnement local)
- Authentification: schéma `BearerAuth` (JWT). Utiliser le token obtenu via `/api/v1/auth/login`.

### 2. Collection Postman
1. Importer `postman_collection.json` dans Postman (ou Bruno/Insomnia avec conversion).
2. Définir les variables d’environnement:
   - `base_url` : `http://localhost:8000/api/v1` (ou URL de l’instance).
   - `access_token` : token JWT (coller la valeur renvoyée par l’endpoint `Authentication > Login`).
3. Les dossiers couvrent les parcours essentiels:
   - **Authentication** : login, refresh, whoami, logout.
   - **Organisations / People / Tasks / Mandats** : CRUD complet + routes dérivées.
   - **Search** : requêtes globales et filtrées.
   - **Webhooks** : gestion CRUD, rotation de secret, listing des événements.

## 🔐 Authentification
- Endpoint de login : `POST /api/v1/auth/login`
- Identifiants de test (jusqu’au branchement sur la vraie table utilisateurs):
  - `admin@tpmfinance.com` / `admin123`
  - `user@tpmfinance.com` / `user123`
- Le token doit être passé dans l’en-tête `Authorization: Bearer <token>`.

## ✅ Couverture fonctionnelle
- **Organisations** : listing, recherche textuelle, statistiques, détail, CRUD.
- **People** : listing, détail, mise à jour et suppression.
- **Tasks** : filtres par statut/priorité, actions rapides (snooze, mark done), statistiques.
- **Mandats** : suivi par organisation, mandats actifs, gestion complète.
- **Webhooks** : exposition des événements `EventType`, gestion du secret HMAC.
- **Recherche** : endpoints full-text (organisations, personnes, mandats, recherche globale).

## 📌 Prochaines améliorations (optionnel)
- Ajouter les **réponses d’erreur structurées** spécifiques (codes métier) si nécessaires.
- Documenter les endpoints secondaires (imports, exports streaming) lorsque stabilisés.
- Synchroniser la spec avec des **docstrings FastAPI** pour générer automatiquement descriptions & exemples.

## 🤝 Maintien & contributions
- Après chaque évolution API majeure, régénérer `openapi.json` et mettre à jour la collection Postman.
- Versionner les changements en s’alignant sur la date/commit (`README` mis à jour, changelog si besoin).
- Pour les tests automatisés, s’appuyer sur `crm-backend/tests` afin de garantir la cohérence avec la spec.

---

💡 **Astuce:** pour valider les workflows end-to-end, exécuter la collection Postman en mode Runner (scénarios pré-remplis) ou utiliser l’OpenAPI dans un client code-gen (TypeScript, Python, etc.) afin d’accélérer l’intégration front/back.
