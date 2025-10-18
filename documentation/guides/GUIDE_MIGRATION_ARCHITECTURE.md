# 🚀 Guide de Migration - Unification Architecture CRM

## 📋 Vue d'Ensemble

Ce guide vous accompagne étape par étape pour unifier l'architecture du CRM en migrant:
- `Investor` → `Organisation` (type=CLIENT)
- `Fournisseur` → `Organisation` (type=FOURNISSEUR)
- `Contact` + `FournisseurContact` → `Person` + `PersonOrganizationLink`

**Durée estimée:** 2-3 heures (incluant backup et vérifications)

---

## ⚠️ Pré-requis

### 1. Backup Obligatoire

```bash
cd crm-backend

# Rendre le script exécutable
chmod +x scripts/backup_database.sh

# Créer le backup
./scripts/backup_database.sh
```

Le backup sera créé dans `crm-backend/backups/crm_backup_YYYYMMDD_HHMMSS.sql.gz`

### 2. Vérifier l'État Actuel

```bash
# Se connecter à la base
docker exec -it crm-postgres psql -U crm_user -d crm_db

# Compter les données actuelles
SELECT 'investors' as table_name, COUNT(*) FROM investors
UNION ALL
SELECT 'fournisseurs', COUNT(*) FROM fournisseurs
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL
SELECT 'fournisseur_contacts', COUNT(*) FROM fournisseur_contacts
UNION ALL
SELECT 'organisations', COUNT(*) FROM organisations
UNION ALL
SELECT 'people', COUNT(*) FROM people;
```

**Notez ces chiffres** pour vérifier après la migration!

### 3. Arrêter l'Application (Recommandé)

```bash
# Pour éviter des écritures pendant la migration
docker-compose down frontend api

# Garder seulement PostgreSQL actif
docker-compose up -d postgres
```

---

## 🎯 Étapes de Migration

### Étape 1: Simulation (Dry-Run)

Toujours commencer par une simulation pour voir ce qui va se passer:

```bash
cd crm-backend

# Lancer la simulation
python migrations/unify_architecture.py --dry-run
```

**Vérifiez la sortie:**
- ✅ Nombre d'investisseurs à migrer
- ✅ Nombre de fournisseurs à migrer
- ✅ Nombre de contacts à migrer
- ✅ Pas d'erreur affichée

### Étape 2: Exécution de la Migration

Si la simulation est OK:

```bash
# Exécuter la migration réelle
python migrations/unify_architecture.py --execute
```

Le script va:
1. ✅ Ajouter les colonnes `type`, `pipeline_stage`, `email`, `main_phone` à `organisations`
2. ✅ Migrer tous les `Investor` → `Organisation` (type=CLIENT)
3. ✅ Migrer tous les `Fournisseur` → `Organisation` (type=FOURNISSEUR)
4. ✅ Migrer tous les `Contact` → `Person` + `PersonOrganizationLink`
5. ✅ Migrer tous les `FournisseurContact` → `Person` + `PersonOrganizationLink`

**Durée:** 5-15 minutes selon la quantité de données

### Étape 3: Vérification Post-Migration

```bash
# Vérifier les nouvelles données
docker exec -it crm-postgres psql -U crm_user -d crm_db

# Compter les organisations par type
SELECT type, COUNT(*) FROM organisations GROUP BY type;

# Devrait afficher:
#     type      | count
# --------------+-------
#  client       |  XXX  (= ancien nombre d'investors)
#  fournisseur  |  YYY  (= ancien nombre de fournisseurs)
#  autre        |  ZZZ  (organisations existantes)

# Compter les personnes
SELECT COUNT(*) FROM people;
# Devrait être ~ nombre total de contacts (dédupliqués si même email)

# Compter les liens Person ↔ Organisation
SELECT organization_type, COUNT(*) FROM person_org_links GROUP BY organization_type;
# Devrait afficher:
#  organization_type | count
# -------------------+-------
#  investor          |  XXX
#  fournisseur       |  YYY
```

### Étape 4: Tester l'Application

```bash
# Redémarrer l'API
docker-compose up -d api

# Vérifier les logs
docker-compose logs -f api

# Tester l'API
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/organisations

# Redémarrer le frontend
docker-compose up -d frontend

# Ouvrir http://localhost:3010
```

**Tests à effectuer:**
1. ✅ Connexion utilisateur
2. ✅ Liste des organisations (clients + fournisseurs)
3. ✅ Détail d'une organisation
4. ✅ Création/modification d'une organisation
5. ✅ Liste des personnes
6. ✅ Détail d'une personne avec ses organisations

---

## 🗑️ Nettoyage des Anciennes Tables

**⚠️ À faire UNIQUEMENT si la migration est 100% réussie et l'application testée!**

### 1. Vérification Finale

```bash
cd crm-backend

# Lancer les vérifications de sécurité
python migrations/cleanup_old_tables.py --dry-run
```

Le script vérifie:
- ✅ Les nouvelles colonnes existent dans `organisations`
- ✅ Les données sont présentes dans `organisations`, `people`, `person_org_links`
- ✅ Les comptages correspondent

### 2. Suppression des Anciennes Tables

Si toutes les vérifications passent:

```bash
# Supprimer définitivement les anciennes tables
python migrations/cleanup_old_tables.py --execute
```

Cela supprime:
- `investors`, `contacts`, `interactions`, `kpis`
- `fournisseurs`, `fournisseur_contacts`, `fournisseur_interactions`, `fournisseur_kpis`
- `organisation_contacts` (remplacé par `person_org_links`)

### 3. Supprimer les Anciens Fichiers Code

```bash
# Backend - Modèles obsolètes
rm crm-backend/models/investor.py
rm crm-backend/models/fournisseur.py

# Backend - Schemas obsolètes
rm crm-backend/schemas/investor.py
rm crm-backend/schemas/fournisseur.py

# Backend - Routes obsolètes (optionnel, garder pour redirect)
# rm crm-backend/api/routes/investors.py
# rm crm-backend/api/routes/fournisseurs.py

# Frontend - Pages obsolètes
# À adapter selon votre choix (voir section suivante)
```

---

## 🎨 Adaptation du Frontend

Deux options possibles:

### Option A: Conserver 2 Pages Séparées (Recommandé)

```
/dashboard/clients        # Organisations type=CLIENT (ex-investors)
/dashboard/fournisseurs   # Organisations type=FOURNISSEUR
```

**Modifications nécessaires:**

```typescript
// crm-frontend/app/dashboard/clients/page.tsx
export default function ClientsPage() {
  const { data: clients } = useOrganisations({ type: 'client' })
  // ...
}

// crm-frontend/app/dashboard/fournisseurs/page.tsx
export default function FournisseursPage() {
  const { data: fournisseurs } = useOrganisations({ type: 'fournisseur' })
  // ...
}
```

### Option B: Page Unique avec Filtres

```
/dashboard/organisations   # Toutes les organisations avec filtre type
```

```typescript
// crm-frontend/app/dashboard/organisations/page.tsx
export default function OrganisationsPage() {
  const [typeFilter, setTypeFilter] = useState<'all' | 'client' | 'fournisseur'>('all')
  const { data: organisations } = useOrganisations({ type: typeFilter })

  return (
    <div>
      <Tabs value={typeFilter} onValueChange={setTypeFilter}>
        <TabsList>
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="client">Clients</TabsTrigger>
          <TabsTrigger value="fournisseur">Fournisseurs</TabsTrigger>
        </TabsList>
      </Tabs>

      <OrganisationsList data={organisations} />
    </div>
  )
}
```

---

## 📊 Routes API à Adapter

### Anciennes Routes (à déprécier)

```python
# api/routes/investors.py
@router.get("/investors")  # ❌ Obsolète

@router.post("/investors")  # ❌ Obsolète
```

### Nouvelles Routes

```python
# api/routes/organisations.py
@router.get("/organisations")
async def list_organisations(
    type: Optional[OrganisationType] = Query(None),
    pipeline_stage: Optional[PipelineStage] = Query(None),
    ...
):
    """
    Liste des organisations avec filtres

    Paramètres:
    - type: 'client', 'fournisseur', 'autre' (optionnel)
    - pipeline_stage: 'prospect_froid', ..., 'client' (optionnel)
    """
    query = db.query(Organisation)

    if type:
        query = query.filter(Organisation.type == type)

    if pipeline_stage:
        query = query.filter(Organisation.pipeline_stage == pipeline_stage)

    return query.all()


@router.post("/organisations")
async def create_organisation(data: OrganisationCreate):
    """
    Créer une organisation (client ou fournisseur)
    """
    org = Organisation(**data.dict())
    db.add(org)
    db.commit()
    return org
```

### Routes de Transition (Optionnel)

Pour ne pas casser les clients existants:

```python
# api/routes/investors.py (garder temporairement)
@router.get("/investors", deprecated=True)
async def list_investors_deprecated():
    """
    ⚠️ DEPRECATED: Utilisez /organisations?type=client
    """
    return await list_organisations(type=OrganisationType.CLIENT)
```

---

## 🔄 Rollback en Cas de Problème

Si la migration échoue ou si vous détectez un problème:

### 1. Restaurer le Backup

```bash
cd crm-backend/backups

# Lister les backups disponibles
ls -lh crm_backup_*.sql.gz

# Restaurer le backup
gunzip -c crm_backup_YYYYMMDD_HHMMSS.sql.gz | \
docker exec -i crm-postgres psql -U crm_user -d crm_db
```

### 2. Redémarrer l'Application

```bash
docker-compose restart api frontend
```

### 3. Vérifier

```bash
curl http://localhost:8000/health
```

---

## 📝 Checklist Complète

### Avant Migration
- [ ] Backup créé et vérifié
- [ ] Comptage des données actuelles noté
- [ ] Application arrêtée (frontend + api)
- [ ] Simulation (dry-run) exécutée et OK

### Pendant Migration
- [ ] Migration exécutée sans erreur
- [ ] Logs vérifiés (pas d'erreur SQL)

### Après Migration
- [ ] Comptage des nouvelles données correspond
- [ ] API redémarrée et health check OK
- [ ] Frontend redémarré et accessible
- [ ] Tests manuels réussis (CRUD organisations, personnes)
- [ ] Pas d'erreur dans les logs

### Nettoyage (Optionnel)
- [ ] Vérifications de sécurité passées
- [ ] Anciennes tables supprimées
- [ ] Anciens fichiers code supprimés
- [ ] Routes API adaptées
- [ ] Frontend adapté

---

## 🆘 Troubleshooting

### Problème: "Column already exists"

```sql
-- Vérifier si les colonnes existent déjà
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'organisations';
```

**Solution:** Ajoutez `IF NOT EXISTS` dans les requêtes ALTER TABLE (déjà fait dans le script)

### Problème: "Duplicate key value"

Si une organisation existe déjà avec le même email:

```python
# Modifier le script pour gérer les doublons
org = db.query(Organisation).filter_by(email=investor.email).first()
if org:
    print(f"⚠️  Organisation avec email {investor.email} existe déjà")
    # Ajouter un suffixe ou updater l'existante
```

### Problème: "Foreign key violation"

Vérifier l'ordre de suppression des tables:

```bash
# Supprimer d'abord les tables enfants
DROP TABLE contacts CASCADE;
# Puis les tables parentes
DROP TABLE investors CASCADE;
```

### Problème: Migration très lente

Pour de gros volumes de données:

```python
# Désactiver temporairement les contraintes
db.execute(text("SET session_replication_role = 'replica';"))
# ... migration ...
db.execute(text("SET session_replication_role = 'origin';"))
```

---

## 📞 Support

En cas de problème:

1. **Vérifier les logs:**
   ```bash
   docker-compose logs -f api
   ```

2. **État de la base:**
   ```bash
   docker exec -it crm-postgres psql -U crm_user -d crm_db -c "\dt"
   ```

3. **Rollback si nécessaire** (voir section Rollback)

---

## 🎯 Prochaines Étapes Après Migration

Une fois la migration terminée avec succès:

1. **Unifier les Interactions et KPIs** (prochaine phase)
   - Migrer `Interaction` + `FournisseurInteraction` → `OrganisationInteraction`
   - Migrer `KPI` + `FournisseurKPI` → Table unifiée

2. **Améliorer l'API**
   - Ajouter endpoints de recherche avancée
   - Ajouter filtres et pagination performants

3. **Optimiser les Performances**
   - Ajouter cache Redis
   - Optimiser les requêtes N+1

4. **Ajouter Tests**
   - Tests unitaires pour les nouveaux modèles
   - Tests d'intégration pour l'API

---

**✅ Félicitations!** Votre architecture CRM est maintenant unifiée et beaucoup plus simple à maintenir! 🎉
