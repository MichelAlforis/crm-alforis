# Refactoring du Système d'Import CRM

## Contexte

L'architecture du CRM a été migrée de l'ancien modèle `Investor`/`Fournisseur` vers le nouveau modèle unifié `Organisation`/`Person`. Cependant, les endpoints d'import en masse (`/api/v1/imports/*`) utilisaient encore les anciens modèles, créant une incohérence.

## Problème Identifié

**Fichier**: `crm-backend/api/routes/imports.py`

### Ancienne Structure (INCORRECTE)
```python
# ❌ Utilisait encore les anciens modèles
from models.investor import Investor
from models.fournisseur import Fournisseur

@router.post("/investors/bulk")  # Utilisait Investor directement
@router.post("/fournisseurs/bulk")  # Utilisait Fournisseur directement
```

Cette approche:
- Ne suivait pas la nouvelle architecture Organisation/Person
- Créait une dette technique
- Empêchait l'utilisation cohérente des nouveaux modèles

## Solution Implémentée

### 1. Nouveaux Imports

```python
# ✅ Utilise les nouveaux modèles unifiés
from models.organisation import Organisation, OrganisationCategory
from models.person import Person, OrganizationType, PersonOrganizationLink
from schemas.organisation import OrganisationCreate
from schemas.person import PersonCreate, PersonOrganizationLinkCreate
```

### 2. Nouveau Endpoint Unifié pour Organisations

**Endpoint**: `POST /api/v1/imports/organisations/bulk`

```python
@router.post("/organisations/bulk")
async def bulk_create_organisations(
    organisations: List[OrganisationCreate],
    type_org: OrganizationType = Query(..., description="Type d'organisation: client ou fournisseur"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional),
) -> Dict[str, Any]:
```

**Fonctionnalités**:
- Import unifié pour **clients** (anciens investors) et **fournisseurs**
- Paramètre `type_org` pour différencier: `INVESTOR` ou `FOURNISSEUR`
- Déduplication par nom d'organisation
- Gestion des erreurs par ligne avec index
- Transactions atomiques avec rollback en cas d'erreur

**Exemple d'utilisation**:
```bash
# Import de clients (anciens investors)
POST /api/v1/imports/organisations/bulk?type_org=INVESTOR

# Import de fournisseurs (anciens fournisseurs)
POST /api/v1/imports/organisations/bulk?type_org=FOURNISSEUR
```

### 3. Nouveau Endpoint pour Personnes Physiques

**Endpoint**: `POST /api/v1/imports/people/bulk`

```python
@router.post("/people/bulk")
async def bulk_create_people(
    people: List[PersonCreate],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional),
) -> Dict[str, Any]:
```

**Fonctionnalités**:
- Import de personnes physiques (contacts)
- Déduplication par `personal_email`
- Permet d'importer des personnes sans les lier immédiatement à une organisation
- Utiliser `/api/v1/people/{person_id}/organizations` pour créer les liens ensuite

**Exemple d'utilisation**:
```bash
POST /api/v1/imports/people/bulk
Content-Type: application/json

[
  {
    "first_name": "Jean",
    "last_name": "Dupont",
    "personal_email": "jean.dupont@example.com",
    "personal_phone": "+33612345678",
    "role": "Directeur Commercial",
    "country_code": "FR",
    "language": "fr"
  },
  ...
]
```

### 4. Endpoints Dépréciés (Compatibilité Rétroactive)

Pour assurer la compatibilité avec le code existant, les anciens endpoints sont conservés mais **marqués comme DEPRECATED**:

#### `/investors/bulk` (DEPRECATED)

```python
@router.post("/investors/bulk")
async def bulk_create_investors_deprecated(
    investors: List[dict],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    DEPRECATED: Utilisez /api/v1/imports/organisations/bulk?type_org=INVESTOR
    """
    logger.warning("Using deprecated endpoint /investors/bulk")

    # Convertit le format ancien vers le nouveau
    # Appelle le nouvel endpoint organisations/bulk
```

#### `/fournisseurs/bulk` (DEPRECATED)

```python
@router.post("/fournisseurs/bulk")
async def bulk_create_fournisseurs_deprecated(
    fournisseurs: List[dict],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    DEPRECATED: Utilisez /api/v1/imports/organisations/bulk?type_org=FOURNISSEUR
    """
    logger.warning("Using deprecated endpoint /fournisseurs/bulk")

    # Convertit le format ancien vers le nouveau
    # Appelle le nouvel endpoint organisations/bulk
```

**Avantages**:
- Le code frontend existant continue de fonctionner
- Logging des avertissements pour identifier les usages
- Conversion automatique de l'ancien format vers le nouveau
- Permet une migration progressive du code client

## Migration Frontend (À Faire)

### Avant
```typescript
// Ancien appel
const response = await fetch('/api/v1/imports/investors/bulk', {
  method: 'POST',
  body: JSON.stringify(investors)
});
```

### Après
```typescript
// Nouveau appel unifié
const response = await fetch('/api/v1/imports/organisations/bulk?type_org=INVESTOR', {
  method: 'POST',
  body: JSON.stringify(organisations)
});
```

## Format de Réponse

Tous les endpoints d'import retournent un format de réponse uniforme:

```json
{
  "total": 100,
  "created": [1, 2, 3, ..., 95],
  "failed": 5,
  "errors": [
    {
      "index": 10,
      "row": 12,
      "error": "Email déjà existant en base: duplicate@example.com"
    },
    {
      "index": 25,
      "row": 27,
      "error": "Doublon dans le payload pour l'email: duplicate2@example.com"
    }
  ],
  "type": "INVESTOR"  // Seulement pour /organisations/bulk
}
```

**Champs**:
- `total`: Nombre total d'entrées dans le payload
- `created`: Liste des IDs créés avec succès
- `failed`: Nombre d'échecs
- `errors`: Détails des erreurs avec index (0-based) et row (1-based, compte le header CSV)
- `type`: Type d'organisation (uniquement pour `/organisations/bulk`)

## Gestion des Erreurs

### Types d'Erreurs Détectées

1. **Doublons dans le payload**
   ```
   "Doublon dans le payload pour l'email: duplicate@example.com"
   ```

2. **Doublons en base de données**
   ```
   "Email déjà existant en base: existing@example.com"
   "Organisation déjà existante: Société XYZ"
   ```

3. **Contraintes d'intégrité**
   ```
   "Contrainte d'intégrité: UNIQUE constraint failed: organisations.name"
   ```

4. **Erreurs de validation**
   ```
   "Category must be one of ['Institution', 'Wholesale', 'SDG', 'CGPI', 'Autres']"
   ```

### Comportement des Transactions

- **Transaction par batch**: Une seule transaction pour tout le batch
- **Échec partiel**: Si une ligne échoue, elle est ignorée mais les autres continuent
- **Rollback en cas d'échec total**: Si toutes les lignes échouent, rollback complet
- **Commit si au moins une réussite**: Si au moins une ligne réussit, commit des lignes valides

## Tests à Effectuer

### 1. Test de l'Endpoint Organisations

```bash
# Test import clients
curl -X POST "http://localhost:8000/api/v1/imports/organisations/bulk?type_org=INVESTOR" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "name": "CGPI Test",
      "category": "CGPI",
      "website": "https://test.com",
      "country_code": "FR",
      "language": "FR",
      "is_active": true
    }
  ]'

# Test import fournisseurs
curl -X POST "http://localhost:8000/api/v1/imports/organisations/bulk?type_org=FOURNISSEUR" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "name": "Asset Manager Test",
      "category": "Institution",
      "aum": 1000000000,
      "website": "https://am-test.com",
      "country_code": "FR",
      "language": "FR"
    }
  ]'
```

### 2. Test de l'Endpoint People

```bash
curl -X POST "http://localhost:8000/api/v1/imports/people/bulk" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "first_name": "Jean",
      "last_name": "Dupont",
      "personal_email": "jean.dupont@test.com",
      "personal_phone": "+33612345678",
      "country_code": "FR",
      "language": "fr"
    }
  ]'
```

### 3. Test de Compatibilité (Endpoints Dépréciés)

```bash
# Test ancien endpoint investors (devrait fonctionner avec warning)
curl -X POST "http://localhost:8000/api/v1/imports/investors/bulk" \
  -H "Content-Type: application/json" \
  -d '[{"name": "Test Investor", "client_type": "CGPI"}]'

# Test ancien endpoint fournisseurs (devrait fonctionner avec warning)
curl -X POST "http://localhost:8000/api/v1/imports/fournisseurs/bulk" \
  -H "Content-Type: application/json" \
  -d '[{"name": "Test Fournisseur", "type_fournisseur": "ASSET_MANAGER"}]'
```

### 4. Tests de Déduplication

```bash
# Test doublons dans le payload
curl -X POST "http://localhost:8000/api/v1/imports/organisations/bulk?type_org=INVESTOR" \
  -H "Content-Type: application/json" \
  -d '[
    {"name": "Duplicate Org", "category": "CGPI"},
    {"name": "Duplicate Org", "category": "CGPI"}
  ]'

# Résultat attendu:
# {
#   "total": 2,
#   "created": [1],
#   "failed": 1,
#   "errors": [{
#     "index": 1,
#     "row": 3,
#     "error": "Doublon dans le payload pour le nom: Duplicate Org"
#   }]
# }
```

## Checklist de Migration

- [x] Refactoring de `api/routes/imports.py`
- [x] Création de `/organisations/bulk` avec paramètre `type_org`
- [x] Création de `/people/bulk`
- [x] Marquage `/investors/bulk` comme DEPRECATED
- [x] Marquage `/fournisseurs/bulk` comme DEPRECATED
- [x] Tests de syntaxe Python (py_compile)
- [ ] Tests unitaires des nouveaux endpoints
- [ ] Tests d'intégration avec base de données
- [ ] Migration du code frontend
- [ ] Tests end-to-end
- [ ] Documentation API (Swagger)
- [ ] Déploiement en production
- [ ] Suppression des endpoints dépréciés (dans 6 mois)

## Fichiers Modifiés

### `crm-backend/api/routes/imports.py`

**Avant**: 529 lignes (avec code dupliqué)
**Après**: 352 lignes (refactorisé)

**Changements**:
1. Suppression des imports `Investor` et `Fournisseur`
2. Ajout des imports `Organisation`, `Person`, `OrganizationType`
3. Suppression de l'ancien `bulk_create_investors()` qui utilisait `Investor`
4. Suppression de l'ancien `bulk_create_fournisseurs()` qui utilisait `Fournisseur`
5. Ajout de `bulk_create_organisations()` unifié
6. Ajout de `bulk_create_people()`
7. Ajout de wrappers de compatibilité `*_deprecated()`

## Avantages de la Nouvelle Architecture

### 1. Cohérence
- Tous les imports utilisent les nouveaux modèles `Organisation`/`Person`
- Pas de mélange entre ancienne et nouvelle architecture

### 2. Maintenabilité
- Code centralisé dans des fonctions unifiées
- Pas de duplication de logique d'import
- Plus facile à maintenir et débugger

### 3. Évolutivité
- Facile d'ajouter de nouveaux types d'organisations
- Structure extensible pour futurs besoins

### 4. Compatibilité
- Endpoints dépréciés assurent la transition en douceur
- Pas de breaking changes pour le frontend existant
- Logs pour identifier les usages à migrer

### 5. Gestion des Erreurs
- Gestion uniforme des erreurs
- Format de réponse consistant
- Détails précis des échecs avec row numbers

## Notes Techniques

### Mapping Anciens Modèles → Nouveaux Modèles

#### Investor → Organisation
```python
# Ancien
Investor(
    name="CGPI XYZ",
    email="contact@cgpi.com",
    client_type="CGPI"
)

# Nouveau
Organisation(
    name="CGPI XYZ",
    category="CGPI",  # Pas d'email au niveau organisation
    type=OrganizationType.INVESTOR
)
```

#### Fournisseur → Organisation
```python
# Ancien
Fournisseur(
    name="Asset Manager ABC",
    email="contact@am.com",
    type_fournisseur="ASSET_MANAGER"
)

# Nouveau
Organisation(
    name="Asset Manager ABC",
    category="Institution",  # Mapping type_fournisseur → category
    type=OrganizationType.FOURNISSEUR
)
```

#### Contact → Person + PersonOrganizationLink
```python
# Ancien (Contact lié à Investor)
Contact(
    investor_id=1,
    name="Jean Dupont",
    email="jean@cgpi.com",
    title="Directeur"
)

# Nouveau (Person séparé + Link)
person = Person(
    first_name="Jean",
    last_name="Dupont",
    personal_email="jean.dupont@perso.com"
)

link = PersonOrganizationLink(
    person_id=person.id,
    organization_id=1,
    organization_type=OrganizationType.INVESTOR,
    work_email="jean@cgpi.com",
    job_title="Directeur"
)
```

## Conclusion

Le système d'import a été complètement refactorisé pour utiliser la nouvelle architecture `Organisation`/`Person`. Les anciens endpoints sont conservés pour la compatibilité mais redirigent vers les nouveaux endpoints unifiés. Cette approche assure une transition en douceur tout en éliminant la dette technique.

**Prochaines Étapes**:
1. Tester les nouveaux endpoints
2. Migrer le code frontend
3. Monitorer les warnings sur les endpoints dépréciés
4. Supprimer les endpoints dépréciés dans 6 mois
