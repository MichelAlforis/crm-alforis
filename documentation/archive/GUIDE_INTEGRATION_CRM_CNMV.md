# 🔌 Guide d'intégration CRM - Données CNMV

## 🎯 Objectif

Intégrer les données CNMV (sociétés de gestion espagnoles + directeurs commerciaux) dans votre CRM Alforis en production.

---

## 📋 Vue d'ensemble du processus

```
1. Extraction données CNMV (local)
   ↓
2. Validation données (local)
   ↓
3. Upload sur serveur production
   ↓
4. Import via API CRM
   ↓
5. Vérification en base de données
   ↓
6. Création liens organisation ↔ contacts
```

---

## 🚀 Méthode complète (étape par étape)

### PHASE 1 : Extraction locale (sur votre machine)

#### Étape 1.1 : Télécharger données INVERCO

```bash
cd /Users/test/Documents/ALFORIS\ FINANCE/06.\ CRM/V1

# Téléchargement automatique
./scripts/cnmv/download_inverco_data.sh

# OU manuel si échec
# 1. Aller sur https://www.inverco.es/archivosdb/
# 2. Télécharger estadisticas_2024_12.xlsx (ou similaire)
# 3. Parser :
python3 scripts/cnmv/parse_inverco_excel.py ~/Downloads/estadisticas_2024_12.xlsx
```

**Résultat** : `cnmv_aum_inverco.json` avec tous les AUM

#### Étape 1.2 : Scraper CNMV et enrichir

```bash
# Option A : Tout en une fois
./scripts/cnmv/import_cnmv.sh --scrape-only

# Option B : Étape par étape
node scripts/cnmv/scraper_cnmv_sgiic.js
node scripts/cnmv/scraper_cnmv_entities.js
python3 scripts/cnmv/enrich_cnmv_with_aum.py
python3 scripts/cnmv/transform_cnmv_to_crm.py
```

**Résultats** :
- ✅ `cnmv_organisations.csv` (~120-150 sociétés)
- ✅ `cnmv_enriched_with_aum.json`

#### Étape 1.3 : Extraire directeurs commerciaux

```bash
# Configurer credentials (optionnel)
export LINKEDIN_EMAIL="your_email@example.com"
export LINKEDIN_PASSWORD="your_password"
export HUNTER_API_KEY="your_hunter_api_key"

# Extraction complète
./scripts/cnmv/extract_all_sales_directors.sh

# OU sans credentials (résultats limités)
node scripts/cnmv/scraper_websites_sales_teams.js
python3 scripts/cnmv/consolidate_sales_contacts.py
```

**Résultat** : `cnmv_sales_contacts_final.csv` (~35-50 contacts)

---

### PHASE 2 : Validation locale (IMPORTANT !)

#### Étape 2.1 : Vérifier les fichiers générés

```bash
# Vérifier que les fichiers existent
ls -lh cnmv_organisations.csv
ls -lh cnmv_sales_contacts_final.csv

# Compter les lignes
echo "Organisations: $(tail -n +2 cnmv_organisations.csv | wc -l)"
echo "Contacts: $(tail -n +2 cnmv_sales_contacts_final.csv | wc -l)"

# Aperçu des données
head -5 cnmv_organisations.csv
head -5 cnmv_sales_contacts_final.csv
```

#### Étape 2.2 : Validation de la qualité

```bash
# Script de validation
python3 << 'EOF'
import pandas as pd

# Organisations
df_orgs = pd.read_csv('cnmv_organisations.csv')
print("="*60)
print("ORGANISATIONS")
print("="*60)
print(f"Total: {len(df_orgs)}")
print(f"\nPar Tier:")
print(df_orgs['tier'].value_counts())
print(f"\nAvec AUM: {df_orgs['aum'].notna().sum()}")
print(f"Avec email: {df_orgs['email'].notna().sum()}")
print(f"Avec téléphone: {df_orgs['phone'].notna().sum()}")
print(f"Avec website: {df_orgs['website'].notna().sum()}")

# Contacts
df_contacts = pd.read_csv('cnmv_sales_contacts_final.csv')
print("\n" + "="*60)
print("CONTACTS")
print("="*60)
print(f"Total: {len(df_contacts)}")
print(f"\nPar Tier:")
print(df_contacts['company_tier'].value_counts())
print(f"\nAvec email: {df_contacts['email'].notna().sum()}")
print(f"Avec téléphone: {df_contacts['phone'].notna().sum()}")
print(f"Avec LinkedIn: {df_contacts['linkedin_url'].notna().sum()}")

# Top 10 organisations
print("\n" + "="*60)
print("TOP 10 ORGANISATIONS (par AUM)")
print("="*60)
top10 = df_orgs.nlargest(10, 'aum')[['name', 'aum', 'tier']]
print(top10.to_string(index=False))

EOF
```

**Validation manuelle** : Ouvrir les CSV dans Excel/Numbers et vérifier

---

### PHASE 3 : Upload sur serveur production

#### Étape 3.1 : Connexion au serveur

```bash
# Vérifier la connexion SSH
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'echo "✅ SSH OK"'
```

#### Étape 3.2 : Upload des fichiers

```bash
# Uploader les CSV
scp -i ~/.ssh/id_rsa_hetzner \
  cnmv_organisations.csv \
  cnmv_sales_contacts_final.csv \
  root@159.69.108.234:/tmp/

# Vérifier upload
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'ls -lh /tmp/cnmv*.csv'
```

---

### PHASE 4 : Import via API CRM

#### Étape 4.1 : Connexion au serveur

```bash
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234
```

#### Étape 4.2 : Convertir CSV en JSON (sur le serveur)

```bash
# Script de conversion organisations
python3 << 'EOF'
import csv
import json

with open('/tmp/cnmv_organisations.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    organisations = []

    for row in reader:
        org = {
            'name': row['name'],
            'email': row['email'] if row['email'] else None,
            'phone': row['phone'] if row['phone'] else None,
            'website': row['website'] if row['website'] else None,
            'address': row['address'] if row['address'] else None,
            'city': row['city'] if row['city'] else None,
            'postal_code': row['postal_code'] if row['postal_code'] else None,
            'country': 'Espagne',
            'country_code': 'ES',
            'category': row['category'],
            'type': 'fournisseur',
            'notes': row['notes'] if row['notes'] else None,
            'pipeline_stage': 'prospect'
        }

        # Ajouter AUM si présent
        if row.get('aum') and row['aum']:
            try:
                org['aum'] = float(row['aum'])
                org['aum_date'] = row.get('aum_date', '2024-12-31')
            except:
                pass

        # Nettoyer les valeurs None
        org = {k: v for k, v in org.items() if v is not None}
        organisations.append(org)

with open('/tmp/cnmv_orgs_payload.json', 'w', encoding='utf-8') as f:
    json.dump(organisations, f, indent=2, ensure_ascii=False)

print(f"✅ {len(organisations)} organisations converties")
EOF
```

```bash
# Script de conversion contacts
python3 << 'EOF'
import csv
import json

with open('/tmp/cnmv_sales_contacts_final.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    people = []

    for row in reader:
        person = {
            'first_name': row['first_name'] if row['first_name'] else None,
            'last_name': row['last_name'] if row['last_name'] else None,
            'personal_email': row['email'] if row['email'] else None,  # Clé unique
            'phone': row['phone'] if row['phone'] else None,
            'country_code': 'ES',
            'language': 'ES'
        }

        # Nettoyer les valeurs None
        person = {k: v for k, v in person.items() if v is not None}

        # Au moins email ou nom requis
        if person.get('personal_email') or (person.get('first_name') and person.get('last_name')):
            people.append(person)

with open('/tmp/cnmv_people_payload.json', 'w', encoding='utf-8') as f:
    json.dump(people, f, indent=2, ensure_ascii=False)

print(f"✅ {len(people)} contacts convertis")
EOF
```

#### Étape 4.3 : Obtenir le token API

```bash
# Option A : Si vous avez déjà un token
export CRM_TOKEN="votre_token_ici"

# Option B : Se connecter et obtenir un token
# Via l'interface web du CRM ou :
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alforis.com","password":"your_password"}' \
  | jq -r '.access_token'

# Exporter le token
export CRM_TOKEN="eyJ..."
```

#### Étape 4.4 : Import organisations

```bash
# Import organisations
curl -X POST "http://localhost:8000/api/v1/imports/organisations/bulk?type_org=fournisseur" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRM_TOKEN" \
  -d @/tmp/cnmv_orgs_payload.json \
  | jq '.'

# Sauvegarder la réponse
curl -X POST "http://localhost:8000/api/v1/imports/organisations/bulk?type_org=fournisseur" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRM_TOKEN" \
  -d @/tmp/cnmv_orgs_payload.json \
  > /tmp/import_orgs_response.json

cat /tmp/import_orgs_response.json | jq '.'
```

**Résultat attendu** :
```json
{
  "total": 120,
  "created": [1, 2, 3, ...],
  "failed": 0,
  "errors": [],
  "type": "fournisseur"
}
```

#### Étape 4.5 : Import contacts

```bash
# Import contacts
curl -X POST "http://localhost:8000/api/v1/imports/people/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRM_TOKEN" \
  -d @/tmp/cnmv_people_payload.json \
  | jq '.'

# Sauvegarder la réponse
curl -X POST "http://localhost:8000/api/v1/imports/people/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRM_TOKEN" \
  -d @/tmp/cnmv_people_payload.json \
  > /tmp/import_people_response.json

cat /tmp/import_people_response.json | jq '.'
```

**Résultat attendu** :
```json
{
  "total": 45,
  "created": [1, 2, 3, ...],
  "failed": 0,
  "errors": []
}
```

---

### PHASE 5 : Vérification en base de données

#### Étape 5.1 : Vérifier les organisations

```bash
# Se connecter à PostgreSQL
docker exec -it crm-db psql -U crm_user -d crm_db

# Ou si pas Docker
psql -U crm_user -d crm_db
```

```sql
-- Compter les organisations CNMV
SELECT COUNT(*)
FROM organisations
WHERE country_code = 'ES' AND type = 'fournisseur';

-- Vérifier la répartition par Tier
SELECT
  CASE
    WHEN notes LIKE '%Tier 1%' THEN 'Tier 1'
    WHEN notes LIKE '%Tier 2%' THEN 'Tier 2'
    WHEN notes LIKE '%Tier 3%' THEN 'Tier 3'
    ELSE 'Unknown'
  END as tier,
  COUNT(*) as count
FROM organisations
WHERE country_code = 'ES'
GROUP BY tier
ORDER BY tier;

-- Top 10 par AUM
SELECT name, aum, notes
FROM organisations
WHERE country_code = 'ES' AND aum IS NOT NULL
ORDER BY aum DESC
LIMIT 10;

-- Vérifier les données complètes
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN email IS NOT NULL THEN 1 ELSE 0 END) as with_email,
  SUM(CASE WHEN phone IS NOT NULL THEN 1 ELSE 0 END) as with_phone,
  SUM(CASE WHEN website IS NOT NULL THEN 1 ELSE 0 END) as with_website,
  SUM(CASE WHEN aum IS NOT NULL THEN 1 ELSE 0 END) as with_aum
FROM organisations
WHERE country_code = 'ES';
```

#### Étape 5.2 : Vérifier les contacts

```sql
-- Compter les contacts espagnols
SELECT COUNT(*)
FROM people
WHERE country_code = 'ES';

-- Vérifier les emails
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN personal_email IS NOT NULL THEN 1 ELSE 0 END) as with_email,
  SUM(CASE WHEN phone IS NOT NULL THEN 1 ELSE 0 END) as with_phone
FROM people
WHERE country_code = 'ES';

-- Lister quelques contacts
SELECT first_name, last_name, personal_email, phone
FROM people
WHERE country_code = 'ES'
LIMIT 10;
```

---

### PHASE 6 : Création des liens Organisation ↔ Contact

#### Étape 6.1 : Identifier les correspondances

```sql
-- Trouver les contacts sans lien organisation
SELECT p.id, p.first_name, p.last_name, p.personal_email
FROM people p
WHERE p.country_code = 'ES'
  AND NOT EXISTS (
    SELECT 1 FROM organisation_person_links opl
    WHERE opl.person_id = p.id
  )
LIMIT 20;
```

#### Étape 6.2 : Créer les liens (manuellement ou via script)

**Option A : Via SQL direct** (si vous avez les mapping précis)

```sql
-- Exemple : Lier un contact à une organisation
INSERT INTO organisation_person_links (
  person_id,
  organisation_id,
  role,
  is_primary,
  job_title,
  work_email,
  created_at,
  updated_at
)
SELECT
  p.id as person_id,
  o.id as organisation_id,
  'contact_commercial' as role,
  true as is_primary,
  'Director Comercial' as job_title,
  p.personal_email as work_email,
  NOW() as created_at,
  NOW() as updated_at
FROM people p
CROSS JOIN organisations o
WHERE p.personal_email = 'juan.garcia@santander.com'
  AND o.name LIKE '%SANTANDER ASSET%'
  AND o.country_code = 'ES';
```

**Option B : Via fichier de mapping**

```bash
# Créer fichier de mapping depuis les données
python3 << 'EOF'
import pandas as pd
import json

# Charger contacts
df_contacts = pd.read_csv('/tmp/cnmv_sales_contacts_final.csv')

# Créer mapping company_name -> contact
mapping = []
for _, row in df_contacts.iterrows():
    if row.get('email') and row.get('company_name'):
        mapping.append({
            'email': row['email'],
            'company_name': row['company_name'],
            'job_title': row.get('job_title', 'Director Comercial'),
            'first_name': row.get('first_name', ''),
            'last_name': row.get('last_name', '')
        })

with open('/tmp/contact_org_mapping.json', 'w') as f:
    json.dump(mapping, f, indent=2)

print(f"✅ {len(mapping)} mappings créés")
EOF
```

Puis créer les liens via API :

```bash
# Script pour créer les liens
python3 << 'EOF'
import json
import requests

CRM_URL = "http://localhost:8000"
TOKEN = "votre_token"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Charger mapping
with open('/tmp/contact_org_mapping.json') as f:
    mappings = json.load(f)

# Pour chaque mapping
for mapping in mappings[:10]:  # Test avec 10 premiers
    # 1. Trouver l'organisation par nom
    org_search = requests.get(
        f"{CRM_URL}/api/v1/organisations",
        headers=headers,
        params={"name": mapping['company_name'], "country_code": "ES"}
    ).json()

    if not org_search or len(org_search) == 0:
        print(f"⚠️  Org not found: {mapping['company_name']}")
        continue

    org_id = org_search[0]['id']

    # 2. Trouver la personne par email
    person_search = requests.get(
        f"{CRM_URL}/api/v1/people",
        headers=headers,
        params={"email": mapping['email']}
    ).json()

    if not person_search or len(person_search) == 0:
        print(f"⚠️  Person not found: {mapping['email']}")
        continue

    person_id = person_search[0]['id']

    # 3. Créer le lien
    link_data = {
        "person_id": person_id,
        "organisation_id": org_id,
        "role": "contact_commercial",
        "is_primary": True,
        "job_title": mapping['job_title'],
        "work_email": mapping['email']
    }

    response = requests.post(
        f"{CRM_URL}/api/v1/org-links",
        headers=headers,
        json=link_data
    )

    if response.status_code in [200, 201]:
        print(f"✅ Linked: {mapping['first_name']} {mapping['last_name']} → {mapping['company_name']}")
    else:
        print(f"❌ Error: {response.text}")

EOF
```

---

### PHASE 7 : Qualification et assignation

#### Étape 7.1 : Qualifier les Tier 1-2 comme prospects prioritaires

```sql
-- Qualifier Tier 1
UPDATE organisations
SET pipeline_stage = 'qualified',
    notes = CONCAT(notes, ' - PRIORITÉ HAUTE')
WHERE country_code = 'ES'
  AND notes LIKE '%Tier 1%';

-- Qualifier Tier 2
UPDATE organisations
SET pipeline_stage = 'qualified'
WHERE country_code = 'ES'
  AND notes LIKE '%Tier 2%';
```

#### Étape 7.2 : Assigner aux commerciaux

```sql
-- Lister les commerciaux
SELECT id, email, first_name, last_name
FROM users
WHERE role = 'sales' OR role = 'admin';

-- Assigner Tier 1 à un commercial (exemple)
UPDATE organisations
SET assigned_to = 1  -- ID du commercial
WHERE country_code = 'ES'
  AND notes LIKE '%Tier 1%';
```

---

## ✅ Checklist finale

### Extraction
- [ ] Données INVERCO téléchargées
- [ ] CNMV scrapé
- [ ] Enrichissement AUM effectué
- [ ] Classification Tier vérifiée
- [ ] Directeurs commerciaux extraits
- [ ] Fichiers CSV générés

### Validation
- [ ] Volumes cohérents (~120 orgs, ~35-50 contacts)
- [ ] Qualité vérifiée (emails, tiers, AUM)
- [ ] Pas d'erreurs dans les CSV

### Import
- [ ] Fichiers uploadés sur serveur
- [ ] JSON payloads créés
- [ ] Token API obtenu
- [ ] Organisations importées
- [ ] Contacts importés
- [ ] Pas d'erreurs d'import

### Vérification
- [ ] Organisations en base vérifiées
- [ ] Contacts en base vérifiés
- [ ] Répartition par Tier correcte
- [ ] AUM présents
- [ ] Liens organisation ↔ contact créés

### Qualification
- [ ] Tier 1-2 qualifiés
- [ ] Assignation commerciaux effectuée
- [ ] Pipeline stages mis à jour

---

## 📊 Résultats attendus

```
✅ ~120-150 organisations espagnoles importées
   - Tier 1: ~18
   - Tier 2: ~5
   - Tier 3: ~100

✅ ~35-50 directeurs commerciaux importés
   - Avec email: 60-80%
   - Tier 1: ~30-40
   - Tier 2: ~4-8

✅ Liens organisation ↔ contact créés

✅ Prêt pour prospection commerciale
```

---

## 🆘 En cas de problème

### Import échoue

```bash
# Vérifier les logs API
docker logs crm-backend --tail 100

# Vérifier le format JSON
cat /tmp/cnmv_orgs_payload.json | jq '.[0]'

# Tester avec 1 seul enregistrement
echo '[{"name":"TEST","country":"Espagne","country_code":"ES","type":"fournisseur"}]' | \
curl -X POST "http://localhost:8000/api/v1/imports/organisations/bulk?type_org=fournisseur" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRM_TOKEN" \
  -d @-
```

### Doublons

```sql
-- Identifier les doublons
SELECT name, COUNT(*)
FROM organisations
WHERE country_code = 'ES'
GROUP BY name
HAVING COUNT(*) > 1;

-- Supprimer les doublons (garder le plus récent)
DELETE FROM organisations
WHERE id NOT IN (
  SELECT MAX(id)
  FROM organisations
  WHERE country_code = 'ES'
  GROUP BY name
);
```

---

**Créé le** : 2025-10-20
**Version** : 1.0
**Support** : documentation/CNMV_COMPLETE_SYSTEM.md
