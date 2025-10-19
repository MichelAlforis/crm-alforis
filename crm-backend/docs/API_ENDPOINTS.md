# Documentation API - CRM TPM Finance

> **Base URL**: `/api/v1`
> **Format**: JSON
> **Authentification**: Bearer Token (JWT)

---

## 📑 Table des matières

- [Authentification](#authentification)
- [Recherche](#recherche)
- [Organisations](#organisations)
- [Personnes](#personnes)
- [Mandats de Distribution](#mandats-de-distribution)
- [Produits](#produits)
- [Tâches](#tâches)
- [Newsletters](#newsletters)
- [Email Automation](#email-automation)
- [Webhooks](#webhooks)
- [Dashboards & Widgets](#dashboards--widgets)
- [Endpoints Legacy (Deprecated)](#endpoints-legacy-deprecated)

---

## 🔐 Authentification

### Connexion
**POST** `/auth/login`

**Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```

### Utilisateur actuel
**GET** `/auth/me`

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "id": 1,
  "username": "string",
  "email": "string",
  "full_name": "string"
}
```

---

## 🔍 Recherche

### Autocomplétion
**GET** `/search/autocomplete`

**Query Params:**
- `q` (string, required): Terme de recherche
- `type` (string): Type d'entité (`organisations`, `people`, `mandats`, `tasks`)
- `limit` (int, default: 10): Nombre de résultats

**Response:**
```json
[
  {
    "id": 1,
    "name": "string",
    "type": "string",
    "...": "additional fields"
  }
]
```

---

## 🏢 Organisations

### Lister les organisations
**GET** `/organisations`

**Query Params:**
- `skip` (int, default: 0)
- `limit` (int, default: 100)
- `category` (string): Catégorie de l'organisation
- `is_active` (boolean): Statut actif
- `country_code` (string): Code pays
- `language` (string): Langue

**Response:**
```json
{
  "items": [...],
  "total": 0,
  "skip": 0,
  "limit": 100
}
```

### Obtenir une organisation
**GET** `/organisations/{id}`

**Response:**
```json
{
  "organisation": { ... },
  "people": [...],
  "mandats": [...],
  "activity_count": 0
}
```

### Rechercher des organisations
**GET** `/organisations/search`

**Query Params:**
- `q` (string, required): Terme de recherche
- `skip` (int)
- `limit` (int)

### Organisations par langue
**GET** `/organisations/by-language/{language}`

**Query Params:**
- `skip` (int)
- `limit` (int)

### Statistiques des organisations
**GET** `/organisations/stats`

**Response:**
```json
{
  "total": 0,
  "by_category": {
    "client": 0,
    "fournisseur": 0
  },
  "by_language": {
    "fr": 0,
    "en": 0
  }
}
```

### Activité d'une organisation
**GET** `/organisations/{id}/activity`

**Query Params:**
- `limit` (int): Nombre d'activités
- `before_id` (int): ID pour pagination curseur
- `types` (array): Types d'activités

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "type": "string",
      "title": "string",
      "preview": "string",
      "occurred_at": "2025-01-01T00:00:00Z",
      "actor_name": "string",
      "organisation_id": 1,
      "organisation_name": "string"
    }
  ],
  "total": 0,
  "limit": 20
}
```

### Créer une organisation
**POST** `/organisations`

**Body:**
```json
{
  "name": "string",
  "category": "string",
  "language": "fr",
  "country_code": "FR",
  "is_active": true,
  "contact_email": "string",
  "contact_phone": "string"
}
```

### Mettre à jour une organisation
**PUT** `/organisations/{id}`

### Supprimer une organisation
**DELETE** `/organisations/{id}`

---

## 👥 Personnes

### Lister les personnes
**GET** `/people`

**Query Params:**
- `skip` (int, default: 0)
- `limit` (int, default: 50)
- `q` (string): Recherche
- `organization_type` (string): Type d'organisation
- `organization_id` (int): ID de l'organisation

### Obtenir une personne
**GET** `/people/{id}`

**Response:**
```json
{
  "person": { ... },
  "organizations": [...]
}
```

### Créer une personne
**POST** `/people`

**Body:**
```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string",
  "title": "string"
}
```

### Mettre à jour une personne
**PUT** `/people/{id}`

### Supprimer une personne
**DELETE** `/people/{id}`

### Lier une personne à une organisation
**POST** `/org-links`

**Body:**
```json
{
  "person_id": 1,
  "organisation_id": 1,
  "role": "string",
  "is_primary": false
}
```

### Mettre à jour un lien organisation
**PUT** `/org-links/{link_id}`

### Supprimer un lien organisation
**DELETE** `/org-links/{link_id}`

---

## 📋 Mandats de Distribution

### Lister les mandats
**GET** `/mandats`

**Query Params:**
- `skip` (int)
- `limit` (int)
- `organisation_id` (int)
- `status` (string)

### Obtenir un mandat
**GET** `/mandats/{id}`

### Mandats actifs
**GET** `/mandats/active`

**Query Params:**
- `organisation_id` (int, optional)

### Mandats par organisation
**GET** `/mandats/organisation/{organisation_id}`

### Vérifier si un mandat est actif
**GET** `/mandats/{id}/is-actif`

**Response:**
```json
{
  "mandat_id": 1,
  "is_actif": true
}
```

### Créer un mandat
**POST** `/mandats`

**Body:**
```json
{
  "organisation_id": 1,
  "nom_mandat": "string",
  "date_signature": "2025-01-01",
  "date_expiration": "2026-01-01",
  "montant_aum": 1000000.0,
  "commission_taux": 1.5,
  "statut": "actif"
}
```

### Mettre à jour un mandat
**PUT** `/mandats/{id}`

### Supprimer un mandat
**DELETE** `/mandats/{id}`

---

## 💼 Produits

### Lister les produits
**GET** `/produits`

**Query Params:**
- `skip` (int)
- `limit` (int)
- `type` (string)
- `status` (string)

### Obtenir un produit
**GET** `/produits/{id}`

### Rechercher des produits
**GET** `/produits/search`

**Query Params:**
- `q` (string, required)
- `skip` (int)
- `limit` (int)

### Produit par ISIN
**GET** `/produits/by-isin/{isin}`

### Produits par mandat
**GET** `/produits/by-mandat/{mandat_id}`

### Créer un produit
**POST** `/produits`

**Body:**
```json
{
  "nom": "string",
  "isin": "string",
  "type_produit": "OPCVM",
  "devise": "EUR",
  "statut": "actif",
  "srri": 3,
  "frais_gestion": 1.5,
  "description": "string"
}
```

### Mettre à jour un produit
**PUT** `/produits/{id}`

### Supprimer un produit
**DELETE** `/produits/{id}`

### Associer un produit à un mandat
**POST** `/produits/associate-to-mandat`

**Body:**
```json
{
  "mandat_id": 1,
  "produit_id": 1,
  "allocation_pourcentage": 25.5
}
```

### Supprimer l'association produit-mandat
**DELETE** `/produits/association/{association_id}`

---

## ✅ Tâches

### Lister les tâches
**GET** `/tasks`

**Query Params:**
- `skip` (int)
- `limit` (int)
- `status` (string): `pending`, `in_progress`, `completed`, `cancelled`
- `priority` (string): `low`, `medium`, `high`, `urgent`
- `category` (string): Task category
- `view` (string): `today`, `overdue`, `next7`, `all`
- `investor_id` (int)
- `fournisseur_id` (int)
- `person_id` (int)

### Obtenir une tâche
**GET** `/tasks/{id}`

### Statistiques des tâches
**GET** `/tasks/stats`

**Response:**
```json
{
  "total": 0,
  "by_status": {
    "pending": 0,
    "in_progress": 0,
    "completed": 0
  },
  "by_priority": {
    "low": 0,
    "medium": 0,
    "high": 0,
    "urgent": 0
  },
  "overdue": 0,
  "due_today": 0,
  "due_this_week": 0
}
```

### Créer une tâche
**POST** `/tasks`

**Body:**
```json
{
  "title": "string",
  "description": "string",
  "due_date": "2025-01-01T10:00:00Z",
  "priority": "medium",
  "status": "pending",
  "category": "follow_up",
  "investor_id": 1,
  "person_id": 1
}
```

### Mettre à jour une tâche
**PUT** `/tasks/{id}`

### Supprimer une tâche
**DELETE** `/tasks/{id}`

### Reporter une tâche (Snooze)
**POST** `/tasks/{id}/snooze`

**Body:**
```json
{
  "days": 7
}
```

### Action rapide
**POST** `/tasks/{id}/quick-action`

**Body:**
```json
{
  "action": "snooze_1d" | "snooze_1w" | "mark_done" | "next_day"
}
```

---

## 📰 Newsletters

> ⚠️ **Phase 3** - Fonctionnalité de newsletters (peut ne pas être encore implémentée côté backend)

### Lister les newsletters
**GET** `/newsletters`

**Query Params:**
- `type` (string, optional): Type de newsletter

**Response:**
```json
[
  {
    "id": 1,
    "title": "string",
    "type": "string",
    "content": "string",
    "created_at": "2025-01-01T00:00:00Z",
    "sent_at": "2025-01-01T10:00:00Z"
  }
]
```

### Créer une newsletter
**POST** `/newsletters`

**Body:**
```json
{
  "title": "string",
  "type": "marketing" | "informational" | "announcement",
  "content": "string",
  "html_content": "<html>...</html>",
  "recipients": ["email1@example.com", "email2@example.com"]
}
```

**Response:**
```json
{
  "id": 1,
  "title": "string",
  "type": "string",
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Envoyer une newsletter
**POST** `/newsletters/{id}/send`

**Response:**
```json
{
  "message": "Newsletter envoyée avec succès",
  "sent_count": 150
}
```

### Supprimer une newsletter
**DELETE** `/newsletters/{id}`

---

## 📧 Email Automation

### Templates

#### Lister les templates
**GET** `/email/templates`

**Query Params:**
- `only_active` (boolean, default: true)

#### Créer un template
**POST** `/email/templates`

**Body:**
```json
{
  "name": "string",
  "subject": "string",
  "html_content": "<html>...</html>",
  "design_json": {},
  "is_active": true,
  "category": "string"
}
```

#### Mettre à jour un template
**PUT** `/email/templates/{id}`

---

### Campagnes

#### Lister les campagnes
**GET** `/email/campaigns`

**Query Params:**
- `skip` (int)
- `limit` (int)
- `status` (string)
- `provider` (string)

#### Obtenir une campagne
**GET** `/email/campaigns/{id}`

#### Créer une campagne
**POST** `/email/campaigns`

**Body:**
```json
{
  "name": "string",
  "description": "string",
  "provider": "brevo",
  "from_name": "string",
  "from_email": "string",
  "subject": "string",
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

#### Mettre à jour une campagne
**PUT** `/email/campaigns/{id}`

#### Planifier une campagne
**POST** `/email/campaigns/{id}/schedule`

**Body:**
```json
{
  "scheduled_at": "2025-01-01T10:00:00Z",
  "schedule_type": "immediate" | "scheduled" | "recurring"
}
```

#### Statistiques d'une campagne
**GET** `/email/campaigns/{id}/stats`

**Response:**
```json
{
  "total_sends": 0,
  "delivered": 0,
  "opens": 0,
  "clicks": 0,
  "bounces": 0,
  "unsubscribes": 0,
  "open_rate": 0.0,
  "click_rate": 0.0
}
```

#### Envois d'une campagne
**GET** `/email/campaigns/{id}/sends`

**Query Params:**
- `skip` (int)
- `limit` (int)
- `status` (string)

---

## 🔔 Webhooks

### Lister les webhooks
**GET** `/webhooks`

**Query Params:**
- `is_active` (boolean)

### Obtenir un webhook
**GET** `/webhooks/{id}`

### Événements disponibles
**GET** `/webhooks/events/available`

**Response:**
```json
[
  {
    "value": "organisation.created",
    "label": "Organisation créée",
    "description": "Déclenché lors de la création d'une organisation"
  }
]
```

### Créer un webhook
**POST** `/webhooks`

**Body:**
```json
{
  "url": "https://example.com/webhook",
  "events": ["organisation.created", "task.completed"],
  "description": "string",
  "is_active": true,
  "secret": "string (optional)"
}
```

### Mettre à jour un webhook
**PUT** `/webhooks/{id}`

### Supprimer un webhook
**DELETE** `/webhooks/{id}`

### Rotation du secret
**POST** `/webhooks/{id}/rotate-secret`

**Body (optional):**
```json
{
  "new_secret": "string (optional)"
}
```

**Response:**
```json
{
  "id": 1,
  "url": "string",
  "secret": "new-secret-value",
  ...
}
```

---

## 📊 Dashboards & Widgets

### Widget d'activité
**GET** `/dashboards/widgets/activity`

**Query Params:**
- `organisation_ids` (array): IDs des organisations à inclure
- `types` (array): Types d'activités à filtrer
- `limit` (int, default: 30)

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "type": "organisation.created",
      "title": "string",
      "preview": "string",
      "occurred_at": "2025-01-01T00:00:00Z",
      "actor_name": "string",
      "organisation_id": 1,
      "organisation_name": "string"
    }
  ],
  "total": 0,
  "limit": 30
}
```

---

## 🗄️ Endpoints Legacy (Deprecated)

> ⚠️ **Ces endpoints sont dépréciés et seront supprimés dans une future version.**
> Utilisez les nouveaux endpoints `/organisations` à la place.

### Investors (Legacy)

- **GET** `/investors` → Utiliser `/organisations?category=client`
- **GET** `/investors/{id}` → Utiliser `/organisations/{id}`
- **POST** `/investors` → Utiliser `/organisations`
- **PUT** `/investors/{id}` → Utiliser `/organisations/{id}`
- **DELETE** `/investors/{id}` → Utiliser `/organisations/{id}`

### Fournisseurs (Legacy)

- **GET** `/fournisseurs` → Utiliser `/organisations?category=fournisseur`
- **GET** `/fournisseurs/{id}` → Utiliser `/organisations/{id}`
- **POST** `/fournisseurs` → Utiliser `/organisations`
- **PUT** `/fournisseurs/{id}` → Utiliser `/organisations/{id}`
- **DELETE** `/fournisseurs/{id}` → Utiliser `/organisations/{id}`
- **GET** `/fournisseurs/{id}/kpis` → Utiliser les endpoints dashboards
- **POST** `/fournisseurs/{id}/kpis` → Utiliser les endpoints dashboards
- **PUT** `/fournisseurs/{fournisseur_id}/kpis/{kpi_id}` → Utiliser les endpoints dashboards
- **DELETE** `/fournisseurs/{fournisseur_id}/kpis/{kpi_id}` → Utiliser les endpoints dashboards

### Interactions (Legacy)

- **GET** `/interactions/investor/{investor_id}` → Utiliser `/organisations/{id}/activity`
- **POST** `/interactions/investor/{investor_id}` → Utiliser `/organisations/{id}/activity`
- **PUT** `/interactions/{id}` → Utiliser les nouveaux endpoints d'activité
- **DELETE** `/interactions/{id}` → Utiliser les nouveaux endpoints d'activité

### KPIs (Legacy)

- **GET** `/kpis/investor/{investor_id}` → Utiliser `/dashboards/stats`
- **GET** `/kpis/investor/{investor_id}/month/{year}/{month}` → Utiliser `/dashboards/stats`
- **POST** `/kpis/investor/{investor_id}` → Utiliser `/dashboards/stats`
- **PUT** `/kpis/{id}` → Utiliser `/dashboards/stats`
- **DELETE** `/kpis/{id}` → Utiliser `/dashboards/stats`

---

## 🔒 Sécurité & Authentification

### Headers requis

```http
Authorization: Bearer {token}
Content-Type: application/json
```

### Gestion des erreurs

Toutes les erreurs retournent un format standardisé :

```json
{
  "detail": "Message d'erreur descriptif"
}
```

**Codes HTTP:**
- `200` - Succès
- `201` - Créé
- `204` - Pas de contenu (succès sans réponse)
- `400` - Requête invalide
- `401` - Non authentifié
- `403` - Non autorisé
- `404` - Ressource non trouvée
- `422` - Erreur de validation
- `500` - Erreur serveur

### Webhooks - Sécurité

Les webhooks sont signés avec HMAC-SHA256. Vérifiez la signature dans le header `X-Webhook-Signature`:

```python
import hmac
import hashlib

def verify_webhook(payload: str, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

---

## 📝 Notes

- Tous les timestamps sont en format ISO 8601 UTC
- La pagination utilise `skip` et `limit`
- Les recherches supportent la recherche partielle (ILIKE)
- Les filtres multiples sont combinés avec AND
- Les tris peuvent être spécifiés avec `sort_by` et `order` (asc/desc)

---

## 🔗 État de l'intégration Frontend

### ✅ Endpoints entièrement intégrés dans le frontend

| Catégorie | Endpoints | Statut |
|-----------|-----------|--------|
| **Authentification** | `/auth/login`, `/auth/me` | ✅ Intégré |
| **Recherche** | `/search/autocomplete` | ✅ Intégré |
| **Organisations** | Tous les endpoints CRUD + activity | ✅ Intégré |
| **Personnes** | Tous les endpoints CRUD + liens org | ✅ Intégré |
| **Mandats** | Tous les endpoints CRUD | ✅ Intégré |
| **Produits** | Tous les endpoints CRUD + associations | ✅ Intégré |
| **Tâches** | Tous les endpoints + snooze/quick actions | ✅ Intégré |
| **Email Templates** | GET, POST, PUT | ✅ Intégré |
| **Email Campaigns** | Tous les endpoints + stats/sends | ✅ Intégré |
| **Webhooks** | Tous les endpoints + rotation secret | ✅ Intégré |
| **Dashboards** | Widget d'activité | ✅ Intégré |

### ⚠️ Endpoints partiellement intégrés

| Endpoint | Statut | Notes |
|----------|--------|-------|
| **Newsletters** | ⚠️ Frontend uniquement | Implémenté côté frontend mais peut ne pas exister côté backend |

### ❌ Endpoints manquants dans le frontend

Les endpoints suivants sont documentés mais **NON implémentés** dans le client API frontend (`lib/api.ts`) :

#### Email Templates
- ❌ **DELETE** `/email/templates/{id}` - Suppression de templates

#### Dashboards
- ❌ **GET** `/dashboards/stats` - Statistiques générales du dashboard
- ❌ Autres endpoints dashboards non spécifiés

#### Exports/Imports
- ❌ Endpoints d'export de données (si existants)
- ❌ Endpoints d'import de données (si existants)

### 📋 Migration des Endpoints Legacy

#### ✅ Phase 1 : COMPLÉTÉE (2025-01-19)

La **Phase 1** de migration a été implémentée avec succès ! Les méthodes legacy dans `lib/api.ts` utilisent maintenant les nouveaux endpoints en interne tout en conservant leur interface publique.

| Endpoint Legacy | Nouveau Endpoint | Statut Migration |
|-----------------|------------------|------------------|
| **GET** `/investors` | **GET** `/organisations` | ✅ **MIGRÉ** - Appelle `getOrganisations()` + mapping |
| **GET** `/investors/{id}` | **GET** `/organisations/{id}` | ✅ **MIGRÉ** - Appelle `getOrganisation()` + mapping |
| **POST** `/investors` | **POST** `/organisations` | ✅ **MIGRÉ** - Appelle `createOrganisation()` (category=DISTRIBUTEUR) |
| **PUT** `/investors/{id}` | **PUT** `/organisations/{id}` | ✅ **MIGRÉ** - Appelle `updateOrganisation()` + mapping |
| **DELETE** `/investors/{id}` | **DELETE** `/organisations/{id}` | ✅ **MIGRÉ** - Appelle `deleteOrganisation()` |
| **GET** `/fournisseurs` | **GET** `/organisations` | ✅ **MIGRÉ** - Appelle `getOrganisations()` + mapping |
| **GET** `/fournisseurs/{id}` | **GET** `/organisations/{id}` | ✅ **MIGRÉ** - Appelle `getOrganisation()` + mapping |
| **POST** `/fournisseurs` | **POST** `/organisations` | ✅ **MIGRÉ** - Appelle `createOrganisation()` (category=FOURNISSEUR_SERVICE) |
| **PUT** `/fournisseurs/{id}` | **PUT** `/organisations/{id}` | ✅ **MIGRÉ** - Appelle `updateOrganisation()` + mapping |
| **DELETE** `/fournisseurs/{id}` | **DELETE** `/organisations/{id}` | ✅ **MIGRÉ** - Appelle `deleteOrganisation()` |
| **GET** `/interactions/investor/{id}` | **GET** `/organisations/{id}/activity` | ✅ **MIGRÉ** - Appelle `getOrganisationActivity()` + mapping |
| **POST** `/interactions/investor/{id}` | N/A | ⚠️ **DEPRECATED** - Retourne une erreur explicite |
| **PUT** `/interactions/{id}` | N/A | ⚠️ **DEPRECATED** - Retourne une erreur explicite |
| **DELETE** `/interactions/{id}` | N/A | ⚠️ **DEPRECATED** - Retourne une erreur explicite |

#### 🔧 Détails techniques de la migration

**Mapping automatique des données :**
- `Investor` ↔ `Organisation` : Conversion transparente avec valeurs par défaut
- `Fournisseur` ↔ `Organisation` : Conversion transparente avec valeurs par défaut
- `Interaction` ↔ `OrganisationActivity` : Mapping en lecture seule

**Catégories utilisées :**
- Investors → `category: 'DISTRIBUTEUR'`
- Fournisseurs → `category: 'FOURNISSEUR_SERVICE'`

**Valeurs par défaut ajoutées :**
- `pipeline_stage: 'prospect_froid'` (pour compatibilité Investor)
- `interaction_count: 0`, `kpi_count: 0` (champs legacy)

**Recherche améliorée :**
- Si `searchText` est fourni dans `getInvestors()` ou `getFournisseurs()`, utilise automatiquement `searchOrganisations()`

#### ✅ Phase 2 : COMPLÉTÉE (2025-01-19)

La **Phase 2** de migration a été implémentée avec succès ! Les méthodes KPI legacy ont été migrées vers les nouveaux endpoints `/dashboards/stats`.

| Endpoint Legacy | Nouveau Endpoint | Statut Migration |
|-----------------|------------------|------------------|
| **GET** `/kpis/investor/{id}` | **GET** `/dashboards/stats/organisation/{id}/kpis` | ✅ **MIGRÉ** |
| **POST** `/kpis/investor/{id}` | N/A | ⚠️ **DEPRECATED** - Retourne une erreur (KPIs calculés automatiquement) |
| **PUT** `/kpis/{id}` | N/A | ⚠️ **DEPRECATED** - Retourne une erreur (KPIs en lecture seule) |
| **DELETE** `/kpis/{id}` | N/A | ⚠️ **DEPRECATED** - Retourne une erreur (KPIs en lecture seule) |
| **GET** `/fournisseurs/{id}/kpis` | **GET** `/dashboards/stats/organisation/{id}/kpis` | ✅ **MIGRÉ** |
| **POST** `/fournisseurs/{id}/kpis` | N/A | ⚠️ **DEPRECATED** - Retourne une erreur (KPIs calculés automatiquement) |
| **PUT** `/fournisseurs/{fid}/kpis/{kid}` | N/A | ⚠️ **DEPRECATED** - Retourne une erreur (KPIs en lecture seule) |
| **DELETE** `/fournisseurs/{fid}/kpis/{kid}` | N/A | ⚠️ **DEPRECATED** - Retourne une erreur (KPIs en lecture seule) |

#### 📊 Nouveaux endpoints Dashboard Stats créés

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/dashboards/stats/global` | Statistiques globales du dashboard |
| **GET** | `/dashboards/stats/organisation/{id}` | Statistiques pour une organisation |
| **GET** | `/dashboards/stats/organisation/{id}/kpis` | KPIs mensuels d'une organisation |
| **GET** | `/dashboards/stats/month/{year}/{month}` | Agrégation mensuelle tous comptes |
| **GET** | `/dashboards/stats/organisation/{id}/year/{year}` | Agrégation annuelle par organisation |

#### 🔧 Nouveaux schémas et services créés

**Backend:**
- ✅ `/schemas/dashboard_stats.py` - Schémas Pydantic pour les statistiques
- ✅ `/services/dashboard_stats.py` - Service de calcul des stats
- ✅ `/api/routes/dashboards.py` - Endpoints REST (mis à jour)

**Frontend:**
- ✅ `lib/api.ts` - Méthodes `getGlobalDashboardStats()`, `getOrganisationStats()`, etc.
- ✅ Migration KPI : `getKPIs()` et `getKPIsByFournisseur()` utilisent maintenant `/dashboards/stats`
- ✅ Build réussi sans erreurs TypeScript

#### ⚠️ Note importante sur les KPIs

Les KPIs ne sont **plus modifiables** dans le nouveau système. Ils sont destinés à être **calculés automatiquement** depuis les activités du CRM. Pour l'instant, les endpoints retournent des données vides car le système de calcul automatique n'est pas encore implémenté.

### 🔄 Plan de migration (mis à jour)

1. **Phase 1** - ✅ **COMPLÉTÉE** (2025-01-19)
   - ✅ Wrapper des méthodes legacy pour utiliser les nouveaux endpoints
   - ✅ Mapping transparent Investor/Fournisseur ↔ Organisation
   - ✅ Aucun changement requis dans les hooks ou composants
   - ✅ Pas de requêtes HTTP aux anciens endpoints legacy

2. **Phase 2** - ✅ **COMPLÉTÉE** (2025-01-19)
   - ✅ Créé les nouveaux endpoints `/dashboards/stats` pour remplacer KPIs
   - ✅ Migré les endpoints KPI vers le nouveau système (lecture seule)
   - ✅ Build frontend réussi avec tous les changements
   - ⚠️ KPIs retournent des données vides (calcul automatique à implémenter)

3. **Phase 3** - ⏳ **À VENIR**
   - Implémenter le calcul automatique des KPIs depuis les activités
   - Créer une table dédiée pour le stockage des KPIs si nécessaire
   - Supprimer les wrappers legacy de `lib/api.ts`
   - Mettre à jour les hooks pour utiliser directement les endpoints organisations
   - Nettoyer les types legacy (Investor, Fournisseur, Interaction)
   - Supprimer les routes backend legacy

---

**Version API:** v1
**Dernière mise à jour:** 2025-01-19
**État Frontend:** Build réussi - Phase 2 complétée le 2025-01-19
