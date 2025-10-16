# 🧪 CRM API - Test Examples

## Point d'entrée
```
http://localhost:8000
```

## Documentation Interactive
```
http://localhost:8000/docs     # Swagger UI (⭐ Recommandé)
http://localhost:8000/redoc    # ReDoc
```

---

## 🏥 Health Check

### Request
```bash
curl http://localhost:8000/health
```

### Response
```json
{
  "status": "healthy",
  "database": true,
  "timestamp": "2024-10-15T12:34:56.789Z"
}
```

---

## 📊 INVESTISSEURS

### 1. Créer un investisseur

**Request**
```bash
curl -X POST http://localhost:8000/api/v1/investors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Apple Inc",
    "email": "contact@apple.com",
    "phone": "+33646464645",
    "company": "Apple",
    "industry": "Technology",
    "pipeline_stage": "prospect_froid"
  }'
```

**Response** (201 Created)
```json
{
  "id": 1,
  "name": "Apple Inc",
  "email": "contact@apple.com",
  "phone": "+33646464645",
  "company": "Apple",
  "industry": "Technology",
  "pipeline_stage": "prospect_froid",
  "client_type": null,
  "notes": null,
  "is_active": true,
  "created_at": "2024-10-15T12:34:56",
  "updated_at": "2024-10-15T12:34:56"
}
```

### 2. Lister les investisseurs

**Request**
```bash
curl http://localhost:8000/api/v1/investors?skip=0&limit=10
```

**Response**
```json
{
  "total": 1,
  "skip": 0,
  "limit": 10,
  "items": [
    {
      "id": 1,
      "name": "Apple Inc",
      "email": "contact@apple.com",
      ...
    }
  ]
}
```

### 3. Rechercher un investisseur

**Request**
```bash
curl http://localhost:8000/api/v1/investors/search?q=Apple
```

### 4. Obtenir les statistiques

**Request**
```bash
curl http://localhost:8000/api/v1/investors/stats
```

**Response**
```json
{
  "total_count": 5,
  "active_count": 4,
  "by_pipeline_stage": {
    "prospect_froid": 2,
    "prospect_tiede": 1,
    "prospect_chaud": 1,
    "en_negociation": 0,
    "client": 1,
    "inactif": 0
  },
  "by_client_type": {
    "cgpi": 1,
    "wholesale": 2,
    "institutionnel": 1,
    "autre": 0
  }
}
```

### 5. Obtenir les détails d'un investisseur

**Request**
```bash
curl http://localhost:8000/api/v1/investors/1
```

### 6. Mettre à jour un investisseur

**Request**
```bash
curl -X PUT http://localhost:8000/api/v1/investors/1 \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline_stage": "prospect_tiede",
    "client_type": "cgpi"
  }'
```

### 7. Avancer au stade suivant du pipeline

**Request**
```bash
curl -X PUT http://localhost:8000/api/v1/investors/1/move-to-next-stage
```

### 8. Supprimer un investisseur

**Request**
```bash
curl -X DELETE http://localhost:8000/api/v1/investors/1
```

---

## 📞 INTERACTIONS

### 1. Créer une interaction

**Request**
```bash
curl -X POST http://localhost:8000/api/v1/interactions/investor/1 \
  -H "Content-Type: application/json" \
  -d '{
    "type": "appel",
    "date": "2024-10-15",
    "duration_minutes": 30,
    "subject": "Première discussion",
    "notes": "Intérêt montré pour la solution"
  }'
```

### 2. Lister les interactions d'un investisseur

**Request**
```bash
curl http://localhost:8000/api/v1/interactions/investor/1
```

### 3. Obtenir un résumé des interactions

**Request**
```bash
curl http://localhost:8000/api/v1/interactions/investor/1/summary
```

**Response**
```json
{
  "total_interactions": 3,
  "by_type": {
    "appel": 2,
    "email": 1
  },
  "total_duration_minutes": 60,
  "last_interaction": "2024-10-15"
}
```

### 4. Mettre à jour une interaction

**Request**
```bash
curl -X PUT http://localhost:8000/api/v1/interactions/1 \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Données mises à jour"
  }'
```

### 5. Supprimer une interaction

**Request**
```bash
curl -X DELETE http://localhost:8000/api/v1/interactions/1
```

---

## 📈 KPIs

### 1. Créer/Mettre à jour un KPI mensuel

**Request**
```bash
curl -X POST http://localhost:8000/api/v1/kpis/investor/1?year=2024&month=10 \
  -H "Content-Type: application/json" \
  -d '{
    "rdv_count": 5,
    "pitchs": 2,
    "due_diligences": 1,
    "closings": 0,
    "revenue": 50000.0,
    "commission_rate": 5.0,
    "notes": "Bon mois"
  }'
```

### 2. Récupérer les KPIs d'un investisseur pour une année

**Request**
```bash
curl http://localhost:8000/api/v1/kpis/investor/1?year=2024
```

### 3. Obtenir le KPI d'un mois spécifique

**Request**
```bash
curl http://localhost:8000/api/v1/kpis/investor/1/month/2024/10
```

### 4. Obtenir un résumé mensuel (tous les investisseurs)

**Request**
```bash
curl http://localhost:8000/api/v1/kpis/summary/month/2024/10
```

**Response**
```json
{
  "total_rdv": 15,
  "total_pitchs": 8,
  "total_due_diligences": 3,
  "total_closings": 1,
  "total_revenue": 200000.0,
  "average_commission_rate": 4.5,
  "month": "2024-10",
  "investor_count": 3
}
```

### 5. Obtenir un résumé annuel

**Request**
```bash
curl http://localhost:8000/api/v1/kpis/summary/annual/1/2024
```

**Response**
```json
{
  "investor_id": 1,
  "year": 2024,
  "total_rdv": 40,
  "total_pitchs": 15,
  "total_due_diligences": 5,
  "total_closings": 2,
  "total_revenue": 500000.0,
  "average_commission_rate": 4.8,
  "months_with_data": 10
}
```

---

## 🧬 Test Workflow Complet

Voici une séquence de test du flux complet:

```bash
#!/bin/bash

# 1. Créer un investisseur
INVESTOR_ID=$(curl -s -X POST http://localhost:8000/api/v1/investors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Investor",
    "email": "test@example.com",
    "pipeline_stage": "prospect_froid"
  }' | jq '.id')

echo "✅ Investisseur créé avec ID: $INVESTOR_ID"

# 2. Créer une interaction
curl -s -X POST http://localhost:8000/api/v1/interactions/investor/$INVESTOR_ID \
  -H "Content-Type: application/json" \
  -d '{
    "type": "appel",
    "date": "2024-10-15",
    "duration_minutes": 20,
    "subject": "Premier contact"
  }' | jq .

echo "✅ Interaction créée"

# 3. Créer un KPI
curl -s -X POST http://localhost:8000/api/v1/kpis/investor/$INVESTOR_ID?year=2024&month=10 \
  -H "Content-Type: application/json" \
  -d '{
    "rdv_count": 1,
    "pitchs": 0
  }' | jq .

echo "✅ KPI créé"

# 4. Obtenir les statistiques
curl -s http://localhost:8000/api/v1/investors/stats | jq .

echo "✅ Workflow complet exécuté!"
```

---

## 🔗 Test avec `curl` ou Postman

### Options communes

```bash
# Avec authentification (une fois implémentée)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/v1/investors

# Afficher les headers
curl -i http://localhost:8000/api/v1/investors

# POST avec JSON
curl -X POST http://localhost:8000/api/v1/investors \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Voir la réponse formatée
curl -s http://localhost:8000/api/v1/investors | jq .
```

---

## 📊 Test avec Python

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# Créer un investisseur
response = requests.post(f"{BASE_URL}/investors", json={
    "name": "Test Corp",
    "email": "test@example.com",
    "pipeline_stage": "prospect_froid"
})
print(response.json())

# Lister les investisseurs
response = requests.get(f"{BASE_URL}/investors")
print(response.json())

# Rechercher
response = requests.get(f"{BASE_URL}/investors/search?q=Test")
print(response.json())
```

---

## 🐛 Debugging

### Voir les logs de l'API
```bash
docker-compose logs -f api
```

### Voir les logs de PostgreSQL
```bash
docker-compose logs -f postgres
```

### Accéder à la BD directement
```bash
docker-compose exec postgres psql -U crm_user -d crm_db
```

### Lister les tables
```sql
\dt
```

### Vérifier les données
```sql
SELECT * FROM investors;
SELECT * FROM interactions;
SELECT * FROM kpis;
```

---

## ✨ Prochaines étapes

- ✅ Tester tous les endpoints dans http://localhost:8000/docs
- ✅ Créer du données de test
- ✅ Vérifier la BD avec `docker-compose exec postgres psql ...`
- ✅ Procéder à la Phase 2 (Frontend React)

Bon test! 🚀