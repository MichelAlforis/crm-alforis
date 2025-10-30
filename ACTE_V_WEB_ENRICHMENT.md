# 🌐 ACTE V: AI-POWERED WEB ENRICHMENT

**Status:** 🚧 EN COURS
**Créé:** 2025-10-30
**Objectif:** Enrichir automatiquement les données CRM via recherche web (AI + Internet)

---

## 🎯 CONCEPT

Quand l'IA parse un email et extrait:
- Nom d'entreprise: "Alforis Finance"
- Contact: "Jean Dupont"

**Le système va automatiquement:**
1. 🔍 Chercher sur Google: "Alforis Finance France"
2. 🌐 Extraire le site web: `alforis.com`
3. 📍 Trouver l'adresse: "123 Avenue des Champs-Élysées, 75008 Paris"
4. 📞 Récupérer le téléphone: "+33 1 23 45 67 89"
5. 💼 Trouver LinkedIn: `linkedin.com/company/alforis`

---

## 📦 LIVRABLES (État au 2025-10-30 - Option A Complétée)

### ✅ **Option A: Quick Win (30 min) - TERMINÉ**

**Commits pushés:**
- `a7cf3217`: Service + API + Migration (898 lignes)
- `c663b782`: Intégration pipeline (66 lignes)
- `1a5fa5dc`: Feature flags + .env.example (112 lignes)

**Total: 1076 lignes ajoutées**

---

### ✅ **Backend (Complété)**

#### **1. Service: `web_enrichment_service.py`** (380 lignes)
**Fonctionnalités:**
- Recherche Google via SerpAPI
- Extraction données structurées (Knowledge Graph)
- Parsing fallback depuis snippets
- Cache Redis (7 jours)
- Confidence scoring (0-1)

**Méthodes:**
```python
service = get_enrichment_service()

result = service.enrich_organisation(
    name="Alforis Finance",
    country="FR",
    force_refresh=False
)

# Returns:
{
    "website": "alforis.com",
    "address": "123 Ave Champs-Élysées, 75008 Paris",
    "phone": "+33123456789",
    "linkedin": "linkedin.com/company/alforis",
    "confidence": 0.85,
    "source": "serpapi",
    "cached": False,
    "enriched_at": "2025-10-30T18:30:00Z"
}
```

#### **2. API Routes: `enrichment.py`** (150 lignes)
**Endpoints:**

##### `POST /api/v1/enrichment/organisation`
Enrichit une organisation manuellement.

**Request:**
```json
{
  "name": "Alforis Finance",
  "country": "FR",
  "force_refresh": false
}
```

**Response:**
```json
{
  "website": "alforis.com",
  "address": "123 Avenue des Champs-Élysées, 75008 Paris",
  "phone": "+33123456789",
  "linkedin": "linkedin.com/company/alforis",
  "confidence": 0.85,
  "source": "serpapi",
  "cached": false,
  "enriched_at": "2025-10-30T18:30:00Z"
}
```

##### `GET /api/v1/enrichment/cache-stats`
Statistiques cache Redis.

**Response:**
```json
{
  "total_keys": 42,
  "hit_rate": 78.5,
  "size_mb": 0.12
}
```

---

## 🛠️ STACK TECHNIQUE

### **API Choisie: SerpAPI** ⭐
- ✅ Google Search résultats structurés
- ✅ 100 req/mois gratuit
- ✅ Knowledge Graph support
- ✅ Facile à parser
- 💰 $50/1000 req après limite gratuite

**Configuration:**
```bash
# .env
SERPAPI_API_KEY=your_key_here
```

**S'inscrire:** https://serpapi.com/

---

## 📊 STATUT DÉPLOIEMENT PRODUCTION

### ✅ **Déployé sur https://crm.alforis.fr**

**Effectué:**
1. ✅ Code pushé sur GitHub (3 commits)
2. ✅ Git pull sur serveur Hetzner
3. ✅ Migration DB appliquée manuellement (colonnes + indexes)
4. ✅ Feature flags ajoutés au .env production
5. ✅ API container rebuild avec nouveau code
6. ⚠️  Route `/api/v1/enrichment/*` déployée mais nécessite SERPAPI_API_KEY

**Configuration Production (.env):**
```bash
SERPAPI_API_KEY=YOUR_KEY_HERE  # ⚠️ À configurer
AUTOFILL_USE_WEB_ENRICHMENT=true
AUTOFILL_THRESHOLD=0.92
AUTOFILL_WEB_MIN_CONFIDENCE=0.70
```

**Test manuel (après ajout clé API):**
```bash
curl -X POST "https://crm.alforis.fr/api/v1/enrichment/organisation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alforis Finance", "country": "FR"}'
```

---

## 📊 PROCHAINES ÉTAPES (Après Option A)

### 🎯 **Option B: Prompt LLM + HITL v2 (2-3h)**

#### **1. Prompt LLM avec web_context** (1h)
Modifier `signature_parser_service.py`:
- Ajouter `web_context` au prompt (website, address, etc.)
- Few-shots examples (3 FR + 2 EN)
- LLM router avec fallback (Mistral → GPT → Claude)
- Auto-apply guardrails (3 conditions)

#### **2. HITL v2 Frontend** (1-2h)
Composant `AutofillSuggestionsV2.tsx`:
- Badge "🌐 Enrichi web" avec confidence
- Bulk actions (valider/rejeter 10 suggestions)
- Filtres avancés (source, champ, confidence)
- Diff viewer avant/après
- Bouton "🔍 Enrichir manuellement"

#### **3. Traçabilité & RGPD** (30 min)
- Decision log par suggestion
- Audit trail (qui a vu/validé quoi)
- Robots.txt compliance

#### **4. Tests & Qualité** (1h)
- Unit tests enrichment service
- Integration tests (5 cas réels)
- Evaluation set (30 emails anonymisés)
- Métriques: précision/rappel par champ

#### **5. Observabilité** (30 min)
- Prometheus metrics (enrichment_requests_total, enrichment_confidence_avg)
- Budget guardrails (alerte si >90 req/mois)
- Slack notifications

---

## 🧪 TESTS

### **Test 1: Enrichissement "Alforis Finance"**
```bash
curl -X POST "http://localhost:8000/api/v1/enrichment/organisation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alforis Finance", "country": "FR"}'
```

**Résultat attendu:**
- ✅ Website trouvé
- ✅ Adresse extraite
- ✅ Téléphone formaté
- ✅ LinkedIn trouvé
- ✅ Confidence > 0.7

### **Test 2: Cache Hit**
Appeler 2 fois le même enrichissement:
- 1ère fois: `"cached": false` (fetch SerpAPI)
- 2ème fois: `"cached": true` (instant depuis Redis)

### **Test 3: Low Confidence**
Enrichir "Toto Inc":
- ⚠️ Confidence < 0.5
- ⚠️ Peu de données trouvées
- ✅ Pas de crash

---

## 💡 AMÉLIORATIONS FUTURES

### **Option A: Enrichissement Contacts** (LinkedIn profils)
- Chercher "Jean Dupont Alforis Finance LinkedIn"
- Extraire profil LinkedIn individuel
- Récupérer email professionnel
- Trouver téléphone direct

### **Option B: Company Insights**
- Nombre d'employés
- Chiffre d'affaires
- Date de création
- Secteur d'activité
- Logo entreprise

### **Option C: Multi-Provider Fallback**
Si SerpAPI échoue:
1. Try Brave Search API
2. Try custom web scraping
3. Return partial data

---

## 🚨 LIMITATIONS

### **Rate Limits:**
- **SerpAPI Free:** 100 req/mois
- **Cache:** 7 jours de TTL
- **Protection:** Pas de re-fetch avant expiration

### **Qualité Données:**
- **Confidence scoring** requis
- **Validation manuelle** recommandée pour confidence < 0.7
- **Fallback:** Parsing depuis snippets si pas de Knowledge Graph

### **Coûts:**
- **0-100 req/mois:** Gratuit
- **101-1000 req/mois:** $50/mois
- **Solution:** Cache agressif + prompt utilisateur avant enrichissement

---

## 📈 KPIs À MONITORER

### **Dashboard Enrichment:**
1. **Total enrichissements** (compteur)
2. **Cache hit rate** (%)
3. **Average confidence** (0-1)
4. **API costs** (€/mois)
5. **Top enriched organisations** (liste)

---

## 🎬 NEXT: HITL V2 (Bulk Validation)

Après enrichment, implémenter:
- ✅ Checkbox multi-select sur suggestions
- ✅ Bulk actions: "Approuver toutes (10)"
- ✅ Filtres: Type, Score, Source, Confiance
- ✅ Diff visuel avant/après

---

## 📝 NOTES TECHNIQUES

### **Regex Phone FR:**
```python
patterns = [
    r'\+33\s?\d\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}',  # +33 1 23 45 67 89
    r'0\d\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}',        # 01 23 45 67 89
]
```

### **Regex Address FR:**
```python
pattern = r'\d+[,\s]+[A-Za-zÀ-ÿ\s\-\']+[,\s]+\d{5}\s+[A-Za-zÀ-ÿ\-\s]+'
# Match: "123 Avenue des Champs-Élysées, 75008 Paris"
```

### **URL Cleaning:**
```python
url = re.sub(r'^https?://', '', url)  # Remove http://
url = re.sub(r'^www\.', '', url)      # Remove www.
url = url.rstrip('/')                  # Remove trailing /
# Result: "alforis.com"
```

---

## ✅ RÉSUMÉ OPTION A (TERMINÉ)

### **Ce qui a été fait (30 min):**

1. **Feature Flags** (5 min) ✅
   - Créé `.env.example` avec tous les flags autofill
   - Intégré dans `web_enrichment_service.py`
   - Intégré dans `email_autofill_pipeline.py`

2. **Migration DB Production** (10 min) ✅
   - Colonnes ajoutées: `web_enriched`, `enrichment_confidence`, `enrichment_source`, `enriched_at`
   - Indexes créés pour performance
   - API rebuild avec nouveau code

3. **Code Pushé GitHub** (5 min) ✅
   - 3 commits (1076 lignes)
   - Déployé sur serveur Hetzner

4. **Documentation** (5 min) ✅
   - Ce fichier mis à jour avec statut complet
   - Instructions test incluses

### **Prêt pour test:**

Une fois `SERPAPI_API_KEY` configurée dans `/srv/crm-alforis/.env`:

```bash
# 1. Tester enrichment manuel
curl -X POST "https://crm.alforis.fr/api/v1/enrichment/organisation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alforis Finance", "country": "FR"}'

# 2. Vérifier cache stats
curl https://crm.alforis.fr/api/v1/enrichment/cache-stats \
  -H "Authorization: Bearer $TOKEN"

# 3. Tester pipeline autofill complet
# (envoyer email → webhook → pipeline → autofill + enrichment)
```

### **Prochaine session: Option B (2-3h)**
Voir section "PROCHAINES ÉTAPES" ci-dessus.

---

**Dernière mise à jour: 2025-10-30 (Option A terminée)**
