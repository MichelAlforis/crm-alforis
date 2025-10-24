# 📋 Chapitre 7 - Workflows & Interactions

**Status :** 🟢 Phase 2 & 3.1 TERMINÉES (80 templates + Interactions v1.1 complètes)
**Tests :** 17/20 (Backend + Frontend + Participants + Composants UI)
**Priorité :** 🟡 Phase 3.2: Intégration ActivityTab dans fiches + Widget Dashboard

---

## 📊 Synthèse Globale

### ✅ Phase 1 : Backend + Migration (TERMINÉ)

#### 🎯 Backend API Workflows
- ✅ **Modèle Workflow** créé avec SQLAlchemy
  - Champs : name, description, trigger_type, trigger_config, conditions, actions
  - Statuts : draft, active, paused, archived
  - Support templates et tags
- ✅ **Endpoints CRUD** complets (`/api/v1/workflows`)
  - GET /workflows (liste paginée avec filtres)
  - POST /workflows (création)
  - GET /workflows/{id} (détail)
  - PUT /workflows/{id} (modification)
  - DELETE /workflows/{id} (suppression)
  - POST /workflows/{id}/activate (activation)
  - POST /workflows/{id}/pause (pause)
- ✅ **Migration Alembic** créée et testée
- ✅ **Tests automatisés** : Endpoints fonctionnels

#### 🚀 Migration Next.js 15 + @xyflow/react
- ✅ **Problème résolu** : Erreur "Module not found: Can't resolve 'reactflow'"
- ✅ **Upgrade Next.js** : 14.2.33 → **15.5.6**
- ✅ **Remplacement reactflow** → **@xyflow/react@12.9.0** (version maintenue)
- ✅ **Configuration optimisée** :
  - `transpilePackages: ['@xyflow/react']`
  - Suppression deprecated options (swcMinify, esmExternals)
- ✅ **WorkflowBuilder.client.tsx** créé avec ReactFlow
- ✅ **Docker rebuild complet** : 18.79GB cache nettoyé
- ✅ **Application opérationnelle** : Compilation sans erreur
- ✅ **Branch poussée** : `feature/chapitre7-workflows-interactions`

#### 📁 Fichiers Backend Créés
```
crm-api/
├── models/workflow.py          # Modèle SQLAlchemy
├── routers/workflows.py        # Endpoints CRUD
├── schemas/workflow.py         # Schémas Pydantic
└── alembic/versions/xxx_add_workflow_model.py
```

#### 📁 Fichiers Frontend Créés
```
crm-frontend/
├── package.json                # Next 15 + @xyflow/react
├── next.config.js              # Configuration optimisée
├── app/workflows/
│   ├── page.tsx                # Liste workflows avec filtres
│   ├── new/page.tsx            # Création workflow (stepper 3 étapes)
│   └── [id]/page.tsx           # Édition workflow
└── components/workflows/
    └── WorkflowBuilder.client.tsx    # Builder visuel ReactFlow
```

### ✅ Phase 2 : Frontend UI Workflows + Bibliothèque (TERMINÉ)
- ✅ Page `/workflows` unifiée avec bibliothèque fusionnée
- ✅ Page `/workflows/new` full-page (stepper 3 étapes)
- ✅ Page `/workflows/[id]` détail avec section pédagogique
- ✅ Builder visuel avec @xyflow/react
- ✅ Mode visuel + mode JSON
- ✅ Gestion statuts (draft/active/inactive) avec toggle
- ✅ **80 templates Finance B2B** (20 initiaux + 60 nouveaux)
- ✅ **10 catégories**: appels, réunions, mailing, relations, prospection, reporting, contrats, conformité, collaboration, partenariats, formation
- ✅ **Bibliothèque fusionnée** dans page principale (suppression /library)
- ✅ **Filtres combinables** : Status + Type (Template/Personnalisé) + Déclencheur + Recherche
- ✅ **Filtres déclencheurs métier** avec emojis (20 triggers: 🏢 Nouvelle Organisation, 📧 Nouveau Mail, etc.)
- ✅ **Badge Type visible** : Template (purple) vs Personnalisé (blue)
- ✅ **Section "Comment ça marche?"** pour templates (déclencheur, actions, durée estimée)
- ✅ **Actions traduites** en langage naturel avec icônes colorées
- ✅ Hook `useWorkflowTemplates` avec filtres avancés
- ✅ Composant `WorkflowTemplateCard` avec métadonnées enrichies
- ✅ Metadata complète pour tous les 80 templates (IDs 21-100)
- ✅ Base de données avec 80 templates insérés et opérationnels
- ✅ API retourne `is_template` dans WorkflowListItem
- ⬜ Tests utilisateur end-to-end

### ✅ Phase 3.1 : Interactions v1.1 - Backend & Composants (TERMINÉ)

#### 🎯 Backend Interactions v1.1
- ✅ **Modèle Interaction** créé avec SQLAlchemy (table: `crm_interactions`)
  - Types: call, email, meeting, visio, note, other
  - Support org_id OU person_id (CHECK constraint)
  - Attachments: JSON array {name, url}
  - Relations: M-N avec Person via `interaction_participants`
- ✅ **Participants multiples** (v1.1)
  - Table M-N `interaction_participants` (person_id, role, present)
  - JSONB `external_participants` (name, email, company)
  - CASCADE DELETE sur foreign keys
- ✅ **Endpoints REST** complets (`/api/v1/interactions`)
  - POST /interactions (création avec participants batch)
  - PATCH /interactions/{id} (update avec replace strategy)
  - DELETE /interactions/{id}
  - GET /interactions/recent?limit=X
  - GET /interactions/by-organisation/{orgId}
  - GET /interactions/by-person/{personId}
- ✅ **Migrations Alembic** : 2 migrations créées et appliquées via psql
- ✅ **Schémas Pydantic** alignés avec Zod frontend

#### 🎨 Frontend Interactions v1.1
- ✅ **Types TypeScript** (`types/interaction.ts`)
  - Interfaces: Interaction, ParticipantIn, ExternalParticipant
  - Schémas Zod: InteractionCreateSchema, InteractionUpdateSchema
  - Type guards & validation
- ✅ **Hooks React Query** (`hooks/useInteractions.ts`)
  - useRecentInteractions(limit)
  - useOrgInteractions(orgId, options)
  - usePersonInteractions(personId, options)
  - useCreateInteraction() avec optimistic updates
  - useUpdateInteraction(), useDeleteInteraction()
- ✅ **Composants UI**
  - `InteractionCard.tsx` : Display interaction avec type icon, participants, actions
  - `InteractionComposerInline.tsx` : Quick create form (6 types)
  - `ActivityTab.tsx` : Timeline groupée par jour (Aujourd'hui, Hier, dates)
- ✅ **Cleanup architecture**
  - Suppression page standalone `/dashboard/interactions`
  - Suppression lien sidebar "Interactions"
  - Solution 1 appliquée: Interactions uniquement en contexte (fiches)

### 🟡 Phase 3.2 : Intégration & Widgets (EN COURS)
- ⬜ **Intégrer ActivityTab dans fiches**
  - Ajouter onglet "Activité" dans `/dashboard/organisations/[id]`
  - Ajouter onglet "Activité" dans `/dashboard/people/[id]`
- ⬜ **Widget Dashboard**
  - Créer `DashboardInteractionsWidget` (5 dernières interactions)
  - Afficher sur page `/dashboard` principale
- ⬜ **Command Palette** (⌘K)
  - Quick create interaction via raccourci clavier
- ⬜ **Export CSV**
  - Endpoint backend `/interactions/export`
  - Bouton download dans interface

---

## Tests Workflows (6 tests)

| # | Test | Statut | Remarques |
|---|------|--------|-----------|
| 7.1 | API GET /workflows fonctionne | ✅ | Backend testé avec curl |
| 7.2 | API POST /workflows crée un workflow | ✅ | JSON validé via Pydantic |
| 7.3 | Migration Next 15 + @xyflow/react | ✅ | Build Docker réussi, app opérationnelle |
| 7.4 | Page "Workflows" accessible | ✅ | Liste workflows opérationnelle |
| 7.5 | **Test** : Créer un workflow via UI | ✅ | Page /workflows/new avec builder visuel FUN |
| 7.5b | **Test** : Bibliothèque de templates | ✅ | Page /workflows/library avec 20 templates B2B + recherche |
| 7.5c | **Test** : Dupliquer un template | ✅ | Bouton "Utiliser" → redirection auto vers édition |
| 7.6 | Assigner workflow à un contact | ⬜ | Logique métier à implémenter |

## Tests Interactions v1.1 (14 tests)

### Backend (6 tests)
| # | Test | Statut | Remarques |
|---|------|--------|-----------|
| 7.7 | API POST /interactions fonctionne | ✅ | Création avec participants multiples |
| 7.8 | API PATCH /interactions/{id} | ✅ | Update avec replace strategy participants |
| 7.9 | API DELETE /interactions/{id} | ✅ | CASCADE delete des participants |
| 7.10 | GET /interactions/by-organisation/{id} | ✅ | Retourne interactions paginées |
| 7.11 | GET /interactions/by-person/{id} | ✅ | Retourne interactions paginées |
| 7.12 | Participants M-N fonctionnels | ✅ | Table `interaction_participants` opérationnelle |

### Frontend Composants (4 tests)
| # | Test | Statut | Remarques |
|---|------|--------|-----------|
| 7.13 | InteractionCard affiche type + participants | ✅ | Icônes, compteur participants, actions |
| 7.14 | InteractionComposerInline crée interaction | ✅ | 6 types, titre, description, auto-reset |
| 7.15 | ActivityTab affiche timeline groupée | ✅ | Groupement par jour (Aujourd'hui, Hier, dates) |
| 7.16 | Hooks React Query fonctionnels | ✅ | useOrgInteractions, useCreateInteraction |

### Intégration (4 tests à faire)
| # | Test | Statut | Remarques |
|---|------|--------|-----------|
| 7.17 | Onglet Activité dans fiche Organisation | ⬜ | Phase 3.2 - À intégrer |
| 7.18 | Onglet Activité dans fiche Personne | ⬜ | Phase 3.2 - À intégrer |
| 7.19 | Widget Dashboard (5 récentes) | ⬜ | Phase 3.2 - À créer |
| 7.20 | Export CSV interactions | ⬜ | Phase 3.2 - À implémenter |

---

## 🔧 Détails Techniques

### Stack Technique
- **Backend** : FastAPI + SQLAlchemy + Alembic
- **Frontend** : Next.js 15.5.6 + React 18.3.1
- **Builder Workflow** : @xyflow/react 12.9.0
- **Base de données** : PostgreSQL 16
- **Data Fetching** : @tanstack/react-query (React Query)
- **Validation** : Pydantic (backend) + Zod (frontend)
- **Dates** : date-fns avec locale fr

### Configuration Next.js 15
```javascript
// next.config.js
transpilePackages: ['@xyflow/react'],
reactStrictMode: true,
```

### Triggers Disponibles
- `manual` : Déclenché manuellement
- `organisation_created` : Nouvelle organisation
- `organisation_updated` : Organisation modifiée
- `deal_created` : Deal créé
- `deal_updated` : Deal modifié
- `deal_stage_changed` : Changement de stage
- `scheduled` : Programmé (quotidien)
- `inactivity_delay` : Délai d'inactivité

### Actions Disponibles
- `create_task` : Créer une tâche
- `send_email` : Envoyer un email
- `send_notification` : Envoyer une notification
- `update_field` : Modifier un champ
- `assign_user` : Assigner un utilisateur
- `add_tag` : Ajouter un tag

### Interactions v1.1 - Architecture
**Table principale** : `crm_interactions`
- org_id (FK nullable vers organisations)
- person_id (FK nullable vers people)
- type (ENUM: call, email, meeting, visio, note, other)
- title (varchar 200)
- body (text nullable)
- attachments (JSON: array of {name, url})
- external_participants (JSON: array of {name, email, company})
- created_by, created_at, updated_at

**Table M-N Participants** : `interaction_participants`
- Composite PK (interaction_id, person_id)
- role (varchar 80 nullable)
- present (boolean default true)
- CASCADE DELETE

**Contraintes**:
- CHECK: (org_id IS NOT NULL) OR (person_id IS NOT NULL)
- Au moins une entité liée obligatoire

**Types d'Interactions**:
- ☎️ `call` : Appel téléphonique
- 📧 `email` : Email
- 📅 `meeting` : Réunion présentielle
- 🎥 `visio` : Visioconférence
- 📝 `note` : Note interne
- 📄 `other` : Autre type

---

## 📝 Commits Importants

### Phase 1 - Migration
- `080bb387` : ✨ Migration Next 15 + @xyflow/react
- `29a1660b` : 📦 Update package-lock.json
- `a2753428` : 🔧 Nettoyage next.config.js Next 15
- `55177687` : 💾 Sauvegarde avant migration

### Phase 2 - Frontend UI + Bibliothèque 80 Templates
- `652bc6e5` : 📋 Enrichissement checklist Chapitre 7
- `fbfda43c` : ✨ Page /workflows/new avec builder visuel FUN
- `65dd7734` : 🔧 Suppression complète système modal
- `76992c7f` : 🔧 Suppression WorkflowCreateModal
- `016916b4` : 🗑️ Suppression doublon /dashboard/workflows
- `12c48c31` : ✨ Création 80 templates Finance B2B (6 fichiers, +2571 lignes)
- `dee20a6e` : 🐛 Fix workflows.data.items access
- `47c5e3ba` : ✨ Refonte page unifiée (+170 lignes)
- `1420947b` : 🗑️ Suppression /library fusionnée dans /workflows
- `14b68986` : ✨ Ajout is_template API + Rename Manuel→Personnalisé

### Phase 2b - Améliorations UX
- `d2d07f9b` : 🎨 Page détail Template vs Personnalisé (badge + encart explicatif)
- `cba8c126` : ✨ Section "Comment ça marche?" pour templates (+163 lignes)
- `d7d932da` : ✨ Filtres par déclencheur (trigger) (+52 lignes)
- `47152830` : ✨ Labels déclencheurs métier (20 triggers avec emojis)

### Phase 3.1 - Interactions v1.1 Refactoring (session actuelle)
- `02a5c490` : ✨ Backend Interactions v1.1 (modèle + participants M-N + endpoints)
- `2e46f3cf` : ✨ Backend Interactions v1.1 - Ajout participants + external_participants
- `7598a96c` : ✨ Frontend Interactions v1.1 - Types + Hooks React Query
- `bcd9a3c0` : ✨ Frontend Interactions v1.1 - Composants UI (Card, Composer, ActivityTab)
- `9333bde5` : 🗑️ Cleanup - Suppression page /dashboard/interactions standalone
- Architecture: Solution 1 appliquée (Interactions uniquement en contexte fiches)

---

## 🎯 Récapitulatif Phase 2 (Bibliothèque Templates)

### Ce qui a été créé
1. **60 nouveaux templates SQL** (`scripts/seed_workflow_templates_finance_60.sql`)
   - Appels/Réunions: 6 templates (IDs 41-46)
   - Mailing/Newsletters: 6 templates (IDs 47-52)
   - Relations Client: 6 templates (IDs 53-58)
   - Prospection/Leads: 7 templates (IDs 59-65)
   - Reporting/Pilotage: 5 templates (IDs 66-70)
   - **Contrats/Mandats**: 8 templates (IDs 71-78)
   - **Conformité/RGPD**: 6 templates (IDs 79-84)
   - **Collaboration Interne**: 6 templates (IDs 85-90)
   - **Partenariats/Réseau**: 5 templates (IDs 91-95)
   - **Formation/Onboarding**: 5 templates (IDs 96-100)

2. **Script Python de génération** (`scripts/generate_template_metadata.py`)
   - Génération automatique des métadonnées TypeScript
   - Évite les erreurs de saisie manuelle
   - Output: `/tmp/metadata_41_100.txt`

3. **Mise à jour Hook Frontend** (`hooks/useWorkflowTemplates.ts`)
   - Types étendus: 11 catégories (ajout de 5 nouvelles)
   - Métadonnées complètes pour IDs 21-100
   - Fonction de recherche fulltext multi-champs
   - Filtres combinables (catégorie + trigger + difficulté)
   - Statistiques automatiques

### Base de données
- **80 templates insérés** (IDs 21-100)
- Tous avec trigger_type, actions, status = ACTIVE
- is_template = true pour tous

### Interface utilisateur
- Page `/dashboard/workflows/library` opérationnelle
- Barre de recherche fulltext
- Filtres par catégorie (11 options)
- Filtres par trigger (8 types)
- Filtres par difficulté (facile/intermédiaire/avancé)
- Affichage statistiques en temps réel
- Bouton "Utiliser" → duplication automatique

---

**Dernière mise à jour :** 24 Octobre 2025 - 18:30
**Status Phase 2 :** ✅ TERMINÉ (80 templates opérationnels)
**Status Phase 3.1 :** ✅ TERMINÉ (Interactions v1.1 - Backend + Composants)
**Prochaine étape :** Phase 3.2 - Intégration ActivityTab dans fiches + Widget Dashboard

## 📦 Fichiers Créés Phase 3.1

### Backend
```
crm-backend/
├── models/interaction.py                    # Modèle Interaction + InteractionParticipant
├── schemas/interaction.py                   # Pydantic schemas v1.1
├── routers/interactions.py                  # REST API endpoints
└── alembic/versions/
    ├── add_interactions_v1.py              # Migration table principale
    └── add_interaction_participants.py     # Migration participants M-N
```

### Frontend
```
crm-frontend/
├── types/interaction.ts                     # Types TS + Zod schemas
├── hooks/useInteractions.ts                 # React Query hooks
└── components/interactions/
    ├── InteractionCard.tsx                 # Display card avec actions
    ├── InteractionComposerInline.tsx       # Quick create form
    └── ActivityTab.tsx                     # Timeline groupée par jour
```
