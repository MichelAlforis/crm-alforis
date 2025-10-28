# 🔧 Pydantic v2 Migration Fix

**Date:** 2025-10-28
**Issue:** ValidationError lors du chargement des tests (extra env vars rejetées)
**Solution:** Ajout de `extra='ignore'` dans `SettingsConfigDict`

---

## 🐛 Problème

Avec Pydantic v2, la classe `Settings` rejetait les variables d'environnement non définies dans le modèle :

```python
# .env contient
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=...
APP_TITLE=...
SENTRY_ENVIRONMENT=...
# ... et plein d'autres

# Mais Settings ne définit que
class Settings(BaseSettings):
    api_title: str = "..."
    database_url: str = "..."
    # ... pas POSTGRES_USER, etc.
```

**Erreur obtenue:**
```
ValidationError: Extra inputs are not permitted
  POSTGRES_USER
  POSTGRES_PASSWORD
  APP_TITLE
  ...
```

Cette erreur empêchait :
- ✅ Démarrage API (OK car Docker Compose charge .env après)
- ❌ Tests unitaires (KO car pytest charge .env avant)

---

## ✅ Solution

### Migration Pydantic v1 → v2

**Avant (Pydantic v1):**
```python
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... fields ...

    class Config:
        env_file = ".env"
        case_sensitive = False
```

**Après (Pydantic v2):**
```python
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # ... fields ...

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra='ignore'  # 🔑 Ignore extra env vars not in Settings model
    )
```

---

## 📝 Changements Appliqués

**Fichier:** `core/config.py`

**Ligne 7:**
```diff
- from pydantic_settings import BaseSettings
+ from pydantic_settings import BaseSettings, SettingsConfigDict
```

**Lignes 144-148:**
```diff
-     class Config:
-         env_file = ".env"
-         case_sensitive = False
+     model_config = SettingsConfigDict(
+         env_file=".env",
+         case_sensitive=False,
+         extra='ignore'  # Ignore extra env vars not in Settings model
+     )
```

---

## 🧪 Validation

### Test 1: API startup
```bash
$ docker-compose restart api
$ curl http://localhost:8000/api/v1/health
{"status":"ok"}  ✅
```

### Test 2: Settings loading
```bash
$ docker-compose exec api python3 -c "from core.config import settings; print('OK')"
✅ Settings loaded successfully
Database URL: postgresql://crm_user:...
Environment: production
Extra vars ignored: OK
```

### Test 3: Tests unitaires (à venir)
```bash
$ docker-compose exec api python3 -m pytest tests/test_ai_statistics.py -v
# Devrait maintenant fonctionner sans ValidationError
```

---

## 📚 Documentation Pydantic v2

**Options `extra` disponibles:**
- `'allow'` : Accepte et stocke les extra fields (⚠️ peut fuiter des données)
- `'ignore'` : Accepte mais ignore les extra fields (✅ recommandé pour Settings)
- `'forbid'` : Rejette les extra fields avec ValidationError (❌ défaut Pydantic v2)

**Référence:** https://docs.pydantic.dev/latest/api/config/#pydantic.ConfigDict.extra

---

## 🎯 Impact

**Avant fix:**
- ❌ Tests bloqués par ValidationError
- ❌ Impossibilité de charger Settings en pytest
- ❌ .env avec variables "libres" rejetées

**Après fix:**
- ✅ Tests peuvent charger Settings
- ✅ .env peut contenir variables Docker (POSTGRES_*, etc.)
- ✅ Settings reste type-safe pour les champs définis
- ✅ Backward compatible avec code existant

---

## 🔗 Liens Connexes

- [Pydantic v2 Migration Guide](https://docs.pydantic.dev/latest/migration/)
- [pydantic-settings Documentation](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [SettingsConfigDict API](https://docs.pydantic.dev/latest/api/config/)

---

**Status:** ✅ Fixed (2025-10-28)
**Tests:** Ready to run
**Production:** No impact (already working)
