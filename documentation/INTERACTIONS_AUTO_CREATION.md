# Système d'Auto-Création d'Interactions

Documentation complète du système permettant de créer automatiquement des interactions depuis différentes sources (emails, hooks, frontend).

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [API Endpoints](#api-endpoints)
4. [Composants Frontend](#composants-frontend)
5. [Cas d'usage](#cas-dusage)
6. [Intégration avec les hooks](#intégration-avec-les-hooks)
7. [Guide d'implémentation](#guide-dimplémentation)

---

## Vue d'ensemble

Le système d'auto-création d'interactions permet de **transformer automatiquement les actions métier en interactions trackées** dans le CRM.

### Fonctionnalités clés

✅ **Création automatique** depuis envois d'emails
✅ **Endpoint simplifié** pour le frontend
✅ **Support multi-participants** (contacts CRM + externes)
✅ **Métadonnées enrichies** pour traçabilité
✅ **Hooks personnalisables** pour intégrations futures

### Sources d'interactions supportées

- 📧 **Emails envoyés** via campagnes email
- 📞 **Appels téléphoniques** enregistrés manuellement
- 📝 **Notes rapides** depuis le frontend
- 🔗 **Hooks personnalisés** (webhook, intégrations externes)
- 📨 **Newsletters** envoyées à plusieurs destinataires

---

## Architecture

### Services Backend

```
crm-backend/services/
├── interaction_auto_creator.py  # Service principal
├── activity_participant.py       # Gestion participants
└── email_service.py              # Emails (peut appeler auto-creator)
```

#### `InteractionAutoCreatorService`

**Méthodes principales:**

```python
# Créer depuis un EmailSend
await create_from_email_send(
    email_send: EmailSend,
    created_by: Optional[int] = None,
    additional_context: Optional[dict] = None
) -> Optional[OrganisationActivity]

# Créer depuis une newsletter
await create_from_newsletter(
    campaign_id: int,
    organisation_id: int,
    recipients: List[dict],
    created_by: Optional[int] = None
) -> Optional[OrganisationActivity]

# Créer une interaction simple
await create_simple_interaction(
    organisation_id: int,
    activity_type: str,
    title: str,
    description: Optional[str] = None,
    recipients: Optional[List[dict]] = None,
    metadata: Optional[dict] = None,
    created_by: Optional[int] = None,
    occurred_at: Optional[datetime] = None
) -> Optional[OrganisationActivity]
```

---

## API Endpoints

### POST `/api/v1/interactions`

**Créer une interaction simple rapidement**

**Body:**
```json
{
  "organisation_id": 42,
  "type": "email",
  "title": "Email: Proposition commerciale Q4",
  "description": "Envoi de la proposition tarifaire 2025",
  "recipients": [
    {
      "email": "john.doe@example.com",
      "name": "John Doe",
      "role": "CEO"
    }
  ],
  "metadata": {
    "source": "manual",
    "urgency": "high"
  }
}
```

**Response:**
```json
{
  "id": 123,
  "organisation_id": 42,
  "type": "email",
  "title": "Email: Proposition commerciale Q4",
  "description": "Envoi de la proposition tarifaire 2025",
  "occurred_at": "2025-10-21T14:30:00Z",
  "participants": [
    {
      "id": 456,
      "external_name": "John Doe",
      "external_email": "john.doe@example.com",
      "external_role": "CEO",
      "is_organizer": false,
      "attendance_status": "confirmed"
    }
  ],
  "attachments_count": 0
}
```

### POST `/api/v1/interactions/from-email-send/{send_id}`

**Créer une interaction depuis un EmailSend existant**

Utile pour:
- Créer rétroactivement des interactions depuis emails déjà envoyés
- Hook automatique après envoi d'email
- Synchronisation batch d'historique

**Response:** Même structure que `/interactions`

---

## Composants Frontend

### `QuickInteractionButton`

**Bouton rapide pour créer une interaction en 2 clics**

```tsx
import QuickInteractionButton from '@/components/activities/QuickInteractionButton'

<QuickInteractionButton
  organisationId={42}
  onSuccess={() => {
    // Rafraîchir la liste des interactions
    refetch()
  }}
/>
```

**Fonctionnalités:**
- Sélection rapide du type (email, appel, note)
- Formulaire minimal (titre + description)
- Ajout optionnel de destinataire
- Création instantanée

### `CreateActivityModal`

**Modal complet pour interactions multi-participants**

```tsx
import CreateActivityModal from '@/components/activities/CreateActivityModal'

<CreateActivityModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  organisationId={42}
  onSuccess={() => refetch()}
/>
```

**Fonctionnalités:**
- Support tous les types (appel, email, reunion, dejeuner)
- Multi-participants (jusqu'à 50)
- Participants CRM ou externes
- Métadonnées enrichies

### `RecentActivities`

**Widget "5 dernières interactions"**

```tsx
import RecentActivities from '@/components/activities/RecentActivities'

// Pour une organisation
<RecentActivities
  organisationId={42}
  limit={5}
  showFilters={true}
/>

// Pour une personne
<RecentActivities
  personId={78}
  limit={5}
/>
```

---

## Cas d'usage

### 1. Email envoyé manuellement

**Scénario:** Vous envoyez un email depuis Gmail/Outlook et voulez le tracker dans le CRM.

**Frontend:**
```tsx
<QuickInteractionButton organisationId={42} />
// Clic → "Email" → Titre: "Proposition Q4" → Créer
```

**API appelée:**
```bash
POST /api/v1/interactions
{
  "organisation_id": 42,
  "type": "email",
  "title": "Email: Proposition Q4",
  "recipients": [{"email": "client@example.com"}]
}
```

**Résultat:** Interaction EMAIL créée, visible dans la timeline organisation

---

### 2. Appel téléphonique

**Scénario:** Après un call client, vous notez rapidement l'interaction.

**Frontend:**
```tsx
<QuickInteractionButton organisationId={42} />
// Clic → "Appel" → Titre: "Call découverte" → Description → Créer
```

**Résultat:** Interaction APPEL avec date/heure actuelle

---

### 3. Email automatique via campagne

**Scénario:** Un email est envoyé via le système de campagne.

**Hook automatique** (dans `EmailDeliveryService`):
```python
# Après envoi réussi
if send.organisation_id:
    auto_creator = InteractionAutoCreatorService(db)
    await auto_creator.create_from_email_send(send)
```

**Résultat:** Interaction EMAIL auto-créée avec:
- Titre: "Email: [subject]"
- Participant: destinataire (CRM ou externe)
- Métadonnées: campaign_id, template_id, email_send_id

---

### 4. Newsletter à plusieurs contacts

**Scénario:** Newsletter envoyée à 200 contacts d'une organisation.

**Code backend:**
```python
auto_creator = InteractionAutoCreatorService(db)
await auto_creator.create_from_newsletter(
    campaign_id=123,
    organisation_id=42,
    recipients=[
        {"email": "contact1@example.com", "name": "Alice", "person_id": 10},
        {"email": "contact2@example.com", "name": "Bob", "person_id": 15},
        # ... jusqu'à 50 max pour éviter surcharge
    ]
)
```

**Résultat:**
- 1 interaction "Newsletter: [nom campagne]"
- 50 participants max (limitation performance)
- Métadonnées: total_recipients=200

---

### 5. Réunion avec 6 personnes

**Frontend:**
```tsx
<CreateActivityModal organisationId={42} />
// Type: Réunion
// Titre: "Réunion Q4 - Stratégie"
// Participants: 6 personnes ajoutées
```

**Résultat:** Interaction REUNION avec 6 participants trackés

---

## Intégration avec les hooks

### Hook: Envoi d'email

**Fichier:** `crm-backend/services/email_service.py`

**Méthode:** `EmailDeliveryService.send_now()`

**Code ajouté:**
```python
# Après envoi réussi SendGrid/Mailgun
if send.organisation_id:
    try:
        auto_creator = _get_interaction_auto_creator(self.db)
        await auto_creator.create_from_email_send(send)
    except Exception as exc:
        logger.warning("Failed to auto-create interaction", extra={"send_id": send.id})
```

**Comportement:**
- ✅ Non bloquant (try/except)
- ✅ Logged pour debugging
- ✅ Seulement si `organisation_id` présent
- ✅ Asynchrone

---

### Hook: Newsletter

**Appel manuel recommandé:**

```python
# Dans le endpoint qui schedule une newsletter
if campaign.schedule_type == "newsletter":
    auto_creator = InteractionAutoCreatorService(db)
    await auto_creator.create_from_newsletter(
        campaign_id=campaign.id,
        organisation_id=organisation_id,
        recipients=payload.recipients
    )
```

---

### Hook personnalisé (webhook externe)

**Exemple: Zapier/Make envoie un webhook**

**Endpoint à créer:**
```python
@router.post("/webhooks/external-interaction")
async def create_from_webhook(payload: dict, db: Session = Depends(get_db)):
    auto_creator = InteractionAutoCreatorService(db)
    return await auto_creator.create_simple_interaction(
        organisation_id=payload["organisation_id"],
        activity_type=payload["type"],
        title=payload["title"],
        description=payload.get("description"),
        recipients=payload.get("recipients"),
        metadata={"source": "webhook", "provider": payload.get("provider")}
    )
```

---

## Guide d'implémentation

### Étape 1: Créer interaction simple depuis frontend

```tsx
// Dans votre composant
import QuickInteractionButton from '@/components/activities/QuickInteractionButton'

export default function OrganisationPage({ organisationId }) {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div>
      <QuickInteractionButton
        organisationId={organisationId}
        onSuccess={() => setRefreshKey(prev => prev + 1)}
      />

      <RecentActivities
        organisationId={organisationId}
        key={refreshKey}  // Force refresh
      />
    </div>
  )
}
```

---

### Étape 2: Afficher les 5 dernières interactions

```tsx
// Page organisation
<RecentActivities
  organisationId={42}
  limit={5}
  showFilters={true}
/>

// Page personne
<RecentActivities
  personId={78}
  limit={5}
  showFilters={false}
/>
```

---

### Étape 3: Hook automatique email

**Déjà implémenté!** Les emails envoyés via campagne créent automatiquement une interaction.

**Vérification:**
1. Envoyer un email via `/api/v1/email/campaigns/{id}/schedule`
2. Vérifier logs backend: `"Interaction auto-created from email_send"`
3. Voir interaction dans `/api/v1/organisations/{id}/activities/recent`

---

### Étape 4: Créer interaction programmatiquement

```python
from services.interaction_auto_creator import InteractionAutoCreatorService

async def my_custom_function(db: Session, organisation_id: int):
    auto_creator = InteractionAutoCreatorService(db)

    activity = await auto_creator.create_simple_interaction(
        organisation_id=organisation_id,
        activity_type="note",
        title="Import automatique réussi",
        description="200 contacts importés depuis CSV",
        metadata={"source": "csv_import", "count": 200},
        created_by=current_user_id
    )

    return activity
```

---

## Bonnes pratiques

### ✅ DO

- Utiliser `create_simple_interaction()` pour actions rapides
- Ajouter des métadonnées pour traçabilité (`source`, `import_id`, etc.)
- Capturer les erreurs sans bloquer le workflow principal
- Limiter les participants à 50 max pour performance
- Utiliser `occurred_at` pour interactions passées

### ❌ DON'T

- Ne pas créer d'interaction sans `organisation_id`
- Ne pas oublier de valider le type d'activité
- Ne pas créer des doublons (vérifier si existe déjà)
- Ne pas surcharger avec des milliers de participants
- Ne pas bloquer l'exécution si création échoue

---

## Tests manuels

### Test 1: Interaction rapide

```bash
curl -X POST http://localhost:8000/api/v1/interactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organisation_id": 1,
    "type": "email",
    "title": "Test email rapide",
    "recipients": [{"email": "test@example.com", "name": "Test User"}]
  }'
```

**Attendu:** Status 201, interaction créée

---

### Test 2: Récupérer dernières interactions

```bash
curl -X GET "http://localhost:8000/api/v1/organisations/1/activities/recent?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Attendu:** Liste de 5 interactions max

---

### Test 3: Filtre par type

```bash
curl -X GET "http://localhost:8000/api/v1/organisations/1/activities/recent?activity_types=email,appel" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Attendu:** Seulement emails et appels

---

## Dépannage

### Problème: Interaction non créée automatiquement

**Vérifications:**
1. L'email a-t-il un `organisation_id` ?
2. Logs backend: chercher "Failed to auto-create interaction"
3. Vérifier que le service `InteractionAutoCreatorService` est bien importé

---

### Problème: Participants non affichés

**Vérifications:**
1. La relation `participants` est-elle chargée ? (lazy loading)
2. Le frontend reçoit-il bien le champ `participants` ?
3. Vérifier la migration BDD: table `activity_participants` existe ?

---

### Problème: Endpoint 404

**Vérifications:**
1. La route est-elle enregistrée dans `api/__init__.py` ?
2. Ligne: `api_router.include_router(interactions.router)`
3. Redémarrer le backend

---

## Roadmap future

- [ ] Support participants LinkedIn (import auto)
- [ ] Détection automatique doublons
- [ ] Suggestions IA de titre/description
- [ ] Export interactions en PDF
- [ ] Intégration calendrier (Google/Outlook)
- [ ] Webhook sortant après création
- [ ] Analytics avancées par type d'interaction

---

**Dernière mise à jour:** 21 octobre 2025
**Version:** 1.0.0
