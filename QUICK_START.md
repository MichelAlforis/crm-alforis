# Guide de démarrage rapide - Refonte CRM

## 🚀 Démarrage en 5 minutes

### Étape 1 : Migration de la base de données

```bash
cd crm-backend

# Simulation (recommandé en premier)
python scripts/migrate_fournisseur_to_organisation.py --dry-run

# Si tout est OK, exécuter la migration
python scripts/migrate_fournisseur_to_organisation.py
```

**Résultat attendu** :
```
✅ 50 fournisseurs migrés avec succès
✅ 50 organisations créées
✅ 50 mandats créés
✅ 120 contacts migrés avec succès
```

### Étape 2 : Redémarrer le backend

```bash
# Si vous utilisez Docker
cd ..  # retour à la racine
docker-compose restart backend

# OU directement avec uvicorn
cd crm-backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Étape 3 : Vérifier l'API

Ouvrir votre navigateur : `http://localhost:8000/docs`

**Nouveaux endpoints visibles** :
- `/api/v1/organisations`
- `/api/v1/mandats`
- `/api/v1/produits`

### Étape 4 : Tester les nouveaux endpoints

#### Créer une organisation

```bash
curl -X POST "http://localhost:8000/api/v1/organisations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Asset Management",
    "category": "Wholesale",
    "language": "FR",
    "website": "https://test-am.com",
    "country_code": "FR"
  }'
```

#### Créer un mandat

```bash
curl -X POST "http://localhost:8000/api/v1/mandats" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "organisation_id": 1,
    "status": "signé",
    "date_signature": "2025-01-15",
    "notes": "Mandat de distribution standard"
  }'
```

#### Créer un produit

```bash
curl -X POST "http://localhost:8000/api/v1/produits" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Fonds Actions Europe",
    "isin": "FR0010869950",
    "type": "OPCVM",
    "status": "actif"
  }'
```

#### Associer le produit au mandat

```bash
curl -X POST "http://localhost:8000/api/v1/produits/associate-to-mandat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "mandat_id": 1,
    "produit_id": 1,
    "date_ajout": "2025-01-20"
  }'
```

### Étape 5 : Vérifier la migration

```bash
# Se connecter à PostgreSQL
docker exec -it crm-db psql -U user -d crm_db

# Vérifier les tables
\dt

# Compter les organisations
SELECT COUNT(*) FROM organisations;

# Compter les mandats
SELECT COUNT(*) FROM mandats_distribution;

# Vérifier les mandats actifs
SELECT o.name, m.status, m.date_signature
FROM organisations o
JOIN mandats_distribution m ON o.id = m.organisation_id
WHERE m.status IN ('signé', 'actif');

# Sortir
\q
```

---

## ⚠️ Problèmes courants

### Erreur : "Table organisations already exists"

**Cause** : Vous avez déjà exécuté la migration

**Solution** :
```bash
# Option 1 : Supprimer les tables et recommencer
psql -U user -d crm_db -c "DROP TABLE IF EXISTS organisations CASCADE;"

# Option 2 : Skip cette étape si les données sont déjà migrées
```

### Erreur : "Module 'models.organisation' not found"

**Cause** : Le chemin Python n'est pas correctement configuré

**Solution** :
```bash
# Depuis le répertoire crm-backend
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
python scripts/migrate_fournisseur_to_organisation.py
```

### Erreur : "ValidationError: Le mandat doit être signé ou actif"

**Cause** : Vous essayez d'associer un produit à un mandat avec status="proposé"

**Solution** : Changer le statut du mandat à "signé" ou "actif" avant d'associer des produits
```bash
curl -X PUT "http://localhost:8000/api/v1/mandats/1" \
  -H "Content-Type: application/json" \
  -d '{"status": "signé", "date_signature": "2025-01-15"}'
```

---

## 📊 Exemples d'utilisation

### Exemple 1 : Segmentation newsletter par langue

**Récupérer toutes les organisations francophones** :
```bash
curl "http://localhost:8000/api/v1/organisations/by-language/FR"
```

**Récupérer toutes les personnes anglophones** :
```bash
curl "http://localhost:8000/api/v1/people?language=EN"
```

### Exemple 2 : Lister les produits d'un fournisseur

```bash
# 1. Récupérer les mandats actifs d'une organisation
curl "http://localhost:8000/api/v1/mandats/organisation/1"

# 2. Pour chaque mandat actif, récupérer les produits
curl "http://localhost:8000/api/v1/produits/by-mandat/1"
```

### Exemple 3 : Créer une interaction avec un produit

```bash
curl -X POST "http://localhost:8000/api/v1/interactions" \
  -H "Content-Type: application/json" \
  -d '{
    "organisation_id": 1,
    "personne_id": 5,
    "produit_id": 1,
    "date": "2025-01-20",
    "type": "reunion",
    "pipeline": "vente",
    "subject": "Présentation du fonds Actions Europe",
    "duration_minutes": 60,
    "notes": "Client intéressé par le fonds"
  }'
```

**Validation automatique** : L'API vérifiera qu'un mandat actif existe entre l'organisation et le produit.

---

## 📝 Checklist post-migration

- [ ] La migration s'est exécutée sans erreur
- [ ] Les tables `organisations`, `mandats_distribution`, `produits` existent
- [ ] Le nombre d'organisations = nombre d'anciens fournisseurs
- [ ] Chaque organisation a au moins un mandat
- [ ] Les contacts ont été migrés vers `organisation_contacts`
- [ ] Les nouveaux endpoints API sont accessibles (`/docs`)
- [ ] Un test de création d'organisation fonctionne
- [ ] Un test de création de mandat fonctionne
- [ ] Un test d'association produit-mandat fonctionne (avec mandat actif)
- [ ] La validation refuse l'association si le mandat n'est pas actif

---

## 🎯 Prochaines étapes

### Frontend (à implémenter)

1. **Mettre à jour l'API client** : [crm-frontend/lib/api.ts](crm-frontend/lib/api.ts)
   ```typescript
   // Ajouter les méthodes pour organisations, mandats, produits
   async getOrganisations(params) { ... }
   async createOrganisation(data) { ... }
   async getMandats(params) { ... }
   async createMandat(data) { ... }
   async getProduits(params) { ... }
   async associateProduitToMandat(data) { ... }
   ```

2. **Créer les hooks** :
   - `crm-frontend/hooks/useOrganisations.ts`
   - `crm-frontend/hooks/useMandats.ts`
   - `crm-frontend/hooks/useProduits.ts`

3. **Créer les pages** :
   - `crm-frontend/app/dashboard/organisations/page.tsx`
   - `crm-frontend/app/dashboard/mandats/page.tsx`
   - `crm-frontend/app/dashboard/produits/page.tsx`

4. **Mettre à jour la sidebar** : [crm-frontend/components/shared/Sidebar.tsx](crm-frontend/components/shared/Sidebar.tsx)
   ```typescript
   { name: 'Organisations', href: '/dashboard/organisations', icon: Building2 }
   { name: 'Mandats', href: '/dashboard/mandats', icon: FileSignature }
   { name: 'Produits', href: '/dashboard/produits', icon: Package }
   ```

---

## 📚 Documentation complète

Voir [REFONTE_CRM_GUIDE.md](./REFONTE_CRM_GUIDE.md) pour la documentation complète.

---

**Support** : En cas de problème, consultez la documentation complète ou contactez l'équipe technique.
