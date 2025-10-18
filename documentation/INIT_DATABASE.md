# 🚀 Initialisation Base de Données CRM Alforis

## 📋 Vue d'ensemble

Guide pour initialiser une **base vierge** avec l'architecture unifiée complète.

**Durée:** 2 minutes
**Prérequis:** PostgreSQL installé et accessible

---

## 🎯 Ce qui sera créé

✅ **Architecture unifiée** (Organisation + Person - pas de legacy Investor/Fournisseur)
✅ **Workflows automatisés** (3 templates prêts à l'emploi)
✅ **Users & Permissions RBAC** (2 users de test)
✅ **Tables support** (tasks, notifications, webhooks)
✅ **Vues & fonctions utiles** (recherche full-text, stats, etc.)
✅ **Données de test** (4 organisations, 3 personnes, 3 workflows templates)

---

## ⚡ Initialisation rapide

### Option 1: Script unique (recommandé)

```bash
cd crm-backend

# Initialiser tout en une commande
psql -U postgres -d crm_alforis < migrations/init_complete_db.sql
```

**Résultat:**
- ✅ 15+ tables créées
- ✅ 20+ index de performance
- ✅ 3 workflows templates
- ✅ 2 users de test (admin + user)
- ✅ 4 rôles RBAC
- ✅ Données de test insérées

### Option 2: Étape par étape

```bash
cd crm-backend/migrations

# 1. Structure unifiée (Organisation + Person)
psql -U postgres -d crm_alforis < init_unified_schema.sql

# 2. Workflows automatisés
psql -U postgres -d crm_alforis < create_workflows_tables.sql

# 3. Users & permissions (manuel - voir init_complete_db.sql)
```

---

## 🔑 Comptes de test créés

### Admin
```
Email: admin@alforis.com
Password: admin123
Rôle: Administrateur (accès complet)
```

### User
```
Email: user@alforis.com
Password: user123
Rôle: Commercial
```

---

## 📊 Structure créée

### Tables principales

```
organisations              -- 🏢 Entités (clients, fournisseurs, distributeurs)
  ├── type                 -- client | fournisseur | distributeur | emetteur
  ├── pipeline_stage       -- prospect | qualification | proposition | signé
  ├── email, téléphone     -- Contact
  ├── aum, strategies      -- Financier (fournisseurs)
  └── montant_potentiel    -- Commercial (clients)

people                     -- 👤 Personnes physiques (contacts)
  ├── prenom, nom, email
  ├── telephone, mobile
  └── fonction, linkedin

person_organization_links  -- 🔗 Lien N-N (Person ↔ Organisation)
  ├── role                 -- contact_principal | decideur | technique
  └── is_primary           -- Contact principal?

organisation_activities    -- 📝 Timeline d'activités
  ├── type                 -- note | appel | email | reunion | changement_stage
  ├── title, description
  └── metadata (JSONB)

tasks                      -- ✅ Tâches
  ├── status               -- todo | in_progress | done | cancelled
  ├── priority             -- low | normal | high | urgent
  ├── assigned_to          -- user_id
  └── due_date             -- Échéance

workflows                  -- 🤖 Workflows automatisés
  ├── trigger_type         -- organisation_created, inactivity_delay, etc.
  ├── conditions (JSONB)   -- Règles à vérifier
  ├── actions (JSONB)      -- Actions à exécuter
  └── is_template          -- Template prêt à l'emploi?

workflow_executions        -- 📊 Historique exécutions
  ├── status               -- pending | running | success | failed | skipped
  ├── execution_logs       -- Logs détaillés
  └── actions_executed     -- Résultats

users                      -- 👥 Utilisateurs CRM
  ├── email, password_hash
  ├── is_admin
  └── is_active

roles                      -- 🔐 Rôles RBAC
  └── name                 -- admin | manager | commercial | viewer

permissions                -- 🔑 Permissions RBAC
  ├── resource             -- organisations, workflows, tasks
  ├── action               -- create, read, update, delete, execute
  └── role_id

notifications              -- 🔔 Notifications temps réel
webhooks                   -- 🔗 Webhooks sortants
```

---

## 🎨 Données de test insérées

### Organisations (4)

**Clients (type=client):**
1. ACME Investments (pipeline: qualification, montant: 500k€)
2. Beta Capital (pipeline: prospect, montant: 250k€)

**Fournisseurs (type=fournisseur):**
3. Alforis Asset Management (AUM: 1.5B€, stratégies: Actions, Obligations)
4. GlobalFund Managers (AUM: 850M€, stratégies: Alternative, Private Equity)

### Personnes (3)

1. Jean Dupont (ACME Investments - Directeur Investissements)
2. Marie Martin (Beta Capital - Analyste Senior)
3. Pierre Bernard (Alforis AM - Portfolio Manager)

### Workflows templates (3)

1. **Relance automatique deal inactif**
   - Trigger: Inactivité > 30 jours
   - Actions: Email + Tâche + Notification

2. **Onboarding nouveau client**
   - Trigger: Deal SIGNÉ
   - Actions: Email bienvenue + 2 tâches + Notification

3. **Alerte manager deal > 50k€**
   - Trigger: Organisation créée
   - Condition: montant > 50000€
   - Actions: Email manager + Notification

---

## ✅ Vérifications post-initialisation

### 1. Vérifier les tables

```sql
-- Compter les tables créées
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public';
-- Résultat attendu: 15+ tables

-- Vérifier les données de test
SELECT COUNT(*) FROM organisations;  -- 4 organisations
SELECT COUNT(*) FROM people;         -- 3 personnes
SELECT COUNT(*) FROM workflows WHERE is_template = true;  -- 3 workflows templates
SELECT COUNT(*) FROM users;          -- 2 users
```

### 2. Tester la recherche full-text

```sql
SELECT * FROM search_organisations('ACME');
SELECT * FROM search_organisations('invest');
```

### 3. Vérifier les vues

```sql
-- Organisations avec contacts
SELECT * FROM v_organisations_with_contacts LIMIT 5;

-- Statistiques workflows
SELECT * FROM v_workflow_stats;
```

---

## 🔧 Commandes utiles

### Connexion PostgreSQL

```bash
# Docker
docker exec -it crm-postgres psql -U postgres -d crm_alforis

# Local
psql -U postgres -d crm_alforis
```

### Reset complet (⚠️ SUPPRIME TOUT)

```bash
# Supprimer et recréer la base
psql -U postgres -c "DROP DATABASE IF EXISTS crm_alforis;"
psql -U postgres -c "CREATE DATABASE crm_alforis;"

# Ré-initialiser
psql -U postgres -d crm_alforis < migrations/init_complete_db.sql
```

### Backup

```bash
# Créer un backup
pg_dump -U postgres crm_alforis > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurer un backup
psql -U postgres -d crm_alforis < backup_20251018_143000.sql
```

---

## 📚 Prochaines étapes

Une fois la base initialisée:

1. **Démarrer l'API**
   ```bash
   cd crm-backend
   uvicorn main:app --reload
   ```

2. **Tester l'authentification**
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@alforis.com", "password": "admin123"}'
   ```

3. **Explorer l'API**
   - Swagger: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

4. **Tester les workflows**
   ```bash
   # Lister les templates
   curl http://localhost:8000/api/v1/workflows/templates/list

   # Créer workflow depuis template
   curl -X POST http://localhost:8000/api/v1/workflows/templates/relance-deal-inactif/create
   ```

---

## 🐛 Troubleshooting

### Erreur: "role crm_user does not exist"

```bash
# Créer le rôle
psql -U postgres -c "CREATE USER crm_user WITH PASSWORD 'crm_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE crm_alforis TO crm_user;"
```

### Erreur: "database crm_alforis does not exist"

```bash
# Créer la base
psql -U postgres -c "CREATE DATABASE crm_alforis OWNER postgres;"
```

### Erreur: "relation already exists"

```bash
# Normal si vous relancez le script plusieurs fois
# Les commandes "IF NOT EXISTS" et "ON CONFLICT DO NOTHING" évitent les doublons
# Pour un reset complet, voir section "Reset complet" ci-dessus
```

---

## 🎯 Architecture décisionnelle

### Pourquoi Organisation au lieu de Investor + Fournisseur?

**Problème initial:**
- 2 tables séparées (investors, fournisseurs)
- Code dupliqué (routes, hooks, composants)
- Impossible de changer le type d'une entité
- Complexité accrue

**Solution unifiée:**
- 1 seule table `organisations` avec champ `type`
- Code 50% plus simple
- Flexibilité totale (une org peut avoir plusieurs rôles)
- Scalable pour nouveaux types (distributeur, emetteur)

### Pourquoi Person au lieu de Contact?

**Problème initial:**
- 1 contact = 1 organisation uniquement
- Duplication si une personne travaille dans 2 organisations

**Solution Person + Links:**
- 1 personne = N organisations (relation N-N)
- Pas de duplication
- Historique complet par personne

---

**Base initialisée et prête à l'emploi! 🚀**
