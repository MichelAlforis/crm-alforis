# 📥 Guide des Imports - CRM Alforis

> **Consolidation** des guides d'import SDG (France) et CNMV (Espagne)

---

## 📊 Imports disponibles

### 1. SDG France (AMF) - 677 sociétés
**Source**: Autorité des Marchés Financiers
**Fichier**: `sdg_import_677_societes.csv`
**Enrichissement**: AUM + Classification Tiers

### 2. CNMV Espagne - Sociétés de gestion
**Source**: CNMV (Comisión Nacional del Mercado de Valores)
**Fichiers**:
- `cnmv_organisations.csv` - Organisations
- `cnmv_contacts.csv` - Contacts
**Enrichissement**: AUM INVERCO + Tiers

---

## 🚀 Import SDG (France)

### Via API
```bash
curl -X POST "http://localhost:8000/api/v1/imports/organisations/bulk" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sdg_import_677_societes.csv"
```

### Format CSV
```csv
name,email,phone,website,country,country_code,category,type,notes
AMUNDI ASSET MANAGEMENT,,0176333030,www.amundi.com,France,FR,SDG,fournisseur,"Forme: SAS..."
```

### Colonnes requises
- `name` (requis)
- `category` = SDG
- `type` = fournisseur
- `country_code` = FR

---

## 🇪🇸 Import CNMV (Espagne)

### Scripts disponibles
```bash
# Import complet (scraping + transformation + import)
cd /Users/test/Documents/ALFORIS\ FINANCE/06.\ CRM/V1
./scripts/cnmv/import_cnmv.sh

# Étapes séparées
node scripts/cnmv/scraper_cnmv_sgiic.js       # Scraper sociétés
node scripts/cnmv/scraper_cnmv_aum.js          # Enrichir AUM
python3 scripts/cnmv/enrich_cnmv_with_aum.py   # Classification Tiers
python3 scripts/cnmv/transform_cnmv_to_crm.py  # Transformation CSV
```

### Sources de données
1. **CNMV SGIIC**: Sociétés de gestion
2. **INVERCO**: Données AUM (Assets Under Management)
3. **Websites**: Extraction contacts automatique

### Fichiers générés
- `cnmv_organisations.csv` - Pour import organisations
- `cnmv_contacts.csv` - Pour import contacts
- `cnmv_enriched_with_aum.json` - Données enrichies

---

## 📋 Classification Tiers (automatique)

**Logique commune SDG + CNMV**:

| Tier | Critère AUM | Stratégie | Pipeline Stage |
|------|-------------|-----------|----------------|
| Tier 1 | ≥ 30 Md€ | Veille | lead |
| Tier 2 | 10-30 Md€ | Opportuniste | lead |
| Tier 3 | 1-10 Md€ | **PRIORITÉ** | qualified |
| Tier 4 | 100M-1Md€ | Prospection | prospect |
| Tier 5 | < 100M€ | Veille | lead |

---

## 🔄 Workflow d'import complet

### 1. Préparation
```bash
# Vérifier que Docker est lancé
docker-compose ps

# Vérifier l'API
curl http://localhost:8000/api/v1/health
```

### 2. Import organisations
```bash
# Via interface web
http://localhost:3000/dashboard/imports/unified

# Ou via API
curl -X POST "http://localhost:8000/api/v1/imports/organisations/bulk" \
  -H "Authorization: Bearer {token}" \
  -F "file=@{fichier}.csv"
```

### 3. Import contacts (après organisations)
```bash
curl -X POST "http://localhost:8000/api/v1/imports/people/bulk" \
  -H "Authorization: Bearer {token}" \
  -F "file=@cnmv_contacts.csv"
```

### 4. Vérification
```sql
-- Compter les imports
SELECT category, tier, COUNT(*)
FROM organisations
WHERE category IN ('SDG', 'CNMV')
GROUP BY category, tier;

-- Contacts liés
SELECT COUNT(*) FROM person_organization_links;
```

---

## 📁 Fichiers source

### France (SDG)
- `SDG_677_FINAL_V2_AVEC_AUM.csv` - Base complète
- `SDG_TIER1_196_CIBLES_V2.csv` - Tier 1
- Voir [SDG_STRATEGIE_COMPLETE.md](SDG_STRATEGIE_COMPLETE.md)

### Espagne (CNMV)
- `scripts/cnmv/` - Scripts de scraping
- `cnmv_*.json` - Données brutes
- `cnmv_*.csv` - Fichiers d'import
- Voir [CNMV_COMPLETE_SYSTEM.md](CNMV_COMPLETE_SYSTEM.md)

---

## 🛠️ Dépannage

### Problème: Import échoue
```bash
# Vérifier format CSV
head -5 fichier.csv

# Vérifier colonnes requises
csvcut -n fichier.csv
```

### Problème: Doublons
```bash
# L'API dédoublonne automatiquement sur 'name'
# Vérifier les doublons avant import:
sort fichier.csv | uniq -d
```

### Problème: Contacts non liés
- Vérifier que les organisations sont importées d'abord
- Vérifier correspondance `organisation_name` exact

---

## 📚 Ressources

**API Documentation**:
- [backend/IMPORTS.md](../backend/IMPORTS.md) - API imports
- [backend/API_ENDPOINTS.md](../backend/API_ENDPOINTS.md) - Tous endpoints

**Stratégie**:
- [SDG_STRATEGIE_COMPLETE.md](SDG_STRATEGIE_COMPLETE.md) - Stratégie commerciale
- [CNMV_COMPLETE_SYSTEM.md](CNMV_COMPLETE_SYSTEM.md) - Système CNMV complet

---

**Dernière mise à jour**: 2025-10-20
