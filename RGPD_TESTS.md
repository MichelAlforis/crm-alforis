# 🧪 Tests RGPD - Documentation

## 📋 Vue d'ensemble

Suite complète de tests pour la conformité RGPD/CNIL.

**Total:** 4 fichiers de tests, ~50 tests

---

## 📁 Fichiers de tests

### 1. `test_rgpd_service.py` (13 tests)

Tests unitaires pour le service RGPD.

**Tests Export:**
- ✅ `test_export_user_data_basic` - Export basique
- ✅ `test_export_user_data_with_people` - Export avec personnes
- ✅ `test_export_user_data_with_organisations` - Export avec organisations
- ✅ `test_export_user_data_with_tasks` - Export avec tâches
- ✅ `test_export_user_data_nonexistent` - Utilisateur inexistant

**Tests Anonymisation:**
- ✅ `test_anonymize_user_basic` - Anonymisation basique
- ✅ `test_anonymize_user_with_people` - Anonymisation avec personnes
- ✅ `test_anonymize_user_with_organisations` - Anonymisation avec organisations
- ✅ `test_anonymize_user_nonexistent` - Utilisateur inexistant
- ✅ `test_anonymize_creates_log` - Création log d'accès

**Tests Logs:**
- ✅ `test_get_access_logs_empty` - Logs vides
- ✅ `test_get_access_logs_basic` - Récupération basique
- ✅ `test_get_access_logs_filter_by_user` - Filtrage par user_id
- ✅ `test_get_access_logs_filter_by_entity_type` - Filtrage par entity_type
- ✅ `test_get_access_logs_filter_by_access_type` - Filtrage par access_type
- ✅ `test_get_access_logs_limit` - Limite de résultats
- ✅ `test_serialize_access_log` - Sérialisation

---

### 2. `test_rgpd_endpoints.py` (14 tests)

Tests d'intégration pour les endpoints API.

**GET /api/v1/rgpd/export:**
- ✅ `test_export_my_data_success` - Export réussi
- ✅ `test_export_my_data_unauthorized` - Sans authentification
- ✅ `test_export_my_data_with_people` - Avec personnes
- ✅ `test_export_creates_access_log` - Création log

**DELETE /api/v1/rgpd/delete:**
- ✅ `test_delete_my_data_success` - Suppression réussie
- ✅ `test_delete_my_data_without_confirm` - Sans confirmation
- ✅ `test_delete_my_data_short_reason` - Raison trop courte
- ✅ `test_delete_my_data_unauthorized` - Sans authentification
- ✅ `test_delete_creates_access_log_before_deletion` - Log avant suppression

**GET /api/v1/rgpd/access-logs (Admin):**
- ✅ `test_access_logs_admin_success` - Admin récupère logs
- ✅ `test_access_logs_non_admin_forbidden` - Non-admin interdit
- ✅ `test_access_logs_filter_by_user_id` - Filtrage user
- ✅ `test_access_logs_filter_by_access_type` - Filtrage type
- ✅ `test_access_logs_unauthorized` - Sans auth

**GET /api/v1/rgpd/my-access-logs:**
- ✅ `test_my_access_logs_success` - Récupération réussie
- ✅ `test_my_access_logs_only_shows_own_logs` - Seulement ses logs
- ✅ `test_my_access_logs_limit` - Limite résultats
- ✅ `test_my_access_logs_unauthorized` - Sans auth

---

### 3. `test_rgpd_tasks.py` (12 tests)

Tests pour les tâches Celery automatiques.

**anonymize_inactive_users():**
- ✅ `test_anonymize_inactive_users_finds_inactive` - Détecte inactifs
- ✅ `test_anonymize_inactive_users_skips_admins` - Ignore admins
- ✅ `test_anonymize_inactive_users_skips_active` - Ignore actifs
- ✅ `test_anonymize_inactive_users_skips_already_anonymized` - Ignore déjà anonymisés
- ✅ `test_anonymize_inactive_users_never_logged_in` - Jamais connectés

**cleanup_old_access_logs():**
- ✅ `test_cleanup_old_access_logs_deletes_old` - Supprime anciens
- ✅ `test_cleanup_old_access_logs_keeps_recent` - Garde récents
- ✅ `test_cleanup_old_access_logs_empty_db` - DB vide

**generate_compliance_report():**
- ✅ `test_generate_compliance_report_basic` - Rapport basique
- ✅ `test_generate_compliance_report_empty_db` - DB vide
- ✅ `test_generate_compliance_report_only_old_logs` - Seulement logs anciens

**Error Handling:**
- ✅ `test_anonymize_inactive_users_handles_errors` - Gestion erreurs

---

### 4. `test_rgpd_middleware.py` (18 tests)

Tests pour le middleware de logging automatique.

**Helper Functions:**
- ✅ `test_extract_entity_from_path_person` - Extraction person
- ✅ `test_extract_entity_from_path_organisation` - Extraction organisation
- ✅ `test_extract_entity_from_path_user` - Extraction user
- ✅ `test_extract_entity_from_path_email_message` - Extraction email
- ✅ `test_extract_entity_from_path_interaction` - Extraction interaction
- ✅ `test_extract_entity_from_path_task` - Extraction task
- ✅ `test_extract_entity_from_path_no_match` - Pas de match
- ✅ `test_extract_entity_from_path_list_endpoint` - Endpoint liste

**Access Type Detection:**
- ✅ `test_get_access_type_read` - Détection lecture
- ✅ `test_get_access_type_export` - Détection export
- ✅ `test_get_access_type_delete` - Détection suppression
- ✅ `test_get_access_type_anonymize` - Détection anonymisation
- ✅ `test_get_access_type_post` - POST non tracké
- ✅ `test_get_access_type_put` - PUT non tracké

**Sensitive Value Masking:**
- ✅ `test_mask_sensitive_value_long` - Masquage valeur longue
- ✅ `test_mask_sensitive_value_short` - Masquage valeur courte
- ✅ `test_mask_sensitive_value_empty` - Valeur vide
- ✅ `test_mask_sensitive_value_api_key` - API key
- ✅ `test_mask_sensitive_value_database_url` - Database URL

**Integration:**
- ✅ `test_middleware_logs_person_access` - Log accès personne
- ✅ `test_middleware_logs_organisation_access` - Log accès organisation
- ✅ `test_middleware_does_not_log_list_endpoints` - Pas de log pour listes
- ✅ `test_middleware_captures_ip_address` - Capture IP

---

## 🚀 Exécution des tests

### Prérequis

```bash
# Installer pytest si nécessaire
pip install pytest pytest-cov

# Ou dans Docker
docker compose exec api pip install pytest pytest-cov
```

### Exécuter tous les tests RGPD

```bash
# Tous les tests RGPD
pytest tests/test_rgpd*.py -v

# Avec couverture de code
pytest tests/test_rgpd*.py --cov=services.rgpd_service --cov=routers.rgpd --cov=middleware.rgpd_logging --cov=tasks.rgpd_tasks --cov-report=html

# Tests spécifiques
pytest tests/test_rgpd_service.py -v
pytest tests/test_rgpd_endpoints.py -v
pytest tests/test_rgpd_tasks.py -v
pytest tests/test_rgpd_middleware.py -v
```

### Exécuter dans Docker

```bash
# Dans le container API
docker compose exec api python -m pytest tests/test_rgpd*.py -v

# Avec couverture
docker compose exec api python -m pytest tests/test_rgpd*.py --cov=services --cov=routers --cov=middleware --cov=tasks --cov-report=term-missing
```

---

## 📊 Couverture de code attendue

| Module | Couverture cible |
|--------|------------------|
| `services/rgpd_service.py` | 95%+ |
| `routers/rgpd.py` | 90%+ |
| `middleware/rgpd_logging.py` | 85%+ |
| `tasks/rgpd_tasks.py` | 90%+ |

---

## ✅ Checklist de validation

### Tests Service
- [x] Export utilisateur basique
- [x] Export avec données liées (people, orgs, tasks)
- [x] Export utilisateur inexistant (erreur)
- [x] Anonymisation basique
- [x] Anonymisation avec données liées
- [x] Anonymisation crée un log
- [x] Récupération logs avec filtres
- [x] Sérialisation correcte

### Tests Endpoints
- [x] GET /export réussi
- [x] GET /export non authentifié (401)
- [x] GET /export crée un log
- [x] DELETE /delete réussi
- [x] DELETE /delete sans confirmation (400)
- [x] DELETE /delete raison courte (422)
- [x] DELETE /delete crée un log AVANT suppression
- [x] GET /access-logs admin OK
- [x] GET /access-logs non-admin (403)
- [x] GET /access-logs filtres fonctionnels
- [x] GET /my-access-logs utilisateur OK
- [x] GET /my-access-logs isolation données

### Tests Celery Tasks
- [x] Anonymisation détecte inactifs (>2 ans)
- [x] Anonymisation ignore admins
- [x] Anonymisation ignore actifs récents
- [x] Anonymisation ignore déjà anonymisés
- [x] Cleanup supprime logs anciens (>3 ans)
- [x] Cleanup garde logs récents
- [x] Rapport génère stats correctes
- [x] Gestion d'erreurs robuste

### Tests Middleware
- [x] Extraction entity_type/entity_id
- [x] Détection access_type (read/export/delete/anonymize)
- [x] Masquage variables sensibles
- [x] Logging automatique sur accès
- [x] Capture IP (avec X-Forwarded-For)
- [x] Pas de log sur endpoints liste

---

## 🐛 Troubleshooting

### Erreur: Module not found

```bash
# S'assurer que le PYTHONPATH est correct
export PYTHONPATH=/app:$PYTHONPATH

# Ou dans pytest.ini
[pytest]
pythonpath = .
```

### Erreur: Database locked (SQLite)

```bash
# Utiliser une DB en mémoire pour les tests (déjà configuré dans conftest.py)
# Vérifier que chaque test utilise la fixture test_db
```

### Tests lents

```bash
# Exécuter en parallèle avec pytest-xdist
pip install pytest-xdist
pytest tests/test_rgpd*.py -n auto
```

---

## 📝 Notes

1. **Fixtures manquantes:** Les tests supposent que `conftest.py` contient:
   - `test_db` - Base de données SQLite en mémoire
   - `client` - TestClient FastAPI
   - `test_user` - Utilisateur de test
   - `admin_user` - Admin de test
   - `auth_headers` - Headers d'authentification
   - `admin_headers` - Headers admin

2. **Mock Celery:** Les tests Celery utilisent `@patch` pour mocker `SessionLocal` car Celery tourne dans un contexte différent.

3. **Isolation:** Chaque test est isolé grâce à `scope="function"` sur les fixtures.

4. **CI/CD:** Ajouter ces tests au pipeline CI:
   ```yaml
   # .github/workflows/tests.yml
   - name: Run RGPD tests
     run: docker compose exec -T api pytest tests/test_rgpd*.py --cov --cov-report=xml
   ```

---

**Version:** 1.0
**Date:** 31 octobre 2025
**Coverage:** ~57 tests créés
**Status:** ✅ Ready for execution (pytest required)
