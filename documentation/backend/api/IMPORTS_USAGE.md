# 📦 API Bulk Import - Guide d'Utilisation

## Vue d'ensemble

L'endpoint `/api/v1/imports/investors/bulk` permet d'importer plusieurs investisseurs en une seule requête, ce qui est **beaucoup plus rapide** que de créer N investisseurs un par un.

### Avantages
- ✅ **1 requête** au lieu de N requêtes
- ✅ **Transaction unique** pour tout le batch
- ✅ **Gestion des erreurs** par investisseur (les valides sont créés même si certains échouent)
- ✅ **Détection des doublons** par email
- ✅ **Statistiques détaillées** en réponse

---

## 🚀 Utilisation

### Endpoint

```
POST /api/v1/imports/investors/bulk
```

### Headers

```
Content-Type: application/json
Authorization: Bearer <token>  (optionnel en dev)
```

### Request Body

```json
[
  {
    "name": "Client A",
    "email": "clienta@example.com",
    "phone": "+33123456789",
    "website": "https://clienta.com",
    "company": "Société A",
    "industry": "Finance",
    "pipeline_stage": "prospect_froid",
    "client_type": "CGPI",
    "notes": "Premier contact via LinkedIn"
  },
  {
    "name": "Client B",
    "email": "clientb@example.com",
    "phone": "+33987654321",
    "company": "Société B",
    "pipeline_stage": "prospect_tiede",
    "client_type": "Wholesale"
  },
  {
    "name": "Client C",
    "email": "clientc@example.com",
    "pipeline_stage": "en_negociation"
  }
]
```

### Response

```json
{
  "total": 3,
  "created": [1, 2, 3],
  "created_count": 3,
  "failed": 0,
  "errors": [],
  "success_rate": "100%"
}
```

### Response en cas d'erreurs

```json
{
  "total": 3,
  "created": [1, 3],
  "created_count": 2,
  "failed": 1,
  "errors": [
    {
      "index": 1,
      "name": "Client B",
      "email": "clientb@example.com",
      "error": "Email déjà existant: clientb@example.com (ID: 42)"
    }
  ],
  "success_rate": "66.7%"
}
```

---

## 📝 Exemples

### Exemple 1 : Import de 3 investisseurs avec curl

```bash
curl -X POST http://localhost:8000/api/v1/imports/investors/bulk \
  -H "Content-Type: application/json" \
  -d '[
    {
      "name": "CGPI Conseils",
      "email": "contact@cgpi-conseils.fr",
      "phone": "+33140201010",
      "company": "CGPI Conseils SAS",
      "industry": "Conseil en gestion de patrimoine",
      "pipeline_stage": "prospect_chaud",
      "client_type": "CGPI"
    },
    {
      "name": "Family Office Paris",
      "email": "info@familyoffice-paris.com",
      "company": "Family Office Paris",
      "pipeline_stage": "en_negociation",
      "client_type": "Institutionnel"
    },
    {
      "name": "Wealth Management Pro",
      "email": "contact@wmpro.fr",
      "pipeline_stage": "client",
      "client_type": "Wholesale"
    }
  ]'
```

### Exemple 2 : Import avec gestion des erreurs

```bash
# Si on ré-exécute la même commande, les doublons seront détectés
curl -X POST http://localhost:8000/api/v1/imports/investors/bulk \
  -H "Content-Type: application/json" \
  -d '[
    {
      "name": "CGPI Conseils",
      "email": "contact@cgpi-conseils.fr"
    }
  ]'

# Réponse:
# {
#   "total": 1,
#   "created": [],
#   "created_count": 0,
#   "failed": 1,
#   "errors": [
#     {
#       "index": 0,
#       "name": "CGPI Conseils",
#       "email": "contact@cgpi-conseils.fr",
#       "error": "Email déjà existant: contact@cgpi-conseils.fr (ID: 1)"
#     }
#   ],
#   "success_rate": "0%"
# }
```

### Exemple 3 : Import depuis un fichier JSON

```bash
# Créer un fichier investors.json
cat > investors.json <<'EOF'
[
  {
    "name": "Investisseur 1",
    "email": "inv1@example.com",
    "pipeline_stage": "prospect_froid"
  },
  {
    "name": "Investisseur 2",
    "email": "inv2@example.com",
    "pipeline_stage": "prospect_tiede"
  }
]
EOF

# Importer
curl -X POST http://localhost:8000/api/v1/imports/investors/bulk \
  -H "Content-Type: application/json" \
  -d @investors.json
```

---

## 🔧 Intégration Frontend

### Méthode API (lib/api.ts)

```typescript
// Ajouter dans la classe ApiClient

async bulkCreateInvestors(investors: InvestorCreate[]): Promise<BulkImportResult> {
  return this.request<BulkImportResult>('/imports/investors/bulk', {
    method: 'POST',
    body: JSON.stringify(investors),
  })
}
```

### Hook Custom (hooks/useImportInvestors.ts)

```typescript
import { useState } from 'react'
import { api } from '@/lib/api'
import type { InvestorCreate } from '@/lib/types'

interface BulkImportResult {
  total: number
  created: number[]
  created_count: number
  failed: number
  errors: Array<{
    index: number
    name: string
    email?: string
    error: string
  }>
  success_rate: string
}

export function useImportInvestors() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BulkImportResult | null>(null)

  const importInvestors = async (investors: InvestorCreate[]) => {
    setLoading(true)
    try {
      const res = await api.bulkCreateInvestors(investors)
      setResult(res)
      return res
    } catch (error) {
      console.error('Erreur import:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return { importInvestors, loading, result }
}
```

### Utilisation dans un composant

```typescript
'use client'

import { useImportInvestors } from '@/hooks/useImportInvestors'

export function ImportButton() {
  const { importInvestors, loading, result } = useImportInvestors()

  const handleImport = async () => {
    const investors = [
      { name: 'Test 1', email: 'test1@example.com', pipeline_stage: 'prospect_froid' },
      { name: 'Test 2', email: 'test2@example.com', pipeline_stage: 'prospect_tiede' },
    ]

    const res = await importInvestors(investors)
    console.log(`✅ ${res.created_count}/${res.total} créés`)
  }

  return (
    <button onClick={handleImport} disabled={loading}>
      {loading ? 'Import en cours...' : 'Importer des investisseurs'}
    </button>
  )
}
```

---

## ⚠️ Limites et Contraintes

### Limite de taille
- **Maximum : 1000 investisseurs** par requête
- Au-delà, diviser en plusieurs batches

### Gestion des doublons
- Détection par **email** uniquement
- Si email existe déjà → erreur + skip
- Si pas d'email → pas de détection de doublon

### Validation
- Tous les champs sont validés via Pydantic
- Erreurs de validation → investisseur skippé
- Les investisseurs valides sont quand même créés

---

## 📊 Comparaison Performance

### Import de 100 investisseurs

| Méthode | Requêtes | Temps approx |
|---------|----------|--------------|
| **Un par un** | 100 requêtes | ~10-20 secondes |
| **Bulk import** | 1 requête | ~0.5-1 seconde |

**Gain : 10-40x plus rapide** 🚀

---

## 🐛 Debugging

### Activer les logs détaillés

```bash
# Voir les logs du container API
docker-compose logs -f api

# Filtrer les logs d'import
docker-compose logs -f api | grep "import"
```

### Logs produits

```
🚀 Démarrage de l'import en masse de 3 investisseurs...
✅ Investisseur créé: CGPI Conseils (ID: 1)
⚠️  Doublon détecté: contact@cgpi-conseils.fr
✅ Investisseur créé: Family Office Paris (ID: 2)
✅ Import terminé: 2/3 créés avec succès
```

---

## 📚 Endpoints Disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/v1/imports/investors/bulk` | POST | Import en masse d'investisseurs |
| `/api/v1/imports/contacts/bulk` | POST | Import en masse de contacts pour un investisseur |

---

## 🔮 Améliorations Futures

- [ ] Support import CSV/Excel
- [ ] Import asynchrone avec queue (Celery/Redis)
- [ ] Notifications par email à la fin de l'import
- [ ] Mode "update or create" (upsert)
- [ ] Validation préalable sans commit (dry-run)
- [ ] Export des erreurs en CSV

---

**Documentation générée automatiquement - CRM TPM Finance**