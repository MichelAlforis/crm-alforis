# 📊 IMPORT SDG CLIENTS - GUIDE COMPLET

## 🎯 Vue d'ensemble

Ce guide explique comment importer les **677 Sociétés De Gestion (SDG)** françaises dans le CRM Alforis.

### Données disponibles:
- **677 organisations SDG** avec type="client"
- **225 AUM collectés** (33.2% couverture) via web scraping
- **8 contacts** pour les SDG prioritaires
- **Classification en 3 tiers** selon AUM

---

## 📁 Fichiers d'import

### 1. Organisations (obligatoire)

**Fichier**: `SDG_677_CLIENTS_FINAL.csv`

**Colonnes**:
```
name, email, phone, website, address, city, country, country_code,
category, type, notes, aum, aum_date, tier, pipeline_stage, priority, aum_source
```

**Statistiques**:
- Total: **677 SDG**
- Tier 1 (> 1 Md€): **143 clients** prioritaires
- Tier 2 (600M€-1Md€): **25 clients** secondaires
- Tier 3 (< 600M€): **509 prospects**

### 2. Contacts (optionnel)

**Fichier**: `/tmp/sdg_people_import.csv`

**Colonnes**:
```
first_name, last_name, personal_email, phone, country_code, language
```

**Statistiques**:
- Total: **8 contacts** (CEO/Président de SDG prioritaires)

**Liste des contacts**:
1. Valérie Baudson - AMUNDI ASSET MANAGEMENT
2. Fannie Wurtz - AMUNDI ASSET MANAGEMENT
3. François-Marc Durand - LAZARD FRERES GESTION
4. Frédéric Janbon - BNP PARIBAS ASSET MANAGEMENT
5. Edouard Carmignac - CARMIGNAC GESTION
6. Guillaume Rigeade - MANDARINE GESTION
7. Eric Franc - DNCA FINANCE
8. Imen Hazgui - ELEVA CAPITAL

---

## 🚀 MÉTHODE 1: Import via Script Python (Recommandé)

### Prérequis

1. **Backend démarré**:
```bash
cd crm-backend
source .venv/bin/activate  # ou .venv312/bin/activate
uvicorn main:app --reload
```

2. **Vérifier que l'API répond**:
```bash
curl http://localhost:8000/health
# Devrait retourner: {"status":"healthy"}
```

### Étapes d'import

#### 1. Exécuter le script

```bash
cd /Users/test/Documents/ALFORIS\ FINANCE/06.\ CRM/V1
python scripts/import_sdg_clients.py
```

Le script va:
- ✅ Charger les 677 organisations depuis `SDG_677_CLIENTS_FINAL.csv`
- ✅ Charger les 8 contacts depuis `/tmp/sdg_people_import.csv`
- ✅ Importer via `POST /api/v1/imports/organisations/bulk?type_org=client`
- ✅ Importer via `POST /api/v1/imports/people/bulk`
- ⚠️  Afficher les erreurs éventuelles (doublons, contraintes, etc.)

#### 2. Vérifier les résultats

Le script affiche un résumé:
```
📊 RÉSUMÉ FINAL
======================================================================
Organisations créées: 677 / 677
Contacts créés: 8 / 8

✅ Import terminé!
```

#### 3. Créer les liens organisation-personne

**Option A - Via script Python** (à créer):
```python
import requests

links = [
    {
        "organisation_name": "AMUNDI ASSET MANAGEMENT",
        "person_email": "valerie.baudson@amundi.com",
        "role": "CEO",
        "is_primary": True
    },
    # ... autres liens
]

response = requests.post(
    "http://localhost:8000/api/v1/org-links/bulk",
    json={"links": links}
)
```

**Option B - Via interface CRM** (manuel):
1. Aller dans l'organisation AMUNDI ASSET MANAGEMENT
2. Ajouter le contact Valérie Baudson
3. Définir comme contact principal

---

## 🚀 MÉTHODE 2: Import via API direct (cURL)

### 1. Import des organisations

```bash
curl -X POST "http://localhost:8000/api/v1/imports/organisations/bulk?type_org=client" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
[
  {
    "name": "AMUNDI ASSET MANAGEMENT",
    "type": "client",
    "category": "SDG",
    "phone": "0176333030",
    "country": "France",
    "country_code": "FR",
    "aum": 2240.0,
    "aum_date": "2024-12-31",
    "pipeline_stage": "qualified",
    "notes": "AUM: 2240.0 Md€ | Leader français"
  },
  {
    "name": "LAZARD FRERES GESTION",
    "type": "client",
    "category": "SDG",
    "phone": "0144130111",
    "country": "France",
    "country_code": "FR",
    "aum": 41.5,
    "aum_date": "2024-12-31",
    "pipeline_stage": "qualified"
  }
]
EOF
```

### 2. Import des contacts

```bash
curl -X POST "http://localhost:8000/api/v1/imports/people/bulk" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
[
  {
    "first_name": "Valérie",
    "last_name": "Baudson",
    "personal_email": "valerie.baudson@amundi.com",
    "phone": "+33176333030",
    "country_code": "FR",
    "language": "FR"
  },
  {
    "first_name": "François-Marc",
    "last_name": "Durand",
    "personal_email": "fm.durand@lazard.fr",
    "phone": "+33144130461",
    "country_code": "FR",
    "language": "FR"
  }
]
EOF
```

---

## 🚀 MÉTHODE 3: Import via interface CRM (Manuel)

1. **Se connecter au CRM** → http://localhost:3000
2. **Aller dans "Organisations"** → Bouton "Import"
3. **Uploader le CSV**: `SDG_677_CLIENTS_FINAL.csv`
4. **Mapper les colonnes**:
   - `name` → Nom
   - `type` → Type (sélectionner "client")
   - `category` → Catégorie (sélectionner "SDG")
   - `aum` → AUM
   - `aum_date` → Date AUM
   - etc.
5. **Valider l'import** → Attendre la fin
6. **Vérifier** → Filtrer par type="client" et category="SDG"

---

## 📊 Schéma de données

### Modèle Organisation

```python
class Organisation:
    name: str                    # Nom de la SDG
    type: OrganisationType       # "client" pour les SDG
    category: OrganisationCategory  # "SDG"
    aum: Decimal                 # Encours gérés (en Md€)
    aum_date: Date              # Date de l'AUM
    email: str (optional)
    phone: str (optional)
    website: str (optional)
    address: str (optional)
    city: str (optional)
    country: str                 # "France"
    country_code: str           # "FR"
    pipeline_stage: PipelineStage  # "qualified", "prospect", "lead"
    notes: str (optional)
```

### Modèle Person

```python
class Person:
    first_name: str
    last_name: str
    personal_email: str
    phone: str (optional)
    country_code: str           # "FR"
    language: str              # "FR"
```

---

## 🔧 Dépannage

### Erreur: "Organisation déjà existante"

**Cause**: Une organisation avec ce nom existe déjà en base.

**Solution**:
1. Vérifier si c'est un doublon légitime
2. Supprimer l'ancienne organisation si nécessaire
3. Ou renommer la nouvelle organisation

### Erreur: "Contrainte d'intégrité"

**Cause**: Violation de contrainte SQL (unique, foreign key, etc.)

**Solution**:
1. Vérifier les logs du backend
2. Identifier le champ en cause
3. Corriger les données dans le CSV

### Erreur: "Email déjà existant"

**Cause**: Une personne avec cet email existe déjà.

**Solution**:
1. Vérifier si c'est un doublon
2. Utiliser un email différent
3. Ou lier la personne existante à l'organisation

### Le serveur ne répond pas

**Cause**: Backend non démarré ou port différent.

**Solution**:
```bash
cd crm-backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

---

## 📈 Après l'import

### 1. Vérifier les données

**Via API**:
```bash
# Compter les SDG clients
curl "http://localhost:8000/api/v1/organisations?type=client&category=SDG&limit=1000" | jq '. | length'
# Devrait retourner: 677

# Compter les Tier 1
curl "http://localhost:8000/api/v1/organisations?type=client&category=SDG&pipeline_stage=qualified&limit=1000" | jq '. | length'
# Devrait retourner: 143
```

**Via interface CRM**:
1. Aller dans "Organisations"
2. Filtrer: Type="client", Catégorie="SDG"
3. Vérifier le nombre total (677)

### 2. Enrichir les contacts

**Priorité**: Enrichir les 143 Tier 1 avec des contacts

**Sources**:
- LinkedIn (CEO, Président, Directeur Distribution)
- Sites web des SDG
- Réseaux professionnels
- Base CSSF Luxembourg (si SDG luxembourgeoises)

**Script à créer**: `scripts/enrich_sdg_contacts.py`

### 3. Configurer le pipeline commercial

**Tier 1** (143 clients):
- Pipeline stage: `qualified`
- Priority: `HIGH`
- Actions: Campagne email, appels, réunions

**Tier 2** (25 clients):
- Pipeline stage: `prospect`
- Priority: `MEDIUM`
- Actions: Newsletter, webinaires

**Tier 3** (509 prospects):
- Pipeline stage: `lead`
- Priority: `LOW`
- Actions: Veille passive

---

## 📊 Statistiques finales

### Couverture AUM

| Métrique | Valeur | % |
|----------|--------|---|
| **Total SDG** | 677 | 100% |
| **Avec AUM** | 225 | 33.2% |
| **Sans AUM** | 452 | 66.8% |

### Classification Tiers

| Tier | Critère | Nombre | % |
|------|---------|--------|---|
| **Tier 1** | > 1 Md€ | 143 | 21.1% |
| **Tier 2** | 600M€-1Md€ | 25 | 3.7% |
| **Tier 3** | < 600M€ ou inconnu | 509 | 75.2% |

### Top 10 SDG (AUM)

1. AMUNDI ASSET MANAGEMENT - 2 240 Md€
2. NCI - 2 025 Md€
3. IQ EQ Management - 750 Md€
4. HSBC REIM France - 731 Md€
5. BNP PARIBAS ASSET MANAGEMENT - 554.8 Md€
6. KATKO CAPITAL - 380 Md€
7. CONSOLIDATION ET DEVELOPPEMENT GESTION - 100 Md€
8. MILLENNIUM CAPITAL MANAGEMENT - 79 Md€
9. AlTi Wealth Management - 60 Md€
10. CARMIGNAC GESTION - 52.8 Md€

---

## 🔗 Ressources

- **Fichier organisations**: `SDG_677_CLIENTS_FINAL.csv`
- **Fichier contacts**: `/tmp/sdg_people_import.csv`
- **Script import**: `scripts/import_sdg_clients.py`
- **Documentation API**: http://localhost:8000/docs
- **Source AMF**: https://www.amf-france.org/fr/base-des-opcvm

---

## ✅ Checklist d'import

- [ ] Backend CRM démarré (`uvicorn main:app --reload`)
- [ ] Fichier `SDG_677_CLIENTS_FINAL.csv` présent
- [ ] Script `scripts/import_sdg_clients.py` créé
- [ ] Exécution du script d'import
- [ ] Vérification: 677 organisations créées
- [ ] Import des 8 contacts (optionnel)
- [ ] Création des liens organisation-personne
- [ ] Vérification dans l'interface CRM
- [ ] Configuration du pipeline commercial
- [ ] Planification enrichissement contacts Tier 1

---

**🚀 Prêt pour l'import!**

*Dernière mise à jour: 20 octobre 2025*
