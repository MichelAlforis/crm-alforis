# 🇪🇸 Import CNMV - Sociétés de Gestion Espagnoles + AUM + Tiers + Contacts

## 🎯 Vue d'ensemble

Ce système d'import récupère et importe automatiquement les données du régulateur espagnol **CNMV** (Comisión Nacional del Mercado de Valores) dans le CRM Alforis, **avec enrichissement automatique des AUM (Assets Under Management) et classification par Tiers stratégiques**.

### Sources de données

1. **CNMV SGIIC** (Sociedades Gestoras de Instituciones de Inversión Colectiva)
   - URL: https://www.cnmv.es/portal/Consultas/IIC/SGIICsRegistro.aspx
   - Équivalent espagnol des SGP françaises
   - Sociétés de gestion d'investissements collectifs

2. **CNMV Entities Hub**
   - URL: https://www.cnmv.es/portal/Consultas/Entidades.aspx
   - Branches EEE (Espace Économique Européen)
   - LPS (Limited Partnership Schemes)
   - Délégués et autres entités

3. **AUM Data (Encours Gérés)** 🆕
   - INVERCO (Asociación de Instituciones de Inversión Colectiva)
   - Rapports statistiques CNMV
   - Base de données intégrée des top 20 gestionnaires espagnols

4. **Contacts via websites**
   - Extraction automatique depuis les sites web des sociétés
   - Directeurs généraux, commerciaux, contacts clés

---

## 📁 Structure du projet

```
scripts/cnmv/
├── scraper_cnmv_sgiic.js       # Scraper SGIIC
├── scraper_cnmv_entities.js    # Scraper entités
├── scraper_cnmv_contacts.js    # Scraper contacts
├── scraper_cnmv_aum.js         # 🆕 Scraper AUM
├── enrich_cnmv_with_aum.py     # 🆕 Enrichissement + Tiers
├── transform_cnmv_to_crm.py    # Transformation données
└── import_cnmv.sh              # Script d'import automatique

Fichiers générés (racine du projet):
├── cnmv_sgiic_raw.json         # Données brutes SGIIC
├── cnmv_entities_raw.json      # Données brutes entités
├── cnmv_contacts_raw.json      # Données brutes contacts
├── cnmv_aum_raw.json           # 🆕 AUM par société
├── cnmv_enriched_with_aum.json # 🆕 Données enrichies + Tiers
├── cnmv_organisations.csv      # CSV pour import CRM
└── cnmv_contacts.csv           # CSV contacts pour CRM
```

---

## 🚀 Utilisation

### Option 1: Import complet avec AUM (recommandé) 🆕

```bash
# Install dependencies (première fois uniquement)
npm install puppeteer

# Lancer l'import complet avec enrichissement AUM
./scripts/cnmv/import_cnmv.sh

# Avec authentification API pour import automatique
export CRM_API_TOKEN="your_token_here"
export CRM_API_URL="http://localhost:8000"
./scripts/cnmv/import_cnmv.sh
```

Le script automatique exécute:
1. ✅ Scraping SGIIC
2. ✅ Scraping entités
3. ✅ Scraping contacts
4. ✅ **Scraping AUM** 🆕
5. ✅ **Enrichissement avec AUM + Classification Tier** 🆕
6. ✅ Transformation des données
7. ✅ Import dans le CRM

---

### Option 2: Import par étapes

#### Étape 1: Scraping complet

```bash
./scripts/cnmv/import_cnmv.sh --scrape-only
```

Génère:
- `cnmv_sgiic_raw.json` - SGIIC companies
- `cnmv_entities_raw.json` - Other entities
- `cnmv_contacts_raw.json` - Contacts
- `cnmv_aum_raw.json` - AUM data 🆕

#### Étape 2: Enrichissement avec AUM 🆕

```bash
./scripts/cnmv/import_cnmv.sh --enrich-only
```

Génère:
- `cnmv_enriched_with_aum.json` - Données enrichies avec AUM et Tiers
- `cnmv_enriched_with_aum.csv` - Version CSV

#### Étape 3: Transformation

```bash
./scripts/cnmv/import_cnmv.sh --transform-only
```

Génère:
- `cnmv_organisations.csv` - Format CRM (avec AUM et Tier)
- `cnmv_contacts.csv` - Format CRM

#### Étape 4: Import

```bash
export CRM_API_TOKEN="your_token"
./scripts/cnmv/import_cnmv.sh --import-only
```

---

## 📊 Classification par Tiers (AUM) 🆕

### Critères de classification

| Tier | AUM | Priorité | Profil |
|------|-----|----------|--------|
| **Tier 1** | ≥ 1 Md€ | 🔴 Maximale | Leaders du marché |
| **Tier 2** | ≥ 500 M€ | 🟠 Haute | Sociétés établies |
| **Tier 3** | < 500 M€ ou inconnu | 🟡 Veille | Petites SGP |

### Top 20 gestionnaires espagnols (estimations)

| # | Société | AUM (Md€) | Tier |
|---|---------|-----------|------|
| 1 | SANTANDER ASSET MANAGEMENT | 185.0 | Tier 1 |
| 2 | CAIXABANK ASSET MANAGEMENT | 85.0 | Tier 1 |
| 3 | BBVA ASSET MANAGEMENT | 72.0 | Tier 1 |
| 4 | BANKINTER GESTION DE ACTIVOS | 35.0 | Tier 1 |
| 5 | KUTXABANK GESTION | 28.0 | Tier 1 |
| 6 | MUTUACTIVOS | 22.0 | Tier 1 |
| 7 | IBERCAJA GESTION | 18.0 | Tier 1 |
| 8 | ALLIANZ POPULAR ASSET MANAGEMENT | 16.0 | Tier 1 |
| 9 | ABANCA GESTION | 15.0 | Tier 1 |
| 10 | MAPFRE ASSET MANAGEMENT | 14.0 | Tier 1 |
| 11 | BANKIA FONDOS | 12.0 | Tier 1 |
| 12 | LABORAL KUTXA GESTORA | 9.0 | Tier 1 |
| 13 | UNICAJA ASSET MANAGEMENT | 8.5 | Tier 1 |
| 14 | BESTINVER | 4.5 | Tier 1 |
| 15 | GVC GAESCO GESTIÓN | 3.5 | Tier 1 |
| 16 | AZVALOR ASSET MANAGEMENT | 2.8 | Tier 1 |
| 17 | COBAS ASSET MANAGEMENT | 1.5 | Tier 1 |
| 18 | MERCHBANC | 1.2 | Tier 1 |
| 19 | PORTOCOLOM | 0.9 | Tier 2 |
| 20 | TRUE VALUE | 0.8 | Tier 2 |

---

## 📋 Structure des données enrichies 🆕

### Organisations avec AUM (cnmv_organisations.csv)

| Colonne | Description | Exemple |
|---------|-------------|---------|
| `name` | Nom de la société | SANTANDER ASSET MANAGEMENT |
| `email` | Email principal | info@santanderassetmanagement.com |
| `phone` | Téléphone | +34 91 257 2500 |
| `website` | Site web | https://www.santanderassetmanagement.com |
| `address` | Adresse | Paseo de la Castellana 75 |
| `city` | Ville | Madrid |
| `postal_code` | Code postal | 28046 |
| `country` | Pays | Espagne |
| `country_code` | Code pays | ES |
| `category` | Catégorie | SGIIC |
| `type` | Type | fournisseur |
| **`aum`** 🆕 | **Encours en Md€** | **185.0** |
| **`aum_date`** 🆕 | **Date AUM** | **2024-12-31** |
| **`tier`** 🆕 | **Classification** | **Tier 2** |
| `notes` | Notes | Tier 2. AUM: 185.0 Bn€. Registro CNMV: 123 |
| `pipeline_stage` | État | prospect |

---

## 🔍 Détails des nouveaux scrapers 🆕

### scraper_cnmv_aum.js

**Fonctionnalités:**
- Scrape INVERCO pour statistiques secteur
- Scrape rapports CNMV
- Base de données intégrée des top 20 gestionnaires
- Matching intelligent avec fuzzy logic

**Sources:**
1. INVERCO statistiques mensuelles
2. Rapports trimestriels CNMV
3. Données publiques des grandes banques espagnoles
4. Base de référence interne

### enrich_cnmv_with_aum.py

**Fonctionnalités:**
- Matching intelligent société ↔ AUM (fuzzy matching)
- Classification automatique par Tier
- Génération statistiques détaillées
- Export JSON + CSV

**Algorithme de matching:**
```python
# Normalisation des noms
# Matching exact, inclusion, fuzzy (>75%)
# Attribution AUM + Tier
# Génération rapport
```

---

## 📊 Résultats attendus

### Volumes

- **SGIIC**: ~100-150 sociétés de gestion
- **Entities**: ~200-300 entités
- **Contacts**: ~50-100 contacts
- **AUM enrichies**: ~20-30 sociétés avec AUM précis 🆕

### Qualité des données

| Champ | Taux de remplissage |
|-------|---------------------|
| Nom société | 100% |
| Numéro registre CNMV | 100% |
| **AUM (Tier 1-3)** 🆕 | **100%** |
| **Tier classification** 🆕 | **100%** |
| Téléphone | 60-70% |
| Email | 40-50% |
| Site web | 70-80% |
| Contacts nominatifs | 30-40% |

---

## 🎯 Stratégie commerciale post-import

### Priorisation automatique

Le système génère automatiquement une classification permettant de prioriser les efforts commerciaux:

#### Tier 1 (≥ 1 Md€) - Priorité MAXIMALE 🔴
- **Profil**: Leaders du marché espagnol (18 sociétés)
- **Contacts**: CEO, C-level executives
- **Fréquence**: Contact mensuel
- **Approche**: Executive sponsorship, relation personnalisée
- **Action**: Qualifier immédiatement, assigner aux top commerciaux

#### Tier 2 (≥ 500 M€) - Priorité HAUTE 🟠
- **Profil**: Sociétés de gestion établies (2 sociétés)
- **Contacts**: Directeurs commerciaux, Head of Distribution
- **Fréquence**: Contact trimestriel
- **Approche**: Solution selling, démonstrations produit
- **Action**: Campagnes outbound ciblées

#### Tier 3 (< 500 M€) - VEILLE 🟡
- **Profil**: Petites SGP et startups
- **Contacts**: Contacts généralistes
- **Fréquence**: Contact annuel ou inbound
- **Approche**: Nurturing, content marketing
- **Action**: Base de données pour opportunités futures


### Requêtes SQL utiles

```sql
-- Qualifier les Tier 1-2 comme prospects prioritaires
UPDATE organisations
SET pipeline_stage = 'qualified',
    notes = CONCAT(notes, ' - PRIORITÉ HAUTE')
WHERE country_code = 'ES'
  AND (tier = 'Tier 1' OR tier = 'Tier 2');

-- Compter par Tier
SELECT tier, COUNT(*) as count, SUM(aum) as total_aum
FROM organisations
WHERE country_code = 'ES'
GROUP BY tier
ORDER BY total_aum DESC;

-- Top 10 espagnols par AUM
SELECT name, aum, tier, website
FROM organisations
WHERE country_code = 'ES' AND aum IS NOT NULL
ORDER BY aum DESC
LIMIT 10;
```

---

## 🔧 Enrichissement recommandé

### Sources additionnelles AUM

1. **INVERCO - Rapports annuels**
   - URL: https://www.inverco.es/archivosdb/
   - Excel téléchargeables avec AUM détaillés

2. **CNMV - Statistiques IIC**
   - URL: https://www.cnmv.es/portal/Publicaciones/Estadisticas/IIC/IIC.aspx
   - AUM par SGIIC trimestriels

3. **Rapports annuels sociétés cotées**
   - Santander, CaixaBank, BBVA, Bankinter
   - AUM publiés dans les résultats financiers

### Contacts C-level

Pour les Tier 1-2, enrichir avec:
- **LinkedIn Sales Navigator**
- **Bases de données B2B** (Informa D&B España)
- **Sites web officiels** (sections "Équipe", "Management")

---

## 🛠️ Configuration avancée

### Variables d'environnement

```bash
# API CRM
export CRM_API_URL="http://localhost:8000"
export CRM_API_TOKEN="your_token_here"

# Scraping
export PUPPETEER_HEADLESS="true"
export SCRAPER_TIMEOUT="60000"
export SCRAPER_MAX_COMPANIES="50"

# AUM enrichment
export AUM_FUZZY_THRESHOLD="0.75"  # Seuil matching (0-1)
export AUM_FALLBACK_DATE="2024-12-31"  # Date par défaut
```

---

## 📅 Maintenance

### Fréquence recommandée

- **Mensuel**: Vérifier nouvelles inscriptions CNMV
- **Trimestriel**: Mettre à jour AUM (rapports CNMV/INVERCO)
- **Annuel**: Re-scraping complet avec enrichissement

### Script automatique (cron)

```bash
# Mise à jour mensuelle complète
0 2 1 * * cd /path/to/crm && ./scripts/cnmv/import_cnmv.sh >> /var/log/cnmv_import.log 2>&1

# Mise à jour AUM uniquement (trimestriel)
0 2 1 */3 * cd /path/to/crm && ./scripts/cnmv/import_cnmv.sh --scrape-only && ./scripts/cnmv/import_cnmv.sh --enrich-only
```

---

## 📝 Import manuel via API

### Importer les organisations avec AUM

```bash
# 1. Copier le fichier sur le serveur
scp -i ~/.ssh/id_rsa_hetzner cnmv_organisations.csv root@159.69.108.234:/tmp/

# 2. Se connecter
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234

# 3. Convertir CSV en JSON
python3 << 'EOF'
import csv
import json

with open('/tmp/cnmv_organisations.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    organisations = []
    for row in reader:
        # Convertir AUM en float si présent
        if row.get('aum'):
            try:
                row['aum'] = float(row['aum'])
            except:
                row['aum'] = None

        org = {k: v for k, v in row.items() if v}
        organisations.append(org)

with open('/tmp/cnmv_orgs_payload.json', 'w', encoding='utf-8') as f:
    json.dump(organisations, f, indent=2, ensure_ascii=False)

print(f"✅ {len(organisations)} organisations prêtes")
EOF

# 4. Importer via API
curl -X POST "http://localhost:8000/api/v1/imports/organisations/bulk?type_org=fournisseur" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d @/tmp/cnmv_orgs_payload.json
```

---

## ✅ Checklist post-import

- [ ] Vérifier le nombre d'organisations importées
- [ ] Vérifier la répartition par Tier (Tier 1-3)
- [ ] Vérifier que les AUM sont présents pour Tier 1-3
- [ ] Contrôler la qualité des données (emails, téléphones)
- [ ] **Qualifier les Tier 1-2 comme prospects prioritaires** 🆕
- [ ] **Assigner les Tier 1-2 aux commerciaux** 🆕
- [ ] Créer les tâches de prospection
- [ ] Enrichir les contacts pour les Tier 1-2
- [ ] Documenter les particularités espagnoles

---

## 🔗 Ressources

### Officielles CNMV

- **CNMV Home**: https://www.cnmv.es
- **Registre SGIIC**: https://www.cnmv.es/portal/Consultas/IIC/SGIICsRegistro.aspx
- **Hub Entités**: https://www.cnmv.es/portal/Consultas/Entidades.aspx
- **Statistiques AUM**: https://www.cnmv.es/portal/publicaciones/estadisticas.aspx 🆕

### Associations professionnelles

- **INVERCO**: https://www.inverco.es (AUM par SGIIC) 🆕
- **AEB**: https://www.aebanca.es (Association bancaire)

### Documentation technique

- [Documentation API CRM](documentation/api/IMPORTS.md)
- [Import AMF France (similaire)](IMPORT_SDG_COMPLET_README.md)

---

**Créé le**: 2025-10-20
**Version**: 2.0 🆕 (avec AUM enrichment)
**Source**: CNMV + INVERCO + Public Reports
**Auteur**: Alforis CRM Team
