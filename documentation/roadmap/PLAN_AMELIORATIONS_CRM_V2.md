# 🚀 Plan d'Améliorations CRM Alforis - Phase 2 (V2)

## 📊 Vue d'Ensemble

Ce document présente la **Phase 2** du CRM Alforis avec des fonctionnalités avancées pour transformer le CRM en une plateforme complète de gestion commerciale et marketing.

**Prérequis:**
- ✅ Phase 1 terminée (PLAN_AMELIORATIONS_CRM.md - 9/11 tâches complètes)
- ✅ Infrastructure de base opérationnelle
- ✅ Tests, monitoring, permissions, recherche, exports en place

**Objectifs Phase 2:**
- 🎯 Automatisation intelligente (workflows, IA)
- 📊 Analytics & Business Intelligence avancée
- 📱 Mobilité & accessibilité everywhere
- 🔗 Intégrations écosystème (Office 365, Google, comptabilité)
- 💼 Fonctionnalités métier avancées (devis, facturation, contrats)

---

## 🗓️ Planning sur 12 Semaines

```
Phase 2.1 (Semaines 1-3):  📊 Analytics & Dashboards Avancés
Phase 2.2 (Semaines 4-6):  🤖 Automatisation & Workflows
Phase 2.3 (Semaines 7-9):  📱 Mobile & Intégrations
Phase 2.4 (Semaines 10-12): 💼 Gestion Commerciale Avancée
```

**Effort Total:** 12 semaines (3 mois)
**Progrès:** 0/15 fonctionnalités = **0%** 🆕

---

## 📊 PHASE 2.1: Analytics & Business Intelligence (Semaines 1-3)

### 🎯 Objectif: Tableaux de bord intelligents & rapports automatisés

#### Semaine 1: Tableaux de Bord Personnalisables ⭐⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥🔥 (Visualisation métier critique)
**Effort:** 🛠️🛠️🛠️🛠️ (5 jours)

**Tâches:**
- [ ] Système de widgets drag-and-drop (React DnD ou react-grid-layout)
- [ ] Bibliothèque de widgets prédéfinis:
  - [ ] Widget KPIs (CA, nombre deals, taux conversion)
  - [ ] Widget graphique pipeline (funnel chart)
  - [ ] Widget top performers (classement commerciaux)
  - [ ] Widget activités récentes (timeline)
  - [ ] Widget objectifs vs réalisé (gauge charts)
- [ ] Sauvegarde layouts par utilisateur (preferences table)
- [ ] Export dashboard en PDF/PNG
- [ ] Templates de dashboards par rôle (Admin, Manager, Commercial)

**Stack Technique:**
```typescript
// Frontend
- react-grid-layout (drag-and-drop)
- recharts ou chart.js (graphiques)
- html2canvas + jsPDF (export PDF)

// Backend
- Nouvelle table: dashboard_layouts
- Nouvelle table: dashboard_widgets
- API endpoint: GET /api/v1/dashboards/user/{user_id}
- API endpoint: PUT /api/v1/dashboards/layout
```

**Fichiers à créer:**
```
crm-frontend/components/dashboard/
├── DashboardGrid.tsx              (container drag-and-drop)
├── widgets/
│   ├── KPIWidget.tsx              (métriques chiffrées)
│   ├── FunnelWidget.tsx           (graphique pipeline)
│   ├── TopPerformersWidget.tsx    (leaderboard)
│   ├── ActivityWidget.tsx         (timeline)
│   └── GoalsWidget.tsx            (objectifs)
├── WidgetLibrary.tsx              (catalogue widgets)
└── DashboardExport.tsx            (export PDF)

crm-backend/models/dashboard.py
crm-backend/api/routes/dashboards.py
```

**Résultats attendus:**
- ✅ Dashboard 100% personnalisable par utilisateur
- ✅ 5+ widgets métier prêts à l'emploi
- ✅ Export PDF professionnel
- ✅ Chargement < 2s (cache Redis)

---

#### Semaine 2: Rapports Automatisés & Analyses Avancées ⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥 (Gain de temps management)
**Effort:** 🛠️🛠️🛠️🛠️ (5 jours)

**Tâches:**
- [ ] Générateur de rapports personnalisés:
  - [ ] Sélection métriques (CA, pipeline, activités, conversions)
  - [ ] Filtres avancés (période, équipe, produit, région)
  - [ ] Groupement (par mois, trimestre, commercial, catégorie)
- [ ] Planification envois automatiques:
  - [ ] Celery Beat (tâches récurrentes)
  - [ ] Rapports hebdomadaires (lundi 9h)
  - [ ] Rapports mensuels (1er du mois)
  - [ ] Alertes seuils (si taux conversion < 30%)
- [ ] Export multi-formats (Excel avec graphiques, PDF, CSV)
- [ ] Envoi email avec pièces jointes (SendGrid/SMTP)
- [ ] Analyse de tendances:
  - [ ] Évolution pipeline 12 mois glissants
  - [ ] Saisonnalité (meilleurs/pires mois)
  - [ ] Prédiction CA fin d'année (régression linéaire simple)

**Stack Technique:**
```python
# Backend
- Celery + Celery Beat (tâches planifiées)
- Redis (broker Celery)
- openpyxl (génération Excel avancé)
- matplotlib/plotly (graphiques dans rapports)
- SendGrid API (envoi emails)

# Nouvelles tables
- scheduled_reports (configuration rapports)
- report_history (historique envois)
```

**Fichiers à créer:**
```
crm-backend/tasks/
├── __init__.py
├── celery_app.py                  (config Celery)
├── reports.py                     (tâches génération rapports)
└── schedules.py                   (Celery Beat schedules)

crm-backend/services/
├── report_generator.py            (logique métier rapports)
├── trend_analyzer.py              (analyses statistiques)
└── email_sender.py                (envoi emails)

crm-frontend/components/reports/
├── ReportBuilder.tsx              (interface création rapport)
├── ScheduleEditor.tsx             (planification envois)
└── ReportHistory.tsx              (historique)
```

**Résultats attendus:**
- ✅ Rapports 100% automatisés (zéro intervention manuelle)
- ✅ Envoi email fiable (confirmation + retry)
- ✅ Analyses prédictives basiques (tendances)
- ✅ Interface no-code pour créer rapports

---

#### Semaine 3: Analytics Avancés & Prédictions IA ⭐⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥🔥 (Avantage concurrentiel)
**Effort:** 🛠️🛠️🛠️🛠️🛠️ (5 jours)

**Tâches:**
- [ ] Lead scoring automatique:
  - [ ] Modèle ML (scikit-learn - Random Forest)
  - [ ] Features: ancienneté, interactions, taille deal, catégorie
  - [ ] Score 0-100 par organisation
  - [ ] Mise à jour quotidienne (Celery task)
- [ ] Prédiction probabilité conversion:
  - [ ] Modèle classification binaire (deal gagné/perdu)
  - [ ] Facteurs: durée pipeline, nb interactions, montant, historique commercial
  - [ ] Affichage % chance succès dans fiche deal
- [ ] Détection anomalies:
  - [ ] Deal bloqué (> 60 jours sans activité)
  - [ ] Client inactif (> 90 jours sans contact)
  - [ ] Baisse performance (commercial -30% vs mois précédent)
- [ ] Benchmarking & Leaderboards:
  - [ ] Classement commerciaux (CA, taux conversion, nb deals)
  - [ ] Comparaison équipes (graphiques radar)
  - [ ] Badges & gamification (Top Closer, Rising Star)

**Stack Technique:**
```python
# Backend - Machine Learning
- scikit-learn (Random Forest, Logistic Regression)
- pandas (préparation données)
- joblib (sérialisation modèles)

# Entraînement modèle
1. Export données historiques (deals gagnés/perdus)
2. Feature engineering (durée, nb_interactions, montant, etc.)
3. Train/test split (80/20)
4. Entraînement Random Forest
5. Sauvegarde modèle (joblib)
6. API prediction endpoint

# Nouvelles tables
- ml_predictions (prédictions générées)
- ml_models_metadata (versions modèles)
```

**Fichiers à créer:**
```
crm-backend/ml/
├── __init__.py
├── train_lead_scoring.py          (entraînement modèle)
├── predict.py                     (inférence)
├── feature_engineering.py         (extraction features)
└── models/                        (modèles sérialisés .joblib)

crm-backend/tasks/ml_tasks.py      (re-entraînement quotidien)
crm-backend/api/routes/predictions.py

crm-frontend/components/analytics/
├── LeadScoreDisplay.tsx           (affichage score 0-100)
├── ConversionProbability.tsx      (gauge probabilité)
├── AnomalyAlerts.tsx              (alertes anomalies)
└── Leaderboard.tsx                (classements)
```

**Résultats attendus:**
- ✅ Lead scoring opérationnel (précision > 70%)
- ✅ Prédictions en temps réel (< 100ms par deal)
- ✅ Alertes proactives (anomalies détectées automatiquement)
- ✅ Gamification fonctionnelle (boost motivation équipes)

---

## 🤖 PHASE 2.2: Automatisation & Workflows (Semaines 4-6)

### 🎯 Objectif: Automatiser tâches répétitives & workflows métier

#### Semaine 4: Workflows Personnalisés ⭐⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥🔥 (Productivité x2)
**Effort:** 🛠️🛠️🛠️🛠️🛠️ (5 jours)

**Tâches:**
- [ ] Moteur de workflows no-code:
  - [ ] Interface drag-and-drop (React Flow)
  - [ ] Triggers disponibles:
    - [ ] Deal créé / modifié / stage changé
    - [ ] Organisation créée / modifiée
    - [ ] Délai écoulé (30 jours sans activité)
    - [ ] Webhook externe reçu
  - [ ] Actions disponibles:
    - [ ] Envoyer email
    - [ ] Créer tâche
    - [ ] Modifier champ
    - [ ] Envoyer notification
    - [ ] Appeler webhook externe
    - [ ] Assigner à utilisateur
- [ ] Conditions & logique:
  - [ ] IF/ELSE (si montant > 100k → notifier manager)
  - [ ] Délais (attendre 7 jours puis...)
  - [ ] Filtres multiples (ET/OU)
- [ ] Exécution asynchrone (Celery workers)
- [ ] Logs d'exécution (audit trail)

**Stack Technique:**
```typescript
// Frontend - Workflow Builder
- React Flow (visual workflow editor)
- Monaco Editor (éditeur conditions)

// Backend - Workflow Engine
- Celery (exécution asynchrone)
- Workflow table (définitions)
- WorkflowExecution table (historique exécutions)
```

**Exemples de workflows prêts à l'emploi:**
```yaml
Workflow 1: Relance automatique
Trigger: Deal en PROPOSITION > 30 jours
Condition: Aucune activité depuis 30 jours
Actions:
  - Envoyer email relance au commercial
  - Créer tâche "Relancer client XYZ"
  - Notifier manager si montant > 50k€

Workflow 2: Onboarding nouveau client
Trigger: Deal → SIGNÉ
Actions:
  - Envoyer email bienvenue client
  - Créer 5 tâches onboarding
  - Notifier équipe support
  - Ajouter tag "Nouveau Client 2025"

Workflow 3: Lead nurturing
Trigger: Organisation créée (statut PROSPECT)
Actions:
  - Jour 0: Email bienvenue + brochure
  - Jour 3: Email cas d'usage
  - Jour 7: Email invitation démo
  - Jour 14: Appel commercial (tâche créée)
```

**Fichiers à créer:**
```
crm-frontend/components/workflows/
├── WorkflowBuilder.tsx            (éditeur visuel)
├── TriggerSelector.tsx            (choix triggers)
├── ActionEditor.tsx               (config actions)
├── ConditionEditor.tsx            (logique IF/ELSE)
└── WorkflowHistory.tsx            (logs exécutions)

crm-backend/models/workflow.py
crm-backend/services/workflow_engine.py
crm-backend/tasks/workflow_tasks.py
crm-backend/api/routes/workflows.py
```

**Résultats attendus:**
- ✅ Workflow engine fonctionnel (100% no-code)
- ✅ 3+ templates workflow prêts à l'emploi
- ✅ Exécution fiable (retry automatique si échec)
- ✅ Audit complet (qui, quoi, quand)

---

#### Semaine 5: Email Automation ⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥 (Nurturing automatisé)
**Effort:** 🛠️🛠️🛠️🛠️ (5 jours)

**Tâches:**
- [ ] Éditeur d'emails (WYSIWYG):
  - [ ] Templates HTML responsive
  - [ ] Variables dynamiques {{organisation.nom}}, {{contact.prenom}}
  - [ ] Bibliothèque templates (bienvenue, relance, newsletter)
- [ ] Campagnes email:
  - [ ] Séquences multi-emails (drip campaigns)
  - [ ] A/B testing (2 versions, split 50/50)
  - [ ] Segmentation audiences (filtres avancés)
  - [ ] Envoi planifié (date/heure précise)
- [ ] Tracking & Analytics:
  - [ ] Taux d'ouverture (tracking pixel)
  - [ ] Taux de clics (liens trackés)
  - [ ] Désabonnements (lien unsubscribe)
  - [ ] Bounces & erreurs
- [ ] Intégration SendGrid/Mailgun:
  - [ ] Webhooks (events: delivered, opened, clicked, bounced)
  - [ ] Rate limiting (respecter quotas)

**Stack Technique:**
```typescript
// Frontend
- react-email-editor (WYSIWYG)
- TipTap ou Slate (éditeur rich text)

// Backend
- SendGrid SDK (envoi emails)
- Webhooks SendGrid (tracking événements)
- Celery (envoi asynchrone)

// Tables
- email_templates
- email_campaigns
- email_sends (historique envois)
- email_events (ouvertures, clics)
```

**Fichiers à créer:**
```
crm-frontend/components/email/
├── EmailEditor.tsx                (éditeur WYSIWYG)
├── TemplateLibrary.tsx            (bibliothèque templates)
├── CampaignBuilder.tsx            (création campagnes)
├── AudienceSelector.tsx           (segmentation)
└── CampaignAnalytics.tsx          (stats ouvertures/clics)

crm-backend/models/email.py
crm-backend/services/email_service.py
crm-backend/api/routes/email_campaigns.py
crm-backend/webhooks/sendgrid.py   (webhooks tracking)
```

**Templates email prédéfinis:**
```
1. Bienvenue nouveau prospect
2. Invitation démo produit
3. Relance proposition commerciale
4. Suivi post-signature
5. Newsletter mensuelle
6. Cas d'usage client
7. Invitation événement
```

**Résultats attendus:**
- ✅ Campagnes email 100% automatisées
- ✅ Tracking précis (taux ouverture > 25%)
- ✅ Templates professionnels responsive
- ✅ Conformité RGPD (unsubscribe obligatoire)

---

#### Semaine 6: Tâches & Rappels Automatiques ⭐⭐⭐

**Impact:** 🔥🔥🔥 (Organisation équipes)
**Effort:** 🛠️🛠️🛠️ (3 jours)

**Tâches:**
- [ ] Système de tâches complet:
  - [ ] Création tâche (titre, description, date échéance, assigné)
  - [ ] Priorités (Urgent, Haute, Normal, Basse)
  - [ ] Statuts (À faire, En cours, Terminée, Annulée)
  - [ ] Liens vers entités (organisation, contact, deal)
- [ ] Rappels automatiques:
  - [ ] Notifications push (WebSocket)
  - [ ] Emails rappel (J-1, J-0, J+1 si non fait)
  - [ ] Récurrence (quotidien, hebdo, mensuel)
- [ ] Vues tâches:
  - [ ] Liste groupée (par date, par priorité, par assigné)
  - [ ] Calendrier (vue mensuelle)
  - [ ] Kanban (À faire / En cours / Fait)
- [ ] Tâches automatiques via workflows:
  - [ ] Deal > 30j → tâche "Relancer client"
  - [ ] Nouveau client → 5 tâches onboarding

**Stack Technique:**
```python
# Backend
- Celery Beat (rappels quotidiens)
- WebSocket (notifications temps réel)

# Tables
- tasks (titre, description, due_date, assignee_id, status)
- task_recurrence (règles récurrence)
```

**Fichiers à créer:**
```
crm-frontend/components/tasks/
├── TaskList.tsx                   (liste tâches)
├── TaskCalendar.tsx               (vue calendrier)
├── TaskKanban.tsx                 (vue kanban)
├── TaskEditor.tsx                 (création/édition)
└── TaskNotifications.tsx          (rappels)

crm-backend/models/task.py
crm-backend/tasks/task_reminders.py
crm-backend/api/routes/tasks.py
```

**Résultats attendus:**
- ✅ Gestion tâches complète (3 vues différentes)
- ✅ Rappels fiables (aucune tâche oubliée)
- ✅ Intégration workflows (tâches auto-créées)
- ✅ Notifications temps réel

---

## 📱 PHASE 2.3: Mobile & Intégrations (Semaines 7-9)

### 🎯 Objectif: Accessibilité mobile + écosystème connecté

#### Semaine 7: Application Mobile (PWA) ⭐⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥🔥 (Mobilité commerciaux)
**Effort:** 🛠️🛠️🛠️🛠️🛠️ (5 jours)

**Tâches:**
- [ ] Conversion Progressive Web App (PWA):
  - [ ] Service Worker (cache offline)
  - [ ] Manifest.json (icône, nom, thème)
  - [ ] Installation sur écran d'accueil
- [ ] Optimisations mobile:
  - [ ] Interface responsive 100% (320px → 768px)
  - [ ] Gestes tactiles (swipe, pull-to-refresh)
  - [ ] Navigation bottom tabs (iOS style)
  - [ ] Inputs optimisés mobile (autocomplete, keyboard types)
- [ ] Mode offline:
  - [ ] IndexedDB (stockage local)
  - [ ] Synchronisation automatique (à la reconnexion)
  - [ ] Indicateur "Mode hors ligne"
  - [ ] Queue actions offline (créations, modifications)
- [ ] Fonctionnalités natives:
  - [ ] Notifications push (Push API)
  - [ ] Appareil photo (scanner carte de visite)
  - [ ] Géolocalisation (check-in rendez-vous)
  - [ ] Partage (Share API)

**Stack Technique:**
```typescript
// Frontend
- Next.js PWA plugin (next-pwa)
- Workbox (service worker)
- IndexedDB (Dexie.js)
- TensorFlow.js Lite (OCR cartes de visite)

// Service Worker
- Cache-first strategy (assets statiques)
- Network-first strategy (données API)
- Background sync (actions offline)
```

**Fichiers à créer:**
```
crm-frontend/
├── public/
│   ├── manifest.json              (PWA manifest)
│   ├── sw.js                      (service worker)
│   └── icons/                     (icônes 192x192, 512x512)
├── hooks/
│   ├── useOfflineSync.ts          (synchronisation)
│   └── usePushNotifications.ts    (notifs push)
└── components/mobile/
    ├── BottomNav.tsx              (navigation mobile)
    ├── BusinessCardScanner.tsx    (OCR carte visite)
    └── LocationCheckIn.tsx        (géolocalisation)

next.config.js (config PWA)
```

**Fonctionnalités mobiles prioritaires:**
```
1. Consultation fiches clients (lecture seule offline)
2. Ajout note rapide (sync auto)
3. Création tâche (sync auto)
4. Scan carte de visite → création contact
5. Check-in rendez-vous (GPS + timestamp)
6. Appel direct depuis fiche (tel: links)
7. Notifications push deals importants
```

**Résultats attendus:**
- ✅ PWA installable (iOS + Android)
- ✅ Mode offline fonctionnel (consultation + modifications)
- ✅ Synchronisation fiable (conflits gérés)
- ✅ Performance mobile excellente (Lighthouse > 90)

---

#### Semaine 8: Intégrations Office 365 & Google ⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥 (Productivité équipes)
**Effort:** 🛠️🛠️🛠️🛠️ (5 jours)

**Tâches:**
- [ ] **Intégration Microsoft 365:**
  - [ ] OAuth2 Microsoft (authentification)
  - [ ] Outlook:
    - [ ] Synchronisation emails (afficher dans CRM)
    - [ ] Envoi email depuis CRM (via Outlook)
    - [ ] Tracking emails (lu/non lu)
  - [ ] Calendar:
    - [ ] Sync rendez-vous bidirectionnel
    - [ ] Création événement depuis CRM
  - [ ] Teams:
    - [ ] Notifications CRM dans Teams
    - [ ] Commandes slash (/crm client XXX)
  - [ ] OneDrive:
    - [ ] Stockage documents (pièces jointes)
    - [ ] Partage fichiers clients
- [ ] **Intégration Google Workspace:**
  - [ ] OAuth2 Google
  - [ ] Gmail:
    - [ ] Sync emails
    - [ ] Envoi depuis CRM
  - [ ] Google Calendar:
    - [ ] Sync bidirectionnel
  - [ ] Google Drive:
    - [ ] Stockage documents
    - [ ] Partage fichiers

**Stack Technique:**
```python
# Backend
- authlib (OAuth2)
- Microsoft Graph API SDK
- Google API Client Python
- Celery (sync périodique)

# Tables
- oauth_tokens (access/refresh tokens)
- email_sync (emails synchronisés)
- calendar_events (événements synced)
```

**Fichiers à créer:**
```
crm-backend/integrations/
├── __init__.py
├── microsoft/
│   ├── oauth.py                   (auth Microsoft)
│   ├── outlook.py                 (emails)
│   ├── calendar.py                (calendrier)
│   ├── teams.py                   (notifications)
│   └── onedrive.py                (stockage)
├── google/
│   ├── oauth.py                   (auth Google)
│   ├── gmail.py                   (emails)
│   ├── calendar.py                (calendrier)
│   └── drive.py                   (stockage)
└── sync_manager.py                (orchestration sync)

crm-backend/api/routes/integrations.py
crm-backend/tasks/sync_tasks.py    (Celery sync)

crm-frontend/components/integrations/
├── OAuthConnect.tsx               (boutons connexion)
├── EmailList.tsx                  (emails synced)
├── CalendarSync.tsx               (config sync)
└── DocumentPicker.tsx             (sélection fichiers)
```

**Workflows de synchronisation:**
```
Emails:
- Sync toutes les 15 minutes (Celery Beat)
- Détection nouveaux emails (depuis last_sync_date)
- Matching automatique (email → organisation/contact)
- Affichage timeline CRM

Calendrier:
- Sync bidirectionnel (CRM ↔ Outlook/Google)
- Création rendez-vous CRM → événement calendar
- Événement calendar avec emails clients → lié au CRM
- Rappels synchronisés

Documents:
- Upload fichier CRM → stocké OneDrive/Drive
- Partage lien depuis CRM
- Permissions héritées (si deal privé → fichier privé)
```

**Résultats attendus:**
- ✅ Sync emails bidirectionnelle (< 15min latence)
- ✅ Calendrier unifié (un seul calendrier)
- ✅ Documents centralisés (zéro email avec PJ)
- ✅ Authentification sécurisée (OAuth2 + refresh tokens)

---

#### Semaine 9: Intégrations Comptabilité & Marketing ⭐⭐⭐

**Impact:** 🔥🔥🔥 (Écosystème complet)
**Effort:** 🛠️🛠️🛠️ (3 jours)

**Tâches:**
- [ ] **Intégration comptabilité:**
  - [ ] Connexion Pennylane (API REST):
    - [ ] Sync clients CRM → Pennylane
    - [ ] Import factures Pennylane → CRM
    - [ ] Affichage CA facturé par client
  - [ ] Alternative: Export comptable CSV
    - [ ] Format compatible Sage/QuickBooks
    - [ ] Mapping champs personnalisable
- [ ] **Intégration marketing:**
  - [ ] Brevo (ex-SendinBlue):
    - [ ] Sync contacts CRM → listes Brevo
    - [ ] Import événements (ouverture email, clics)
    - [ ] Déclenchement campagnes depuis CRM
  - [ ] Mailchimp (alternative):
    - [ ] Sync bidirectionnelle contacts
    - [ ] Segments automatiques (tags CRM → tags Mailchimp)
- [ ] **Webhooks sortants:**
  - [ ] Configuration webhooks personnalisés
  - [ ] Événements disponibles:
    - [ ] deal.created, deal.updated, deal.won
    - [ ] organisation.created
    - [ ] task.created
  - [ ] Format JSON standardisé
  - [ ] Retry automatique (3 tentatives)
  - [ ] Logs webhooks (succès/échecs)

**Stack Technique:**
```python
# Backend
- httpx (requêtes async)
- Celery (envoi webhooks async)

# Tables
- webhook_configs (URLs + événements)
- webhook_logs (historique envois)
- integration_mappings (mapping champs)
```

**Fichiers à créer:**
```
crm-backend/integrations/
├── pennylane/
│   ├── client.py                  (API client)
│   ├── sync.py                    (sync clients/factures)
│   └── mapping.py                 (mapping champs)
├── brevo/
│   ├── client.py                  (API client)
│   └── sync.py                    (sync contacts)
├── mailchimp/
│   ├── client.py
│   └── sync.py
└── webhooks/
    ├── manager.py                 (envoi webhooks)
    └── handlers.py                (triggers événements)

crm-backend/api/routes/webhooks.py
crm-frontend/components/integrations/
├── PennylaneConnect.tsx
├── BrevoConnect.tsx
└── WebhookManager.tsx
```

**Exemples webhooks sortants:**
```json
POST https://votre-app.com/webhook
{
  "event": "deal.won",
  "timestamp": "2025-10-18T14:30:00Z",
  "data": {
    "deal_id": 123,
    "organisation": {
      "id": 456,
      "nom": "ACME Corp",
      "email": "contact@acme.com"
    },
    "amount": 50000,
    "pipeline_stage": "SIGNE"
  }
}
```

**Résultats attendus:**
- ✅ Sync comptabilité automatique (CA à jour)
- ✅ Marketing automation connecté (campagnes synchronisées)
- ✅ Webhooks fiables (100% événements délivrés)
- ✅ Écosystème complet (CRM = hub central)

---

## 💼 PHASE 2.4: Gestion Commerciale Avancée (Semaines 10-12)

### 🎯 Objectif: Cycle de vente complet (devis → facture → contrat)

#### Semaine 10: Devis & Propositions Commerciales ⭐⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥🔥 (Professionnalisation)
**Effort:** 🛠️🛠️🛠️🛠️🛠️ (5 jours)

**Tâches:**
- [ ] Générateur de devis:
  - [ ] Catalogue produits/services:
    - [ ] Table products (nom, description, prix unitaire, catégorie)
    - [ ] Gestion TVA (taux 0%, 5.5%, 10%, 20%)
  - [ ] Éditeur de devis:
    - [ ] Ajout lignes (produit, quantité, prix, remise)
    - [ ] Calcul automatique (HT, TVA, TTC)
    - [ ] Conditions commerciales (validité, paiement)
    - [ ] Notes & mentions légales
  - [ ] Templates PDF personnalisables:
    - [ ] Logo entreprise
    - [ ] Charte graphique (couleurs)
    - [ ] Mise en page professionnelle
  - [ ] Versions de devis (v1, v2, v3...)
  - [ ] Statuts (Brouillon, Envoyé, Accepté, Refusé, Expiré)
- [ ] Signature électronique:
  - [ ] Intégration DocuSign ou signature canvas HTML5
  - [ ] Workflow validation (client signe → statut Accepté)
  - [ ] Archivage PDF signé
- [ ] Conversion devis → deal:
  - [ ] Devis accepté → deal PROPOSITION ou SIGNE
  - [ ] Montant deal = montant devis TTC

**Stack Technique:**
```python
# Backend
- WeasyPrint ou ReportLab (génération PDF)
- Jinja2 (templates HTML → PDF)

# Tables
- products (catalogue)
- quotes (devis)
- quote_lines (lignes devis)
- quote_versions (historique versions)
```

**Fichiers à créer:**
```
crm-backend/models/
├── product.py                     (catalogue produits)
├── quote.py                       (devis)
└── quote_line.py                  (lignes devis)

crm-backend/services/
├── quote_generator.py             (logique métier devis)
└── pdf_generator.py               (génération PDF)

crm-backend/templates/pdf/
├── quote_template.html            (template Jinja2)
└── styles.css                     (styles PDF)

crm-backend/api/routes/
├── products.py
└── quotes.py

crm-frontend/components/quotes/
├── QuoteEditor.tsx                (éditeur devis)
├── ProductCatalog.tsx             (sélection produits)
├── QuotePDFPreview.tsx            (aperçu PDF)
├── QuoteSignature.tsx             (signature électronique)
└── QuoteHistory.tsx               (versions)
```

**Template PDF devis:**
```
┌─────────────────────────────────────────────┐
│ [LOGO]              DEVIS N°2025-001        │
│ Votre Entreprise    Date: 18/10/2025        │
│                     Validité: 30 jours      │
├─────────────────────────────────────────────┤
│ Client: ACME Corp                           │
│ Contact: John Doe                           │
├─────────────────────────────────────────────┤
│ Produit          Qté   PU      Total        │
├─────────────────────────────────────────────┤
│ Service A         1   5 000€   5 000€       │
│ Service B         2   2 500€   5 000€       │
├─────────────────────────────────────────────┤
│                            Total HT: 10 000€ │
│                            TVA 20%:  2 000€ │
│                            Total TTC: 12 000€│
├─────────────────────────────────────────────┤
│ Conditions: Paiement à 30 jours             │
│ Signature client:                           │
│ [ZONE SIGNATURE ÉLECTRONIQUE]               │
└─────────────────────────────────────────────┘
```

**Résultats attendus:**
- ✅ Devis professionnels en 2 minutes
- ✅ PDF aux couleurs de l'entreprise
- ✅ Signature électronique valide
- ✅ Conversion automatique devis → deal

---

#### Semaine 11: Facturation & Suivi Paiements ⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥 (Gestion financière)
**Effort:** 🛠️🛠️🛠️🛠️ (5 jours)

**Tâches:**
- [ ] Génération factures:
  - [ ] Conversion devis accepté → facture
  - [ ] Numérotation automatique légale (2025-F-001)
  - [ ] Mentions légales obligatoires (SIRET, TVA intra, RIB)
  - [ ] Template PDF conforme réglementation française
  - [ ] Factures d'acompte (30% à la commande)
  - [ ] Avoirs (remboursements)
- [ ] Suivi paiements:
  - [ ] Statuts (Non payée, Payée partiellement, Payée, En retard)
  - [ ] Échéances (30 jours, 45 jours fin de mois)
  - [ ] Relances automatiques:
    - [ ] J-3: rappel aimable
    - [ ] J+7: relance ferme
    - [ ] J+30: mise en demeure
  - [ ] Enregistrement paiements (date, montant, mode)
- [ ] Tableau de bord financier:
  - [ ] CA facturé vs encaissé
  - [ ] Impayés (liste + montant total)
  - [ ] Prévisionnel de trésorerie (J+30, J+60, J+90)
  - [ ] Export comptable (FEC, CSV)

**Stack Technique:**
```python
# Backend
- WeasyPrint (PDF factures)
- Celery Beat (relances automatiques)

# Tables
- invoices (factures)
- invoice_lines (lignes factures)
- payments (paiements reçus)
- payment_reminders (historique relances)
```

**Fichiers à créer:**
```
crm-backend/models/
├── invoice.py                     (factures)
├── invoice_line.py                (lignes factures)
└── payment.py                     (paiements)

crm-backend/services/
├── invoice_generator.py           (génération factures)
└── payment_tracker.py             (suivi paiements)

crm-backend/tasks/payment_reminders.py (relances auto)
crm-backend/api/routes/invoices.py

crm-frontend/components/invoices/
├── InvoiceEditor.tsx              (création facture)
├── InvoicePDFPreview.tsx          (aperçu PDF)
├── PaymentTracker.tsx             (suivi paiements)
├── PaymentReminders.tsx           (gestion relances)
└── FinancialDashboard.tsx         (tableau de bord CA)
```

**Mentions légales facture (conformité France):**
```
- Numéro SIRET
- Numéro TVA intracommunautaire
- RCS + ville d'immatriculation
- Capital social
- RIB (si paiement par virement)
- Pénalités de retard (3x taux légal)
- Indemnité forfaitaire recouvrement (40€)
- Escompte si paiement anticipé
```

**Résultats attendus:**
- ✅ Factures conformes réglementation française
- ✅ Relances automatiques (zéro oubli)
- ✅ Visibilité trésorerie (prévisionnel fiable)
- ✅ Export comptable (FEC compatible)

---

#### Semaine 12: Gestion Contrats & Renouvellements ⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥 (Revenus récurrents)
**Effort:** 🛠️🛠️🛠️🛠️ (5 jours)

**Tâches:**
- [ ] Gestion des contrats:
  - [ ] Création contrat (lié à organisation + deal)
  - [ ] Informations clés:
    - [ ] Type (Prestation, Abonnement, Maintenance)
    - [ ] Date début / fin
    - [ ] Montant (mensuel, annuel)
    - [ ] Conditions renouvellement (tacite reconduction)
  - [ ] Upload document PDF (contrat signé)
  - [ ] Suivi versions (avenant 1, avenant 2...)
- [ ] Renouvellements automatiques:
  - [ ] Alertes expiration (J-90, J-60, J-30)
  - [ ] Workflow renouvellement:
    - [ ] J-60: email commercial "Préparer renouvellement"
    - [ ] J-30: email client "Proposition renouvellement"
    - [ ] J-0: si tacite reconduction → nouveau contrat créé automatiquement
  - [ ] Historique renouvellements
- [ ] Tableau de bord contrats:
  - [ ] MRR (Monthly Recurring Revenue)
  - [ ] ARR (Annual Recurring Revenue)
  - [ ] Taux de renouvellement (%)
  - [ ] Contrats à renouveler (30/60/90 jours)
  - [ ] Churn (contrats résiliés)
- [ ] Gestion résiliations:
  - [ ] Motif résiliation (prix, insatisfaction, concurrence)
  - [ ] Date effective
  - [ ] Impact sur MRR/ARR

**Stack Technique:**
```python
# Backend
- Celery Beat (alertes renouvellement)
- S3 ou stockage local (PDFs contrats)

# Tables
- contracts (contrats)
- contract_renewals (historique renouvellements)
- contract_amendments (avenants)
```

**Fichiers à créer:**
```
crm-backend/models/
├── contract.py                    (contrats)
├── contract_renewal.py            (renouvellements)
└── contract_amendment.py          (avenants)

crm-backend/services/
├── contract_manager.py            (logique métier)
└── renewal_tracker.py             (suivi renouvellements)

crm-backend/tasks/contract_reminders.py (alertes auto)
crm-backend/api/routes/contracts.py

crm-frontend/components/contracts/
├── ContractEditor.tsx             (création/édition)
├── ContractTimeline.tsx           (historique versions)
├── RenewalTracker.tsx             (suivi renouvellements)
├── MRRDashboard.tsx               (métriques récurrentes)
└── ChurnAnalysis.tsx              (analyse résiliations)
```

**KPIs contrats:**
```
MRR (Monthly Recurring Revenue):
- Somme des contrats mensuels actifs
- Évolution MoM (Month over Month)

ARR (Annual Recurring Revenue):
- MRR × 12
- Projection CA annuel récurrent

Taux de renouvellement:
- (Contrats renouvelés / Contrats arrivant à échéance) × 100
- Objectif: > 85%

Churn rate:
- (Contrats résiliés / Total contrats actifs) × 100
- Objectif: < 5% mensuel

Customer Lifetime Value (CLV):
- Montant moyen contrat × durée moyenne relation
```

**Résultats attendus:**
- ✅ Aucun contrat expiré par oubli (alertes à J-90)
- ✅ Visibilité MRR/ARR en temps réel
- ✅ Renouvellements tacites automatisés
- ✅ Analyse churn pour améliorer rétention

---

## 📊 Tableau Récapitulatif Phase 2

| Phase | Fonctionnalité | Impact | Effort | Semaines |
|-------|----------------|--------|--------|----------|
| **2.1 Analytics** | Dashboards personnalisables | ⭐⭐⭐⭐⭐ | 🛠️🛠️🛠️🛠️ | S1 |
| | Rapports automatisés | ⭐⭐⭐⭐ | 🛠️🛠️🛠️🛠️ | S2 |
| | Analytics IA & prédictions | ⭐⭐⭐⭐⭐ | 🛠️🛠️🛠️🛠️🛠️ | S3 |
| **2.2 Automation** | Workflows personnalisés | ⭐⭐⭐⭐⭐ | 🛠️🛠️🛠️🛠️🛠️ | S4 |
| | Email automation | ⭐⭐⭐⭐ | 🛠️🛠️🛠️🛠️ | S5 |
| | Tâches & rappels auto | ⭐⭐⭐ | 🛠️🛠️🛠️ | S6 |
| **2.3 Mobile** | Application PWA | ⭐⭐⭐⭐⭐ | 🛠️🛠️🛠️🛠️🛠️ | S7 |
| | Intégrations Office/Google | ⭐⭐⭐⭐ | 🛠️🛠️🛠️🛠️ | S8 |
| | Intégrations Compta/Marketing | ⭐⭐⭐ | 🛠️🛠️🛠️ | S9 |
| **2.4 Commercial** | Devis & propositions | ⭐⭐⭐⭐⭐ | 🛠️🛠️🛠️🛠️🛠️ | S10 |
| | Facturation & paiements | ⭐⭐⭐⭐ | 🛠️🛠️🛠️🛠️ | S11 |
| | Contrats & renouvellements | ⭐⭐⭐⭐ | 🛠️🛠️🛠️🛠️ | S12 |

**Métriques de succès:**
- 📱 Installation PWA: > 80% utilisateurs mobiles
- 🤖 Workflows actifs: > 5 workflows/utilisateur
- 📊 Dashboards personnalisés: > 70% utilisateurs
- 📧 Taux d'ouverture emails: > 25%
- 💰 Devis générés: +200% vs manuel
- 🔄 Sync Office 365/Google: < 15min latence
- 🎯 Lead scoring: précision > 70%
- 💼 MRR tracking: visibilité temps réel

---

## 🎯 Priorités Recommandées

### 🔴 MUST HAVE (Valeur métier immédiate)
1. **Workflows personnalisés** (S4) → Automatisation critique
2. **Devis & propositions** (S10) → Professionnalisation
3. **Dashboards personnalisables** (S1) → Visibilité métier
4. **Application PWA** (S7) → Mobilité commerciaux

### 🟡 SHOULD HAVE (Avantage concurrentiel)
5. **Analytics IA & prédictions** (S3) → Lead scoring
6. **Email automation** (S5) → Nurturing
7. **Facturation & paiements** (S11) → Gestion financière
8. **Intégrations Office 365/Google** (S8) → Productivité

### 🟢 NICE TO HAVE (Optimisations)
9. **Rapports automatisés** (S2) → Gain de temps management
10. **Tâches & rappels** (S6) → Organisation
11. **Contrats & renouvellements** (S12) → Revenus récurrents
12. **Intégrations Compta/Marketing** (S9) → Écosystème

---

## 📋 Prérequis Techniques Phase 2

### Infrastructure
```bash
# Nouveaux services
- Celery Workers (automatisations)
- Celery Beat (tâches planifiées)
- Redis (broker Celery + cache)
- MinIO ou S3 (stockage documents/PDFs)
- Elasticsearch (optionnel - recherche avancée)

# Docker Compose
docker-compose.yml:
  - crm-backend (FastAPI)
  - crm-frontend (Next.js)
  - postgres (base de données)
  - redis (cache + Celery broker)
  - celery-worker (x3 workers)
  - celery-beat (scheduler)
  - minio (stockage S3-compatible)
  - elasticsearch (optionnel)
```

### Dépendances Backend (Python)
```txt
# requirements.txt (ajouts Phase 2)
celery[redis]==5.3.4              # Tâches asynchrones
celery-beat==2.5.0                # Tâches planifiées
scikit-learn==1.3.2               # Machine Learning
pandas==2.1.3                     # Data processing
joblib==1.3.2                     # Sérialisation modèles
weasyprint==60.1                  # Génération PDF
reportlab==4.0.7                  # Alternative PDF
sendgrid==6.11.0                  # Email automation
authlib==1.2.1                    # OAuth2 (Office/Google)
microsoft-graph==1.0.0            # API Microsoft 365
google-api-python-client==2.108.0 # API Google
httpx==0.25.2                     # Requêtes HTTP async
dexie==1.0.0                      # IndexedDB (frontend)
tensorflow-lite==2.14.0           # OCR mobile (optionnel)
```

### Dépendances Frontend (npm)
```json
{
  "dependencies": {
    "react-grid-layout": "^1.4.4",
    "recharts": "^2.10.3",
    "react-flow": "^11.10.1",
    "react-email-editor": "^1.7.9",
    "next-pwa": "^5.6.0",
    "dexie": "^3.2.4",
    "workbox-webpack-plugin": "^7.0.0",
    "html2canvas": "^1.4.1",
    "jspdf": "^2.5.1"
  }
}
```

### Base de Données (PostgreSQL)
```sql
-- Nouvelles tables Phase 2

-- Analytics & Dashboards
CREATE TABLE dashboard_layouts (...);
CREATE TABLE dashboard_widgets (...);
CREATE TABLE scheduled_reports (...);
CREATE TABLE report_history (...);
CREATE TABLE ml_predictions (...);
CREATE TABLE ml_models_metadata (...);

-- Workflows & Automation
CREATE TABLE workflows (...);
CREATE TABLE workflow_executions (...);
CREATE TABLE email_templates (...);
CREATE TABLE email_campaigns (...);
CREATE TABLE email_sends (...);
CREATE TABLE email_events (...);
CREATE TABLE tasks (...);
CREATE TABLE task_recurrence (...);

-- Intégrations
CREATE TABLE oauth_tokens (...);
CREATE TABLE email_sync (...);
CREATE TABLE calendar_events (...);
CREATE TABLE webhook_configs (...);
CREATE TABLE webhook_logs (...);
CREATE TABLE integration_mappings (...);

-- Gestion Commerciale
CREATE TABLE products (...);
CREATE TABLE quotes (...);
CREATE TABLE quote_lines (...);
CREATE TABLE quote_versions (...);
CREATE TABLE invoices (...);
CREATE TABLE invoice_lines (...);
CREATE TABLE payments (...);
CREATE TABLE payment_reminders (...);
CREATE TABLE contracts (...);
CREATE TABLE contract_renewals (...);
CREATE TABLE contract_amendments (...);

-- Total: ~30 nouvelles tables
```

---

## 🚀 Démarrage Phase 2

### Étape 1: Infrastructure (Jour 1)
```bash
# 1. Mise à jour docker-compose.yml
# Ajouter: celery-worker, celery-beat, minio

# 2. Installation dépendances
cd crm-backend
pip install -r requirements-phase2.txt

cd crm-frontend
npm install

# 3. Migrations base de données
alembic revision --autogenerate -m "Phase 2 tables"
alembic upgrade head

# 4. Configuration variables d'environnement
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
SENDGRID_API_KEY=...
MICROSOFT_CLIENT_ID=...
GOOGLE_CLIENT_ID=...
```

### Étape 2: Choix Fonctionnalités Prioritaires (Jour 2)
```
Option A: Démarrage "Quick Wins"
→ Semaine 1: Dashboards personnalisables
→ Semaine 4: Workflows personnalisés
→ Semaine 10: Devis & propositions
(Impact métier immédiat)

Option B: Démarrage "Tech First"
→ Semaine 7: Application PWA
→ Semaine 8: Intégrations Office/Google
→ Semaine 3: Analytics IA
(Fondations techniques solides)

Option C: Démarrage "Commercial"
→ Semaine 10: Devis
→ Semaine 11: Facturation
→ Semaine 12: Contrats
(Cycle de vente complet)
```

### Étape 3: Validation Métier (Jour 3)
- [ ] Revue plan avec équipe commerciale
- [ ] Validation priorités avec direction
- [ ] Identification quick wins (ROI immédiat)
- [ ] Planification sprints (2 semaines/sprint)

---

## 📞 Support & Questions

**Documentation:**
- [PLAN_AMELIORATIONS_CRM.md](PLAN_AMELIORATIONS_CRM.md) - Phase 1 (terminée)
- Architecture technique: `crm-backend/README.md`
- API: `http://localhost:8000/docs` (Swagger)

**Contacts:**
- Lead Dev: [À définir]
- Product Owner: [À définir]
- Support technique: [À définir]

---

## 🎉 Vision Long Terme

**Après Phase 2 (Mois 6-12):**
- Multi-tenancy (SaaS multi-clients)
- Marketplace intégrations (connecteurs communautaires)
- Mobile natif iOS/Android (React Native)
- IA conversationnelle (assistant vocal)
- Internationalisation (10+ langues)
- Accessibilité WCAG AAA
- Conformité SOC 2 / ISO 27001

**Objectif 12 mois:**
- CRM Alforis = Référence marché TPM Finance
- 500+ utilisateurs actifs
- 95% satisfaction utilisateurs
- 99.9% uptime
- < 500ms temps réponse API (p95)

---

**Date de création:** 2025-10-18
**Version:** 2.0
**Statut:** 🆕 Planification (0/15 fonctionnalités complètes)
**Progrès Phase 1:** ✅ 9/11 terminé (82%)
**Durée estimée Phase 2:** 12 semaines (3 mois)
**ROI attendu:** Productivité équipes ×2, CA généré +30%
