# 🔗 Option 3: Import Unifié (Organisations + Personnes)

## Vue d'ensemble

L'**Option 3** propose une approche unifiée de l'import combinant:
- ✅ Import d'organisations
- ✅ Import de personnes
- 🔄 Création automatique des liens (en développement)

Cette option centralise le workflow d'import et permet de charger des données complètement opérationnelles en une seule requête.

---

## 🏗️ Architecture Technique

### Backend Endpoints

#### 1. **POST `/api/v1/imports/organisations/bulk`**
```python
# Déjà existant
# Crée plusieurs organisations
POST /api/v1/imports/organisations/bulk?type_org=client
Content-Type: application/json

[
  { "name": "Acme Corp", "email": "...", "phone": "..." },
  { "name": "Tech Corp", "email": "...", "phone": "..." }
]

Response:
{
  "total": 2,
  "created": [1, 2],           # IDs créés
  "failed": 0,
  "errors": [],
  "type": "client"
}
```

#### 2. **POST `/api/v1/imports/people/bulk`**
```python
# Déjà existant
# Crée plusieurs personnes
POST /api/v1/imports/people/bulk
Content-Type: application/json

[
  { "first_name": "Jean", "last_name": "Dupont", "personal_email": "...", ... },
  { "first_name": "Marie", "last_name": "Martin", "personal_email": "...", ... }
]

Response:
{
  "total": 2,
  "created": [1, 2],           # IDs créés
  "failed": 0,
  "errors": []
}
```

#### 3. **POST `/api/v1/org-links/bulk`** ✨ NEW
```python
# Crée plusieurs liens personne ↔ organisation
POST /api/v1/org-links/bulk
Content-Type: application/json

[
  {
    "person_id": 1,
    "organisation_id": 1,
    "role": "contact_principal",
    "is_primary": true,
    "job_title": "Responsable Partenariats",
    "work_email": "jean@acme.com",
    "work_phone": "+33123456789"
  },
  {
    "person_id": 2,
    "organisation_id": 2,
    "role": "contact_secondaire",
    "is_primary": false
  }
]

Response:
{
  "total": 2,
  "created": [1, 2],           # IDs de liens créés
  "failed": 0,
  "errors": []
}
```

### Frontend Components

#### **ImportUnifiedForm.tsx**
- 📦 Upload CSV organisations
- 👥 Upload CSV personnes
- 🎯 Sélection du type d'organisation
- 🚀 Lancement import (3 étapes)
- 📊 Rapport détaillé avec erreurs

#### **Page: `/dashboard/imports/unified`**
- 🎨 Interface principale
- 📋 Documentation des formats CSV
- 💡 Guide d'utilisation
- 🔗 Liens rapides vers organisations/people

---

## 📝 Format CSV

### Organisations CSV
```
name,email,phone,address,city,country
Acme Corp,contact@acme.com,+33123456789,123 Rue X,Paris,FR
Tech Corp,info@techcorp.com,+33987654321,456 Av Y,Lyon,FR
```

**Colonnes attendues:**
- `name` **(requis)** - Nom de l'organisation
- `email` - Email de contact
- `phone` - Téléphone
- `address` - Adresse
- `city` - Ville
- `country` - Pays (code ISO)

### Personnes CSV
```
first name,last name,personal email,email,personal phone,phone,country code,language
Jean,Dupont,jean@gmail.com,jean@acme.com,+33612345678,+33123456789,FR,fr
Marie,Martin,marie@gmail.com,marie@techcorp.com,+33687654321,+33987654321,FR,fr
```

**Colonnes attendues:**
- `first name` - Prénom
- `last name` - Nom
- `personal email` **(requis)** - Email personnel (clé unique)
- `email` - Email professionnel
- `personal phone` - Téléphone personnel
- `phone` - Téléphone professionnel
- `country code` - Code pays
- `language` - Langue (ex: fr, en)

### Associations CSV (pour liens - future feature)
```
person_first_name,person_last_name,organisation_name,role,is_primary,job_title
Jean,Dupont,Acme Corp,contact_principal,true,Responsable Partenariats
Marie,Martin,Tech Corp,contact_secondaire,false,
```

---

## 🔄 Workflow

### Version Actuelle (V1)
```
1. Upload CSV Organisations
   ↓
2. Upload CSV Personnes
   ↓
3. Cliquer "Importer"
   ├─→ POST /api/v1/imports/organisations/bulk
   │  ├─ Déduplication
   │  ├─ Validation
   │  └─ Création
   ├─→ POST /api/v1/imports/people/bulk
   │  ├─ Déduplication
   │  ├─ Validation
   │  └─ Création
   ├─→ [SKIPPED] POST /api/v1/org-links/bulk
   │  └─ À faire: matching par nom
   ↓
4. Rapport détaillé
   ├─ Organisations créées: N
   ├─ Personnes créées: M
   ├─ Liens créés: K (en cours de développement)
   └─ Erreurs: X (listées avec ligne/index)
```

### Version Future (V2)
```
Amélioration attendue:
- Matching automatique personne ↔ organisation
- Support alias d'organisations
- Gestion des doublons par email
- Création de liens dans la même requête
```

---

## ✅ Fonctionnalités Implémentées

### Backend
- ✅ Endpoint `/org-links/bulk` créé
- ✅ Déduplication des liens (même person_id + organisation_id)
- ✅ Validation existence personne et organisation
- ✅ Gestion d'erreurs complète
- ✅ Rapport détaillé (total, created, failed, errors)

### Frontend
- ✅ Upload 2 fichiers CSV
- ✅ Parsing CSV (headers case-insensitive)
- ✅ Sélection type organisation
- ✅ Validation données avant submit
- ✅ Affichage nombre lignes
- ✅ Rapport avec erreurs détaillées
- ✅ Toast notifications
- ⏳ Création automatique liens (TODO)

---

## 🎯 Comparaison des 3 Options

| Feature | Option 1 | Option 2 | Option 3 |
|---------|----------|----------|----------|
| **Import Orgs** | ❌ Centralisé | ✅ Modulaire | ✅ Unifié |
| **Import People** | ❌ Centralisé | ✅ Modulaire | ✅ Unifié |
| **Création Liens** | ❌ Manual | ❌ Manual | ⏳ Auto (partial) |
| **Découplage** | ❌ Couplé | ✅ Séparé | ✅ Unifié |
| **Scalabilité** | ⚠️ Moyen | ✅ Bon | ✅ Excellent |
| **UX** | ⚠️ 1 page | ✅ 2 pages | ✅ 1 page |
| **Maintenance** | ⚠️ Complexe | ✅ Simple | ✅ Très simple |

---

## 🚀 Utilisation

### Accès
- Menu Sidebar → **Import Unifié** (badge NEW)
- Direct: `/dashboard/imports/unified`

### Étapes
1. Télécharger fichier CSV organisations
2. Télécharger fichier CSV personnes
3. Sélectionner type d'organisation
4. Cliquer **Importer**
5. Consulter rapport

---

## 🔧 Développement Futur

### Phase 2: Matching Automatique des Liens
```python
# Pseudo-code
def create_links_from_csv(organisations_data, people_data):
    links = []
    for person in people_data:
        for org in organisations_data:
            if person.organisation_name == org.name:
                links.append({
                    'person_id': person.id,
                    'organisation_id': org.id,
                    'role': person.get('role', 'contact_secondaire'),
                    'is_primary': person.get('is_primary', False),
                    'job_title': person.get('job_title'),
                    'work_email': person.get('work_email'),
                    'work_phone': person.get('work_phone')
                })
    return links
```

### Phase 3: Support des Alias
- Mapping organisations (Acme Corp ↔ ACME Groupe)
- Support des multiples organisations par personne
- Import avec révision avant commit

---

## 📊 Cas d'Usage

### Cas 1: Import Simple
```csv
# organisations.csv
name,email,phone
Acme Corp,contact@acme.com,+33123456789

# people.csv
first name,last name,personal email
Jean,Dupont,jean@gmail.com
```
→ 1 organisation + 1 personne (pas de lien automatique)

### Cas 2: Import Complexe
```csv
# organisations.csv (50 lignes)
name,email,phone,address,city,country
...

# people.csv (200 lignes)
first name,last name,personal email,email,phone,country code,language
...
```
→ Import en ~1 sec, déduplication automatique, rapport détaillé

---

## 🐛 Dépannage

### "Lien déjà existant"
- Cette personne est déjà associée à cette organisation
- Vérifier la déduplication en base

### "Ressource introuvable"
- La personne ou l'organisation n'existe pas
- Vérifier que les imports précédents ont réussi

### Erreurs dans le rapport
- Affichées avec numéro de ligne (Ligne 2, Ligne 3, etc.)
- Vérifier format CSV et correspondance des noms

---

## 📋 Files de Travail

- ✅ `org_links.py` - Endpoint bulk créé
- ✅ `ImportUnifiedForm.tsx` - Composant créé
- ✅ `imports/unified/page.tsx` - Page créée
- ✅ `Sidebar.tsx` - Menu item ajouté
- ⏳ Matching automatique à faire
- ⏳ Support alias à faire

---

## 🎓 Notes de Conception

### Pourquoi cette architecture?
1. **Cohérence**: Les 2 endpoints bulk pour organisations et people existent déjà
2. **Modularité**: Chaque endpoint indépendant (on peut créer orgs sans people)
3. **Scalabilité**: Support de milliers d'enregistrements
4. **UX**: Interface simple et intuitive

### Compromis
- Création des liens pas automatique (complexité avec matching)
- Nécessite 3 appels API (mais possible de combiner en 1 avec un nouvel endpoint)
- Matching par nom peut être ambigü

### Améliorations Possibles
- Endpoint unique `/api/v1/imports/unified` qui fait tout
- Support Associations CSV pour matching
- Validation avant commit (dry-run)