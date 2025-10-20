# CSSF Luxembourg - Système d'import complet

## Vue d'ensemble

Système d'import des sociétés de gestion luxembourgeoises depuis le régulateur CSSF (Commission de Surveillance du Secteur Financier) vers le CRM Alforis.

### Objectifs

1. **Importer les sociétés de gestion luxembourgeoises** enregistrées auprès du CSSF
2. **Enrichir avec les données AUM** depuis Inverco (données publiques espagnoles)
3. **Extraire les contacts commerciaux** depuis les métadonnées CSSF
4. **Assigner un tier stratégique** pour priorisation commerciale

---

## Architecture du système

```
┌─────────────────────────────────────────────────────────────────┐
│                    CSSF LUXEMBOURG WORKFLOW                      │
└─────────────────────────────────────────────────────────────────┘

1. SOURCES DE DONNÉES
   ┌──────────────────────┐      ┌──────────────────────┐
   │  CSSF Database       │      │  Inverco AUM Data    │
   │  - UCITS Mgmt Co.    │      │  - Spanish market    │
   │  - AIFMs             │      │  - Public data       │
   │  - Chapter 15        │      │  - EUR millions      │
   └──────────┬───────────┘      └──────────┬───────────┘
              │                              │
              └──────────────┬───────────────┘
                             ▼
2. CONSOLIDATION
   ┌──────────────────────────────────────────┐
   │  cssf_import.py                          │
   │  - Normalisation des noms                │
   │  - Matching AUM                          │
   │  - Extraction contacts commerciaux       │
   │  - Enrichissement métadonnées            │
   └──────────────────┬───────────────────────┘
                      ▼
3. IMPORT CRM
   ┌──────────────────────────────────────────┐
   │  CRM Alforis                             │
   │  - Sociétés par tier                     │
   │  - Contacts associés                     │
   │  - AUM enrichi                           │
   │  - Métadonnées CSSF                      │
   └──────────────────────────────────────────┘
```

---

## Scripts et fichiers

### 1. Script d'import principal

**Fichier:** `scripts/cssf/cssf_import.py`

**Fonctionnalités:**
- Import depuis CSV contenant les sociétés CSSF
- Enrichissement AUM depuis Inverco
- Extraction automatique des contacts commerciaux
- Gestion des tiers stratégiques
- Mode dry-run pour tests

**Usage:**
```bash
# Test en dry-run
python3 scripts/cssf/cssf_import.py \
    --file data/cssf/cssf_companies_tier1.csv \
    --tier 1 \
    --dry-run

# Import réel
python3 scripts/cssf/cssf_import.py \
    --file data/cssf/cssf_companies_tier1.csv \
    --tier 1 \
    --import
```

### 2. Workflow de démonstration

**Fichier:** `scripts/cssf/demo_cssf.sh`

**Fonctionnalités:**
- Workflow complet end-to-end
- Vérification des dépendances
- Création de données exemple
- Validation API CRM
- Résumé détaillé

**Usage:**
```bash
# Test tier 1
./scripts/cssf/demo_cssf.sh --tier 1 --dry-run

# Import réel tier 1
./scripts/cssf/demo_cssf.sh --tier 1 --import

# Test tier 2
./scripts/cssf/demo_cssf.sh --tier 2 --dry-run
```

---

## Sources de données CSSF

### 1. UCITS Management Companies (Chapter 15)

**URL officielle:** https://www.cssf.lu/
**Base de données:** https://edesk.apps.cssf.lu/search-entities/search

**Types d'entités:**
- Management Companies (Chapter 15)
- UCITS Management Companies
- AIFMs (Alternative Investment Fund Managers)

**Données disponibles:**
- Nom de la société
- Adresse complète
- Numéro d'enregistrement
- Date d'autorisation
- Statut (Active/Inactive)
- Type d'entité

### 2. Données Inverco (enrichissement)

**Source:** Asociación de Instituciones de Inversión Colectiva y Fondos de Pensiones (Espagne)

**Données:**
- AUM (Assets Under Management) en millions d'euros
- Données publiques du marché espagnol
- Mise à jour mensuelle

**Matching:**
- Normalisation des noms de sociétés
- Recherche exacte puis partielle
- Suppression des suffixes légaux (S.A., Ltd., etc.)

---

## Format CSV d'import

### Structure du fichier

```csv
name,address,city,postal_code,website,registration_number,entity_type,status,registration_date,contacts
```

### Colonnes

| Colonne | Type | Description | Obligatoire |
|---------|------|-------------|-------------|
| `name` | String | Nom de la société | ✅ Oui |
| `address` | String | Adresse complète | Non |
| `city` | String | Ville | Non |
| `postal_code` | String | Code postal | Non |
| `website` | String | Site web | Non |
| `registration_number` | String | Numéro d'enregistrement CSSF | Non |
| `entity_type` | String | Type d'entité (UCITS/AIFM) | Non |
| `status` | String | Statut (Active/Inactive) | Non |
| `registration_date` | String | Date d'autorisation (YYYY-MM-DD) | Non |
| `contacts` | JSON Array | Contacts commerciaux | Non |

### Exemple de fichier

```csv
name,address,city,postal_code,website,registration_number,entity_type,status,registration_date,contacts
"Blackrock Investment Management (Luxembourg) S.A.","35A avenue J.F. Kennedy","Luxembourg","L-1855","www.blackrock.com","B00000","UCITS Management Company","Active","1988-01-15","[]"
"Amundi Luxembourg S.A.","5 allée Scheffer","Luxembourg","L-2520","www.amundi.lu","B00001","UCITS Management Company","Active","1990-03-20","[]"
```

---

## Extraction des contacts commerciaux

### Logique de priorisation

Le script `cssf_import.py` extrait automatiquement les contacts commerciaux selon cette priorité:

**1. Sales Director (priorité maximale)**
- Pattern: `sales director`, `director of sales`, `head of sales`
- Français: `responsable commercial`

**2. Business Development**
- Pattern: `business development`, `développement commercial`

**3. Executive (fallback)**
- Pattern: `managing director`, `chief executive`, `ceo`, `directeur général`

### Format des contacts dans CSV

```json
[
  {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@company.lu",
    "phone": "+352 12 34 56 78",
    "title": "Sales Director",
    "linkedin_url": "https://linkedin.com/in/johndoe"
  }
]
```

### Import dans CRM

Les contacts extraits sont automatiquement:
- Associés à la société parente
- Catégorisés par type (Sales/BD/Executive)
- Annotés avec la source CSSF

---

## Stratégie de tier

### Tier 1 - Prioritaires

**Critères:**
- Top gestionnaires luxembourgeois
- AUM > 50 Mds€
- Présence internationale forte
- Sociétés cibles principales

**Exemples:**
- Blackrock Luxembourg
- Amundi Luxembourg
- DWS Investment S.A.
- J.P. Morgan Asset Management Europe
- UBS Fund Management Luxembourg

### Tier 2 - Secondaires

**Critères:**
- Gestionnaires établis
- AUM entre 10-50 Mds€
- Spécialisation sectorielle
- Potentiel de croissance

### Tier 3 - Opportunistes

**Critères:**
- Nouveaux entrants
- Boutiques spécialisées
- AUM < 10 Mds€
- Opportunités long terme

---

## Workflow complet

### Étape 1: Préparation des données

```bash
# Créer le répertoire
mkdir -p data/cssf

# Préparer le fichier CSV avec les sociétés CSSF
# Format: voir section "Format CSV d'import"
```

### Étape 2: Vérification Inverco (optionnel)

```bash
# Vérifier la présence des données AUM
ls -lh data/inverco_aum_latest.csv

# Si absent, télécharger depuis Inverco
# (script séparé ou manuel)
```

### Étape 3: Test en dry-run

```bash
./scripts/cssf/demo_cssf.sh --tier 1 --dry-run
```

**Vérifications:**
- Nombre de sociétés détectées
- Matching AUM réussi
- Contacts extraits
- Aucune erreur

### Étape 4: Import réel

```bash
./scripts/cssf/demo_cssf.sh --tier 1 --import
```

**Résultat attendu:**
```
════════════════════════════════════════════════════════════════
RÉSUMÉ DE L'IMPORT
════════════════════════════════════════════════════════════════
Total sociétés: 50
✅ Créées: 48
♻️  Mises à jour: 2
💰 Enrichies AUM: 35
👤 Contacts trouvés: 42
❌ Erreurs: 0
════════════════════════════════════════════════════════════════
```

### Étape 5: Vérification dans CRM

```bash
# Liste des sociétés tier 1 luxembourgeoises
curl http://localhost:8000/api/societes?pays=Luxembourg&tier_strategique=1

# Détail d'une société avec contacts
curl http://localhost:8000/api/societes/123

# Contacts commerciaux
curl http://localhost:8000/api/contacts?societe_id=123
```

---

## Enrichissement AUM

### Normalisation des noms

Le matching AUM utilise une normalisation agressive:

```python
def normalize_company_name(name: str) -> str:
    """
    Transformations:
    1. Minuscules
    2. Suppression suffixes légaux (S.A., Ltd., LLC, etc.)
    3. Suppression ponctuation
    4. Suppression espaces multiples
    """
    # "Blackrock Investment Management (Luxembourg) S.A."
    # → "blackrock investment management"
```

### Algorithme de matching

1. **Recherche exacte:**
   - Comparaison des noms normalisés

2. **Recherche partielle:**
   - Sous-chaîne dans les deux sens
   - Ex: "Blackrock Luxembourg" match "Blackrock"

3. **Résultat:**
   - AUM en millions d'euros
   - Source: Inverco
   - Stocké dans métadonnées CRM

---

## Métadonnées CSSF

### Stockage dans CRM

Chaque société importée conserve ses métadonnées CSSF:

```json
{
  "cssf_type": "UCITS Management Company",
  "cssf_registration_date": "1988-01-15",
  "cssf_status": "Active"
}
```

### Utilisation

- Filtrage par type d'entité
- Vérification statut actif
- Historique d'autorisation
- Conformité réglementaire

---

## Gestion des erreurs

### Types d'erreurs

**1. Société sans nom**
```
⚠️ Ligne ignorée: nom vide
```

**2. API CRM non accessible**
```
❌ API CRM non accessible - impossible d'importer
Démarrer le backend: cd crm-backend && docker-compose up -d
```

**3. Société déjà existante**
```
⚠️ Société existe déjà: Blackrock Luxembourg
```

**4. Erreur HTTP**
```
❌ Société XYZ: HTTP 500
```

### Logs et résumé

Toutes les erreurs sont:
- Loggées en temps réel
- Collectées dans `stats['errors']`
- Affichées dans le résumé final (max 10)

---

## Exemples d'utilisation

### Cas 1: Import initial tier 1

```bash
# Préparation
mkdir -p data/cssf
cp cssf_top_50.csv data/cssf/cssf_companies_tier1.csv

# Test
./scripts/cssf/demo_cssf.sh --tier 1 --dry-run

# Import
./scripts/cssf/demo_cssf.sh --tier 1 --import
```

### Cas 2: Mise à jour avec nouveaux AIFMs

```bash
# Ajout de nouveaux AIFMs au CSV
cat new_aifms.csv >> data/cssf/cssf_companies_tier2.csv

# Import tier 2
./scripts/cssf/demo_cssf.sh --tier 2 --import
```

### Cas 3: Re-import avec AUM mis à jour

```bash
# Télécharger nouvelles données Inverco
wget https://inverco.es/data/latest.csv -O data/inverco_aum_latest.csv

# Re-import (mettra à jour l'AUM)
./scripts/cssf/demo_cssf.sh --tier 1 --import
```

---

## Comparaison avec CNMV

| Aspect | CNMV (Espagne) | CSSF (Luxembourg) |
|--------|----------------|-------------------|
| **Régulateur** | CNMV | CSSF |
| **Pays** | Espagne | Luxembourg |
| **Types** | SGIICs, Gestoras | UCITS, AIFMs |
| **API publique** | ✅ Oui | ❌ Non (interface web) |
| **Enrichissement** | Inverco AUM | Inverco AUM |
| **Contacts** | Scraping LinkedIn | Métadonnées CSSF |
| **Script** | `cnmv_import.py` | `cssf_import.py` |
| **Workflow** | `demo_workflow.sh` | `demo_cssf.sh` |

---

## Maintenance et évolution

### Mises à jour régulières

**Mensuel:**
- Vérifier nouvelles autorisations CSSF
- Télécharger données AUM Inverco
- Re-import tier 1 pour mise à jour

**Trimestriel:**
- Audit complet des sociétés
- Vérification statuts (Active/Inactive)
- Mise à jour contacts commerciaux

**Annuel:**
- Revue stratégie de tiers
- Reclassification si nécessaire

### Évolutions possibles

**Court terme:**
1. Scraping automatique de la base CSSF (JavaScript)
2. Enrichissement LinkedIn pour contacts
3. Export vers outils d'email marketing

**Moyen terme:**
1. API CSSF officielle (si disponible)
2. Intégration données Bloomberg/Refinitiv
3. Scoring automatique de priorité

**Long terme:**
1. Prédiction AUM basée sur historique
2. Recommandations IA pour prospection
3. Intégration CRM → ERP

---

## Support et documentation

### Fichiers de référence

- **Script principal:** [scripts/cssf/cssf_import.py](../../scripts/cssf/cssf_import.py)
- **Workflow demo:** [scripts/cssf/demo_cssf.sh](../../scripts/cssf/demo_cssf.sh)
- **Ce guide:** [documentation/archive/CSSF_COMPLETE_SYSTEM.md](./CSSF_COMPLETE_SYSTEM.md)

### Ressources externes

- **CSSF Luxembourg:** https://www.cssf.lu/
- **Base de données entités:** https://edesk.apps.cssf.lu/search-entities/search
- **Inverco (Espagne):** https://www.inverco.es/

### Contact

Pour questions ou problèmes:
- Vérifier les logs d'import
- Consulter la documentation API CRM
- Tester en mode dry-run d'abord

---

## Changelog

### Version 1.0 (2025-10-20)

**Création initiale:**
- ✅ Script `cssf_import.py` complet
- ✅ Workflow `demo_cssf.sh` automatisé
- ✅ Support enrichissement AUM Inverco
- ✅ Extraction contacts commerciaux
- ✅ Gestion tiers stratégiques 1-2-3
- ✅ Mode dry-run et import
- ✅ Documentation complète

---

**Généré le 2025-10-20 par Claude Code**
