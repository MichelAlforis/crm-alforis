# 🔴 Explication: Erreur Export CORS + 500

## Erreur Rencontrée

```
Access to fetch at 'http://localhost:8000/api/v1/exports/organisations/csv'
from origin 'http://localhost:3010' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.

GET http://localhost:8000/api/v1/exports/organisations/csv net::ERR_FAILED 500 (Internal Server Error)
```

---

## 🔍 Analyse du Problème

### 1. **CORS Policy Blocked**

**Cause apparente**: Message d'erreur CORS
**Vraie cause**: Erreur 500 du backend

#### Pourquoi le message CORS apparaît ?

Quand le backend renvoie une **erreur 500**, il ne parvient pas à exécuter le middleware CORS qui ajoute les en-têtes `Access-Control-Allow-Origin`.

**Séquence d'événements**:
```
1. Frontend → Requête GET /api/v1/exports/organisations/csv
2. Backend → Erreur 500 (crash avant le middleware CORS de réponse)
3. Browser → Bloque la réponse car pas d'en-tête CORS
4. Console → Affiche erreur CORS (message trompeur)
```

**Important**: Le problème n'est PAS le CORS, mais l'erreur 500 du backend.

---

### 2. **Configuration CORS Actuelle**

Le CORS est déjà correctement configuré dans [crm-backend/main.py:124-132](crm-backend/main.py#L124):

```python
ALLOWED_ORIGINS = ["http://localhost:3010", "http://127.0.0.1:3010"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

✅ **Le CORS est OK** - Le problème vient de l'erreur 500.

---

### 3. **Endpoint Export Existe**

Le router exports existe et est enregistré:
- **Fichier**: [crm-backend/routers/exports.py](crm-backend/routers/exports.py)
- **Enregistrement**: [crm-backend/api/__init__.py:48](crm-backend/api/__init__.py#L48)

```python
# api/__init__.py ligne 48
api_router.include_router(exports.router)
```

✅ **L'endpoint existe** - Le problème vient de l'implémentation.

---

## 🐛 Causes Possibles de l'Erreur 500

### Cause 1: Dépendance `ExportService` manquante

Le code fait référence à `ExportService.export_csv()`:

```python
# routers/exports.py ligne 61
buffer = ExportService.export_csv(
    data=organisations,
    filename="organisations.csv",
)
```

**Vérifier**:
```bash
ls crm-backend/core/exports.py
```

Si le fichier n'existe pas → **Créer le service ExportService**

---

### Cause 2: Librairie CSV/Excel manquante

L'export CSV nécessite potentiellement:
- `pandas` (pour DataFrames)
- `openpyxl` (pour Excel)
- `reportlab` (pour PDF)

**Vérifier**:
```bash
cd crm-backend
python3 -c "import pandas; print('pandas OK')"
python3 -c "import openpyxl; print('openpyxl OK')"
python3 -c "import reportlab; print('reportlab OK')"
```

Si erreur `ModuleNotFoundError` → **Installer les dépendances**

---

### Cause 3: Sérialisation des objets Organisation

Les objets SQLAlchemy ne sont pas directement sérialisables en CSV.

**Solution**: Convertir en dict avant export:
```python
organisations_data = [
    {
        "id": org.id,
        "name": org.name,
        "category": org.category,
        "email": org.email,
        "is_active": org.is_active,
        # ...
    }
    for org in organisations
]
```

---

## 🛠️ Solutions

### Solution Rapide: Vérifier les logs backend

```bash
cd crm-backend
docker-compose logs api -f

# Ou si vous utilisez Docker directement:
docker logs v1--api-1 -f
```

**Chercher**:
- `ImportError: No module named 'pandas'`
- `AttributeError: 'ExportService' has no attribute 'export_csv'`
- `TypeError: Object of type Organisation is not JSON serializable`

---

### Solution Complète: Implémenter ExportService

Si `core/exports.py` n'existe pas, créer le service:

```python
# crm-backend/core/exports.py
import io
import csv
from typing import List, Any, Dict

class ExportService:
    @staticmethod
    def export_csv(data: List[Any], filename: str) -> io.BytesIO:
        """Export liste d'objets en CSV"""
        buffer = io.BytesIO()

        if not data:
            return buffer

        # Convertir objets SQLAlchemy en dicts
        if hasattr(data[0], '__dict__'):
            rows = [
                {k: v for k, v in obj.__dict__.items() if not k.startswith('_')}
                for obj in data
            ]
        else:
            rows = data

        # Écrire CSV
        if rows:
            writer = csv.DictWriter(
                io.TextIOWrapper(buffer, encoding='utf-8-sig', newline=''),
                fieldnames=rows[0].keys()
            )
            writer.writeheader()
            writer.writerows(rows)

        buffer.seek(0)
        return buffer
```

---

### Solution Alternative: Désactiver temporairement les boutons Export

Si vous n'avez pas besoin des exports immédiatement:

```tsx
// Dans ExportButtons.tsx
<Button disabled={true}>CSV</Button>
<Button disabled={true}>Excel</Button>
<Button disabled={true}>PDF</Button>
```

Ou masquer complètement:
```tsx
// Dans organisations/page.tsx
{/* <ExportButtons ... /> */}
```

---

## 🔧 Commandes de Débogage

### 1. Tester l'endpoint directement avec curl

```bash
curl -X GET "http://localhost:8000/api/v1/exports/organisations/csv" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -v
```

### 2. Vérifier les dépendances Python

```bash
cd crm-backend
pip list | grep -E "(pandas|openpyxl|reportlab)"
```

### 3. Tester l'import ExportService

```bash
cd crm-backend
python3 -c "from core.exports import ExportService; print('OK')"
```

---

## ✅ Checklist de Résolution

- [ ] Vérifier logs backend (`docker logs v1--api-1 -f`)
- [ ] Confirmer que `core/exports.py` existe
- [ ] Vérifier dépendances Python installées
- [ ] Tester endpoint avec curl + JWT token
- [ ] Implémenter ExportService si manquant
- [ ] Redémarrer backend après corrections
- [ ] Re-tester depuis frontend

---

## 📌 Note pour l'Utilisateur

**Le composant ExportButtons fonctionne correctement côté frontend.**
Le problème vient du **backend** qui n'a pas implémenté les endpoints d'export ou manque de dépendances.

**Actions recommandées**:
1. Vérifier les logs backend pour identifier l'erreur exacte
2. Implémenter le service ExportService si manquant
3. Ou désactiver temporairement les boutons Export

---

**Date**: 2025-10-22
**Branch**: test/chapitre5-organisations
