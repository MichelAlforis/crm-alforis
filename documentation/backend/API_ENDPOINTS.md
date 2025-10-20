# Documentation API - CRM Alforis (Architecture Unifiée)

> **Base URL**: `http://localhost:8000/api/v1`
> **Format**: JSON
> **Authentification**: Bearer Token (JWT)
> **Version**: v1.0 (Architecture unifiée - Janvier 2025)

---

## 📑 Table des matières

- [🔐 Authentification](#-authentification)
- [🔍 Recherche](#-recherche)
- [🏢 Organisations](#-organisations)
- [👥 Personnes](#-personnes)
- [🔗 Liens Organisation-Personne](#-liens-organisation-personne)
- [✅ Tâches](#-tâches)
- [📋 Mandats de Distribution](#-mandats-de-distribution)
- [💼 Produits](#-produits)
- [📧 Email Automation](#-email-automation)
- [🤖 Workflows](#-workflows)
- [🔔 Webhooks](#-webhooks)
- [📊 Dashboards & Statistiques](#-dashboards--statistiques)
- [📤 Exports](#-exports)
- [📥 Imports](#-imports)
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

## 🔍 Recherche

**Prefix**: `/search`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/search/organisations?q={query}` | Recherche d'organisations |
| **GET** | `/search/people?q={query}` | Recherche de personnes |
| **GET** | `/search/mandats?q={query}` | Recherche de mandats |
| **GET** | `/search/autocomplete?q={query}&type={type}` | Autocomplétion multitype |

**Query params communs:**
- `q` (string, required): Terme de recherche
- `skip` (int, default: 0): Offset pagination
- `limit` (int, default: 20): Limite de résultats

---

## 🏢 Organisations

**Prefix**: `/organisations`

### Endpoints principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/organisations/search?q={query}` | Rechercher des organisations |
| **GET** | `/organisations/stats` | Statistiques globales |
| **GET** | `/organisations/by-language/{language}` | Organisations par langue |
| **GET** | `/organisations/{id}` | Détails d'une organisation |
| **PUT** | `/organisations/{id}` | Mettre à jour une organisation |
| **DELETE** | `/organisations/{id}` | Supprimer une organisation |

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

## 👥 Personnes

**Prefix**: `/people`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/people/search?q={query}` | Rechercher des personnes |
| **GET** | `/people/{id}` | Détails d'une personne |
| **GET** | `/people/{id}/organisations` | Organisations liées à une personne |
| **PUT** | `/people/{id}` | Mettre à jour une personne |
| **DELETE** | `/people/{id}` | Supprimer une personne |

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

## ✅ Tâches

**Prefix**: `/tasks`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/tasks/stats` | Statistiques des tâches |
| **GET** | `/tasks/{id}` | Détails d'une tâche |
| **POST** | `/tasks/{id}/snooze` | Reporter une tâche |
| **POST** | `/tasks/{id}/quick-action` | Action rapide (snooze_1d, mark_done, etc.) |
| **PUT** | `/tasks/{id}` | Mettre à jour une tâche |
| **DELETE** | `/tasks/{id}` | Supprimer une tâche |

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
| **GET** | `/mandats/active` | Mandats actifs |
| **GET** | `/mandats/organisation/{organisation_id}` | Mandats d'une organisation |
| **GET** | `/mandats/{id}` | Détails d'un mandat |
| **GET** | `/mandats/{id}/is-actif` | Vérifier si mandat actif |
| **PUT** | `/mandats/{id}` | Mettre à jour un mandat |
| **DELETE** | `/mandats/{id}` | Supprimer un mandat |

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

## 📧 Email Automation

**Prefix**: `/email`

### Templates

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/email/templates` | Lister les templates |
| **POST** | `/email/templates` | Créer un template |
| **PUT** | `/email/templates/{id}` | Mettre à jour un template |

### Campagnes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/email/campaigns` | Lister les campagnes |
| **POST** | `/email/campaigns` | Créer une campagne |
| **GET** | `/email/campaigns/{id}` | Détails d'une campagne |
| **PUT** | `/email/campaigns/{id}` | Mettre à jour une campagne |
| **POST** | `/email/campaigns/{id}/schedule` | Planifier l'envoi |
| **GET** | `/email/campaigns/{id}/stats` | Statistiques de la campagne |
| **GET** | `/email/campaigns/{id}/sends` | Liste des envois |

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

## 🤖 Workflows

**Prefix**: `/workflows`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/workflows/{id}` | Détails d'un workflow |
| **PUT** | `/workflows/{id}` | Mettre à jour un workflow |
| **DELETE** | `/workflows/{id}` | Supprimer un workflow |
| **POST** | `/workflows/{id}/activate` | Activer un workflow |
| **POST** | `/workflows/{id}/execute` | Exécuter manuellement |
| **GET** | `/workflows/{id}/executions` | Historique d'exécution |
| **GET** | `/workflows/{id}/executions/{execution_id}` | Détails d'une exécution |
| **GET** | `/workflows/{id}/stats` | Statistiques du workflow |
| **GET** | `/workflows/templates/list` | Templates de workflow |
| **POST** | `/workflows/templates/{template_id}/create` | Créer depuis template |

---

## 🔔 Webhooks

**Prefix**: `/webhooks`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/webhooks/{id}` | Détails d'un webhook |
| **PUT** | `/webhooks/{id}` | Mettre à jour un webhook |
| **DELETE** | `/webhooks/{id}` | Supprimer un webhook |
| **POST** | `/webhooks/{id}/rotate-secret` | Régénérer le secret |
| **GET** | `/webhooks/events/available` | Liste des événements disponibles |

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

## 📤 Exports

**Prefix**: `/exports`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/exports/organisations/csv` | Export organisations CSV |
| **GET** | `/exports/organisations/excel` | Export organisations Excel |
| **GET** | `/exports/organisations/pdf` | Export organisations PDF |
| **GET** | `/exports/mandats/csv` | Export mandats CSV |
| **GET** | `/exports/mandats/pdf` | Export mandats PDF |

**Query params:**
- `ids` (array, optional): Liste d'IDs à exporter
- `filters` (object, optional): Filtres à appliquer

**Réponse:** Fichier binaire avec headers appropriés (`Content-Type`, `Content-Disposition`)

---

## 📥 Imports

**Prefix**: `/imports`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **POST** | `/imports/organisations/bulk` | Import massif d'organisations |
| **POST** | `/imports/people/bulk` | Import massif de personnes |

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

## 🏥 Health Check

**Prefix**: `/health`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/health/health` | Vérifier l'état de l'API |

**Réponse:**
```json
{
  "status": "ok"
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

## 🗑️ Endpoints supprimés

Les endpoints suivants ont été **supprimés** avec l'architecture unifiée :

- ❌ `/investors/*` - Remplacé par `/organisations`
- ❌ `/fournisseurs/*` - Remplacé par `/organisations`
- ❌ `/interactions/*` - Intégré dans `/organisations/{id}/activity`
- ❌ `/kpis/investor/*` - Remplacé par `/dashboards/stats`
- ❌ `/migration/*` - Plus nécessaire (base recréée proprement)

**Migration complète** : Toutes les données legacy ont été supprimées. Seules les tables unifiées existent maintenant.

---

**Version API:** v1.0
**Architecture:** Unifiée (Organisation + Person)
**Dernière mise à jour:** 20 Octobre 2024
**Base de données:** PostgreSQL 15 (base recréée proprement le 19 oct 2024)
