# Documentation API - CRM Alforis

> **Base URL Production**: `https://crm.alforis.fr/api/v1`
> **Base URL Dev**: `http://localhost:8000/api/v1`
> **Format**: JSON
> **Authentification**: Bearer Token (JWT)
> **Version**: v1.0
> **Dernière mise à jour**: 23 Octobre 2025

---

## 📑 Table des matières

- [🔐 Authentification](#-authentification)
- [👥 Utilisateurs](#-utilisateurs)
- [🏢 Organisations](#-organisations)
- [👤 Personnes](#-personnes)
- [🔗 Liens Organisation-Personne](#-liens-organisation-personne)
- [💬 Interactions](#-interactions)
- [✅ Tâches](#-tâches)
- [📋 Mandats de Distribution](#-mandats-de-distribution)
- [💼 Produits](#-produits)
- [📧 Email Marketing](#-email-marketing)
- [📋 Listes de Diffusion](#-listes-de-diffusion)
- [🤖 Workflows](#-workflows)
- [🔔 Webhooks](#-webhooks)
- [🌐 Webhooks Publics](#-webhooks-publics)
- [🤖 Agent IA](#-agent-ia)
- [📊 Dashboards & Statistiques](#-dashboards--statistiques)
- [📥 Imports](#-imports)
- [🌍 API Publique](#-api-publique)
- [🏥 Health Check](#-health-check)

---

## 🔐 Authentification

**Prefix**: `/auth`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **POST** | `/auth/login` | Connexion avec username/password |
| **GET** | `/auth/me` | Obtenir l'utilisateur actuel |
| **POST** | `/auth/refresh` | Rafraîchir le token JWT |
| **POST** | `/auth/logout` | Déconnexion |

### Exemple de connexion

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Réponse:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

**Headers pour les requêtes authentifiées:**
```http
Authorization: Bearer {access_token}
```

---

## 👥 Utilisateurs

**Prefix**: `/users`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/users` | Liste tous les utilisateurs |
| **POST** | `/users` | Créer un nouvel utilisateur |
| **GET** | `/users/{id}` | Détails d'un utilisateur |
| **PUT** | `/users/{id}` | Mettre à jour un utilisateur |
| **DELETE** | `/users/{id}` | Supprimer un utilisateur |
| **PUT** | `/users/{id}/password` | Changer le mot de passe |
| **PUT** | `/users/{id}/role` | Changer le rôle |

---

## 🏢 Organisations

**Prefix**: `/organisations`

### Endpoints principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/organisations/search?q={query}` | Rechercher des organisations |
| **GET** | `/organisations/stats` | Statistiques globales |
| **GET** | `/organisations/by-language/{language}` | Organisations par langue |
| **POST** | `/organisations` | Créer une organisation |
| **GET** | `/organisations/{id}` | Détails d'une organisation |
| **PUT** | `/organisations/{id}` | Mettre à jour une organisation |
| **DELETE** | `/organisations/{id}` | Supprimer une organisation |
| **GET** | `/organisations/{id}/interactions` | Interactions liées à une organisation |
| **POST** | `/organisations/{id}/interactions` | Créer une interaction |
| **GET** | `/organisations/{id}/people` | Personnes liées à l'organisation |
| **GET** | `/organisations/{id}/mandats` | Mandats de l'organisation |
| **GET** | `/organisations/export/csv` | Export organisations CSV |
| **GET** | `/organisations/export/excel` | Export organisations Excel |
| **GET** | `/organisations/export/pdf` | Export organisations PDF |

### Détails d'une organisation

**GET** `/organisations/{id}`

**Réponse:**
```json
{
  "organisation": {
    "id": 1,
    "name": "Exemple SA",
    "type": "client",
    "category": "Institution",
    "pipeline_stage": "prospect",
    "email": "contact@exemple.com",
    "phone": "+33 1 23 45 67 89",
    "city": "Paris",
    "country_code": "FR",
    "language": "FR",
    "is_active": true,
    "created_at": "2025-01-15T10:00:00Z"
  },
  "people": [...],
  "mandats": [...],
  "activity_count": 42
}
```

### Statistiques

**GET** `/organisations/stats`

**Réponse:**
```json
{
  "total": 150,
  "by_category": {
    "Institution": 45,
    "Wholesale": 30,
    "CGPI": 75
  },
  "by_language": {
    "FR": 120,
    "EN": 30
  },
  "active": 140,
  "inactive": 10
}
```

---

## 👤 Personnes

**Prefix**: `/people`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/people` | Liste toutes les personnes |
| **POST** | `/people` | Créer une personne |
| **GET** | `/people/search?q={query}` | Rechercher des personnes |
| **GET** | `/people/stats` | Statistiques globales |
| **GET** | `/people/{id}` | Détails d'une personne |
| **PUT** | `/people/{id}` | Mettre à jour une personne |
| **DELETE** | `/people/{id}` | Supprimer une personne |
| **GET** | `/people/{id}/organisations` | Organisations liées à une personne |
| **GET** | `/people/{id}/interactions` | Interactions liées à une personne |
| **POST** | `/people/{id}/interactions` | Créer une interaction |
| **GET** | `/people/export/csv` | Export personnes CSV |
| **GET** | `/people/export/excel` | Export personnes Excel |
| **GET** | `/people/export/pdf` | Export personnes PDF |

### Détails d'une personne

**GET** `/people/{id}`

**Réponse:**
```json
{
  "person": {
    "id": 1,
    "first_name": "Jean",
    "last_name": "Dupont",
    "personal_email": "jean.dupont@email.com",
    "phone": "+33 6 12 34 56 78",
    "title": "Directeur",
    "created_at": "2025-01-15T10:00:00Z"
  },
  "organizations": [
    {
      "organisation_id": 5,
      "organisation_name": "Exemple SA",
      "role": "Contact Principal",
      "is_primary": true
    }
  ]
}
```

---

## 🔗 Liens Organisation-Personne

**Prefix**: `/org-links`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **POST** | `/org-links/bulk` | Créer plusieurs liens en masse |
| **GET** | `/org-links/{link_id}` | Détails d'un lien |
| **PUT** | `/org-links/{link_id}` | Mettre à jour un lien |
| **DELETE** | `/org-links/{link_id}` | Supprimer un lien |

### Création en masse

**POST** `/org-links/bulk`

**Body:**
```json
{
  "links": [
    {
      "person_id": 1,
      "organisation_id": 5,
      "role": "Contact Principal",
      "is_primary": true,
      "professional_email": "jean.dupont@exemple.com"
    },
    {
      "person_id": 2,
      "organisation_id": 5,
      "role": "Assistant",
      "is_primary": false
    }
  ]
}
```

---

## 💬 Interactions

**Prefix**: `/interactions`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/interactions` | Liste toutes les interactions |
| **POST** | `/interactions` | Créer une interaction |
| **GET** | `/interactions/{id}` | Détails d'une interaction |
| **PUT** | `/interactions/{id}` | Mettre à jour une interaction |
| **DELETE** | `/interactions/{id}` | Supprimer une interaction |
| **GET** | `/interactions/types` | Types d'interactions disponibles |
| **GET** | `/interactions/stats` | Statistiques des interactions |

### Types d'interactions

**GET** `/interactions/types`

**Réponse:**
```json
[
  "email",
  "phone",
  "meeting",
  "note",
  "task",
  "linkedin",
  "event"
]
```

---

## ✅ Tâches

**Prefix**: `/tasks`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/tasks` | Liste toutes les tâches |
| **POST** | `/tasks` | Créer une tâche |
| **GET** | `/tasks/stats` | Statistiques des tâches |
| **GET** | `/tasks/{id}` | Détails d'une tâche |
| **PUT** | `/tasks/{id}` | Mettre à jour une tâche |
| **DELETE** | `/tasks/{id}` | Supprimer une tâche |
| **POST** | `/tasks/{id}/snooze` | Reporter une tâche |
| **POST** | `/tasks/{id}/quick-action` | Action rapide (snooze_1d, mark_done, etc.) |
| **POST** | `/tasks/{id}/complete` | Marquer comme complétée |
| **GET** | `/tasks/export/csv` | Export tâches CSV |

### Statistiques

**GET** `/tasks/stats`

**Réponse:**
```json
{
  "total": 127,
  "by_status": {
    "TODO": 45,
    "DOING": 30,
    "DONE": 50,
    "CANCELLED": 2
  },
  "by_priority": {
    "CRITIQUE": 5,
    "HAUTE": 20,
    "NORMALE": 80,
    "BASSE": 22
  },
  "overdue": 8,
  "due_today": 12,
  "due_this_week": 35
}
```

### Actions rapides

**POST** `/tasks/{id}/quick-action`

**Body:**
```json
{
  "action": "snooze_1d" | "snooze_1w" | "mark_done" | "next_day"
}
```

---

## 📋 Mandats de Distribution

**Prefix**: `/mandats`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/mandats` | Liste tous les mandats |
| **POST** | `/mandats` | Créer un mandat |
| **GET** | `/mandats/active` | Mandats actifs |
| **GET** | `/mandats/organisation/{organisation_id}` | Mandats d'une organisation |
| **GET** | `/mandats/stats` | Statistiques des mandats |
| **GET** | `/mandats/{id}` | Détails d'un mandat |
| **GET** | `/mandats/{id}/is-actif` | Vérifier si mandat actif |
| **PUT** | `/mandats/{id}` | Mettre à jour un mandat |
| **DELETE** | `/mandats/{id}` | Supprimer un mandat |
| **GET** | `/mandats/export/csv` | Export mandats CSV |
| **GET** | `/mandats/export/pdf` | Export mandats PDF |

---

## 💼 Produits

**Prefix**: `/produits`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/produits/search?q={query}` | Rechercher des produits |
| **GET** | `/produits/by-isin/{isin}` | Produit par code ISIN |
| **GET** | `/produits/by-mandat/{mandat_id}` | Produits d'un mandat |
| **GET** | `/produits/{id}` | Détails d'un produit |
| **POST** | `/produits/associate-to-mandat` | Associer produit à un mandat |
| **PUT** | `/produits/{id}` | Mettre à jour un produit |
| **DELETE** | `/produits/{id}` | Supprimer un produit |
| **DELETE** | `/produits/association/{id}` | Supprimer une association |

---

## 📧 Email Marketing

**Prefix**: `/email`

### Templates Email

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/email/templates` | Lister tous les templates |
| **POST** | `/email/templates` | Créer un template |
| **GET** | `/email/templates/{id}` | Détails d'un template |
| **PUT** | `/email/templates/{id}` | Mettre à jour un template |
| **DELETE** | `/email/templates/{id}` | Supprimer un template |
| **POST** | `/email/templates/{id}/preview` | Aperçu du template |
| **GET** | `/email/templates/export/csv` | Export templates CSV |

### Campagnes Email

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/email/campaigns` | Lister toutes les campagnes |
| **POST** | `/email/campaigns` | Créer une campagne |
| **GET** | `/email/campaigns/{id}` | Détails d'une campagne |
| **PUT** | `/email/campaigns/{id}` | Mettre à jour une campagne |
| **DELETE** | `/email/campaigns/{id}` | Supprimer une campagne |
| **POST** | `/email/campaigns/{id}/prepare` | Préparer la campagne |
| **POST** | `/email/campaigns/{id}/start` | Démarrer l'envoi |
| **POST** | `/email/campaigns/{id}/pause` | Mettre en pause |
| **POST** | `/email/campaigns/{id}/cancel` | Annuler |
| **POST** | `/email/campaigns/{id}/send-test` | Envoyer un email de test |
| **GET** | `/email/campaigns/{id}/stats` | Statistiques de la campagne |
| **GET** | `/email/campaigns/{id}/sends` | Liste des envois |
| **GET** | `/email/campaigns/export/csv` | Export campagnes CSV |
| **GET** | `/email/campaigns/export/excel` | Export campagnes Excel |
| **GET** | `/email/campaigns/export/pdf` | Export campagnes PDF |

### Création de campagne

**POST** `/email/campaigns`

**Body:**
```json
{
  "name": "Newsletter Q1 2025",
  "description": "Newsletter trimestrielle",
  "provider": "brevo",
  "from_name": "Alforis Finance",
  "from_email": "contact@alforis.com",
  "track_opens": true,
  "track_clicks": true,
  "steps": [
    {
      "template_id": 1,
      "order_index": 0,
      "delay_hours": 0,
      "variant": "a"
    }
  ]
}
```

---

## 📋 Listes de Diffusion

**Prefix**: `/mailing-lists`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/mailing-lists` | Lister toutes les listes |
| **POST** | `/mailing-lists` | Créer une liste |
| **GET** | `/mailing-lists/{id}` | Détails d'une liste |
| **PUT** | `/mailing-lists/{id}` | Mettre à jour une liste |
| **DELETE** | `/mailing-lists/{id}` | Supprimer une liste |
| **POST** | `/mailing-lists/{id}/toggle-active` | Activer/Désactiver |
| **GET** | `/mailing-lists/{id}/contacts` | Contacts de la liste |
| **POST** | `/mailing-lists/{id}/contacts` | Ajouter des contacts |
| **DELETE** | `/mailing-lists/{id}/contacts/{contact_id}` | Retirer un contact |
| **GET** | `/mailing-lists/export/csv` | Export listes CSV |
| **GET** | `/mailing-lists/export/excel` | Export listes Excel |
| **GET** | `/mailing-lists/export/pdf` | Export listes PDF |

---

## 🤖 Workflows

**Prefix**: `/workflows`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/workflows` | Lister tous les workflows |
| **POST** | `/workflows` | Créer un workflow |
| **GET** | `/workflows/{id}` | Détails d'un workflow |
| **PUT** | `/workflows/{id}` | Mettre à jour un workflow |
| **DELETE** | `/workflows/{id}` | Supprimer un workflow |
| **POST** | `/workflows/{id}/activate` | Activer un workflow |
| **POST** | `/workflows/{id}/deactivate` | Désactiver un workflow |
| **POST** | `/workflows/{id}/execute` | Exécuter manuellement |
| **GET** | `/workflows/{id}/executions` | Historique d'exécution |
| **GET** | `/workflows/{id}/executions/{execution_id}` | Détails d'une exécution |
| **GET** | `/workflows/{id}/stats` | Statistiques du workflow |
| **GET** | `/workflows/templates` | Templates de workflow disponibles |
| **POST** | `/workflows/from-template/{template_id}` | Créer depuis template |

**Note**: Les workflows utilisent des définitions JSON pour configurer déclencheurs et actions. Voir [WORKFLOWS.md](WORKFLOWS.md) pour la documentation complète.

---

## 🔔 Webhooks

**Prefix**: `/webhooks`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/webhooks` | Lister tous les webhooks |
| **POST** | `/webhooks` | Créer un webhook |
| **GET** | `/webhooks/{id}` | Détails d'un webhook |
| **PUT** | `/webhooks/{id}` | Mettre à jour un webhook |
| **DELETE** | `/webhooks/{id}` | Supprimer un webhook |
| **POST** | `/webhooks/{id}/test` | Tester un webhook |
| **POST** | `/webhooks/{id}/rotate-secret` | Régénérer le secret |
| **GET** | `/webhooks/events` | Liste des événements disponibles |

### Événements disponibles

**GET** `/webhooks/events/available`

**Réponse:**
```json
[
  {
    "value": "organisation.created",
    "label": "Organisation créée",
    "description": "Déclenché lors de la création d'une organisation"
  },
  {
    "value": "task.completed",
    "label": "Tâche complétée",
    "description": "Déclenché quand une tâche passe à DONE"
  }
]
```

---

## 🌐 Webhooks Publics (Resend)

**Prefix**: `/external-webhooks`

**Note**: Ces endpoints sont destinés à recevoir des webhooks externes (Resend pour les emails). Ils ne nécessitent pas d'authentification JWT mais utilisent une vérification par signature.

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **POST** | `/external-webhooks/resend` | Webhook Resend (événements email) |

### Événements Resend traités

- `email.sent` - Email envoyé
- `email.delivered` - Email délivré
- `email.delivery_delayed` - Livraison retardée
- `email.bounced` - Email rejeté
- `email.opened` - Email ouvert
- `email.clicked` - Lien cliqué

---

## 🤖 Agent IA

**Prefix**: `/ai`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **POST** | `/ai/chat` | Conversation avec l'agent IA |
| **GET** | `/ai/suggestions` | Obtenir des suggestions IA |
| **GET** | `/ai/statistics` | Statistiques d'utilisation IA |
| **GET** | `/ai/config` | Configuration de l'agent IA |
| **PUT** | `/ai/config` | Mettre à jour la configuration |

### Chat avec l'agent

**POST** `/ai/chat`

**Body:**
```json
{
  "message": "Quelles sont mes tâches urgentes?",
  "context": {
    "organisation_id": 5,
    "person_id": 12
  }
}
```

**Réponse:**
```json
{
  "response": "Vous avez 3 tâches urgentes...",
  "suggestions": [
    "Voir les tâches",
    "Créer une interaction"
  ]
}
```

---

## 📊 Dashboards & Statistiques

**Prefix**: `/dashboards`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/dashboards/stats/global` | Statistiques globales du dashboard |
| **GET** | `/dashboards/stats/organisation/{id}` | Statistiques d'une organisation |

### Statistiques globales

**GET** `/dashboards/stats/global`

**Réponse:**
```json
{
  "organisations_count": 150,
  "people_count": 320,
  "tasks_pending": 45,
  "tasks_overdue": 8,
  "mandats_active": 78,
  "recent_activities": [...]
}
```

---

## 📥 Imports

**Prefix**: `/imports`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **POST** | `/imports/organisations` | Import massif d'organisations |
| **POST** | `/imports/people` | Import massif de personnes |
| **POST** | `/imports/mandats` | Import massif de mandats |
| **POST** | `/imports/interactions` | Import massif d'interactions |
| **POST** | `/imports/validate` | Valider un fichier avant import |
| **GET** | `/imports/history` | Historique des imports |
| **GET** | `/imports/{import_id}/status` | Statut d'un import |

### Import d'organisations

**POST** `/imports/organisations/bulk`

**Body:**
```json
{
  "organisations": [
    {
      "name": "Exemple SA",
      "email": "contact@exemple.com",
      "category": "Institution",
      "type": "client",
      "country_code": "FR",
      "language": "FR"
    }
  ]
}
```

**Réponse:**
```json
{
  "total": 100,
  "created": 95,
  "failed": 5,
  "errors": [
    {
      "index": 42,
      "row": 44,
      "error": "Email déjà existant en base: duplicate@example.com"
    }
  ]
}
```

---

## 🌍 API Publique

**Prefix**: `/public`

**Note**: Ces endpoints sont publics et ne nécessitent pas d'authentification. Ils sont destinés à être utilisés par des utilisateurs externes (liens de désinscription, etc.).

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/public/unsubscribe?token={token}` | Page de désinscription RGPD |
| **POST** | `/public/unsubscribe` | Confirmer la désinscription |
| **GET** | `/public/preferences?token={token}` | Page préférences email |
| **POST** | `/public/preferences` | Mettre à jour les préférences |

### Désinscription RGPD

**GET** `/public/unsubscribe?token={jwt_token}`

Affiche une page HTML permettant à l'utilisateur de se désabonner des communications marketing.

**POST** `/public/unsubscribe`

**Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "reason": "too_many_emails",
  "feedback": "Message optionnel"
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Vous avez été désinscrit avec succès"
}
```

---

## 🏥 Health Check

**Prefix**: `/health`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/health` | Vérifier l'état de l'API |
| **GET** | `/ready` | Vérifier si l'API est prête (readiness probe) |

**Réponse:**
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

---

## 🔒 Sécurité & Authentification

### Headers requis

```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

### Gestion des erreurs

Format standardisé pour toutes les erreurs :

```json
{
  "detail": "Message d'erreur descriptif"
}
```

**Codes HTTP:**
- `200` - Succès
- `201` - Créé
- `204` - Pas de contenu (suppression réussie)
- `400` - Requête invalide
- `401` - Non authentifié (token manquant/invalide)
- `403` - Non autorisé (permissions insuffisantes)
- `404` - Ressource non trouvée
- `422` - Erreur de validation (données invalides)
- `500` - Erreur serveur

---

## 📝 Notes techniques

- **Timestamps**: Format ISO 8601 UTC (`2025-01-15T10:30:00Z`)
- **Pagination**: Paramètres `skip` et `limit` (défaut: skip=0, limit=20-100 selon endpoint)
- **Recherche**: Recherche insensible à la casse (ILIKE) sur les champs texte
- **Filtres**: Combinaison AND par défaut
- **Tri**: Paramètres `order_by` et `order` (asc/desc) quand disponibles

---

## 📋 Résumé des Endpoints

**Total**: ~100+ endpoints

### Par module
- **Auth & Users**: 11 endpoints
- **Organisations**: 12 endpoints
- **Personnes**: 13 endpoints
- **Liens Org-Person**: 4 endpoints
- **Interactions**: 7 endpoints
- **Tâches**: 10 endpoints
- **Mandats**: 11 endpoints
- **Produits**: 7 endpoints
- **Email Templates**: 7 endpoints
- **Email Campagnes**: 12 endpoints
- **Listes de Diffusion**: 12 endpoints
- **Workflows**: 13 endpoints
- **Webhooks**: 8 endpoints
- **Webhooks Publics (Resend)**: 1 endpoint
- **Agent IA**: 5 endpoints
- **Dashboards**: 2 endpoints
- **Imports**: 7 endpoints
- **API Publique**: 4 endpoints
- **Health Check**: 2 endpoints

### Fonctionnalités transversales
- **Exports**: CSV, Excel, PDF disponibles pour organisations, personnes, tâches, mandats, campagnes, listes, templates
- **Recherche**: Disponible sur organisations, personnes, produits
- **Statistiques**: Disponibles pour chaque module
- **Pagination**: Supportée partout (params `page`, `page_size`)
- **Filtres**: Disponibles sur tous les endpoints de liste

---

## 📚 Documentation Complémentaire

- [WORKFLOWS.md](WORKFLOWS.md) - Guide complet workflows
- [IMPORTS.md](IMPORTS.md) - Guide imports massifs
- [EXPORTS.md](EXPORTS.md) - Guide exports multi-formats
- [RECHERCHE.md](RECHERCHE.md) - Recherche full-text PostgreSQL
- [email-campaigns-guide.md](../marketing/email-campaigns-guide.md) - Guide complet campagnes email

---

**Version API:** v1.0
**Production**: https://crm.alforis.fr/api/v1
**Documentation Interactive**: https://crm.alforis.fr/api/v1/docs
**Dernière mise à jour:** 23 Octobre 2025
