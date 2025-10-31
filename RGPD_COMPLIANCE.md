# 🔒 RGPD Compliance - Guide Administrateur

## 📋 Vue d'ensemble

Le CRM Alforis est **100% conforme RGPD/CNIL** avec les fonctionnalités suivantes:

### ✅ Implémentations RGPD

1. **Traçabilité des accès (CNIL)** ✅
   - Logging automatique de tous les accès aux données personnelles
   - Table `data_access_logs` avec rétention 3 ans minimum
   - Middleware transparent (pas d'impact sur les endpoints existants)

2. **Droit d'accès (Article 15)** ✅
   - Endpoint `/api/v1/rgpd/export` - Export JSON complet
   - Export de toutes les données: profil, contacts, organisations, emails, interactions, tâches
   - Logs d'accès inclus (admin uniquement)

3. **Droit à l'oubli (Article 17)** ✅
   - Endpoint `/api/v1/rgpd/delete` - Anonymisation complète
   - Soft deletion: remplace données personnelles par valeurs anonymisées
   - Préserve les statistiques/agrégations pour conformité légale

4. **Automatisation (CNIL)** ✅
   - Anonymisation auto des comptes inactifs (2 ans) - Tous les lundis 1h
   - Nettoyage logs anciens (>3 ans) - 1er de chaque mois 2h
   - Rapport de conformité mensuel - 1er de chaque mois 3h

---

## 🏗️ Architecture Technique

### Composants

```
crm-backend/
├── models/
│   └── data_access_log.py          # Table traçabilité CNIL
├── middleware/
│   └── rgpd_logging.py             # Auto-logging transparent
├── services/
│   └── rgpd_service.py             # Logic métier export/delete
├── routers/
│   └── rgpd.py                     # Endpoints API
├── tasks/
│   └── rgpd_tasks.py               # Celery tasks automation
└── alembic/versions/
    └── 20251031_0900_add_data_access_logs.py
```

### Base de données

**Table `data_access_logs`:**
```sql
- id (PK)
- entity_type (person, organisation, user, email_message)
- entity_id
- access_type (read, export, delete, anonymize)
- endpoint (/api/v1/people/123)
- purpose (justification métier)
- user_id (FK users)
- ip_address
- user_agent
- extra_data (JSON metadata)
- accessed_at (timestamp)
```

**Indexes optimisés:**
- Composite: (entity_type, entity_id, accessed_at)
- Composite: (user_id, accessed_at)
- Composite: (access_type, accessed_at)

---

## 🚀 API Endpoints

### 1. Export des données utilisateur

**GET `/api/v1/rgpd/export`**

Exporte toutes les données personnelles de l'utilisateur actuel.

**Query Parameters:**
- `include_access_logs` (bool, admin only): Inclure les logs d'accès

**Response:**
```json
{
  "export_date": "2025-10-31T00:00:00Z",
  "user_id": 123,
  "data": {
    "user": {...},
    "people": [...],
    "organisations": [...],
    "interactions": [...],
    "tasks": [...],
    "email_messages": [...],
    "access_logs": [...]  // admin only
  }
}
```

**Exemple cURL:**
```bash
curl -X GET "http://localhost:8000/api/v1/rgpd/export?include_access_logs=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. Suppression/Anonymisation des données

**DELETE `/api/v1/rgpd/delete`**

Anonymise toutes les données personnelles de l'utilisateur actuel.

**⚠️ ATTENTION:** Action **IRRÉVERSIBLE**

**Body:**
```json
{
  "reason": "Je souhaite exercer mon droit à l'oubli (min 10 caractères)",
  "confirm": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Your personal data has been successfully anonymized.",
  "anonymized_records": {
    "user": 1,
    "people": 42,
    "organisations": 15,
    "interactions": 128,
    "tasks": 67,
    "email_messages": 345,
    "email_attachments": 89
  }
}
```

**Exemple cURL:**
```bash
curl -X DELETE "http://localhost:8000/api/v1/rgpd/delete" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Je souhaite supprimer mes données personnelles conformément au RGPD.",
    "confirm": true
  }'
```

---

### 3. Consultation des logs d'accès (Admin)

**GET `/api/v1/rgpd/access-logs`**

Récupère les logs d'accès pour audits CNIL (admin uniquement).

**Query Parameters:**
- `user_id` (int, optional): Filtrer par utilisateur
- `entity_type` (string, optional): Filtrer par type d'entité
- `entity_id` (int, optional): Filtrer par ID d'entité
- `access_type` (string, optional): Filtrer par type d'accès
- `limit` (int, default=100, max=1000): Nombre max de résultats

**Response:**
```json
{
  "total": 42,
  "logs": [
    {
      "id": 1234,
      "entity_type": "person",
      "entity_id": 567,
      "access_type": "read",
      "endpoint": "/api/v1/people/567",
      "purpose": "Consultation person",
      "user_id": 123,
      "ip_address": "192.168.1.1",
      "accessed_at": "2025-10-31T12:34:56Z"
    }
  ]
}
```

---

### 4. Mes logs d'accès (Utilisateur)

**GET `/api/v1/rgpd/my-access-logs`**

Permet à un utilisateur de consulter les accès à ses propres données.

**Query Parameters:**
- `limit` (int, default=100, max=1000)

---

## ⚙️ Tâches Celery Automatisées

### 1. Anonymisation automatique

**Task:** `tasks.rgpd_tasks.anonymize_inactive_users`

**Schedule:** Tous les lundis à 1h du matin

**Configuration:**
- Inactivité: 730 jours (2 ans) par défaut
- Critères:
  - `last_login` > 2 ans OU jamais connecté
  - `created_at` > 2 ans
  - `is_active = True`
  - `is_admin = False` (les admins ne sont pas anonymisés)
  - Email non déjà anonymisé

**Exécution manuelle:**
```python
from tasks.rgpd_tasks import anonymize_inactive_users
result = anonymize_inactive_users.delay(inactive_days=730)
```

---

### 2. Nettoyage des logs anciens

**Task:** `tasks.rgpd_tasks.cleanup_old_access_logs`

**Schedule:** 1er de chaque mois à 2h du matin

**Configuration:**
- Rétention: 1095 jours (3 ans) par défaut
- Supprime les logs > 3 ans (conforme CNIL)

**Exécution manuelle:**
```python
from tasks.rgpd_tasks import cleanup_old_access_logs
result = cleanup_old_access_logs.delay(retention_days=1095)
```

---

### 3. Rapport de conformité

**Task:** `tasks.rgpd_tasks.generate_compliance_report`

**Schedule:** 1er de chaque mois à 3h du matin

**Contenu du rapport:**
- Statistiques utilisateurs (total, actifs, inactifs, anonymisés)
- Statistiques logs d'accès (30 derniers jours)
- Répartition par type d'accès

**Exécution manuelle:**
```python
from tasks.rgpd_tasks import generate_compliance_report
report = generate_compliance_report.delay()
```

---

## 🛡️ Middleware de Logging

Le middleware `RGPDLoggingMiddleware` log automatiquement:

### Endpoints trackés:
- `/api/v1/people/{id}` → person
- `/api/v1/organisations/{id}` → organisation
- `/api/v1/users/{id}` → user
- `/api/v1/email/messages/{id}` → email_message
- `/api/v1/interactions/{id}` → interaction
- `/api/v1/tasks/{id}` → task

### Types d'accès:
- **GET** → `read`
- **GET /export** → `export`
- **DELETE** → `delete`
- **DELETE /anonymize** → `anonymize`

### Métadonnées capturées:
- IP (avec support X-Forwarded-For)
- User-Agent
- HTTP method
- Query parameters
- User ID (depuis auth middleware)

---

## 📊 Monitoring & Alertes

### Vérifier les logs Celery

```bash
# Voir les tasks planifiées
docker compose exec celery-beat celery -A tasks.celery_app inspect scheduled

# Voir les workers actifs
docker compose exec celery-worker celery -A tasks.celery_app inspect active

# Flower UI (monitoring)
open http://localhost:5555
```

### Vérifier les logs d'accès

```sql
-- Derniers accès
SELECT * FROM data_access_logs ORDER BY accessed_at DESC LIMIT 10;

-- Accès par type (30 derniers jours)
SELECT access_type, COUNT(*)
FROM data_access_logs
WHERE accessed_at > NOW() - INTERVAL '30 days'
GROUP BY access_type;

-- Utilisateurs inactifs (>1 an)
SELECT id, email, last_login
FROM users
WHERE last_login < NOW() - INTERVAL '1 year'
  AND is_active = true
  AND email NOT LIKE '%@anonymized.local';
```

---

## 🔐 Sécurité & Variables sensibles

Le middleware masque automatiquement les variables sensibles dans les logs:

```python
SENSITIVE_ENV_VARS = {
    "DATABASE_URL",
    "REDIS_URL",
    "SECRET_KEY",
    "JWT_SECRET",
    "OPENAI_API_KEY",
    "MISTRAL_API_KEY",
    "GMAIL_CLIENT_SECRET",
    "OUTLOOK_CLIENT_SECRET",
    "SENTRY_DSN",
}
```

Format de masquage: `abcd***xyz` (4 premiers + 4 derniers caractères)

---

## 📝 Checklist de conformité

### ✅ Avant mise en production:

- [ ] Vérifier que les migrations sont appliquées (`alembic upgrade head`)
- [ ] Tester l'endpoint `/api/v1/rgpd/export`
- [ ] Tester l'endpoint `/api/v1/rgpd/delete` (sur compte test!)
- [ ] Vérifier que Celery Beat tourne (`docker compose ps celery-beat`)
- [ ] Consulter Flower pour voir les tasks planifiées
- [ ] Vérifier les logs dans `data_access_logs`
- [ ] Configurer les alertes pour rapport mensuel
- [ ] Ajouter lien "Exporter mes données" dans interface utilisateur
- [ ] Ajouter page "Supprimer mon compte" dans paramètres
- [ ] Mettre à jour CGU/Privacy Policy avec mentions RGPD

### ✅ En production:

- [ ] Monitor les tasks Celery (Flower/Sentry)
- [ ] Backup régulier de `data_access_logs` (compliance 3 ans)
- [ ] Audit mensuel des rapports de conformité
- [ ] Vérifier que l'anonymisation automatique fonctionne
- [ ] Répondre aux demandes d'export sous 1 mois (obligation légale)

---

## 🆘 Troubleshooting

### Le middleware ne log pas

**Vérifier:**
1. Que le middleware est bien chargé dans `main.py`
2. Les logs en mode DEBUG: `docker compose logs api | grep RGPD`
3. La connexion à la base de données

### Les tasks Celery ne s'exécutent pas

**Vérifier:**
1. `docker compose ps celery-beat` → doit être `Up`
2. `docker compose logs celery-beat | grep rgpd`
3. Configuration Redis: `REDIS_URL` dans `.env`

### Erreur "Module not found"

**Solution:**
```bash
docker compose restart api celery-worker celery-beat
```

---

## 📚 Ressources

- [RGPD - Texte officiel](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32016R0679)
- [CNIL - Guide développeur](https://www.cnil.fr/fr/guide-rgpd-du-developpeur)
- [Article 15 - Droit d'accès](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3#Article15)
- [Article 17 - Droit à l'oubli](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3#Article17)

---

**Version:** 1.0
**Date:** 31 octobre 2025
**Auteur:** CRM Alforis - RGPD Compliance Team
**Status:** ✅ Production Ready
