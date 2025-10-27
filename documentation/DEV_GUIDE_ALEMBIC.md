# 🔧 Guide Alembic — CRM Alforis

> **Alembic n'est pas juste un outil de migration, c'est le "contrat" entre ton code et ta base.**

Ce guide détaille les bonnes pratiques pour gérer les migrations de base de données dans le projet CRM Alforis.

---

## 📋 Table des matières

1. [Configuration actuelle](#configuration-actuelle)
2. [Philosophie](#philosophie)
3. [Commandes essentielles](#commandes-essentielles)
4. [Workflow standard](#workflow-standard)
5. [Bonnes pratiques techniques](#bonnes-pratiques-techniques)
6. [Checklist avant merge](#checklist-avant-merge)
7. [Troubleshooting](#troubleshooting)
8. [Exemples concrets](#exemples-concrets)

---

## 🏗️ Configuration actuelle

### Fichiers principaux

```
crm-backend/
├── alembic.ini              # Configuration principale
├── alembic/
│   ├── env.py               # Import auto des modèles
│   ├── script.py.mako       # Template migrations
│   └── versions/            # Historique migrations
│       ├── add_email_campaigns.py
│       ├── add_interactions_v1.py
│       └── ...
```

### Version actuelle

```bash
docker-compose exec api alembic current
# email_marketing_lite (head)
```

### Configuration clé

- ✅ Autogenerate activé (`compare_type`, `compare_server_default`)
- ✅ Import automatique de tous les modèles via `models/__init__.py`
- ✅ `DATABASE_URL` injecté depuis l'environnement
- ✅ Format de fichier: `YYYYMMDD_HHMM_revid_slug`

---

## 🧭 Philosophie

### Règle d'or

> Chaque révision doit refléter un changement **métier** ou **structurel clair**.

✅ **Bon exemple de nommage** :
- `add_lead_scores_table` → scoring marketing
- `add_status_to_interactions` → workflow inbox
- `add_embeddings_to_emails` → recherche sémantique IA

❌ **Mauvais exemple** :
- `update_db`
- `fix_stuff`
- `migration_v2`

### Principe de traçabilité

Ta base de données doit **raconter l'histoire** de ton produit :

```
migrations/
├── 20241021_add_interactions_v1.py        # Chapitre 7: Interactions de base
├── 20241022_add_interactions_v2_fields.py # Chapitre 7: Workflow inbox
├── 20241023_add_email_campaigns.py        # Email marketing
├── 20241025_add_lead_scores.py            # (futur) Lead scoring
└── 20241026_add_email_embeddings.py       # (futur) IA sémantique
```

---

## ⚙️ Commandes essentielles

### Vérifier l'état actuel

```bash
# Version actuelle en base
docker-compose exec api alembic current

# Dernière migration disponible
docker-compose exec api alembic heads

# Historique complet
docker-compose exec api alembic history --verbose
```

### Créer une migration

```bash
# Autogenerate (détecte les changements automatiquement)
docker-compose exec api alembic revision --autogenerate -m "add_lead_scores_table"

# Migration manuelle (pour data corrections)
docker-compose exec api alembic revision -m "fix_interaction_statuses"
```

### Appliquer les migrations

```bash
# Appliquer toutes les migrations en attente
docker-compose exec api alembic upgrade head

# Appliquer une migration spécifique
docker-compose exec api alembic upgrade +1

# Voir le SQL sans exécuter (dry-run)
docker-compose exec api alembic upgrade head --sql
```

### Revenir en arrière

```bash
# Revenir d'une migration
docker-compose exec api alembic downgrade -1

# Revenir à une version spécifique
docker-compose exec api alembic downgrade <revision_id>

# DANGER: Tout réinitialiser (dev uniquement!)
docker-compose exec api alembic downgrade base
```

### Synchroniser une base existante

```bash
# Marquer la base comme à jour sans exécuter les migrations
docker-compose exec api alembic stamp head
```

---

## 🔄 Workflow standard

### 1. Modifier un modèle SQLAlchemy

```python
# models/interaction.py
class Interaction(BaseModel):
    # ... champs existants ...

    # ✨ Nouveau champ
    ai_summary = Column(Text, nullable=True, comment="Résumé IA de l'interaction")
```

### 2. S'assurer que le modèle est importé

```python
# models/__init__.py
from models.interaction import Interaction  # ✅ Doit être présent
```

### 3. Créer la migration

```bash
docker-compose exec api alembic revision --autogenerate -m "add_ai_summary_to_interactions"
```

### 4. Vérifier le fichier généré

```bash
# Ouvrir le fichier dans crm-backend/alembic/versions/
# YYYYMMDD_HHMM_<rev>_add_ai_summary_to_interactions.py
```

**Checklist de relecture :**
- [ ] Le `upgrade()` ajoute bien la colonne
- [ ] Le `downgrade()` la supprime correctement
- [ ] Pas de changements parasites (index recréés inutilement)
- [ ] Les `nullable`, `default`, `server_default` sont corrects
- [ ] Pas d'imports externes (seulement `op` et `sa`)

### 5. Tester localement

```bash
# Appliquer
docker-compose exec api alembic upgrade head

# Vérifier que ça marche
docker-compose exec postgres psql -U crm_user -d crm_db -c "\d interactions"

# Rollback pour tester le downgrade
docker-compose exec api alembic downgrade -1

# Remettre
docker-compose exec api alembic upgrade head
```

### 6. Commit + Push

```bash
git add crm-backend/alembic/versions/YYYYMMDD_*_add_ai_summary_to_interactions.py
git commit -m "✨ Migration: Add AI summary field to interactions"
git push
```

---

## ✅ Bonnes pratiques techniques

### 1. Toujours relire l'autogenerate

Même si `--autogenerate` est magique, il peut se tromper :

**Exemples de pièges :**
- Changements de `server_default` détectés à tort
- Index recréés inutilement
- Types Postgres non reconnus

**Solution :** Toujours ouvrir le fichier et vérifier manuellement.

### 2. Ne jamais éditer une migration déployée

> Une fois en production = **IMMUABLE**

Si tu dois corriger :
- Crée une **nouvelle migration de correction**
- Documente le pourquoi dans le message de commit

**Exemple :**
```python
# ❌ NE PAS FAIRE : éditer add_status_to_interactions.py déjà en prod

# ✅ FAIRE : créer fix_status_default_value.py
def upgrade():
    op.execute("UPDATE interactions SET status='pending' WHERE status IS NULL")
    op.alter_column('interactions', 'status', nullable=False)
```

### 3. Séparer structure et données

**Structure (autogenerate) :**
```python
def upgrade():
    op.add_column('interactions', sa.Column('status', sa.String(50)))
```

**Données (migration manuelle) :**
```python
def upgrade():
    op.execute("UPDATE interactions SET status='done' WHERE completed_at IS NOT NULL")
```

### 4. Gérer les ENUMs proprement

Pour ajouter une valeur à un ENUM existant :

```python
def upgrade():
    # PostgreSQL nécessite une syntaxe spéciale
    op.execute("ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'linkedin_message'")

def downgrade():
    # ATTENTION: Impossible de supprimer une valeur ENUM en PostgreSQL
    # Il faut recréer le type entier
    pass
```

### 5. Indexes et contraintes

```python
# ✅ Créer un index
def upgrade():
    op.create_index(
        'idx_interactions_org_created',
        'interactions',
        ['organisation_id', 'created_at']
    )

# ✅ Ajouter une contrainte unique
def upgrade():
    op.create_unique_constraint(
        'uq_email_campaign_name',
        'email_campaigns',
        ['name']
    )

# ✅ Ajouter une foreign key
def upgrade():
    op.create_foreign_key(
        'fk_interaction_assignee',
        'interactions', 'users',
        ['assignee_id'], ['id'],
        ondelete='SET NULL'
    )
```

### 6. Données sensibles

**JAMAIS** de données sensibles dans les migrations :

```python
# ❌ DANGER
def upgrade():
    op.execute("INSERT INTO users (email, password) VALUES ('admin@alforis.com', 'password123')")

# ✅ CORRECT
def upgrade():
    # Créer l'utilisateur via un script séparé ou interface admin
    pass
```

---

## 📝 Checklist avant merge

Avant de merger une branche avec migrations :

### ☑️ Checklist technique

- [ ] Migration créée avec `--autogenerate` et relue manuellement
- [ ] Nom de migration clair et descriptif
- [ ] `upgrade()` et `downgrade()` fonctionnent (testés localement)
- [ ] Pas d'imports externes (seulement `op`, `sa`)
- [ ] Pas de données sensibles hardcodées
- [ ] Modèle importé dans `models/__init__.py`
- [ ] Migration testée en local : `downgrade -1` puis `upgrade head`

### ☑️ Checklist documentation

- [ ] Commentaire dans le fichier expliquant le "pourquoi"
- [ ] Message de commit suit le format : `✨ Migration: Description`
- [ ] Si changement majeur : ajout dans `CHANGELOG_DB.md`

### ☑️ Checklist déploiement

- [ ] Backup de la base planifié avant déploiement
- [ ] Migration testée sur une copie de prod (staging)
- [ ] Downtime nécessaire ? → Communication équipe
- [ ] Script de rollback préparé si problème

---

## 🔥 Troubleshooting

### Erreur : "Target database is not up to date"

**Cause :** Tu essaies de créer une migration alors que la base n'est pas à jour.

**Solution :**
```bash
docker-compose exec api alembic upgrade head
# Puis réessayer
docker-compose exec api alembic revision --autogenerate -m "..."
```

### Erreur : "relation already exists"

**Cause :** La table existe déjà en base mais Alembic ne le sait pas.

**Solution :**
```bash
# Marquer la base comme à jour
docker-compose exec api alembic stamp head
```

### Migration ne détecte pas mes changements

**Causes possibles :**
1. Modèle non importé dans `models/__init__.py`
2. Base pas à jour (`alembic upgrade head` d'abord)
3. Changement non supporté par autogenerate (ex: renommage de colonne)

**Solutions :**
```bash
# 1. Vérifier l'import
cat crm-backend/models/__init__.py | grep "MyModel"

# 2. Mettre à jour la base
docker-compose exec api alembic upgrade head

# 3. Migration manuelle pour renommages
docker-compose exec api alembic revision -m "rename_column"
# Puis éditer le fichier :
def upgrade():
    op.alter_column('table', 'old_name', new_column_name='new_name')
```

### Base de données corrompue

**Si Alembic est complètement désynchronisé :**

```bash
# 1. Sauvegarder les données
docker-compose exec postgres pg_dump crm_db > backup.sql

# 2. Réinitialiser alembic_version
docker-compose exec postgres psql -U crm_user -d crm_db -c "DROP TABLE alembic_version;"

# 3. Stamper à la version actuelle
docker-compose exec api alembic stamp head

# 4. Vérifier
docker-compose exec api alembic current
```

---

## 🎯 Exemples concrets Alforis

### Exemple 1 : Ajouter un champ simple

**Besoin :** Ajouter un champ `ai_summary` aux interactions

```bash
# 1. Modifier le modèle
# models/interaction.py
ai_summary = Column(Text, nullable=True)

# 2. Créer la migration
docker-compose exec api alembic revision --autogenerate -m "add_ai_summary_to_interactions"

# 3. Vérifier le fichier généré
# ✅ Doit contenir :
def upgrade():
    op.add_column('interactions', sa.Column('ai_summary', sa.Text(), nullable=True))

def downgrade():
    op.drop_column('interactions', 'ai_summary')

# 4. Appliquer
docker-compose exec api alembic upgrade head
```

### Exemple 2 : Créer une nouvelle table

**Besoin :** Table `lead_scores` pour le scoring marketing

```bash
# 1. Créer le modèle
# models/lead_score.py
class LeadScore(BaseModel):
    __tablename__ = 'lead_scores'

    person_id = Column(Integer, ForeignKey('people.id'), nullable=False)
    score = Column(Integer, nullable=False, default=0)
    last_activity_at = Column(DateTime(timezone=True))

# 2. Importer dans models/__init__.py
from models.lead_score import LeadScore

# 3. Créer la migration
docker-compose exec api alembic revision --autogenerate -m "add_lead_scores_table"

# 4. Vérifier que create_table() est présent
# 5. Appliquer
docker-compose exec api alembic upgrade head
```

### Exemple 3 : Migration de données

**Besoin :** Migrer les anciennes interactions sans statut vers "pending"

```bash
# 1. Créer une migration manuelle
docker-compose exec api alembic revision -m "fix_interaction_statuses"

# 2. Éditer le fichier :
def upgrade():
    # Mise à jour des données
    op.execute("""
        UPDATE interactions
        SET status = 'pending'
        WHERE status IS NULL
    """)

    # Puis rendre la colonne NOT NULL
    op.alter_column('interactions', 'status', nullable=False)

def downgrade():
    op.alter_column('interactions', 'status', nullable=True)

# 3. Appliquer
docker-compose exec api alembic upgrade head
```

### Exemple 4 : Ajouter une valeur ENUM

**Besoin :** Ajouter `'linkedin_message'` à `InteractionType`

```bash
# 1. Modifier l'enum Python
# models/interaction.py
class InteractionType(str, enum.Enum):
    # ... existants ...
    LINKEDIN_MESSAGE = "linkedin_message"

# 2. Créer migration manuelle (autogenerate ne gère pas les ENUMs)
docker-compose exec api alembic revision -m "add_linkedin_to_interaction_type"

# 3. Éditer :
def upgrade():
    op.execute("ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'linkedin_message'")

def downgrade():
    # Impossible de supprimer une valeur ENUM en PostgreSQL
    # Il faudrait recréer le type entier
    pass

# 4. Appliquer
docker-compose exec api alembic upgrade head
```

### Exemple 5 : Renommer une colonne

**Besoin :** Renommer `body` en `description` pour cohérence

```bash
# 1. Créer migration manuelle
docker-compose exec api alembic revision -m "rename_body_to_description"

# 2. Éditer :
def upgrade():
    op.alter_column('interactions', 'body', new_column_name='description')

def downgrade():
    op.alter_column('interactions', 'description', new_column_name='body')

# 3. Appliquer
docker-compose exec api alembic upgrade head
```

---

## 🚀 Intégration CI/CD

### Automatiser dans Docker

Ajouter à `crm-backend/entrypoint.sh` :

```bash
#!/bin/bash
echo "🔄 Running Alembic migrations..."
alembic upgrade head || echo "⚠️ No migration to apply"

echo "🚀 Starting FastAPI..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
```

### Pre-deploy backup

Ajouter au script de déploiement :

```bash
#!/bin/bash
# scripts/deploy.sh

# Backup avant migration
echo "📦 Backup database..."
docker-compose exec postgres pg_dump crm_db > backups/pre_migration_$(date +%F_%H-%M).sql

# Migration
echo "🔄 Running migrations..."
docker-compose exec api alembic upgrade head

# Restart
echo "♻️ Restarting services..."
docker-compose restart api
```

---

## 📊 Maintenance

### Tous les 6 mois : Audit des migrations

```bash
# Compter les migrations
ls -1 crm-backend/alembic/versions/ | wc -l

# Si > 50 migrations : considérer un "squash"
# (fusionner les anciennes migrations en une seule)
```

### Nettoyer les migrations de test

```bash
# Supprimer les migrations de test non déployées
rm crm-backend/alembic/versions/*test*.py

# Recréer l'historique propre
docker-compose exec api alembic stamp head
```

---

## 📚 Ressources

- [Documentation officielle Alembic](https://alembic.sqlalchemy.org/)
- [SQLAlchemy Types](https://docs.sqlalchemy.org/en/20/core/types.html)
- [PostgreSQL ALTER TYPE](https://www.postgresql.org/docs/current/sql-altertype.html)

---

## 🎓 Résumé des règles d'or

1. ✅ **Une migration = un changement métier clair**
2. ✅ **Toujours relire l'autogenerate**
3. ✅ **Tester downgrade/upgrade en local avant merge**
4. ✅ **Ne jamais éditer une migration déployée**
5. ✅ **Backup avant migration en prod**
6. ✅ **Documenter les migrations complexes**
7. ✅ **Importer tous les modèles dans `models/__init__.py`**
8. ✅ **Séparer structure et données**

---

**Dernière mise à jour :** 2024-10-25
**Responsable :** Michel Alforis
**Version Alembic :** 1.13+
**Version actuelle BDD :** `email_marketing_lite`
