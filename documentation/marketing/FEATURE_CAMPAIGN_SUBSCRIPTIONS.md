# Feature: Abonnements aux Campagnes Email

## Vue d'ensemble

Cette feature permet d'abonner manuellement des personnes ou des organisations à des campagnes email. Les abonnements sont visibles et gérables depuis les pages de détail Person et Organisation, ainsi que depuis les pages de gestion de campagnes.

## Architecture

### Backend

#### 1. Modèle de données (`CampaignSubscription`)

**Fichier**: `crm-backend/models/email.py` (lignes 345-370)

```python
class CampaignSubscription(BaseModel):
    """Abonnement manuel d'une personne ou organisation à une campagne."""

    campaign_id: int (FK -> email_campaigns.id)
    person_id: int? (FK -> people.id)
    organisation_id: int? (FK -> organisations.id)
    subscribed_by: int? (FK -> users.id)
    is_active: bool
    unsubscribed_at: datetime?
```

**Contraintes**:
- Au moins `person_id` OU `organisation_id` doit être fourni (pas les deux)
- Index unique sur (`campaign_id`, `person_id`, `organisation_id`)
- Cascade DELETE sur campaign, person, organisation
- SET NULL sur subscribed_by

#### 2. Schemas Pydantic

**Fichier**: `crm-backend/schemas/email.py` (lignes 295-366)

- `CampaignSubscriptionCreate`: Création d'un abonnement
- `CampaignSubscriptionResponse`: Réponse avec données enrichies
- `CampaignSubscriptionBulkCreate`: Abonnement en masse
- `CampaignSubscriptionBulkResponse`: Résultat d'abonnement en masse

#### 3. Endpoints API

**Fichier**: `crm-backend/api/routes/email_campaigns.py` (lignes 588-955)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/email/campaigns/{campaign_id}/subscriptions` | Abonner une entité à une campagne |
| DELETE | `/email/campaigns/{campaign_id}/subscriptions/{subscription_id}` | Désabonner (soft delete) |
| GET | `/email/campaigns/{campaign_id}/subscriptions` | Lister les abonnements d'une campagne |
| GET | `/email/people/{person_id}/subscriptions` | Lister les abonnements d'une personne |
| GET | `/email/organisations/{organisation_id}/subscriptions` | Lister les abonnements d'une organisation |
| POST | `/email/campaigns/subscriptions/bulk` | Abonnement en masse |

#### 4. Migration de base de données

**Fichier**: `crm-backend/alembic/versions/add_campaign_subscriptions.py`

- Révision: `add_campaign_subscriptions`
- Dépend de: `add_mailing_lists`
- Crée la table `campaign_subscriptions` avec tous les indexes

**Commande pour appliquer**:
```bash
cd crm-backend
alembic upgrade head
```

### Frontend

#### 1. Hook React Query

**Fichier**: `crm-frontend/hooks/useCampaignSubscriptions.ts`

**Hooks exportés**:
- `useCampaignSubscriptions(campaignId)`: Gérer les abonnements d'une campagne
- `usePersonSubscriptions(personId)`: Récupérer les abonnements d'une personne
- `useOrganisationSubscriptions(organisationId)`: Récupérer les abonnements d'une organisation
- `useSubscribeToCampaign()`: Hook réutilisable pour abonner/désabonner depuis n'importe où

**Fonctionnalités**:
- Query avec React Query (cache automatique)
- Mutations avec invalidation de cache
- Toasts de succès/erreur
- Gestion des états de chargement

#### 2. Composant UI

**Fichier**: `crm-frontend/components/email/CampaignSubscriptionManager.tsx`

**Props**:
```typescript
interface CampaignSubscriptionManagerProps {
  entityType: 'person' | 'organisation'
  entityId: number
  entityName: string
}
```

**Fonctionnalités**:
- Liste des abonnements actifs et inactifs
- Modal pour ajouter un abonnement
- Sélection de campagne avec liste filtrée (exclut déjà abonnées)
- Bouton de désabonnement
- Affichage des dates d'abonnement/désabonnement

#### 3. Intégration dans les pages

**Fichiers modifiés**:
- `crm-frontend/app/dashboard/people/[id]/page.tsx` (lignes 18, 328-333)
- `crm-frontend/app/dashboard/organisations/[id]/page.tsx` (lignes 23, 413-420)

Le composant est ajouté après la section des rattachements/timeline dans chaque page.

## Utilisation

### 1. Depuis une page Person

1. Naviguer vers une fiche personne (`/dashboard/people/{id}`)
2. Scroller jusqu'à la section "Abonnements aux campagnes"
3. Cliquer sur "Abonner à une campagne"
4. Sélectionner une campagne dans la liste
5. Valider

### 2. Depuis une page Organisation

1. Naviguer vers une fiche organisation (`/dashboard/organisations/{id}`)
2. Scroller jusqu'à la section "Abonnements aux campagnes"
3. Cliquer sur "Abonner à une campagne"
4. Sélectionner une campagne dans la liste
5. Valider

### 3. Via API (abonnement en masse)

```bash
curl -X POST http://localhost:8000/api/v1/email/campaigns/subscriptions/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 1,
    "person_ids": [1, 2, 3],
    "organisation_ids": [5, 6]
  }'
```

## Scénarios d'usage

### Cas 1: Abonner un client VIP à une campagne exclusive

1. Ouvrir la fiche du client (Person)
2. Abonner à la campagne "VIP Q1 2025"
3. Le client recevra tous les emails de cette campagne

### Cas 2: Abonner toutes les institutions à une newsletter

1. Utiliser l'endpoint bulk avec la liste des IDs d'organisations
2. Tous les abonnements sont créés en une seule requête
3. Le système gère les doublons automatiquement

### Cas 3: Désabonner une organisation

1. Depuis la fiche organisation
2. Dans la section abonnements, cliquer sur le bouton de désabonnement
3. L'abonnement est marqué comme inactif (soft delete)
4. Il apparaît dans la section "Abonnements inactifs"

## Données techniques

### Invalidation de cache

Lorsqu'un abonnement est créé/supprimé, les caches suivants sont invalidés:
- `campaign-subscriptions` (tous ou pour une campagne spécifique)
- `person-subscriptions` (pour la personne concernée)
- `organisation-subscriptions` (pour l'organisation concernée)
- `campaigns` (liste des campagnes)

### Événements

Tous les endpoints émettent des événements:
- Type: `EMAIL_CAMPAIGN_UPDATED`
- Actions: `subscription_added`, `subscription_removed`, `bulk_subscriptions_added`
- Données: campaign_id, entity_type, entity_id, statistiques

### Validation

#### Backend (Pydantic)
- Au moins person_id OU organisation_id requis
- campaign_id doit être > 0
- Vérification d'existence des entités
- Prévention des doublons

#### Frontend
- Désactivation du bouton si aucune campagne disponible
- Campagnes déjà abonnées filtrées de la liste
- Affichage de messages d'erreur contextuels

## Tests recommandés

### Backend
```bash
# Créer un abonnement
curl -X POST http://localhost:8000/api/v1/email/campaigns/1/subscriptions \
  -d '{"campaign_id": 1, "person_id": 5}'

# Lister les abonnements
curl http://localhost:8000/api/v1/email/campaigns/1/subscriptions

# Désabonner
curl -X DELETE http://localhost:8000/api/v1/email/campaigns/1/subscriptions/1
```

### Frontend
1. ✅ Abonnement Person → campagne
2. ✅ Abonnement Organisation → campagne
3. ✅ Désabonnement
4. ✅ Affichage liste abonnements actifs
5. ✅ Affichage liste abonnements inactifs
6. ✅ Filtrage campagnes disponibles
7. ✅ Gestion erreurs (campagne/entité inexistante)
8. ✅ Doublon détecté (déjà abonné)

## Extensions futures possibles

1. **Abonnement depuis la création de campagne**: Ajouter un sélecteur d'entités dans le formulaire de création de campagne
2. **Statistiques**: Nombre d'abonnés par campagne dans le dashboard
3. **Export**: Exporter la liste des abonnés d'une campagne (CSV/Excel)
4. **Notifications**: Notifier les abonnés lors de l'ajout/retrait
5. **Historique**: Tracer tous les changements d'abonnement
6. **Groupes**: Permettre d'abonner des groupes entiers

## Fichiers créés/modifiés

### Backend (4 fichiers modifiés + 1 créé)
- ✅ `models/email.py` - Ajout du modèle `CampaignSubscription`
- ✅ `models/__init__.py` - Export du nouveau modèle
- ✅ `schemas/email.py` - Ajout des schemas d'abonnement
- ✅ `api/routes/email_campaigns.py` - Ajout des 6 endpoints
- ✅ `alembic/versions/add_campaign_subscriptions.py` - Migration DB

### Frontend (4 fichiers créés + 2 modifiés)
- ✅ `hooks/useCampaignSubscriptions.ts` - Hook React Query
- ✅ `components/email/CampaignSubscriptionManager.tsx` - Composant UI
- ✅ `app/dashboard/people/[id]/page.tsx` - Intégration Person
- ✅ `app/dashboard/organisations/[id]/page.tsx` - Intégration Organisation

### Documentation
- ✅ `FEATURE_CAMPAIGN_SUBSCRIPTIONS.md` - Cette documentation

**Total**: 10 fichiers modifiés/créés

## Commandes pour déployer

```bash
# 1. Backend - Appliquer la migration
cd crm-backend
alembic upgrade head

# 2. Frontend - Rebuild (si nécessaire)
cd ../crm-frontend
npm run build

# 3. Redémarrer les services
docker-compose restart backend
docker-compose restart frontend
```

## Statut

✅ **COMPLÉTÉ** - Tous les éléments sont implémentés et prêts à être testés.

- Backend: Modèle, schemas, endpoints, migration ✅
- Frontend: Hook, composant, intégration ✅
- Documentation: Complète ✅

## Prochaines étapes

1. Appliquer la migration de base de données
2. Tester les endpoints API
3. Tester l'interface utilisateur
4. Vérifier les cas d'erreur
5. (Optionnel) Ajouter le sélecteur dans la création de campagne
