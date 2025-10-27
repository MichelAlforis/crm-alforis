# 🚀 Initialisation Base de Données CRM Alforis

## 📋 Vue d'ensemble

Guide pour initialiser une **base de données complète** avec toutes les fonctionnalités du CRM.

**Durée:** 3-5 minutes
**Prérequis:** Docker + Docker Compose OU PostgreSQL 15+ installé

---

## 🎯 Ce qui sera créé

✅ **Architecture unifiée** (Organisation + Person)
✅ **Module Marketing** (Campagnes email, templates, listes)
✅ **Workflows automatisés** (Templates prêts à l'emploi)
✅ **Interactions & Timeline** (Historique complet)
✅ **Users & Permissions RBAC** (Rôles et permissions)
✅ **Webhooks & Events** (Intégrations externes)
✅ **Agent IA** (Configuration et historique)
✅ **Données de test** (Organisations, contacts, campagnes)

---

## ⚡ Initialisation rapide

### Option 1: Docker (Recommandé)

```bash
# 1. Démarrer PostgreSQL via Docker
cd crm-backend
docker-compose up -d postgres

# 2. Attendre que PostgreSQL soit prêt (10-15 secondes)
docker-compose logs -f postgres
# Attendre le message "database system is ready to accept connections"

# 3. Exécuter les migrations Alembic
docker-compose exec api alembic upgrade head

# 4. (Optionnel) Ajouter des données de test
docker-compose exec api python scripts/seed_data.py
```

**Résultat:**
- ✅ 25+ tables créées
- ✅ 40+ index de performance
- ✅ Contraintes et relations
- ✅ Extensions PostgreSQL (uuid-ossp, pg_trgm)
- ✅ Fonctions et triggers
- ✅ Données de test (optionnel)

### Option 2: Alembic (Migration contrôlée)

```bash
cd crm-backend

# Vérifier les migrations disponibles
alembic current
alembic history

# Appliquer toutes les migrations
alembic upgrade head

# Revenir à une version spécifique (si besoin)
alembic downgrade -1
```

### Option 3: PostgreSQL direct

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base
CREATE DATABASE crm_alforis OWNER postgres;

# Appliquer le schéma (si disponible)
\i crm-backend/alembic/versions/001_initial_schema.sql
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

### Tables principales (25+)

**🏢 CRM Core**
```
organisations              -- Entités (clients, fournisseurs, distributeurs)
  ├── type, category, pipeline_stage
  ├── contact: email, phone, website
  ├── financial: aum, strategies
  └── metadata (JSONB)

people                     -- Personnes physiques (contacts)
  ├── first_name, last_name
  ├── personal_email, phone, mobile
  ├── title, linkedin_url
  └── subscribed_to_marketing (RGPD)

person_organization_links  -- Relation N-N (Person ↔ Organisation)
  ├── role, is_primary
  ├── professional_email
  └── notes

interactions               -- 📝 Historique complet (timeline)
  ├── type: email | phone | meeting | note | linkedin
  ├── subject, content
  ├── related: organisation_id, person_id
  └── metadata (JSONB)

tasks                      -- ✅ Tâches et TODO
  ├── status: TODO | DOING | DONE | CANCELLED
  ├── priority: LOW | NORMAL | HIGH | URGENT
  ├── assigned_to, due_date
  └── related: organisation_id, person_id

mandats                    -- 📋 Mandats de distribution
  ├── organisation_id, produit_id
  ├── date_debut, date_fin
  ├── commission_percentage
  └── is_active

produits                   -- 💼 Produits financiers
  ├── name, isin, type
  ├── aum, strategies
  └── metadata (JSONB)
```

**📧 Email Marketing**
```
email_templates            -- Templates d'emails
  ├── name, subject, html_content
  ├── variables (JSONB)
  └── is_active

email_campaigns            -- Campagnes email
  ├── name, status: draft | scheduled | sending | completed
  ├── default_template_id, mailing_list_id
  ├── from_name, from_email
  └── scheduled_at

email_sends                -- Envois individuels
  ├── campaign_id, recipient_email
  ├── status: pending | sent | delivered | bounced | failed
  ├── batch_id (groupement)
  └── sent_at, delivered_at

email_send_batches         -- Lots d'envoi
  ├── campaign_id
  ├── total_count, sent_count
  └── status

mailing_lists              -- Listes de diffusion
  ├── name, description
  ├── subscriber_count
  └── is_active

mailing_list_subscribers   -- Abonnés aux listes
  ├── mailing_list_id
  ├── organisation_id OR person_id
  └── subscribed_at
```

**🤖 Automatisation**
```
workflows                  -- Workflows automatisés
  ├── name, trigger_type
  ├── conditions, actions (JSONB)
  ├── is_active, is_template
  └── execution_count

workflow_executions        -- Historique exécutions
  ├── workflow_id, status
  ├── trigger_data, results (JSONB)
  └── executed_at

webhooks                   -- Webhooks sortants
  ├── url, events[], secret
  ├── is_active
  └── last_triggered_at

event_logs                 -- 📊 Logs d'événements
  ├── event_type, entity_type, entity_id
  ├── user_id, data (JSONB)
  └── created_at
```

**👥 Users & Permissions**
```
users                      -- Utilisateurs CRM
  ├── email, username, password_hash
  ├── first_name, last_name
  ├── role, is_active, is_admin
  └── last_login_at

roles                      -- Rôles RBAC (custom future)
permissions                -- Permissions granulaires
```

**🤖 Agent IA**
```
ai_conversations           -- Historique conversations IA
  ├── user_id, session_id
  ├── messages (JSONB array)
  └── created_at

ai_suggestions             -- Suggestions IA
  ├── type, entity_type, entity_id
  ├── suggestion_text
  └── applied_at
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
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Résultat attendu: 25+ tables

-- Lister toutes les tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Vérifier les tables critiques
SELECT
  (SELECT COUNT(*) FROM organisations) as orgs,
  (SELECT COUNT(*) FROM people) as people,
  (SELECT COUNT(*) FROM interactions) as interactions,
  (SELECT COUNT(*) FROM email_campaigns) as campaigns,
  (SELECT COUNT(*) FROM workflows) as workflows,
  (SELECT COUNT(*) FROM users) as users;
```

### 2. Vérifier les index

```sql
-- Lister tous les index créés
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Résultat attendu: 40+ index
```

### 3. Tester les extensions PostgreSQL

```sql
-- Vérifier les extensions installées
SELECT * FROM pg_extension;
-- Attendu: uuid-ossp, pg_trgm (pour recherche full-text)

-- Tester la recherche trigram
SELECT similarity('Alforis', 'alforis');
-- Résultat: 1.0 (identique)
```

### 4. Vérifier les contraintes

```sql
-- Lister les foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

---

## 🔧 Commandes utiles

### Connexion PostgreSQL

```bash
# Via Docker Compose
docker-compose exec postgres psql -U postgres -d crm_alforis

# Via Docker direct
docker exec -it crm-postgres psql -U postgres -d crm_alforis

# Local
psql -U postgres -d crm_alforis
```

### Migrations Alembic

```bash
# Voir l'historique des migrations
docker-compose exec api alembic history

# Voir la version actuelle
docker-compose exec api alembic current

# Créer une nouvelle migration
docker-compose exec api alembic revision --autogenerate -m "Description"

# Appliquer toutes les migrations
docker-compose exec api alembic upgrade head

# Revenir à une version
docker-compose exec api alembic downgrade -1
```

### Reset complet (⚠️ SUPPRIME TOUT)

```bash
# Option 1: Via Docker Compose
docker-compose down -v  # Supprime les volumes
docker-compose up -d postgres
docker-compose exec api alembic upgrade head

# Option 2: Via PostgreSQL
psql -U postgres -c "DROP DATABASE IF EXISTS crm_alforis;"
psql -U postgres -c "CREATE DATABASE crm_alforis;"
docker-compose exec api alembic upgrade head
```

### Backup & Restore

```bash
# Créer un backup
docker-compose exec postgres pg_dump -U postgres crm_alforis > backup_$(date +%Y%m%d_%H%M%S).sql

# Ou via pg_dump local
pg_dump -h localhost -p 5432 -U postgres crm_alforis > backup.sql

# Restaurer un backup
docker-compose exec -T postgres psql -U postgres -d crm_alforis < backup.sql

# Backup avec compression
docker-compose exec postgres pg_dump -U postgres -Fc crm_alforis > backup.dump
docker-compose exec -T postgres pg_restore -U postgres -d crm_alforis < backup.dump
```

---

## 📚 Prochaines étapes

Une fois la base initialisée:

1. **Démarrer tous les services**
   ```bash
   cd crm-backend
   docker-compose up -d

   # Vérifier que tout est démarré
   docker-compose ps
   ```

2. **Vérifier la santé de l'API**
   ```bash
   curl http://localhost:8000/health
   # Réponse: {"status": "healthy", "database": "connected", ...}
   ```

3. **Tester l'authentification**
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "admin123"}'
   ```

4. **Explorer l'API Documentation**
   - **Swagger UI**: http://localhost:8000/docs (interactif)
   - **ReDoc**: http://localhost:8000/redoc (référence)
   - **OpenAPI JSON**: http://localhost:8000/openapi.json

5. **Démarrer le Frontend**
   ```bash
   cd crm-frontend
   npm install
   npm run dev
   ```
   - Frontend: http://localhost:3000

6. **Tester les fonctionnalités**
   ```bash
   # Lister les organisations
   curl http://localhost:8000/api/v1/organisations

   # Statistiques dashboard
   curl http://localhost:8000/api/v1/dashboards/stats/global

   # Lister les workflows
   curl http://localhost:8000/api/v1/workflows
   ```

---

## 🐛 Troubleshooting

### Erreur: "database crm_alforis does not exist"

```bash
# Créer la base via Docker
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE crm_alforis OWNER postgres;"

# Ou via PostgreSQL local
psql -U postgres -c "CREATE DATABASE crm_alforis OWNER postgres;"
```

### Erreur: "connection refused" (PostgreSQL)

```bash
# Vérifier que PostgreSQL tourne
docker-compose ps postgres

# Redémarrer PostgreSQL
docker-compose restart postgres

# Voir les logs
docker-compose logs postgres
```

### Erreur: "relation already exists" (Alembic)

```bash
# Vérifier l'état des migrations
docker-compose exec api alembic current

# Si besoin, marquer toutes les migrations comme appliquées
docker-compose exec api alembic stamp head

# Ou reset complet (voir section ci-dessus)
```

### Erreur: "No module named 'alembic'"

```bash
# Installer les dépendances Python
cd crm-backend
pip install -r requirements.txt

# Ou via Docker
docker-compose build api
```

### Performance lente

```bash
# Vérifier les index
SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';

# Analyser les tables
ANALYZE organisations;
ANALYZE people;
ANALYZE interactions;

# Vacuum
VACUUM ANALYZE;
```

### Problème d'encoding

```bash
# Vérifier l'encoding de la base
SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = 'crm_alforis';
# Attendu: UTF8

# Si besoin de recréer avec bon encoding
DROP DATABASE IF EXISTS crm_alforis;
CREATE DATABASE crm_alforis
  WITH ENCODING 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE = 'en_US.UTF-8'
  TEMPLATE template0;
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

## 📊 Diagramme de Relations (ERD)

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│organisations│◄─────►│person_org_   │◄─────►│   people    │
│             │       │   links      │       │             │
└──────┬──────┘       └──────────────┘       └──────┬──────┘
       │                                            │
       │ 1:N                                    1:N │
       ▼                                            ▼
┌─────────────┐                              ┌─────────────┐
│interactions │                              │interactions │
└─────────────┘                              └─────────────┘
       │                                            │
       │ N:1                                    N:1 │
       ▼                                            ▼
┌─────────────┐                              ┌─────────────┐
│    tasks    │                              │    tasks    │
└─────────────┘                              └─────────────┘

┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│email_       │       │email_send_   │       │email_sends  │
│campaigns    │──────►│batches       │──────►│             │
└─────────────┘  1:N  └──────────────┘  1:N  └─────────────┘
       │
       │ N:1
       ▼
┌─────────────┐       ┌──────────────┐
│email_       │       │mailing_list_ │
│templates    │       │subscribers   │
└─────────────┘       └──────────────┘
                             │ N:1
                             ▼
                      ┌─────────────┐
                      │mailing_lists│
                      └─────────────┘
```

---

## 📚 Documentation Connexe

- [API_ENDPOINTS.md](API_ENDPOINTS.md) - Liste complète des 100+ endpoints
- [WORKFLOWS.md](WORKFLOWS.md) - Guide workflows automatisés
- [IMPORTS.md](IMPORTS.md) - Imports massifs de données
- [EXPORTS.md](EXPORTS.md) - Exports multi-formats
- [RECHERCHE.md](RECHERCHE.md) - Recherche full-text PostgreSQL

---

**Base de données initialisée et prête pour la production! 🚀**

**Dernière mise à jour:** 23 Octobre 2025
