# 🇪🇸 Système Complet CNMV - Alforis CRM

## 🎯 Vue d'ensemble

Système automatisé complet pour importer et enrichir les données des **sociétés de gestion espagnoles** (CNMV/INVERCO) dans le CRM Alforis, avec extraction automatique des **directeurs commerciaux**.

### Ce que fait ce système :

1. ✅ **Import ~100-150 SGIIC espagnoles** avec AUM et classification Tier
2. ✅ **Extraction ~35-50 directeurs commerciaux** avec emails et LinkedIn
3. ✅ **Enrichissement automatique** depuis INVERCO, LinkedIn, Hunter.io
4. ✅ **Import CRM prêt** au format CSV/JSON

---

## 📊 Données obtenues

### Organisations (SGIIC)

| Donnée | Source | Volume |
|--------|--------|--------|
| Sociétés de gestion | CNMV | ~100-150 |
| AUM (encours) | INVERCO | ~100-150 |
| Classification Tier | Auto | 100% |
| Coordonnées | CNMV + Web | 60-80% |

**Classification Tier :**
- **Tier 1** : ≥ 1 Md€ (~18 sociétés)
- **Tier 2** : ≥ 500 M€ (~5 sociétés)
- **Tier 3** : < 500 M€ (~100+ sociétés)

### Contacts (Directeurs commerciaux)

| Donnée | Source | Volume |
|--------|--------|--------|
| Directeurs commerciaux | LinkedIn + Web | ~35-50 |
| Emails | Hunter.io | 60-80% |
| LinkedIn profiles | LinkedIn | 40-50% |
| Téléphones | Web | 30-40% |

---

## 🚀 Démarrage rapide

### Prérequis

```bash
# Node.js + Puppeteer
npm install puppeteer

# Python 3 + pandas
pip install pandas openpyxl
```

### Option 1 : Workflow complet automatique

```bash
# Lancer la démo interactive
./scripts/cnmv/demo_workflow.sh
```

### Option 2 : Import données CNMV uniquement

```bash
# 1. Télécharger AUM INVERCO
./scripts/cnmv/download_inverco_data.sh

# 2. Import complet
./scripts/cnmv/import_cnmv.sh
```

### Option 3 : Extraction directeurs commerciaux uniquement

```bash
# Configuration (optionnel)
export LINKEDIN_EMAIL="your_email"
export LINKEDIN_PASSWORD="your_password"
export HUNTER_API_KEY="your_hunter_key"

# Extraction complète
./scripts/cnmv/extract_all_sales_directors.sh
```

---

## 📁 Structure des scripts

```
scripts/cnmv/
│
├── 📊 IMPORT DONNÉES CNMV + AUM
│   ├── scraper_cnmv_sgiic.js           # SGIIC companies
│   ├── scraper_cnmv_entities.js        # Entities hub
│   ├── scraper_cnmv_contacts.js        # Contacts
│   ├── scraper_cnmv_aum.js             # AUM (top 20)
│   ├── parse_inverco_excel.py          # Parser Excel INVERCO
│   ├── download_inverco_data.sh        # Téléchargement INVERCO
│   ├── enrich_cnmv_with_aum.py         # Enrichissement + Tiers
│   ├── transform_cnmv_to_crm.py        # Transformation CRM
│   └── import_cnmv.sh                  # 🎯 SCRIPT MASTER
│
├── 👔 EXTRACTION DIRECTEURS COMMERCIAUX
│   ├── scraper_linkedin_sales_directors.js    # LinkedIn
│   ├── scraper_websites_sales_teams.js        # Sites web
│   ├── enrich_with_hunter.js                  # Hunter.io
│   ├── consolidate_sales_contacts.py          # Consolidation
│   └── extract_all_sales_directors.sh         # 🎯 SCRIPT MASTER
│
└── 🎬 DEMO
    └── demo_workflow.sh                        # 🎯 DEMO INTERACTIVE
```

---

## 📚 Documentation détaillée

| Document | Description |
|----------|-------------|
| [IMPORT_CNMV_README.md](IMPORT_CNMV_README.md) | Import complet CNMV + AUM |
| [INVERCO_AUM_README.md](INVERCO_AUM_README.md) | Parser Excel INVERCO |
| [EXTRACTION_DIRECTEURS_COMMERCIAUX.md](EXTRACTION_DIRECTEURS_COMMERCIAUX.md) | Extraction directeurs commerciaux |

---

## 🎯 Workflows courants

### Workflow 1 : Premier import complet

```bash
# 1. Télécharger données INVERCO (AUM)
./scripts/cnmv/download_inverco_data.sh

# Si échec auto, télécharger manuellement :
# https://www.inverco.es/archivosdb/
# Puis : python3 scripts/cnmv/parse_inverco_excel.py fichier.xlsx

# 2. Scraper CNMV + enrichir + transformer
./scripts/cnmv/import_cnmv.sh

# 3. Extraire directeurs commerciaux
export LINKEDIN_EMAIL="email"
export LINKEDIN_PASSWORD="password"
export HUNTER_API_KEY="key"
./scripts/cnmv/extract_all_sales_directors.sh

# Résultats :
# - cnmv_organisations.csv (sociétés)
# - cnmv_sales_contacts_final.csv (directeurs)
```

### Workflow 2 : Mise à jour mensuelle

```bash
# Re-télécharger AUM (données actualisées)
./scripts/cnmv/download_inverco_data.sh

# Re-enrichir
python3 scripts/cnmv/enrich_cnmv_with_aum.py

# Re-extraire directeurs (nouveaux postes)
./scripts/cnmv/extract_all_sales_directors.sh

# Import delta dans CRM (API déduplique automatiquement)
```

### Workflow 3 : Enrichissement emails uniquement

```bash
# Si vous avez déjà des contacts sans emails
export HUNTER_API_KEY="key"
node scripts/cnmv/enrich_with_hunter.js
python3 scripts/cnmv/consolidate_sales_contacts.py
```

---

## 🔑 Credentials (optionnels)

### LinkedIn

```bash
export LINKEDIN_EMAIL="your_email@example.com"
export LINKEDIN_PASSWORD="your_password"
```

**Sans credentials** : ~3 résultats max par recherche
**Avec credentials** : ~10-20 résultats par recherche
**Avec Premium/Sales Navigator** : Résultats illimités

### Hunter.io

```bash
export HUNTER_API_KEY="your_api_key"
```

Obtenir une clé : https://hunter.io

**Plans** :
- Free : 50 recherches/mois
- Starter : 500 recherches/mois (49€)
- Growth : 2500 recherches/mois (99€)

**Sans API key** : Pas d'enrichissement email (mais workflow fonctionne)

---

## 📊 Résultats attendus

### Import CNMV

```
📊 Organisations importées : ~120-150
   Tier 1 (≥ 1 Md€)    : ~18 sociétés
   Tier 2 (≥ 500 M€)   : ~5 sociétés
   Tier 3 (< 500 M€)   : ~100 sociétés

💰 AUM total : ~500-600 Md€

✅ Avec AUM : 100%
✅ Avec email : 40-50%
✅ Avec téléphone : 60-70%
✅ Avec website : 70-80%
```

### Directeurs commerciaux

```
👔 Contacts extraits : ~35-50

📧 Avec email : 60-80% (grâce à Hunter.io)
📞 Avec téléphone : 30-40%
🔗 Avec LinkedIn : 40-50%

Par Tier :
   Tier 1 : ~30-40 contacts
   Tier 2 : ~4-8 contacts
```

---

## 💾 Fichiers générés

### Import CNMV

| Fichier | Description |
|---------|-------------|
| `cnmv_sgiic_raw.json` | Données brutes SGIIC |
| `cnmv_aum_inverco.json` | AUM depuis INVERCO |
| `cnmv_enriched_with_aum.json` | Données enrichies + Tiers |
| `cnmv_organisations.csv` | **CSV IMPORT CRM** |

### Directeurs commerciaux

| Fichier | Description |
|---------|-------------|
| `cnmv_sales_directors.json` | Contacts LinkedIn |
| `cnmv_sales_teams_websites.json` | Contacts sites web |
| `cnmv_contacts_enriched_hunter.json` | Enrichi Hunter.io |
| `cnmv_sales_contacts_final.csv` | **CSV IMPORT CRM** |

---

## 🔄 Import dans le CRM

### Via API

```bash
# Organisations
curl -X POST "http://localhost:8000/api/v1/imports/organisations/bulk?type_org=fournisseur" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRM_API_TOKEN" \
  -d @cnmv_organisations.json

# Contacts
curl -X POST "http://localhost:8000/api/v1/imports/people/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRM_API_TOKEN" \
  -d @cnmv_sales_contacts_final.json
```

### Via serveur (production)

```bash
# Copier fichiers
scp -i ~/.ssh/id_rsa_hetzner cnmv_*.csv root@159.69.108.234:/tmp/

# Importer sur serveur
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234
# ... suivre instructions dans IMPORT_CNMV_README.md
```

---

## 🆘 Dépannage

### Puppeteer : "Executable not found"

```bash
npm install puppeteer
# Ou sur Linux :
apt-get install chromium-browser
```

### INVERCO : "Could not download"

Téléchargement manuel :
1. https://www.inverco.es/archivosdb/
2. Télécharger `estadisticas_YYYY_MM.xlsx`
3. `python3 scripts/cnmv/parse_inverco_excel.py fichier.xlsx`

### Hunter.io : "Quota exceeded"

- Vérifier quota : https://hunter.io/api-keys
- Attendre reset mensuel ou upgrade plan

### LinkedIn : "CAPTCHA detected"

- Utiliser `headless: false` et résoudre manuellement
- Ralentir les requêtes (augmenter délais)
- Utiliser Sales Navigator si possible

---

## 📅 Maintenance

### Cron jobs recommandés

```bash
# Mise à jour mensuelle complète
0 2 1 * * /path/to/crm/scripts/cnmv/import_cnmv.sh >> /var/log/cnmv_import.log 2>&1

# Extraction directeurs (trimestrielle)
0 3 1 */3 * /path/to/crm/scripts/cnmv/extract_all_sales_directors.sh >> /var/log/sales_extraction.log 2>&1
```

---

## 🎓 Formation / Onboarding

### Pour un nouveau collaborateur

```bash
# 1. Lire la doc
cat CNMV_COMPLETE_SYSTEM.md

# 2. Lancer la démo interactive
./scripts/cnmv/demo_workflow.sh

# 3. Tester avec vraies données
# Obtenir credentials LinkedIn + Hunter.io
# Lancer workflow complet

# 4. Import dans CRM de dev
# Tester l'API d'import
```

---

## 📊 Comparaison avec AMF (France)

| Aspect | CNMV (Espagne) | AMF (France) |
|--------|----------------|--------------|
| Sociétés | ~120-150 SGIIC | ~677 SDG |
| Source AUM | INVERCO | Option Finance |
| Top Tier 1 | 18 (≥1 Md€) | 1 (>50 Md€) |
| Directeurs | ~35-50 | ~8 (manuel) |
| Automatisation | 95% | 90% |

---

## ✅ Checklist complète

### Prérequis
- [ ] Node.js installé
- [ ] Python 3 + pandas installé
- [ ] Puppeteer installé (`npm install puppeteer`)
- [ ] Credentials LinkedIn (optionnel)
- [ ] Hunter.io API key (optionnel)

### Premier import
- [ ] Télécharger données INVERCO
- [ ] Scraper CNMV
- [ ] Enrichir avec AUM
- [ ] Vérifier classification Tier
- [ ] Générer CSV organisations
- [ ] Importer dans CRM

### Directeurs commerciaux
- [ ] Scraper LinkedIn
- [ ] Scraper sites web
- [ ] Enrichir avec Hunter.io
- [ ] Consolider contacts
- [ ] Générer CSV contacts
- [ ] Importer dans CRM

### Validation
- [ ] Vérifier volumes (organisations, contacts)
- [ ] Vérifier qualité données (emails, tiers)
- [ ] Tester import CRM
- [ ] Documenter particularités

---

## 🔗 Ressources externes

- **CNMV** : https://www.cnmv.es
- **INVERCO** : https://www.inverco.es
- **Hunter.io** : https://hunter.io
- **LinkedIn Sales Navigator** : https://business.linkedin.com/sales-solutions

---

## 📞 Support

En cas de problème :
1. Consulter la documentation spécifique
2. Vérifier les logs de scraping
3. Tester manuellement l'accès aux sources
4. Contacter l'équipe technique

---

**Créé le** : 2025-10-20
**Version** : 1.0
**Auteur** : Alforis CRM Team
**Maintenance** : Mise à jour mensuelle recommandée
