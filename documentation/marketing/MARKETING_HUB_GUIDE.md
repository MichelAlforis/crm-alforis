# 📧 Marketing Hub - Guide Complet

**Dernière mise à jour** : 24 Octobre 2025
**Version** : 2.0
**Tests validés** : 178/178 (100%) ✅

---

## 📊 Vue d'ensemble

Le **Marketing Hub** est un système complet de marketing automation intégré au CRM Alforis. C'est un véritable "CRM dans le CRM" pour gérer vos campagnes email.

### Architecture
```
📧 Marketing Hub (/dashboard/marketing)
├── 📊 Dashboard Central (KPIs globaux)
├── 📮 Campagnes (Wizard 4 étapes)
├── 📋 Listes de Diffusion (Gestion destinataires)
└── 📄 Templates (Emails personnalisables)
```

### Fonctionnalités Principales
- ✅ **15 fonctionnalités majeures**
- ✅ **Wizard 4 étapes** pour création campagne
- ✅ **Tracking leads** avec scoring 0-100
- ✅ **Webhooks Resend** (9 événements temps réel)
- ✅ **RGPD** (désabonnements + liste noire)
- ✅ **Multi-provider** (Resend, SendGrid, Mailgun)

---

## 🎯 1. Dashboard Central

**Route** : `/dashboard/marketing`

### KPIs Affichés
| KPI | Source | Description |
|-----|--------|-------------|
| Total Envoyés | Sum(campaigns.sent_count) | Emails envoyés toutes campagnes |
| Taux Ouverture Moyen | Avg(open_rate) | % moyen d'ouverture |
| Taux Clic Moyen | Avg(click_rate) | % moyen de clics |
| Destinataires Totaux | Sum(lists.recipient_count) | Total dans listes |

### Cards Cliquables
- **Campagnes** → `/marketing/campaigns`
- **Listes** → `/marketing/mailing-lists`
- **Templates** → `/marketing/templates`

### Alerte Campagnes en Cours
Card bleue animée (pulse) si campagnes avec status `SENDING`

---

## 📮 2. Module Campagnes

### 2.1 Wizard Création (4 Étapes)

**Route** : `/marketing/campaigns/new`

#### Étape 1 : Informations Basiques
- **Nom** : Nom de la campagne (requis)
- **Description** : Description courte (optionnel)
- **Template** : Dropdown avec liste templates
  - Bouton "Créer nouveau template" (modal inline)

#### Étape 2 : Sélection Destinataires ⭐
**Composant** : RecipientSelectorTableV2

**Type de cible** :
- Contacts 👤 (personnes)
- Organisations 🏢

**8 Filtres Avancés** :
| Filtre | Type | Description |
|--------|------|-------------|
| Pays | Multi-select | France, Luxembourg, etc. |
| Langues | Multi-select | FR, EN, ES, DE, IT, PT |
| Catégories | Multi-select | BANK, ASSET_MANAGER, etc. |
| Types | Multi-select | Types organisations |
| Villes | Multi-select | Filtrer par ville |
| Rôles | Multi-select | Rôles contacts |
| Statut | Select | Actif/Inactif |
| IDs spécifiques | Array | Liste IDs manuels |

**Features** :
- ✅ Compteur temps réel (API `/recipients/count`)
- ✅ Table preview (pagination 10/page)
- ✅ Recherche nom/email/organisation
- ✅ Import fichiers (.txt/.csv)
- ✅ Export sélection (CSV/Excel)
- ✅ Sélection checkboxes persistante
- ✅ Bouton "Tout sélectionner" (max 10,000)
- ✅ Charger/Sauvegarder listes existantes

**Validation** : recipientCount > 0 (bloque si 0)

#### Étape 3 : Configuration Envoi
- **Provider** : Resend / SendGrid / Mailgun
- **Click tracking** : Toggle ON/OFF
- **Open tracking** : Toggle ON/OFF
- **Programmation** :
  - Immédiat (défaut)
  - Programmé (date picker)

#### Étape 4 : Récapitulatif
- Résumé campagne (nom, template, provider)
- Nombre destinataires (highlight)
- **Boutons** :
  - "Sauvegarder brouillon" → Status DRAFT
  - "Valider" → Crée campagne

### 2.2 Page Détails Campagne

**Route** : `/marketing/campaigns/[id]`

**Sections** :
- **Informations** : Nom, description, status, dates
- **Statistiques** : Envoyés, ouverts, cliqués, rebonds
- **Actions** :
  - Prévisualiser destinataires
  - Envoyer email de test
  - Démarrer l'envoi (confirmation required)

**Statuts** :
| Status | Badge | Description |
|--------|-------|-------------|
| DRAFT | Gris | Brouillon |
| SCHEDULED | Bleu | Programmé |
| SENDING | Bleu animé | Envoi en cours |
| SENT | Vert | Envoyé |
| FAILED | Rouge | Échec |

### 2.3 Preview Destinataires

**Route** : `/campaigns/[id]/preview`
**Endpoint** : GET `/campaigns/{id}/recipients`

**Affichage** :
- Table avec colonnes : Email, Nom, Type (Contact/Organisation)
- Pagination 10/page
- Compteur total dans header
- Bouton retour vers détails

### 2.4 Tracking Leads ⭐⭐⭐

**Route** : `/campaigns/[id]/sends/[sendId]`
**Endpoint** : GET `/campaigns/{id}/batches/{batch_id}/recipients-tracking`

**Scoring d'Engagement (0-100 points)** :
- **Clicks** : 20 pts par clic
- **Opens** : 10 pts par ouverture
- **Bonus récence** : +30 si <24h, +15 si <48h
- **Bonus engagement** : +20 si >3 ouvertures

**Classification Visuelle** :
| Score | Badge | Couleur | Icône |
|-------|-------|---------|-------|
| ≥70 | Lead très chaud | 🔴 Rouge | 🔥 |
| ≥40 | Lead chaud | 🟠 Orange | ⚡ |
| ≥20 | Intéressé | 🟢 Vert | 🟢 |
| <20 | Envoyé | ⚪ Gris | - |

**Timeline Événements** :
- Envoyé (sent_at)
- Ouvert (opened events avec timestamps)
- Cliqué (clicked events avec URLs)

**Actions Commerciales** :
| Bouton | Action | Priorité |
|--------|--------|----------|
| Rappeler | Crée tâche automatique | Haute si score ≥70 |
| Note | Redirige vers /people/{id} | - |
| Fiche | Modal contact | - |

**Filtres** :
- Tous (all)
- Ont cliqué (clicked)
- Ont ouvert (opened)
- Non ouverts (not_opened)
- Rebonds (bounced)

**Tri** :
- Par engagement (défaut)
- Par nom alphabétique
- Par date d'événement

**KPIs Batch Temps Réel** :
- Total destinataires
- Envoyés / Délivrés
- Ouverts (%)
- Cliqués (%)
- Rebonds

---

## 📋 3. Module Listes de Diffusion

**Route** : `/marketing/mailing-lists`

### 3.1 Page Principale

**Table avec** :
- Colonnes : Nom, Type, Destinataires, Créé le, Modifié le
- Tri par colonne (toutes colonnes)
- Pagination 20/page
- Actions : Modifier, Supprimer (confirmation)

**KPIs** :
- Total listes
- Total destinataires (sum)
- Moyenne destinataires par liste

### 3.2 Création Liste

**Route** : `/marketing/mailing-lists/new`

**Structure 3 Étapes** :

#### Étape 1 : Informations
- **Nom** : Requis, validation temps réel
- **Type** : Contacts 👤 / Organisations 🏢
- **Description** : Optionnel (3 lignes)

#### Étape 2 : Sélection Destinataires
**Composant** : RecipientSelectorTableV2 (idem Campagnes)

**Section pliable** :
- Bouton "Afficher/Masquer filtres"
- Compteur temps réel dans subtitle

**Import/Export** :
- Import : .txt (ID par ligne) ou .csv (colonne 'id')
- Export : CSV/Excel (sélection uniquement)

#### Étape 3 : Résumé
- 3 blocs : Nom, Type, Destinataires
- **Highlight compteur** : Bordure primary, taille 2xl
- Description affichée si présente

**Bouton "Créer"** :
- Disabled si nom vide OU 0 destinataires
- POST `/mailing-lists`
- Redirection liste avec toast succès

### 3.3 Édition Liste

**Route** : `/marketing/mailing-lists/[id]`

**Features** :
- Formulaire pré-rempli (nom, description, type, filtres)
- Sélection destinataires chargée (specific_ids restaurés)
- Métadonnées : Date création + dernière utilisation
- Bouton "Enregistrer" : PUT `/mailing-lists/{id}`
- Gestion erreurs : Alert + possibilité réessayer
- Gestion 404 : Alert + bouton retour

---

## 📄 4. Module Templates

**Route** : `/marketing/templates`

### 4.1 Page Principale

**Layout** :
- Grid responsive (3 col desktop, 2 tablet, 1 mobile)
- Cards avec : Nom, Sujet, Date création
- Actions : Aperçu, Modifier, Supprimer

**Bouton "Nouveau Template"** :
- Modal création (TemplateCreateModal)
- Champs : Nom, Sujet, Preheader, HTML Content
- Variables cliquables (insertion auto)
- POST `/email/templates`
- Cache invalidation React Query

### 4.2 Modal Preview ⭐

**Composant** : TemplatePreviewModal

**Features** :
- Toggle Desktop/Mobile (responsive preview)
- Fake email client header
- HTML rendering
- **Envoi email de test intégré** :
  - Input email avec validation
  - Bouton "Envoyer un test" (loading state)
  - POST `/email/templates/{id}/send-test`
  - Feedback ✅ succès / ❌ erreur
  - Auto-clear après 3s

**Responsive** :
- Largeur : 95vw mobile, 4xl desktop
- Footer : vertical mobile, horizontal desktop
- Boutons Desktop/Mobile cachés sur < sm

### 4.3 Modal Edit ⭐

**Composant** : TemplateEditModal

**Features** :
- **Split-view 50/50** :
  - Gauche : Éditeur (Nom, Sujet, Preheader, HTML)
  - Droite : Preview temps réel
- Variables cliquables (insertion)
- Toggle Desktop/Mobile (preview)
- PUT `/email/templates/{id}` avec cache invalidation
- Loading state pendant sauvegarde

**Responsive** :
- Layout vertical mobile (éditeur en haut, preview en bas)
- Layout horizontal desktop (split 50/50)
- Padding adaptatif (p-3 → md:p-6)
- Boutons stack vertical mobile, horizontal desktop

### 4.4 Suppression Template

**Validation backend** :
- Check si template utilisé dans campagne active
- Erreur 400 si utilisé
- DELETE `/email/templates/{id}` si OK
- Confirmation via useConfirm (danger)

---

## 🔧 5. Configuration Technique

### 5.1 Providers Email

**Table** : `email_configurations`

| Provider | Status | Features |
|----------|--------|----------|
| Resend | ✅ Configuré | Webhooks, Tracking |
| SendGrid | ⏳ Disponible | Tracking complet |
| Mailgun | ⏳ Disponible | Tracking basique |

**Encryption Clé API** :
- Service : EmailConfigurationService
- Méthode : Fernet (Python cryptography)
- Décryptage automatique avant envoi

### 5.2 Webhooks Resend ⭐

**Endpoint** : POST `/api/v1/webhooks/resend`
**Sécurité** : Bearer Token (WEBHOOK_SECRET)

**9 Événements Supportés** :
| Événement | Status Interne | KPI |
|-----------|----------------|-----|
| email.sent | PROCESSED | - |
| email.delivered | DELIVERED | Taux délivrabilité |
| email.delivery_delayed | DEFERRED | - |
| email.failed | DROPPED | - |
| email.bounced | BOUNCED | Taux bounce |
| email.opened | OPENED | Taux ouverture |
| email.clicked | CLICKED | Taux clic (CTR) |
| email.complained | SPAM_REPORT | Taux spam |
| email.scheduled | PROCESSED | - |

**KPIs Calculés** :
- Taux délivrabilité = delivered / sent
- Taux ouverture = opened / delivered
- Taux clic (CTR) = clicked / delivered
- Taux bounce = bounced / sent
- Taux spam = complained / sent

**Configuration** :
```
URL : https://www.alforis.fr/api/webhooks/resend
Proxy : Forward vers CRM backend
Secret : Configuré dans .env.local
```

### 5.3 RGPD Désabonnements ⭐

**Modèle** : UnsubscribedEmail

**Table** : `unsubscribed_emails`
- email (UNIQUE)
- source (resend, manual, web)
- reason (optionnel)
- created_at

**Colonnes ajoutées** :
- `person.email_unsubscribed` (boolean)
- `organisation.email_unsubscribed` (boolean)

**Endpoints** :
- GET `/subscriptions/{campaign_id}` - Liste abonnés
- POST `/subscriptions` (bulk) - Création masse
- DELETE `/subscriptions/{id}` - Désabonnement soft delete
- POST `/webhooks/unsubscribe` - Désabonnement site web

**Webhooks** :
- Event UNSUBSCRIBED de Resend
- Ajout automatique à liste noire
- Flag email_unsubscribed = true

---

## 🐛 6. Bugs Corrigés

### Bug #1 : Infinite Loop RecipientSelectorTableV2
- **Cause** : JSON.stringify() dans useEffect dependencies
- **Solution** : Pattern useRef pour deep comparison
- **Fichier** : RecipientSelectorTableV2.tsx:101-107
- **Impact** : Freeze interface corrigé

### Bug #2 : Validation Step 2 Manquante
- **Cause** : Validation retournait toujours true
- **Solution** : Validation recipientCount > 0
- **Fichier** : CampaignWizard.tsx:156
- **Impact** : Empêche campagnes vides

### Bug #3 : 51 console.log en Production
- **Cause** : console.log directs exposent données
- **Solution** : Logger wrapper (lib/logger.ts)
- **Fichiers** : 19 fichiers email/marketing
- **Impact** : Production-safe

### Bug #4 : Endpoint Batch Manquant
- **Cause** : Seul endpoint liste existait
- **Solution** : GET `/batches/{batch_id}` ajouté
- **Fichier** : email_campaigns.py:602-627
- **Impact** : Page tracking corrigée

### Bug #5 : Mapping template_id
- **Cause** : Frontend/backend noms différents
- **Solution** : Transformation bidirectionnelle
- **Fichier** : campaigns/new/page.tsx
- **Impact** : Erreur "Field required" corrigée

---

## 📊 7. Métriques de Succès

| Métrique | Valeur |
|----------|--------|
| Tests validés | 178/178 (100%) |
| Bugs corrigés | 5/5 (100%) |
| Fonctionnalités majeures | 15/15 (100%) |
| Endpoints créés | 15+ |
| Composants réutilisables | 11 |
| Hooks réutilisables | 4 |
| Performance Lighthouse | ⭐ Excellent |

---

## 🎯 8. Workflows Validés

### Workflow 1 : Créer et Envoyer Campagne
1. Créer/choisir template
2. Wizard 4 étapes → Campagne DRAFT
3. Envoyer email de test
4. Prévisualiser destinataires
5. Démarrer envoi → SENDING → SENT

### Workflow 2 : Gérer Liste Diffusion
1. Créer liste (/new)
2. Sélectionner destinataires (filtres/import)
3. Sauvegarder
4. Réutiliser dans campagne (dropdown)

### Workflow 3 : Analyser Leads Chauds
1. Campagne envoyée
2. Page tracking (/sends/[sendId])
3. Filtrer "Ont cliqué"
4. Trier par "Engagement"
5. Leads 🔥 en premier
6. Créer tâche "Rappeler" (haute priorité)

---

## 🔗 Ressources

- [Chapitre 6 - Tests Marketing](../../checklists/06-marketing.md)
- [Guide Campagnes Email](./email-campaigns-guide.md)
- [RGPD Abonnements](./FEATURE_CAMPAIGN_SUBSCRIPTIONS.md)
- [Hooks Réutilisables](../frontend/HOOKS.md)
- [API Endpoints](../backend/API_ENDPOINTS.md)

---

**Dernière mise à jour** : 24 Octobre 2025
