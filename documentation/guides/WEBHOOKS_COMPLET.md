# 📡 Webhooks CRM – Guide Complet

## 1. Objectifs & Résumé

Les webhooks permettent de recevoir en temps réel les événements majeurs du CRM Alforis sur un service externe (outil marketing, data warehouse, automatisations, etc.).

- ✅ **Modèle dédié** `webhooks` avec stockage du secret et des événements suivis
- ✅ **Service d’envoi asynchrone** avec signature HMAC SHA-256
- ✅ **Intégration Event Bus** : déclenché sur les actions clés (organisations, personnes, tâches, mandats, interactions)
- ✅ **CRUD API** (`/api/v1/webhooks`) + endpoint `events/available`
- ✅ **UI de gestion** : `/dashboard/settings/webhooks`
- ✅ **Documentation & validation** pour faciliter l’intégration côté partenaire

## 2. Architecture Technique

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ Action CRM   │ 1.    │ Event Bus Redis  │ 2.    │ core/webhooks.py │
│ (API/Service)├──────➤│ (EventType)      ├──────➤│ Trigger webhooks │
└──────────────┘       └──────────────────┘       └──────────────────┘
                                                       │
                                                       ▼
                                                HTTP POST signé
                                                vers l’intégration
```

1. Les routes API publient un `EventType` (ex. `organisation.created`)
2. `core.webhooks.register_webhook_listeners` s’abonne aux événements cibles
3. Le service récupère les webhooks actifs en base, signe la charge utile et envoie la requête via `httpx.AsyncClient`

## 3. Modèle & Migration

**Fichier** : `crm-backend/models/webhook.py`

| Colonne      | Type          | Description                                         |
|--------------|---------------|-----------------------------------------------------|
| `url`        | String(500)   | Endpoint HTTPS cible                                |
| `events`     | ARRAY(String) | Liste des `EventType.value` suivis                  |
| `secret`     | String(128)   | Secret HMAC (généré si absent)                      |
| `is_active`  | Boolean       | Permet de suspendre sans supprimer                  |
| `description`| Text          | Notes internes (optionnel)                          |
| `created_at` | timestamp     | Hérité de `BaseModel`                               |
| `updated_at` | timestamp     | Hérité de `BaseModel`                               |

**Migration** : `migrations/add_webhooks_table.py`

- Création de la table + indexes (`url`, `is_active`, `events` en GIN PostgreSQL)
- Compatible SQLite (fallback `Text`) pour les environnements locaux

## 4. Endpoints API

| Méthode | URI                              | Description                             |
|---------|----------------------------------|-----------------------------------------|
| GET     | `/api/v1/webhooks`               | Liste tous les webhooks (filtre `is_active`)
| POST    | `/api/v1/webhooks`               | Crée un webhook                         |
| GET     | `/api/v1/webhooks/{id}`          | Détail                                   |
| PUT     | `/api/v1/webhooks/{id}`          | Mise à jour                             |
| DELETE  | `/api/v1/webhooks/{id}`          | Suppression                             |
| POST    | `/api/v1/webhooks/{id}/rotate-secret` | Rotation manuelle du secret       |
| GET     | `/api/v1/webhooks/events/available`  | Liste des événements exposés        |

**Auth** : toutes les routes nécessitent un utilisateur admin (`verify_admin_user`).

### Exemple de création (cURL)

```bash
curl -X POST https://crm.exemple.com/api/v1/webhooks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://integration.exemple.com/crm-webhook",
    "events": ["organisation.created", "task.completed"],
    "description": "Synchronisation HubSpot",
    "is_active": true
  }'
```

**Réponse** (200) :

```json
{
  "id": 4,
  "url": "https://integration.exemple.com/crm-webhook",
  "events": ["organisation.created", "task.completed"],
  "is_active": true,
  "description": "Synchronisation HubSpot",
  "secret": "5d1fa0ad0f97...",
  "created_at": "2025-10-18T09:42:31.120523",
  "updated_at": "2025-10-18T09:42:31.120523"
}
```

## 5. Payload & Signature

Chaque webhook reçoit un POST `application/json` :

```json
{
  "event": "organisation.created",
  "timestamp": "2025-10-18T09:43:12.442Z",
  "user_id": 12,
  "data": {
    "organisation_id": 51,
    "name": "ACME Capital",
    "category": "Institution",
    "country_code": "FR"
  }
}
```

En-têtes ajoutés :

- `X-Webhook-Id` – Identifiant interne du webhook
- `X-Webhook-Event` – Valeur `EventType` (ex: `task.completed`)
- `X-Webhook-Timestamp` – ISO 8601 UTC
- `X-Webhook-Signature` – `HMAC_SHA256(secret, payload-json)` hexadécimal

### Vérification côté destinataire (Python)

```python
import hmac
import hashlib

def verify_signature(secret: str, payload: bytes, header_signature: str) -> bool:
    computed = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, header_signature)
```

## 6. Évènements disponibles

| EventType                     | Déclencheur                                           |
|-------------------------------|-------------------------------------------------------|
| `organisation.created`        | POST `/organisations`                                |
| `organisation.updated`        | PUT `/organisations/{id}`                            |
| `organisation.deleted`        | DELETE `/organisations/{id}`                         |
| `person.created`              | POST `/people`                                       |
| `person.updated`              | PUT `/people/{id}`                                   |
| `person.deleted`              | DELETE `/people/{id}`                                |
| `task.created`                | POST `/tasks`                                        |
| `task.completed`              | PUT `/tasks/{id}` + quick actions `mark_done`        |
| `mandat.created`              | POST `/mandats`                                      |
| `mandat.updated`              | PUT `/mandats/{id}`                                  |
| `mandat.signed`               | Création/édition avec statut `signé`                 |
| `interaction.created`         | POST `/interactions/...`                             |
| `interaction.updated`         | PUT `/interactions/{id}`                             |

> ✨ L’event bus est extensible : ajouter un event dans `EventType` + publier via `emit_event` suffit à exposer le webhook correspondant.

## 7. UI de Gestion

- Vue dédiée : **Dashboard → Paramètres → Webhooks** (`/dashboard/settings/webhooks`)
- Fonctionnalités :
  - Liste des webhooks et événements surveillés
  - Création / édition (URL, description, liste d’événements, activation)
  - Rotation du secret (copie auto presse-papier)
  - Suppression sécurisée (confirmation)
- Validation client :
  - Champ URL obligatoire
  - Sélection d’au moins un événement
  - Clé secrète optionnelle (générée sinon)

## 8. Tests & Observabilité

- **Tests unitaires** à ajouter (backlog) : mocks httpx + base sqlite
- Journalisation : `core.monitoring.get_logger` trace `webhook_delivered`, `webhook_timeout`, `webhook_http_error`
- En cas d’échec, l’erreur est loggée mais n’interrompt pas le flux (best-effort)
- Prévoir un dashboard Sentry spécifique pour monitorer les erreurs d’intégration

## 9. Roadmap & Next Steps

- [ ] Ajouter un historique des tentatives (table `webhook_deliveries`)
- [ ] Permettre la mise en pause automatique après X erreurs
- [ ] Ajouter un bouton « Tester le webhook » (ping manuel)
- [ ] Couverture de test Pytest + MSW (frontend) pour valider le flux end-to-end

---

**Références**

- Backend
  - `models/webhook.py`
  - `services/webhook.py`
  - `core/webhooks.py`
  - `routers/webhooks.py`
- Frontend
  - `hooks/useWebhooks.ts`
  - `app/dashboard/settings/webhooks/page.tsx`
- Documentation
  - `documentation/roadmap/PLAN_AMELIORATIONS_CRM.md`

Pour toute nouvelle intégration, dupliquer ce guide et adapter la liste d’événements en fonction des besoins métier.
