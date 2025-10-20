# 📊 Import Complet SDG - Sociétés de Gestion + Contacts + AUM + Tiers

## 🎯 Vue d'ensemble

Ce package d'import contient:
1. **677 sociétés de gestion** françaises agréées AMF
2. **Classification par Tiers** selon les AUM (Assets Under Management)
3. **8 contacts clés** pour les principales SDG (Tier 1-3)
4. **Données enrichies** avec AUM, LEI, SIRET, website

---

## 📁 Fichiers générés

### 1️⃣ **sdg_enriched_677_societes_with_AUM_Tiers.csv**
**Description**: Sociétés de gestion enrichies avec AUM et classification Tier

**Colonnes**:
- `name` - Nom de la société (requis)
- `email` - Email (vide - à compléter)
- `phone` - Téléphone
- `website` - Site web
- `address`, `city` - Adresse (vide - à compléter)
- `country`, `country_code` - Pays (France/FR)
- `category` - **SDG** (Société De Gestion)
- `type` - **fournisseur**
- `notes` - Forme juridique, SIRET, LEI
- **`aum`** - Assets Under Management en Md€
- **`aum_date`** - Date de l'AUM (2024-12-31)
- **`tier`** - Classification Tier 1/2/3/4
- `pipeline_stage` - prospect (par défaut)

**Répartition par Tier**:
- **Tier 1**: 1 société (> 50 Md€) → AMUNDI (2,240 Md€)
- **Tier 2**: 8 sociétés (10-50 Md€) → BNP AM, Candriam, EdR, etc.
- **Tier 3**: 6 sociétés (1-10 Md€) → Mandarine, DNCA, Eleva, etc.
- **Tier 4**: 662 sociétés (< 1 Md€ ou AUM inconnu)

---

### 2️⃣ **sdg_contacts_8_personnes.csv**
**Description**: Contacts clés pour import via `/api/v1/imports/people/bulk`

**Colonnes**:
- `first_name`, `last_name` - Nom et prénom
- `personal_email` - Email (work_email utilisé comme clé unique)
- `phone` - Téléphone professionnel
- `country_code` - FR
- `language` - FR

**Contacts inclus** (8 personnes):

| Nom | Poste | Société | Tier |
|-----|-------|---------|------|
| Valérie Baudson | CEO | Amundi Asset Management | Tier 1 |
| Fannie Wurtz | Dir. Distribution | Amundi Asset Management | Tier 1 |
| François-Marc Durand | Président | Lazard Frères Gestion | Tier 2 |
| Frédéric Janbon | CEO | BNP Paribas AM | Tier 2 |
| Edouard Carmignac | Fondateur | Carmignac Gestion | Tier 2 |
| Guillaume Rigeade | Président | Mandarine Gestion | Tier 3 |
| Eric Franc | Président | DNCA Finance | Tier 3 |
| Imen Hazgui | Managing Partner | Eleva Capital | Tier 3 |

---

### 3️⃣ **sdg_contacts_reference.csv**
**Description**: Fichier de référence avec toutes les infos (work_email, role, is_primary, etc.)

**Usage**: Permet de créer les liens organisation-personne après l'import

---

## 🚀 Procédure d'import en production

### Étape 1: Importer les organisations SDG

```bash
# Copier le fichier sur le serveur
scp -i ~/.ssh/id_rsa_hetzner sdg_enriched_677_societes_with_AUM_Tiers.csv root@159.69.108.234:/tmp/

# Se connecter au serveur
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234

# Convertir CSV en JSON
python3 << 'EOF'
import csv
import json

with open('/tmp/sdg_enriched_677_societes_with_AUM_Tiers.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    organisations = []
    for row in reader:
        org = {
            "name": row['name'],
            "phone": row['phone'] if row['phone'] else None,
            "website": row['website'] if row['website'] else None,
            "country": row['country'],
            "country_code": row['country_code'],
            "category": row['category'],
            "type": row['type'],
            "notes": row['notes'],
            "aum": float(row['aum']) if row['aum'] else None,
            "aum_date": row['aum_date'] if row['aum_date'] else None,
            "pipeline_stage": row['pipeline_stage']
        }
        # Nettoyer les None
        org = {k: v for k, v in org.items() if v is not None}
        organisations.append(org)

with open('/tmp/sdg_payload.json', 'w', encoding='utf-8') as f:
    json.dump(organisations, f, indent=2, ensure_ascii=False)

print(f"✅ {len(organisations)} organisations prêtes")
EOF

# Importer via API (depuis le serveur)
curl -X POST "http://localhost:8000/api/v1/imports/organisations/bulk?type_org=fournisseur" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d @/tmp/sdg_payload.json

# Ou via Docker si l'API est dans un container
docker exec crm-backend curl -X POST "http://localhost:8000/api/v1/imports/organisations/bulk?type_org=fournisseur" \
  -H "Content-Type: application/json" \
  -d @/tmp/sdg_payload.json
```

**Résultat attendu**:
```json
{
  "total": 677,
  "created": [1, 2, 3, ...],
  "failed": 0,
  "errors": [],
  "type": "fournisseur"
}
```

---

### Étape 2: Importer les contacts/personnes

```bash
# Copier le fichier
scp -i ~/.ssh/id_rsa_hetzner sdg_contacts_8_personnes.csv root@159.69.108.234:/tmp/

# Convertir en JSON
python3 << 'EOF'
import csv
import json

with open('/tmp/sdg_contacts_8_personnes.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    people = []
    for row in reader:
        person = {
            "first_name": row['first_name'],
            "last_name": row['last_name'],
            "personal_email": row['personal_email'],
            "phone": row['phone'] if row['phone'] else None,
            "country_code": row['country_code'],
            "language": row['language']
        }
        person = {k: v for k, v in person.items() if v is not None}
        people.append(person)

with open('/tmp/people_payload.json', 'w', encoding='utf-8') as f:
    json.dump(people, f, indent=2, ensure_ascii=False)

print(f"✅ {len(people)} personnes prêtes")
EOF

# Importer via API
curl -X POST "http://localhost:8000/api/v1/imports/people/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d @/tmp/people_payload.json
```

**Résultat attendu**:
```json
{
  "total": 8,
  "created": [1, 2, 3, 4, 5, 6, 7, 8],
  "failed": 0,
  "errors": []
}
```

---

### Étape 3: Créer les liens Organisation ↔ Personne

⚠️ **Important**: Il faut mapper les IDs des organisations et personnes créées

```bash
# D'abord, récupérer les IDs
# Option A: Via psql
docker exec crm-db psql -U crm_user -d crm_db -c "SELECT id, name FROM organisations WHERE category = 'SDG' AND name IN ('AMUNDI ASSET MANAGEMENT', 'LAZARD FRERES GESTION', 'BNP PARIBAS ASSET MANAGEMENT');"

# Option B: Via API
curl "http://localhost:8000/api/v1/organisations?category=SDG&limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

curl "http://localhost:8000/api/v1/people?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Créer le payload des liens (exemple)
cat > /tmp/links_payload.json << 'EOF'
[
  {
    "person_id": 1,
    "organisation_id": 123,
    "role": "contact_principal",
    "is_primary": true,
    "job_title": "CEO - Directeur Général",
    "work_email": "valerie.baudson@amundi.com",
    "work_phone": "+33176333030"
  }
]
EOF

# Importer les liens
curl -X POST "http://localhost:8000/api/v1/org-links/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d @/tmp/links_payload.json
```

---

## 📊 Classification des Tiers

### Critères de classification

| Tier | AUM | Nombre | Exemples |
|------|-----|--------|----------|
| **Tier 1** | > 50 Md€ | 1 | Amundi (2,240 Md€) |
| **Tier 2** | 10-50 Md€ | 8 | BNP AM (554 Md€), Lazard (41.5 Md€), Carmignac (33.9 Md€) |
| **Tier 3** | 1-10 Md€ | 6 | Mandarine, DNCA, Eleva, Eiffel, Amiral, Axiom |
| **Tier 4** | < 1 Md€ ou inconnu | 662 | Toutes les autres SDG |

### Utilisation stratégique

- **Tier 1**: Priorité maximale, CEO/C-level contacts
- **Tier 2**: Priorité haute, contacts distribution/commerciaux
- **Tier 3**: Priorité moyenne, contacts dirigeants
- **Tier 4**: Opportunités long-terme, veille

---

## 🔍 Données AUM (Top 15)

| Société | AUM (Md€) | Tier |
|---------|-----------|------|
| AMUNDI ASSET MANAGEMENT | 2,240.0 | Tier 1 |
| BNP PARIBAS ASSET MANAGEMENT | 554.8 | Tier 2 |
| CANDRIAM | 140.8 | Tier 2 |
| EDMOND DE ROTHSCHILD ASSET MANAGEMENT | 100.0 | Tier 2 |
| ALLIANZ GLOBAL INVESTORS | 89.8 | Tier 2 |
| HSBC GLOBAL ASSET MANAGEMENT FRANCE | 61.6 | Tier 2 |
| CPRAM | 59.5 | Tier 2 |
| IM GLOBAL PARTNER | 43.8 | Tier 2 |
| LAZARD FRERES GESTION | 41.5 | Tier 2 |
| CARMIGNAC GESTION | 33.9 | Tier 2 |
| GROUPAMA ASSET MANAGEMENT | 32.7 | Tier 2 |
| BFT INVESTMENT MANAGERS | 31.7 | Tier 2 |
| ARKEA ASSET MANAGEMENT | 26.8 | Tier 2 |
| DNCA FINANCE | 26.3 | Tier 2 |
| EURAZEO | 26.0 | Tier 2 |

---

## 📝 Actions post-import

### 1. Vérification en base

```sql
-- Compter les SDG importées
SELECT COUNT(*) FROM organisations WHERE category = 'SDG';
-- Résultat attendu: 677

-- Vérifier la répartition par Tier (via notes)
SELECT
  CASE
    WHEN notes LIKE '%Tier 1%' THEN 'Tier 1'
    WHEN notes LIKE '%Tier 2%' THEN 'Tier 2'
    WHEN notes LIKE '%Tier 3%' THEN 'Tier 3'
    ELSE 'Tier 4'
  END as tier,
  COUNT(*) as count
FROM organisations
WHERE category = 'SDG'
GROUP BY tier;

-- Vérifier les AUM
SELECT name, aum FROM organisations WHERE category = 'SDG' AND aum IS NOT NULL ORDER BY aum DESC LIMIT 10;

-- Vérifier les contacts
SELECT COUNT(*) FROM people WHERE personal_email IN (
  'valerie.baudson@amundi.com',
  'fm.durand@lazard.fr'
  -- etc.
);
```

### 2. Enrichissement des données

- [ ] Compléter les emails manquants (scraping, LinkedIn)
- [ ] Ajouter les adresses des sièges sociaux
- [ ] Rechercher AUM pour les Tier 4 avec > 500 M€
- [ ] Ajouter plus de contacts (directeurs commerciaux, responsables distribution)

### 3. Qualification commerciale

- [ ] Assigner les Tier 1-2 à des commerciaux
- [ ] Mettre `pipeline_stage` = "qualified" pour les Tier 1-2
- [ ] Créer des tâches de prospection
- [ ] Planifier des rendez-vous

---

## 🔗 Ressources

- **Source AMF**: https://www.data.gouv.fr/datasets/liste-des-societes-de-gestion-de-portefeuille-sgp-agreees-par-lamf/
- **Source AUM**: Option Finance "Les 50 sociétés de gestion qui comptent 2025"
- **Documentation API**: [documentation/api/IMPORTS.md](documentation/api/IMPORTS.md)

---

## ⚙️ Scripts utilisés

1. `/tmp/transform_sdg_to_crm.py` - Transformation CSV AMF → CSV CRM
2. `/tmp/enrich_sdg_with_aum.py` - Enrichissement avec AUM et Tiers
3. `/tmp/create_sdg_contacts.py` - Création des contacts clés

---

## 📅 Maintenance

Pour mettre à jour:
```bash
# Télécharger la dernière liste AMF
curl -L -o /tmp/sdg_amf_new.csv "https://www.data.gouv.fr/api/1/datasets/r/2220f808-8908-4afc-98e3-cf74a25678e2"

# Re-transformer
python3 /tmp/transform_sdg_to_crm.py
python3 /tmp/enrich_sdg_with_aum.py

# Import delta (seules les nouvelles)
# L'API CRM déduplique automatiquement par nom
```

---

**Créé le**: 2025-10-20
**Source**: AMF + Option Finance + Web
**Version**: 1.0
