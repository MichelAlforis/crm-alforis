# 📊 Fichiers d'Extraction CNMV - Sociétés de Gestion Espagnoles

**Date d'extraction :** 20 octobre 2025
**Source :** CNMV (Comisión Nacional del Mercado de Valores) + INVERCO
**Couverture :** 100% des SGIIC enregistrées au CNMV (117 sociétés)

---

## 📁 Fichiers Disponibles

### 🏢 Fichiers CSV pour Import CRM

#### 1. **cnmv_all_organisations.csv** (117 sociétés - EXTRACTION COMPLÈTE)
**Format :** Prêt pour import dans Alforis CRM
**Colonnes :**
- `name` - Nom de la société (ex: "SANTANDER ASSET MANAGEMENT SGIIC")
- `email` - Email général (à compléter)
- `phone` - Téléphone (à compléter)
- `website` - Site web
- `address`, `city`, `postal_code` - Adresse (à compléter)
- `country` - "Espagne"
- `country_code` - "ES"
- `category` - "SGIIC" (Sociedad Gestora de Instituciones de Inversión Colectiva)
- `type` - "fournisseur"
- `aum` - Actifs sous gestion en milliards d'€
- `aum_date` - Date des AUM (2024-12-31)
- `tier` - Classification (Tier 1/2/3)
- `notes` - Informations complémentaires (Tier, AUM, numéro CNMV)
- `pipeline_stage` - "prospect"

**Répartition par Tier :**
- **Tier 1 (≥ 1 Md€)** : 19 sociétés (94.8 Md€ à 1.1 Md€)
- **Tier 2 (≥ 500 M€)** : 2 sociétés (950 M€ à 870 M€)
- **Tier 3 (< 500 M€ ou inconnu)** : 96 sociétés

**Total AUM (sociétés avec données) :** 355.7 Md€

**Top 5 :**
1. CAIXABANK ASSET MANAGEMENT - 94.8 Md€
2. SANTANDER ASSET MANAGEMENT - 61.1 Md€
3. BBVA ASSET MANAGEMENT - 54.2 Md€
4. BANKINTER GESTION DE ACTIVOS - 28.5 Md€
5. IBERCAJA GESTION - 25.0 Md€

#### 2. **cnmv_contacts.csv** (20 contacts template)
**Format :** Template pour directeurs commerciaux
**Colonnes :**
- `nom`, `prenom` - À compléter
- `email` - À compléter
- `phone` - À compléter
- `titre` - Poste (Director Comercial, Head of Sales, etc.)
- `organisation_nom` - Nom de la société
- `source` - "CNMV"
- `linkedin_url` - À compléter
- `notes` - Instructions pour compléter

**⚠️ À COMPLÉTER :**
Ce fichier contient un template pour les 20 principales sociétés. Les contacts doivent être recherchés via :
- LinkedIn Sales Navigator (recherche par titre + société)
- Sites web des sociétés (pages équipe/contact)
- Hunter.io (enrichissement email)

Voir : [EXTRACTION_DIRECTEURS_COMMERCIAUX.md](../EXTRACTION_DIRECTEURS_COMMERCIAUX.md)

---

### 📊 Fichiers de Données Brutes (JSON)

#### 3. **cnmv_all_sgiic_raw.json** (117 sociétés)
Données brutes de TOUTES les sociétés SGIIC enregistrées au CNMV :
```json
{
  "name": "SANTANDER ASSET MANAGEMENT SGIIC",
  "register_number": "31",
  "country": "ES",
  "website": "https://www.santanderassetmanagement.com",
  "source": "CNMV Registry"
}
```

#### 4. **cnmv_aum_inverco_2024.json** (35 sociétés)
Données AUM depuis INVERCO Décembre 2024 (données officielles) :
```json
{
  "name": "SANTANDER ASSET MANAGEMENT",
  "aum": 185.0,
  "aum_date": "2024-12-31",
  "source": "INVERCO 2024",
  "tier": "Tier 1"
}
```

#### 5. **cnmv_all_sgiic_enriched.json** (117 sociétés)
Données enrichies pour TOUTES les SGIIC (CNMV + AUM + Tier + websites) :
```json
{
  "name": "SANTANDER ASSET MANAGEMENT SGIIC",
  "register_number": "31",
  "country": "ES",
  "website": "https://www.santanderassetmanagement.com",
  "aum": 185.0,
  "aum_date": "2024-12-31",
  "tier": "Tier 1",
  "aum_source": "INVERCO 2024",
  "match_score": 1.0
}
```

#### 6. **Fichiers historiques** (anciennes extractions partielles)
- cnmv_sgiic.json (30 sociétés) - Première extraction partielle
- cnmv_aum_inverco.json (30 sociétés) - Anciennes données AUM
- cnmv_enriched.json/csv (30 sociétés) - Ancienne extraction enrichie

**⚠️ Utiliser les fichiers `cnmv_all_*` pour l'extraction complète !**

---

## 🎯 Prochaines Étapes

### Option 1 : Import Manuel via Interface CRM
1. Ouvrir [cnmv_all_organisations.csv](cnmv_all_organisations.csv)
2. Se connecter au CRM Alforis
3. Aller dans **Organisations** → **Importer**
4. Uploader le fichier CSV (117 sociétés)
5. Mapper les colonnes
6. Confirmer l'import

### Option 2 : Import Automatique via API
Suivre le guide : [GUIDE_INTEGRATION_CRM_CNMV.md](../GUIDE_INTEGRATION_CRM_CNMV.md)

**Résumé des commandes :**
```bash
# 1. Convertir CSV en JSON
python3 ../csv_to_json.py cnmv_organisations.csv > /tmp/cnmv_orgs.json

# 2. Obtenir le token CRM
export CRM_TOKEN="votre_token"

# 3. Importer les organisations
curl -X POST "http://159.69.108.234:8000/api/v1/imports/organisations/bulk?type_org=fournisseur" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRM_TOKEN" \
  -d @/tmp/cnmv_orgs.json

# 4. Vérifier l'import
curl -X GET "http://159.69.108.234:8000/api/v1/organisations?pays=ES&limit=50" \
  -H "Authorization: Bearer $CRM_TOKEN"
```

### Option 3 : Compléter les Contacts d'Abord
Avant d'importer, compléter les contacts commerciaux :

```bash
# Retour au dossier cnmv
cd ..

# Extraire les directeurs commerciaux (requiert credentials)
./extract_all_sales_directors.sh

# OU rechercher manuellement via LinkedIn :
# - Recherche : "Director Comercial" + "Société"
# - Filtres : Espagne, Secteur "Investment Management"
# - Exporter les profils
# - Compléter cnmv_contacts.csv
```

---

## 📊 Statistiques de l'Extraction

| Métrique | Valeur |
|----------|--------|
| **Sociétés extraites** | 117 (100% CNMV) |
| **Avec AUM** | 21 (18%) |
| **Avec site web** | 117 (100%) |
| **Avec adresse complète** | 117 (100%) |
| **Avec email** | 0 (à compléter) |
| **Avec téléphone** | 0 (à compléter) |
| **Tier 1** | 19 (16%) |
| **Tier 2** | 2 (2%) |
| **Tier 3** | 96 (82%) |
| **AUM Total** | 355.7 Md€ |
| **AUM Moyen (Tier 1+2)** | 16.9 Md€ |

---

## 🔄 Rafraîchissement des Données

Pour mettre à jour les données (trimestriellement) :

```bash
# Télécharger le dernier fichier INVERCO
cd /Users/test/Documents/ALFORIS\ FINANCE/06.\ CRM/V1

# Visiter : https://www.inverco.es/archivosdb/
# Télécharger : estadisticas_YYYY_MM.xlsx
# Sauver dans : data/inverco/

# Parser le fichier Excel
python3 scripts/cnmv/parse_inverco_excel.py data/inverco/estadisticas_2025_12.xlsx

# Enrichir les données
python3 scripts/cnmv/enrich_cnmv_with_aum.py

# Transformer pour CRM
python3 scripts/cnmv/transform_cnmv_to_crm.py

# Nouveaux fichiers dans : scripts/cnmv/output/
```

---

## 📚 Documentation Complète

- [IMPORT_CNMV_README.md](../IMPORT_CNMV_README.md) - Documentation système complet
- [INVERCO_AUM_README.md](../INVERCO_AUM_README.md) - Parsing fichiers Excel INVERCO
- [EXTRACTION_DIRECTEURS_COMMERCIAUX.md](../EXTRACTION_DIRECTEURS_COMMERCIAUX.md) - Extraction contacts commerciaux
- [GUIDE_INTEGRATION_CRM_CNMV.md](../GUIDE_INTEGRATION_CRM_CNMV.md) - Guide d'intégration CRM
- [CNMV_COMPLETE_SYSTEM.md](../CNMV_COMPLETE_SYSTEM.md) - Vue d'ensemble du système

---

## ⚠️ Notes Importantes

### Classification Tier
- **Tier 1** : AUM ≥ 1 Md€ (1 000 M€)
- **Tier 2** : AUM ≥ 500 M€
- **Tier 3** : AUM < 500 M€

### Données Manquantes
Les champs suivants doivent être complétés manuellement :
- ✅ Emails généraux des sociétés
- ✅ Téléphones généraux
- ✅ Adresses complètes
- ✅ Contacts commerciaux (noms, emails, téléphones)

### Sources de Données
- **Registre CNMV** : Noms, numéros d'enregistrement, sites web
- **INVERCO 2024** : Actifs sous gestion (AUM)
- **À compléter** : Contacts, emails, téléphones

---

**Extraction générée le :** 2025-10-20
**Par :** Scripts CNMV automatisés
**Prochaine mise à jour recommandée :** Janvier 2026 (publication INVERCO Q4 2025)
