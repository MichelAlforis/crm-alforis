# 📊 INVERCO AUM Data - Mode d'emploi

## 🎯 Objectif

Récupérer les **AUM (Assets Under Management)** de **TOUTES** les sociétés de gestion espagnoles (SGIIC) depuis les fichiers officiels **INVERCO**.

**INVERCO** (Asociación de Instituciones de Inversión Colectiva) publie mensuellement des fichiers Excel contenant les encours gérés par toutes les SGIIC enregistrées en Espagne.

---

## 🚀 Utilisation rapide

### Option 1 : Téléchargement automatique (recommandé)

```bash
# Télécharger et parser automatiquement
./scripts/cnmv/download_inverco_data.sh
```

Le script va :
1. ✅ Télécharger le dernier fichier INVERCO
2. ✅ Le parser automatiquement
3. ✅ Générer `cnmv_aum_inverco.json` avec tous les AUM

### Option 2 : Téléchargement manuel

```bash
# 1. Télécharger manuellement depuis INVERCO
# Visitez : https://www.inverco.es/archivosdb/
# Téléchargez : estadisticas_2024_12.xlsx (ou similaire)

# 2. Parser le fichier
python3 scripts/cnmv/parse_inverco_excel.py ~/Downloads/estadisticas_2024_12.xlsx

# 3. Résultat généré : cnmv_aum_inverco.json
```

---

## 📁 Structure fichier INVERCO Excel

Les fichiers INVERCO contiennent typiquement :

### Feuilles (sheets)
- `SGIICs` ou `Gestoras` → Données par société de gestion
- `Patrimonio` → Encours gérés
- `IICs` → Fonds par société

### Colonnes typiques
| Colonne | Description |
|---------|-------------|
| Nombre / Entidad | Nom de la SGIIC |
| Patrimonio | AUM en millions € |
| Nº IIC | Nombre de fonds |
| Fecha | Date de référence |

---

## 🔧 Parser avec colonnes personnalisées

Si l'auto-détection échoue, spécifiez manuellement :

```bash
python3 scripts/cnmv/parse_inverco_excel.py inverco.xlsx \
  --sheet "SGIICs" \
  --name-col "Nombre de la entidad" \
  --aum-col "Patrimonio gestionado" \
  --date "2024-12-31"
```

### Voir la structure d'un fichier Excel

```bash
# Lister les feuilles
python3 << EOF
import pandas as pd
xls = pd.ExcelFile('inverco.xlsx')
print("Sheets:", xls.sheet_names)
EOF

# Voir les colonnes
python3 << EOF
import pandas as pd
df = pd.read_excel('inverco.xlsx', sheet_name='SGIICs')
print("Columns:", list(df.columns))
print(df.head())
EOF
```

---

## 📊 Résultat attendu

### Fichier généré : `cnmv_aum_inverco.json`

```json
[
  {
    "name": "SANTANDER ASSET MANAGEMENT",
    "aum": 185.0,
    "source": "INVERCO",
    "date": "2024-12-31",
    "row_index": 0
  },
  {
    "name": "CAIXABANK ASSET MANAGEMENT",
    "aum": 85.0,
    "source": "INVERCO",
    "date": "2024-12-31",
    "row_index": 1
  }
  // ... 100+ sociétés
]
```

### Statistiques affichées

```
📊 INVERCO AUM SUMMARY
Total companies: 120
Total AUM: 450.5 Bn€
Average AUM: 3.75 Bn€

Tier 1 (≥ 1 Bn€): 18 companies
Tier 2 (≥ 500 M€): 5 companies
Tier 3 (< 500 M€): 97 companies

🏆 Top 20 by AUM:
  1. SANTANDER ASSET MANAGEMENT              185.0 Bn€  [Tier 1]
  2. CAIXABANK ASSET MANAGEMENT               85.0 Bn€  [Tier 1]
  ...
```

---

## 🔄 Workflow complet avec INVERCO

```bash
# 1. Télécharger données INVERCO
./scripts/cnmv/download_inverco_data.sh

# 2. Scraper CNMV (optionnel, pour infos complémentaires)
node scripts/cnmv/scraper_cnmv_sgiic.js
node scripts/cnmv/scraper_cnmv_entities.js
node scripts/cnmv/scraper_cnmv_contacts.js

# 3. Enrichir avec AUM INVERCO
python3 scripts/cnmv/enrich_cnmv_with_aum.py

# 4. Transformer pour CRM
python3 scripts/cnmv/transform_cnmv_to_crm.py

# 5. Importer dans CRM
export CRM_API_TOKEN="your_token"
./scripts/cnmv/import_cnmv.sh --import-only
```

Ou en une seule commande (après téléchargement INVERCO) :

```bash
./scripts/cnmv/download_inverco_data.sh && \
./scripts/cnmv/import_cnmv.sh
```

---

## 📝 Exemple de fichier INVERCO

### Fichier : `estadisticas_2024_12.xlsx`

**Sheet: SGIICs**

| Código | Nombre de la entidad | Patrimonio (millones €) | Nº IICs | Fecha |
|--------|---------------------|-------------------------|---------|--------|
| 1 | SANTANDER ASSET MANAGEMENT SGIIC SA | 185000.5 | 245 | 31/12/2024 |
| 2 | CAIXABANK ASSET MANAGEMENT SGIIC SA | 85000.2 | 180 | 31/12/2024 |
| 3 | BBVA ASSET MANAGEMENT SGIIC SA | 72000.0 | 165 | 31/12/2024 |

Le parser convertit automatiquement :
- `185000.5` millions € → `185.0` Md€
- Nettoie les noms (retire SGIIC, SA, etc.)
- Extrait la date

---

## 🔍 Sources de données INVERCO

### Site officiel
- **URL principale** : https://www.inverco.es
- **Archives** : https://www.inverco.es/archivosdb/

### Types de fichiers disponibles

1. **Estadísticas mensuales** (recommandé)
   - Nom : `estadisticas_YYYY_MM.xlsx`
   - Contenu : AUM par SGIIC, nombre de fonds
   - Fréquence : Mensuel
   - Détail : Maximum

2. **Informes trimestrales**
   - Nom : `informe_trimestral_YYYY_Q?.pdf`
   - Contenu : Rapports secteur
   - Fréquence : Trimestriel
   - Détail : Agrégé

3. **Rankings**
   - Nom : `ranking_sgiics_YYYY.xlsx`
   - Contenu : Classement par AUM
   - Fréquence : Annuel

---

## ⚙️ Configuration avancée

### Variables d'environnement

```bash
# Répertoire de téléchargement
export INVERCO_DOWNLOAD_DIR="/tmp/inverco"

# Date de référence par défaut
export INVERCO_DEFAULT_DATE="2024-12-31"

# Seuil de matching fuzzy
export AUM_FUZZY_THRESHOLD="0.75"
```

### Parser avec pandas avancé

```python
import pandas as pd

# Lire avec options spécifiques
df = pd.read_excel(
    'inverco.xlsx',
    sheet_name='SGIICs',
    skiprows=2,  # Sauter les 2 premières lignes
    usecols=['Nombre', 'Patrimonio'],  # Colonnes spécifiques
    na_values=['N/A', '--', '']  # Valeurs nulles
)

# Traiter les données
df['aum_bn'] = df['Patrimonio'] / 1000  # Millions → Billions
df['name_clean'] = df['Nombre'].str.replace('SGIIC', '').str.strip()

# Exporter
df.to_json('custom_aum.json', orient='records')
```

---

## 🆘 Dépannage

### Erreur : "Could not auto-detect columns"

```bash
# Solution : Inspecter le fichier
python3 << EOF
import pandas as pd
xls = pd.ExcelFile('inverco.xlsx')
for sheet in xls.sheet_names:
    df = pd.read_excel('inverco.xlsx', sheet_name=sheet)
    print(f"\nSheet: {sheet}")
    print("Columns:", list(df.columns))
    print(df.head(3))
EOF

# Puis parser avec colonnes manuelles
python3 scripts/cnmv/parse_inverco_excel.py inverco.xlsx \
  --sheet "LA_BONNE_SHEET" \
  --name-col "LA_BONNE_COLONNE_NOM" \
  --aum-col "LA_BONNE_COLONNE_AUM"
```

### Erreur : "File is not Excel format"

Le fichier téléchargé est peut-être une page HTML d'erreur.

```bash
# Vérifier le type de fichier
file downloaded_file.xlsx

# Si c'est HTML, télécharger manuellement
open https://www.inverco.es/archivosdb/
```

### AUM en mauvaise unité

Par défaut, le parser assume que l'INVERCO publie en **millions €** et convertit en **milliards €**.

Si les valeurs semblent incorrectes :

```python
# Vérifier dans le fichier original
import pandas as pd
df = pd.read_excel('inverco.xlsx', sheet_name='SGIICs')
print(df['Patrimonio'].head())
print(f"Max: {df['Patrimonio'].max()}")
print(f"Min: {df['Patrimonio'].min()}")

# Si > 1000, c'est probablement en millions
# Si < 1000, c'est probablement déjà en milliards
```

---

## 📅 Mise à jour régulière

### Cron job mensuel

```bash
# Ajouter au crontab
0 3 1 * * cd /path/to/crm && ./scripts/cnmv/download_inverco_data.sh && ./scripts/cnmv/import_cnmv.sh >> /var/log/inverco_import.log 2>&1
```

### Notification si échec

```bash
#!/bin/bash
if ./scripts/cnmv/download_inverco_data.sh; then
    echo "INVERCO import success" | mail -s "INVERCO OK" admin@alforis.com
else
    echo "INVERCO import failed" | mail -s "INVERCO FAILED" admin@alforis.com
fi
```

---

## ✅ Checklist

- [ ] Python 3 et pandas installés (`pip install pandas openpyxl`)
- [ ] Télécharger fichier INVERCO (auto ou manuel)
- [ ] Parser le fichier Excel
- [ ] Vérifier `cnmv_aum_inverco.json` généré
- [ ] Lancer l'enrichissement
- [ ] Vérifier la classification Tier
- [ ] Importer dans le CRM

---

## 🔗 Ressources

- **INVERCO** : https://www.inverco.es
- **Archives INVERCO** : https://www.inverco.es/archivosdb/
- **CNMV** : https://www.cnmv.es
- **Pandas docs** : https://pandas.pydata.org/docs/

---

**Créé le** : 2025-10-20
**Version** : 1.0
**Auteur** : Alforis CRM Team
