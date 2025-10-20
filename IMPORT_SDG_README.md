# 📋 Import des Sociétés de Gestion (SDG) - AMF

## 📊 Fichier généré

**Fichier**: `sdg_import_677_societes.csv`
**Source**: Liste officielle AMF (Autorité des Marchés Financiers)
**Date de publication AMF**: 20/10/2025
**Nombre de sociétés**: 677 sociétés de gestion agréées

---

## 📝 Format du CSV

Le fichier CSV contient les colonnes suivantes:

| Colonne | Description | Exemple |
|---------|-------------|---------|
| `name` | Nom de la société (requis) | AMUNDI ASSET MANAGEMENT |
| `email` | Email de contact | (vide - non fourni par AMF) |
| `phone` | Téléphone | 0176333030 |
| `website` | Site web | www.amundi.com |
| `address` | Adresse | (vide - non fourni par AMF) |
| `city` | Ville | (vide - non fourni par AMF) |
| `country` | Pays | France |
| `country_code` | Code pays ISO | FR |
| `category` | Catégorie | **SDG** |
| `type` | Type d'organisation | **fournisseur** |
| `notes` | Informations complémentaires | Forme juridique, SIRET, LEI |

---

## 🚀 Comment importer dans le CRM

### Option 1: Via l'interface web

1. **Accéder à l'interface d'import**
   - Menu: Dashboard → **Import Unifié**
   - URL: `http://localhost:3000/dashboard/imports/unified`

2. **Charger le fichier**
   - Cliquez sur "Upload CSV Organisations"
   - Sélectionnez `sdg_import_677_societes.csv`
   - Type: **Fournisseur** (pré-rempli dans le CSV)

3. **Lancer l'import**
   - Cliquez sur "Importer"
   - Attendez le rapport d'import

4. **Consulter les résultats**
   - Nombre créé: X sociétés
   - Erreurs éventuelles: liste détaillée

### Option 2: Via l'API (cURL)

```bash
# Préparer le payload JSON depuis le CSV
python3 << 'EOF'
import csv
import json

with open('sdg_import_677_societes.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    organisations = []
    for row in reader:
        org = {
            "name": row['name'],
            "email": row['email'] if row['email'] else None,
            "phone": row['phone'] if row['phone'] else None,
            "website": row['website'] if row['website'] else None,
            "country": row['country'],
            "country_code": row['country_code'],
            "category": row['category'],
            "type": row['type'],
            "notes": row['notes']
        }
        organisations.append(org)

with open('sdg_payload.json', 'w', encoding='utf-8') as f:
    json.dump(organisations, f, indent=2, ensure_ascii=False)

print(f"✅ {len(organisations)} organisations prêtes pour l'import")
EOF

# Import via API
curl -X POST "http://localhost:8000/api/v1/imports/organisations/bulk?type_org=fournisseur" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @sdg_payload.json
```

---

## 🔍 Détails techniques

### Colonnes mappées depuis AMF

| Colonne AMF | Colonne CRM | Notes |
|-------------|-------------|-------|
| `entite_nom` | `name` | Nom unique de la société |
| `telephone` | `phone` | Format variable |
| `site_internet` | `website` | URLs parfois incomplètes |
| `pays_siege` | `country_code` | Toujours "FR" |
| `forme_juridique` | `notes` | Forme juridique (SAS, SA, etc.) |
| `siret` | `notes` | Numéro SIRET (si disponible) |
| `lei` | `notes` | Legal Entity Identifier |

### Catégorie et Type

- **Catégorie**: `SDG` (Société De Gestion)
  - Correspond à `OrganisationCategory.SDG` dans le modèle

- **Type**: `fournisseur`
  - Correspond à `OrganisationType.FOURNISSEUR` dans le modèle
  - Les SDG sont des asset managers (fournisseurs de produits)

---

## ⚠️ Points d'attention

### Données manquantes

L'AMF ne fournit pas:
- ❌ Emails de contact
- ❌ Adresses postales complètes
- ❌ Villes

Ces champs devront être complétés manuellement si nécessaire.

### Déduplication

Le système CRM déduplique automatiquement par:
- **Nom de la société** (case insensitive)

Si une société existe déjà avec le même nom, elle ne sera **pas** importée à nouveau.

### Téléphones

Les formats de téléphone sont variables:
- `0176333030`
- `01 76 33 30 30`
- `+033 1 76 33 30 30`

Aucune normalisation n'a été appliquée.

---

## 📈 Résultat attendu

Après import réussi, vous devriez avoir:

- **677 nouvelles organisations** de type `fournisseur`
- Catégorie: **SDG**
- Pipeline stage: **PROSPECT** (par défaut)
- Statut: **is_active = true**

---

## 🧹 Post-import

### Actions recommandées

1. **Vérifier les imports**
   ```sql
   SELECT COUNT(*) FROM organisations WHERE category = 'SDG';
   SELECT * FROM organisations WHERE category = 'SDG' LIMIT 10;
   ```

2. **Compléter les données manquantes**
   - Ajouter emails via scraping web ou recherche manuelle
   - Enrichir les adresses si nécessaire

3. **Créer des contacts/personnes**
   - Utiliser l'import personnes pour ajouter les contacts
   - Lier via `/api/v1/org-links/bulk`

4. **Qualifier les prospects**
   - Mettre à jour `pipeline_stage` selon la stratégie commerciale
   - Assigner des responsables (`assigned_to`, `owner_id`)

---

## 🔗 Ressources

- **Source AMF**: https://www.data.gouv.fr/datasets/liste-des-societes-de-gestion-de-portefeuille-sgp-agreees-par-lamf/
- **Documentation import CRM**: [documentation/api/IMPORTS.md](documentation/api/IMPORTS.md)
- **Endpoint API**: `POST /api/v1/imports/organisations/bulk`

---

## 📅 Mise à jour

Pour mettre à jour la liste:

```bash
# Télécharger la dernière version AMF
curl -L -o /tmp/sdg_amf_new.csv "https://www.data.gouv.fr/api/1/datasets/r/2220f808-8908-4afc-98e3-cf74a25678e2"

# Transformer
python3 /tmp/transform_sdg_to_crm.py

# Copier le nouveau fichier
cp /tmp/sdg_crm_import.csv "./sdg_import_$(date +%Y%m%d).csv"

# Re-importer (seules les nouvelles sociétés seront ajoutées)
```

---

## ✅ Checklist import

- [ ] Fichier CSV téléchargé et vérifié
- [ ] Backend CRM démarré (`docker-compose up` ou `uvicorn`)
- [ ] Frontend CRM accessible (`http://localhost:3000`)
- [ ] Import lancé via interface ou API
- [ ] Rapport d'import consulté
- [ ] Erreurs traitées si nécessaire
- [ ] Données vérifiées en base
- [ ] Pipeline stage et assignments configurés

---

**Généré le**: 2025-10-20
**Script de transformation**: `/tmp/transform_sdg_to_crm.py`
