# 🎯 Plan d'Améliorations CRM Alforis - Feuille de Route

## 📊 Vue d'Ensemble

Ce document présente un plan d'action concret pour améliorer le CRM Alforis sur 6 semaines.

**Objectifs:**
- ✅ Simplifier l'architecture (ROI maximal)
- ✅ Améliorer la qualité et la fiabilité
- ✅ Optimiser les performances
- ✅ Enrichir l'expérience utilisateur

---

## 🗓️ Planning sur 6 Semaines

```
Semaine 1-2: 🏗️  Fondations (Architecture + Tests)
Semaine 3:   ⚡ Monitoring & Performance
Semaine 4:   🔒 Sécurité & UX
Semaine 5:   ✨ Features Utilisateur
Semaine 6:   🎨 Polish & Documentation
```

---

## 📅 SEMAINE 1-2: Fondations

### 🎯 Objectif: Architecture Unifiée + Tests

#### Jour 1-2: Unification Architecture ⭐⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥🔥 (ROI maximal)
**Effort:** 🛠️🛠️🛠️ (2 jours)

**Tâches:**
- [x] ✅ Script de migration créé: [unify_architecture.py](crm-backend/migrations/unify_architecture.py)
- [x] ✅ Script de backup créé: [backup_database.sh](crm-backend/scripts/backup_database.sh)
- [x] ✅ Script de nettoyage créé: [cleanup_old_tables.py](crm-backend/migrations/cleanup_old_tables.py)
- [x] ✅ Guide complet créé: [GUIDE_MIGRATION_ARCHITECTURE.md](GUIDE_MIGRATION_ARCHITECTURE.md)
- [ ] Exécuter backup de production
- [ ] Exécuter migration en dry-run
- [ ] Exécuter migration réelle
- [ ] Vérifier intégrité des données
- [ ] Tester l'application complètement

**Résultats attendus:**
- ✅ Investor + Fournisseur → Organisation unifiée
- ✅ Contact → Person + PersonOrganizationLink
- ✅ Code 50% plus simple
- ✅ Base de données cohérente

**Fichiers à créer/modifier:**
```
✅ crm-backend/migrations/unify_architecture.py
✅ crm-backend/migrations/cleanup_old_tables.py
✅ crm-backend/scripts/backup_database.sh
✅ GUIDE_MIGRATION_ARCHITECTURE.md
⏳ crm-backend/models/organisation.py (ajouter colonnes)
⏳ crm-backend/api/routes/organisations.py (adapter)
⏳ crm-frontend/app/dashboard/clients/page.tsx (nouveau)
⏳ crm-frontend/hooks/useOrganisations.ts (adapter)
```

---

#### Jour 3-5: Tests Automatisés ⭐⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥🔥 (Éviter régressions)
**Effort:** 🛠️🛠️🛠️ (3 jours)

**Backend Tests (pytest):**

```bash
# Structure à créer
crm-backend/tests/
├── __init__.py
├── conftest.py              # Fixtures partagées
├── test_auth.py            # Tests authentification
├── test_organisations.py   # Tests CRUD organisations
├── test_people.py          # Tests CRUD personnes
├── test_mandats.py         # Tests mandats/produits
├── test_imports.py         # Tests imports CSV/Excel
└── test_api_integration.py # Tests end-to-end
```

**Tâches Backend:**
- [ ] Installer pytest, pytest-cov, httpx, faker
- [ ] Créer fixtures de base (db, client, user)
- [ ] Tests unitaires modèles (Organisation, Person)
- [ ] Tests API endpoints (/organisations, /people)
- [ ] Tests imports (CSV/Excel)
- [ ] Tests authentification JWT
- [ ] Coverage > 70%

**Frontend Tests (Jest + React Testing Library):**

```bash
# Structure à créer
crm-frontend/__tests__/
├── components/
│   ├── OrganisationCard.test.tsx
│   ├── PersonForm.test.tsx
│   └── ...
├── hooks/
│   ├── useOrganisations.test.ts
│   └── usePeople.test.ts
└── integration/
    └── organisations.test.tsx
```

**Tâches Frontend:**
- [ ] Installer Jest, @testing-library/react, MSW
- [ ] Configurer MSW pour mock API
- [ ] Tests composants UI (OrganisationCard, PersonForm)
- [ ] Tests hooks personnalisés
- [ ] Tests integration (création organisation)
- [ ] Coverage > 60%

**Commande pour lancer les tests:**
```bash
# Backend
cd crm-backend
pytest --cov=. --cov-report=html

# Frontend
cd crm-frontend
npm run test
npm run test:coverage
```

---

## 📅 SEMAINE 3: Monitoring & Performance

### 🎯 Objectif: Détecter Bugs + Accélérer l'App

#### Jour 1: Error Tracking (Sentry) ⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥
**Effort:** 🛠️ (1 jour)

**Backend:**

```bash
# Installer Sentry
pip install sentry-sdk[fastapi]
```

```python
# crm-backend/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=settings.sentry_dsn,
    environment=settings.environment,
    traces_sample_rate=0.1,  # 10% des traces
    integrations=[FastApiIntegration()]
)
```

**Frontend:**

```bash
# Installer Sentry
npm install @sentry/nextjs
```

```typescript
// crm-frontend/lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})
```

**Tâches:**
- [ ] Créer compte Sentry (gratuit jusqu'à 5k events/mois)
- [ ] Intégrer Sentry backend (FastAPI)
- [ ] Intégrer Sentry frontend (Next.js)
- [ ] Configurer alertes par email
- [ ] Tester en production

---

#### Jour 2-3: Cache Redis + Optimisation DB ⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥 (Réduction temps réponse 70%)
**Effort:** 🛠️🛠️ (2 jours)

**Ajouter Redis au docker-compose:**

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis-data:
```

**Backend Cache Layer:**

```python
# crm-backend/core/cache.py
from redis import Redis
from functools import wraps
import json

redis_client = Redis(
    host=settings.redis_host,
    port=settings.redis_port,
    decode_responses=True
)

def cache_response(ttl=300):
    """Decorator pour cacher les réponses API"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"

            # Chercher dans le cache
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)

            # Exécuter la fonction
            result = await func(*args, **kwargs)

            # Mettre en cache
            redis_client.setex(cache_key, ttl, json.dumps(result))

            return result
        return wrapper
    return decorator

# Utilisation
@router.get("/organisations")
@cache_response(ttl=300)  # Cache 5 minutes
async def list_organisations():
    return db.query(Organisation).all()
```

**Optimisations DB:**

```python
# crm-backend/models/organisation.py
class Organisation(BaseModel):
    # Ajouter des index pour les colonnes fréquemment requêtées
    name = Column(String(255), nullable=False, index=True)
    type = Column(Enum, index=True)
    pipeline_stage = Column(Enum, index=True)
    is_active = Column(Boolean, index=True)

    # Index composé pour recherche
    __table_args__ = (
        Index('idx_org_type_stage', 'type', 'pipeline_stage'),
        Index('idx_org_active_type', 'is_active', 'type'),
    )

# Utiliser eager loading pour éviter N+1 queries
organisations = db.query(Organisation)\
    .options(joinedload(Organisation.contacts))\
    .options(joinedload(Organisation.mandats))\
    .all()
```

**Tâches:**
- [ ] Ajouter Redis à docker-compose
- [ ] Créer module cache.py
- [ ] Cacher liste organisations (5 min)
- [ ] Cacher détails organisation (10 min)
- [ ] Ajouter index DB (type, pipeline_stage)
- [ ] Optimiser requêtes N+1 (joinedload)
- [ ] Mesurer amélioration performance

**Gain attendu:** Temps réponse API divisé par 5-10x

---

## 📅 SEMAINE 4: Sécurité & UX

### 🎯 Objectif: Contrôle d'Accès + Notifications

#### Jour 1-2: Permissions et Rôles ⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥 (Sécurité)
**Effort:** 🛠️🛠️ (2 jours)

**Modèle de rôles:**

```python
# crm-backend/models/user.py
class UserRole(str, enum.Enum):
    ADMIN = "admin"       # Tous les droits
    MANAGER = "manager"   # Gestion équipe
    SALES = "sales"       # Commercial (ses données)
    VIEWER = "viewer"     # Lecture seule

class Team(BaseModel):
    """Équipe commerciale"""
    __tablename__ = "teams"

    name = Column(String(255), nullable=False)
    users = relationship("User", back_populates="team")

class User(BaseModel):
    # ... champs existants ...
    role = Column(Enum(UserRole), default=UserRole.SALES)
    team_id = Column(Integer, ForeignKey("teams.id"))
    team = relationship("Team", back_populates="users")

# Décorateur de permission
def require_role(min_role: UserRole):
    def decorator(func):
        @wraps(func)
        async def wrapper(
            *args,
            current_user: User = Depends(get_current_user),
            **kwargs
        ):
            role_hierarchy = {
                UserRole.VIEWER: 0,
                UserRole.SALES: 1,
                UserRole.MANAGER: 2,
                UserRole.ADMIN: 3,
            }

            if role_hierarchy[current_user.role] < role_hierarchy[min_role]:
                raise HTTPException(403, "Permission denied")

            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

# Utilisation
@router.delete("/organisations/{id}")
@require_role(UserRole.MANAGER)
async def delete_organisation(id: int, current_user: User):
    # Seuls MANAGER et ADMIN peuvent supprimer
    ...
```

**Tâches:**
- [ ] Créer modèle Team
- [ ] Ajouter role et team_id à User
- [ ] Créer décorateur @require_role
- [ ] Protéger routes sensibles (DELETE, PUT)
- [ ] Filtrer données par équipe (SALES voit sa team)
- [ ] Tests unitaires permissions

---

#### Jour 3-4: Système de Notifications ⭐⭐⭐

**Impact:** 🔥🔥🔥
**Effort:** 🛠️🛠️ (2 jours)

**Backend:**

```python
# crm-backend/models/notification.py
class NotificationType(str, enum.Enum):
    TASK_DUE = "task_due"
    NEW_INTERACTION = "new_interaction"
    PIPELINE_UPDATE = "pipeline_update"
    MANDAT_SIGNED = "mandat_signed"

class Notification(BaseModel):
    __tablename__ = "notifications"

    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(Enum(NotificationType))
    title = Column(String(255))
    message = Column(Text)
    link = Column(String(500))  # URL de redirection
    is_read = Column(Boolean, default=False)

    user = relationship("User")

# Service de notifications
class NotificationService:
    @staticmethod
    def notify_task_due(user_id: int, task):
        notif = Notification(
            user_id=user_id,
            type=NotificationType.TASK_DUE,
            title=f"Tâche échue: {task.title}",
            message=f"La tâche '{task.title}' devait être terminée le {task.due_date}",
            link=f"/dashboard/tasks/{task.id}"
        )
        db.add(notif)
        db.commit()
```

**Frontend:**

```typescript
// components/NotificationBell.tsx
export function NotificationBell() {
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 30000, // Rafraîchir toutes les 30s
  })

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  return (
    <Popover>
      <PopoverTrigger>
        <button className="relative">
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent>
        <NotificationsList notifications={notifications} />
      </PopoverContent>
    </Popover>
  )
}
```

**Tâches:**
- [ ] Créer modèle Notification
- [ ] Créer service NotificationService
- [ ] Endpoint API /notifications
- [ ] Composant NotificationBell frontend
- [ ] Marquer notification comme lue
- [ ] Déclencher notifications (tâches échues, etc.)

---

## 📅 SEMAINE 5: Features Utilisateur

### 🎯 Objectif: Recherche Avancée + Exports

#### Jour 1-2: Recherche Globale Full-Text ⭐⭐⭐⭐

**Impact:** 🔥🔥🔥🔥
**Effort:** 🛠️🛠️ (2 jours)

**PostgreSQL Full-Text Search:**

```sql
-- Ajouter colonne de recherche
ALTER TABLE organisations
ADD COLUMN search_vector tsvector;

-- Trigger pour maintenir search_vector à jour
CREATE FUNCTION organisations_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('french', COALESCE(NEW.notes, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvector_update
BEFORE INSERT OR UPDATE ON organisations
FOR EACH ROW EXECUTE FUNCTION organisations_search_trigger();

-- Index GIN pour recherche rapide
CREATE INDEX idx_organisations_search ON organisations USING GIN(search_vector);
```

**API de recherche:**

```python
@router.get("/search")
async def global_search(
    q: str = Query(..., min_length=2),
    type: Optional[str] = Query(None),
    limit: int = Query(20, le=100)
):
    """
    Recherche globale avec typo tolerance
    """
    # Recherche organisations
    orgs = db.query(Organisation)\
        .filter(Organisation.search_vector.op('@@')(func.plainto_tsquery('french', q)))\
        .order_by(func.ts_rank(Organisation.search_vector, func.plainto_tsquery('french', q)).desc())\
        .limit(limit)\
        .all()

    # Recherche personnes
    people = db.query(Person)\
        .filter(
            or_(
                Person.first_name.ilike(f"%{q}%"),
                Person.last_name.ilike(f"%{q}%"),
                Person.personal_email.ilike(f"%{q}%")
            )
        )\
        .limit(limit)\
        .all()

    return {
        "query": q,
        "results": {
            "organisations": orgs,
            "people": people
        }
    }
```

**Tâches:**
- [ ] Ajouter colonne search_vector à Organisation
- [ ] Créer trigger PostgreSQL
- [ ] Créer index GIN
- [ ] Endpoint API /search
- [ ] Composant SearchBar frontend
- [ ] Tests recherche avec fautes de frappe

---

#### Jour 3-4: Exports Avancés (Excel/PDF) ⭐⭐⭐

**Impact:** 🔥🔥🔥
**Effort:** 🛠️ (2 jours)

**Backend Exports:**

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.chart import BarChart, Reference
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

@router.get("/organisations/export")
async def export_organisations(
    format: str = Query(..., regex="^(csv|excel|pdf)$"),
    type: Optional[OrganisationType] = Query(None),
    pipeline_stage: Optional[PipelineStage] = Query(None)
):
    # Récupérer les données filtrées
    query = db.query(Organisation)
    if type:
        query = query.filter(Organisation.type == type)
    if pipeline_stage:
        query = query.filter(Organisation.pipeline_stage == pipeline_stage)

    organisations = query.all()

    if format == "csv":
        return export_csv(organisations)
    elif format == "excel":
        return export_excel_with_charts(organisations)
    elif format == "pdf":
        return export_pdf_report(organisations)

def export_excel_with_charts(organisations):
    """Export Excel avec mise en forme et graphiques"""
    wb = Workbook()
    ws = wb.active
    ws.title = "Organisations"

    # En-têtes stylés
    headers = ['Nom', 'Type', 'Pipeline', 'Catégorie', 'Contacts', 'Dernier Contact']
    for col, header in enumerate(headers, 1):
        cell = ws.cell(1, col, header)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")

    # Données
    for row, org in enumerate(organisations, 2):
        ws.cell(row, 1, org.name)
        ws.cell(row, 2, org.type)
        ws.cell(row, 3, org.pipeline_stage)
        ws.cell(row, 4, org.category)
        ws.cell(row, 5, len(org.contacts))
        # ...

    # Ajouter graphique pipeline
    chart = BarChart()
    # ... configuration graphique ...
    ws.add_chart(chart, "H2")

    # Sauvegarder
    output = BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=organisations.xlsx"}
    )
```

**Tâches:**
- [ ] Endpoint export CSV
- [ ] Endpoint export Excel avec graphiques
- [ ] Endpoint export PDF rapport
- [ ] Bouton export dans UI
- [ ] Tests exports

---

## 📅 SEMAINE 6: Polish & Documentation

### 🎯 Objectif: Webhooks + Docs + Polish

#### Jour 1-2: Webhooks & Intégrations ⭐⭐⭐

```python
# crm-backend/models/webhook.py
class Webhook(BaseModel):
    url = Column(String(500), nullable=False)
    events = Column(ARRAY(String))  # ['organisation.created', 'task.updated']
    is_active = Column(Boolean, default=True)
    secret = Column(String(64))  # Pour signature HMAC

# Service webhooks
async def trigger_webhook(event: str, data: dict):
    webhooks = db.query(Webhook).filter(
        Webhook.is_active == True,
        Webhook.events.contains([event])
    ).all()

    for webhook in webhooks:
        payload = {
            'event': event,
            'data': data,
            'timestamp': datetime.utcnow().isoformat()
        }

        # Signature HMAC pour sécurité
        signature = hmac.new(
            webhook.secret.encode(),
            json.dumps(payload).encode(),
            'sha256'
        ).hexdigest()

        # Envoyer webhook (async)
        await httpx.post(
            webhook.url,
            json=payload,
            headers={'X-Webhook-Signature': signature},
            timeout=5.0
        )
```

**Tâches:**
- [ ] Créer modèle Webhook
- [ ] Service trigger_webhook
- [ ] CRUD webhooks (/webhooks)
- [ ] Déclencher sur événements clés
- [ ] UI gestion webhooks
- [ ] Documentation webhooks

---

#### Jour 3: Thème Sombre ⭐⭐

```typescript
// crm-frontend/components/ThemeToggle.tsx
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}
```

**Tâches:**
- [ ] Installer next-themes
- [ ] Configurer Tailwind dark mode
- [ ] Composant ThemeToggle
- [ ] Adapter tous les composants (dark:classes)
- [ ] Persister préférence utilisateur

---

#### Jour 4-5: Documentation & Déploiement

**Documentation API:**
- [ ] Compléter docstrings FastAPI
- [ ] Exemples requêtes/réponses
- [ ] Guide authentification
- [ ] Guide webhooks
- [ ] Postman collection

**Documentation Utilisateur:**
- [ ] Guide démarrage rapide
- [ ] Guide import CSV/Excel
- [ ] Guide gestion pipeline
- [ ] FAQ
- [ ] Vidéos tutoriels (optionnel)

**Déploiement:**
- [ ] Vérifier config production
- [ ] SSL/HTTPS configuré
- [ ] Variables d'environnement sécurisées
- [ ] Monitoring actif (Sentry)
- [ ] Backups automatiques

---

## 📊 Tableau Récapitulatif

| Phase | Amélioration | Impact | Effort | Durée | Status |
|-------|--------------|--------|--------|-------|--------|
| S1-2 | Unifier architecture | 🔥🔥🔥🔥🔥 | 🛠️🛠️🛠️ | 2j | ⏳ À faire |
| S1-2 | Tests automatisés | 🔥🔥🔥🔥🔥 | 🛠️🛠️🛠️ | 3j | ⏳ À faire |
| S3 | Error tracking | 🔥🔥🔥🔥 | 🛠️ | 1j | ⏳ À faire |
| S3 | Cache + Performance | 🔥🔥🔥🔥 | 🛠️🛠️ | 2j | ⏳ À faire |
| S4 | Permissions/Rôles | 🔥🔥🔥🔥 | 🛠️🛠️ | 2j | ⏳ À faire |
| S4 | Notifications | 🔥🔥🔥 | 🛠️🛠️ | 2j | ⏳ À faire |
| S5 | Recherche globale | 🔥🔥🔥🔥 | 🛠️🛠️ | 2j | ⏳ À faire |
| S5 | Exports avancés | 🔥🔥🔥 | 🛠️ | 2j | ⏳ À faire |
| S6 | Webhooks | 🔥🔥 | 🛠️🛠️ | 2j | ⏳ À faire |
| S6 | Thème sombre | 🔥 | 🛠️ | 1j | ⏳ À faire |
| S6 | Documentation | 🔥🔥🔥 | 🛠️🛠️ | 2j | ⏳ À faire |

---

## 🎯 Actions Immédiates (Cette Semaine)

### ✅ Déjà Fait
- [x] ✅ Analyse complète du CRM
- [x] ✅ Script de migration créé
- [x] ✅ Script de backup créé
- [x] ✅ Guide de migration complet
- [x] ✅ Plan d'amélioration sur 6 semaines

### 🔥 À Faire Maintenant

1. **Backup de la base de données**
   ```bash
   cd crm-backend
   ./scripts/backup_database.sh
   ```

2. **Simulation de la migration**
   ```bash
   python migrations/unify_architecture.py --dry-run
   ```

3. **Si OK, exécuter la migration**
   ```bash
   python migrations/unify_architecture.py --execute
   ```

4. **Vérifier et tester**
   - Vérifier comptages dans la base
   - Tester l'application complètement
   - Si OK, nettoyer anciennes tables

---

## 📞 Support & Questions

Pour toute question sur ce plan:
1. Consulter [GUIDE_MIGRATION_ARCHITECTURE.md](GUIDE_MIGRATION_ARCHITECTURE.md)
2. Consulter [ANALYSE_ARCHITECTURE_CRM.md](ANALYSE_ARCHITECTURE_CRM.md)
3. Vérifier les scripts dans [crm-backend/migrations/](crm-backend/migrations/)

---

**Bon courage pour l'implémentation! 🚀**

L'unification de l'architecture est la première étape et la plus importante.
Une fois celle-ci terminée, tout le reste sera beaucoup plus facile à implémenter.
