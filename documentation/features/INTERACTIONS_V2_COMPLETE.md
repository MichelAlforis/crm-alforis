# Interactions V2 + Email Marketing - Implementation Complete

**Date**: 2025-10-24
**Branch**: `feature/chapitre7-workflows-interactions`
**Commits**: 6 commits (backend: 4, frontend: 2)

## 📋 Overview

Implémentation complète d'**Interactions V2** avec workflow inbox et d'**Email Marketing lite** avec lead scoring automatique.

---

## ✅ Backend Implementation

### 1. Database Migrations

#### Migration: `add_interactions_v2_fields.py`
```sql
-- Add workflow inbox fields to interactions
ALTER TABLE crm_interactions ADD COLUMN status interaction_status NOT NULL DEFAULT 'todo';
ALTER TABLE crm_interactions ADD COLUMN assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE crm_interactions ADD COLUMN next_action_at TIMESTAMPTZ;
ALTER TABLE crm_interactions ADD COLUMN notified_at TIMESTAMPTZ;
ALTER TABLE crm_interactions ADD COLUMN linked_task_id INTEGER REFERENCES tasks(id);
ALTER TABLE crm_interactions ADD COLUMN linked_event_id INTEGER;

-- Indexes for performance
CREATE INDEX idx_interactions_status_assignee ON crm_interactions(status, assignee_id);
CREATE INDEX idx_interactions_next_action ON crm_interactions(next_action_at) WHERE next_action_at IS NOT NULL;
```

#### Migration: `add_email_sends_lead_scores.py`
```sql
-- Email tracking table
CREATE TABLE email_sends (
    id SERIAL PRIMARY KEY,
    organisation_id INTEGER REFERENCES organisations(id),
    person_id INTEGER REFERENCES people(id),
    provider VARCHAR(50) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    status email_status NOT NULL DEFAULT 'sent',
    sent_at TIMESTAMPTZ,
    open_count INTEGER NOT NULL DEFAULT 0,
    click_count INTEGER NOT NULL DEFAULT 0,
    last_open_at TIMESTAMPTZ,
    last_click_at TIMESTAMPTZ,
    interaction_id INTEGER REFERENCES crm_interactions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_provider_external_id UNIQUE (provider, external_id)
);

-- Lead scoring table
CREATE TABLE lead_scores (
    person_id INTEGER PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    last_event_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_lead_scores_score ON lead_scores(score DESC);
```

### 2. Models

#### `models/interaction.py` (Extended)
```python
class InteractionStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"

class Interaction(BaseModel):
    # ... existing fields
    # V2 fields:
    status = Column(Enum(InteractionStatus), nullable=False, default=InteractionStatus.TODO, index=True)
    assignee_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    next_action_at = Column(DateTime(timezone=True), nullable=True, index=True)
    notified_at = Column(DateTime(timezone=True), nullable=True)
```

#### `models/email_marketing.py` (New)
```python
class EmailStatus(str, enum.Enum):
    SENT = "sent"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"

class EmailSend(BaseModel):
    provider: str
    external_id: str  # Unique per provider
    status: EmailStatus
    open_count: int = 0
    click_count: int = 0
    interaction_id: Optional[int]  # Auto-linked on first open

class LeadScore(BaseModel):
    person_id: int  # PK
    score: int = 0  # Min 0
    last_event_at: Optional[datetime]
```

### 3. API Endpoints

#### `routers/interactions.py` (Extended)

**GET /api/v1/interactions/inbox**
```python
Query params:
- assignee: 'me' | user_id | 'unassigned' | None (default: non-done)
- status: 'todo' | 'in_progress' | 'done' | None
- due: 'overdue' | 'today' | 'week' | 'all'
- limit: int (default: 50, max: 200)
- cursor: str (pagination)

Response: InteractionListResponse
- items: List[InteractionOut]
- total: int
- limit: int
- cursor: Optional[str]

Sorting: next_action_at ASC NULLS LAST, created_at DESC
```

**PATCH /api/v1/interactions/{id}/status**
```python
Body: { status: 'todo' | 'in_progress' | 'done' }
Response: InteractionOut
```

**PATCH /api/v1/interactions/{id}/assignee**
```python
Body: { assignee_id: int | null }
Response: InteractionOut
```

**PATCH /api/v1/interactions/{id}/next-action**
```python
Body: { next_action_at: ISO datetime | null }
Response: InteractionOut
Note: Resets notified_at to NULL
```

#### `routers/email_marketing.py` (New)

**POST /api/v1/marketing/email/ingest**
```python
Body: EmailIngestPayload
- provider: str (resend, sendgrid, etc.)
- external_id: str (unique per provider)
- event: 'sent' | 'opened' | 'clicked' | 'bounced'
- occurred_at: ISO datetime
- person_id: Optional[int]
- organisation_id: Optional[int]
- subject: Optional[str]

Response: EmailSendOut

Logic:
1. Upsert EmailSend by (provider, external_id)
2. Update status, counters, timestamps
3. Create Interaction on first open (if interaction_id NULL)
4. Update LeadScore if person_id exists
```

**GET /api/v1/marketing/leads-hot**
```python
Query params:
- limit: int (default: 10, max: 100)
- threshold: int (default: 15, min score)

Response: HotLeadsResponse
- items: List[LeadScoreOut] (with person_name, person_email via join)
- threshold: int
- total: int

Sorting: score DESC
```

### 4. Lead Scoring Logic

```python
def calculate_score_delta(email_send: EmailSend, event: str) -> int:
    if event == "opened":
        return 3 if email_send.open_count == 0 else 1
    elif event == "clicked":
        return 8 if email_send.click_count == 0 else 2
    elif event == "bounced":
        return -10
    else:  # sent
        return 0

# Score minimum: 0 (never negative)
# First open: +3, subsequent: +1
# First click: +8, subsequent: +2
# Bounced: -10
```

### 5. Worker

#### `workers/reminder_worker.py` (New)
```python
# Job périodique (5 minutes)
def process_reminders():
    # Query overdue interactions
    interactions = db.query(Interaction).filter(
        Interaction.status.in_(['todo', 'in_progress']),
        Interaction.next_action_at <= now,
        Interaction.notified_at.is_(None),
        Interaction.assignee_id.isnot(None),
    ).all()

    for interaction in interactions:
        send_notification(interaction, user, db)
        interaction.notified_at = now
        db.commit()

# Run modes:
# - python -m workers.reminder_worker (loop, production)
# - python -m workers.reminder_worker --once (test)
```

---

## ✅ Frontend Implementation

### 1. Types & Schemas

#### `types/interaction.ts` (Extended)
```typescript
export type InteractionStatus = 'todo' | 'in_progress' | 'done'

export const INTERACTION_STATUS_LABELS: Record<InteractionStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
}

export const INTERACTION_STATUS_COLORS: Record<InteractionStatus, string> = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
}

export interface Interaction {
  // ... existing fields
  // V2 fields:
  status: InteractionStatus
  assignee_id?: number | null
  next_action_at?: string | null  // ISO datetime
  notified_at?: string | null
  linked_task_id?: number | null
  linked_event_id?: number | null
}

// 3 new schemas for quick actions
export const InteractionStatusUpdateSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'done']),
})

export const InteractionAssigneeUpdateSchema = z.object({
  assignee_id: z.number().int().positive().optional().nullable(),
})

export const InteractionNextActionUpdateSchema = z.object({
  next_action_at: z.string().datetime().optional().nullable(),
})
```

#### `types/email-marketing.ts` (New)
```typescript
export type EmailStatus = 'sent' | 'opened' | 'clicked' | 'bounced'

export interface EmailSend {
  id: number
  provider: string
  external_id: string
  status: EmailStatus
  open_count: number
  click_count: number
  interaction_id?: number | null
  // ... timestamps
}

export interface LeadScore {
  person_id: number
  score: number
  last_event_at?: string | null
  // Optional: person data (via join)
  person_name?: string | null
  person_email?: string | null
}

export interface HotLeadsResponse {
  items: LeadScore[]
  threshold: number
  total: number
}
```

### 2. Hooks

#### `hooks/useInteractions.ts` (Extended)
```typescript
// Query hook
export function useInbox(filters: InboxFilters = {}) {
  const { assignee, status, due = 'all', limit = 50, cursor } = filters
  // Fetch from GET /api/v1/interactions/inbox
}

// Mutation hooks with optimistic updates
export function useUpdateInteractionStatus() {
  return useMutation({
    mutationFn: async ({ id, status }) =>
      PATCH /api/v1/interactions/{id}/status,
    onMutate: async ({ id, status }) => {
      // Optimistic update
      queryClient.setQueriesData({ queryKey: interactionKeys.all }, ...)
    },
    onError: (err, variables, context) => {
      // Rollback
    },
    onSettled: () => {
      // Refetch
      queryClient.invalidateQueries({ queryKey: interactionKeys.all })
    },
  })
}

export function useUpdateInteractionAssignee() { /* similar */ }
export function useUpdateInteractionNextAction() { /* similar */ }
```

#### `hooks/useEmailMarketing.ts` (New)
```typescript
export function useHotLeads(options?: { limit?: number; threshold?: number }) {
  const { limit = 10, threshold = 15 } = options || {}
  return useQuery({
    queryKey: emailMarketingKeys.hotLeads(limit, threshold),
    queryFn: async () => GET /api/v1/marketing/leads-hot,
  })
}
```

### 3. Page Inbox

#### `app/dashboard/inbox/page.tsx` (New)

**Features:**
- Filters: assignee (Tous / Moi / Non assigné), status (Non terminé / À faire / En cours / Terminé), due (En retard / Aujourd'hui / Cette semaine / Toutes)
- Stats cards: Total, À faire, En cours, Terminé
- InteractionCard with:
  - Type icon & label
  - Status badge
  - Next action date (with urgency: Retard / Aujourd'hui / Dans Xj)
  - Assignee badge
  - Entity link (Org #X / Person #Y)
- Quick actions:
  - Marquer terminé (status = done)
  - Reporter +1 jour (+1d to next_action_at)
  - Reporter +3 jours (+3d)
  - Reporter +1 semaine (+7d)
- Optimistic updates via React Query mutations
- Design cohérent avec tasks page (gradients, hover effects)

**URL:** `/dashboard/inbox`

### 4. Widgets

#### `components/dashboard/widgets/InboxWidget.tsx` (New)

**Features:**
- Widget dashboard "À traiter" (5 prochaines actions)
- Fetch: useInbox({ status: '', due: 'all', limit: 5 })
- InboxRow with:
  - Type icon
  - Title + urgency label (Retard / Aujourd'hui / Dans Xj)
  - Status badge + type label + date
- Empty state: "Aucune action en attente" (user à jour)
- Link: "Voir tout" → `/dashboard/inbox`

#### `components/dashboard/widgets/HotLeadsWidget.tsx` (New)

**Features:**
- Widget dashboard "Leads chauds" (top N par score)
- Fetch: useHotLeads({ limit: 5, threshold: 15 })
- LeadRow with:
  - Heat level icon: 🔥 (15+), 🔥🔥 (20+), 🔥🔥🔥 (30+)
  - Person name + email
  - Score badge (couleur selon heat level)
  - Heat level label badge (Tiède / Chaud / Très chaud)
- Empty state: "Aucun lead chaud pour le moment" (seuil: score ≥ 15)
- Link: "Voir tout (X)" → `/dashboard/people`

---

## 📊 Commits Summary

### Backend (4 commits)

1. **feat(api): Interactions V2 + Email Marketing - Modèles backend** (`b73ed308`)
   - Migrations: add_interactions_v2_fields, add_email_sends_lead_scores
   - Models: Interaction V2 fields, EmailSend, LeadScore

2. **feat(api): Schemas Pydantic V2 pour Inbox + Email Marketing** (`49a98ae3`)
   - interaction.py: V2 fields + 3 new schemas (StatusUpdate, AssigneeUpdate, NextActionUpdate)
   - email_marketing.py: EmailIngestPayload, EmailSendOut, LeadScoreOut, HotLeadsResponse

3. **feat(api): Endpoints Inbox V2 + Email Marketing webhook** (`7b44f758`)
   - interactions.py: +4 endpoints (inbox, status, assignee, next-action)
   - email_marketing.py: +2 endpoints (ingest, leads-hot) + scoring service

4. **feat(worker): Reminder worker pour interactions en retard** (`79d9a705`)
   - reminder_worker.py: Job 5 min pour notifications overdue
   - Modes: --once (test) ou loop (production)

### Frontend (2 commits)

5. **feat(ui): Types & hooks pour Interactions V2 + Email Marketing** (`dd8c4d72`)
   - types/interaction.ts: V2 fields + 3 schemas Zod + constantes UI
   - types/email-marketing.ts: EmailSend, LeadScore, HotLeads (NEW)
   - hooks/useInteractions.ts: useInbox + 3 mutation hooks avec optimistic updates
   - hooks/useEmailMarketing.ts: useHotLeads (NEW)

6. **feat(ui): Page Inbox + Widgets pour Interactions V2** (`0f6f9d2a`)
   - app/dashboard/inbox/page.tsx: Page inbox complète (NEW)
   - components/dashboard/widgets/InboxWidget.tsx (NEW)
   - components/dashboard/widgets/HotLeadsWidget.tsx (NEW)

---

## 🎯 Testing Checklist

### Backend API

- [ ] GET /api/v1/interactions/inbox (filters: assignee, status, due)
- [ ] PATCH /api/v1/interactions/{id}/status
- [ ] PATCH /api/v1/interactions/{id}/assignee
- [ ] PATCH /api/v1/interactions/{id}/next-action
- [ ] POST /api/v1/marketing/email/ingest (webhook simulation)
- [ ] GET /api/v1/marketing/leads-hot

### Worker

- [ ] python -m workers.reminder_worker --once (test mode)
- [ ] Check notifications created in DB
- [ ] Check notified_at field updated

### Frontend

- [ ] Page /dashboard/inbox (filters, stats, cards, quick actions)
- [ ] InboxWidget sur dashboard (5 prochaines actions)
- [ ] HotLeadsWidget sur dashboard (top leads par score)
- [ ] Optimistic updates (status change immediately visible)

---

## 📝 Next Steps

### Integration to Dashboard

1. Add widgets to `app/dashboard/page.tsx`:
```typescript
import { InboxWidget } from '@/components/dashboard/widgets/InboxWidget'
import { HotLeadsWidget } from '@/components/dashboard/widgets/HotLeadsWidget'

// In dashboard:
<InboxWidget limit={5} />
<HotLeadsWidget limit={5} threshold={15} />
```

2. Add inbox link to sidebar navigation

### Production Deployment

1. Run migrations:
```bash
docker-compose exec api alembic upgrade head
```

2. Start worker (supervisord ou cron):
```bash
# Cron example (every 5 minutes)
*/5 * * * * cd /app && python -m workers.reminder_worker --once
```

3. Configure webhook in Resend/Sendgrid:
```
Endpoint: https://your-domain.com/api/v1/marketing/email/ingest
Method: POST
Auth: Bearer token in header
```

### Future Enhancements

- [ ] Weekly score decay (-1/week) via cron job
- [ ] Email notifications (in addition to in-app)
- [ ] Bulk actions (mark multiple as done, reassign batch)
- [ ] Advanced filters (date range, type, org/person)
- [ ] Export to CSV (inbox items, hot leads)

---

## 🔗 Related Documentation

- [API Endpoints](../backend/API_ENDPOINTS.md)
- [Database Migrations](../backend/INIT_DATABASE.md)
- [Frontend Hooks](../frontend/HOOKS.md)
- [Workflows Guide](../../checklists/07-workflows.md)

---

**Implementation Status**: ✅ Complete
**Branch**: `feature/chapitre7-workflows-interactions`
**Ready for**: Merge to main after testing
