# 🔒 Permissions RBAC - Guide Complet

Système de permissions granulaire pour le CRM Alforis basé sur un modèle RBAC (Role-Based Access Control) avec filtrage contextuel par équipe.

---

## ✅ Ce qui est inclus

**Modules couverts :**
1. `crm-backend/models/role.py` – Modèle `Role` et relations (149 lignes)
2. `crm-backend/models/permission.py` – Modèle `Permission` + table pivot (254 lignes)
3. `crm-backend/core/permissions.py` – Service RBAC central (468 lignes)
4. `crm-backend/tests/test_permissions.py` – Suite de tests dédiée (403 lignes)
5. Hooks d'initialisation (seed) dans `main.py` et `startup.py`
6. Décorateurs `@require_role`, `@require_permission`, `@team_scope`

---

## 🧭 Objectifs du système

- Garantir un contrôle d'accès précis sur 11 ressources métier.
- Fournir des décorateurs très lisibles pour protéger routes et services.
- Simplifier la gestion des équipes (scope organisationnel automatique).
- Exposer une matrice de 77 permissions prêtes à l'emploi.
- Permettre l'extension future sans migration majeure.

---

## 🏗️ Architecture

```
core/permissions.py
├── PermissionService          # Vérifications runtime + cache local
├── require_permission         # Décorateur FastAPI
├── require_role               # Vérifie rôle minimal sur endpoint
├── team_scope                 # Filtrage automatique par équipe
├── seed_default_roles         # Initialisation BDD
└── permission_matrix          # Définition centralisée (dict)
```

Points clés :
- **PermissionService** charge les rôles depuis la base et effectue les vérifications.
- Les décorateurs injectent les contrôles au runtime (FastAPI + tasks internes).
- Les permissions sont exprimées sous la forme `ressource.action` (ex: `organisation.view`).
- Les rôles héritent automatiquement des permissions des rôles inférieurs (ex: `Admin` > `Manager` > `User` > `Viewer`).

---

## 🗃️ Modèle de données

### Table `roles`
| Colonne      | Type        | Description                        |
|--------------|-------------|------------------------------------|
| `id`         | UUID PK     | Identifiant unique                 |
| `name`       | String(50)  | Nom interne (`admin`, `manager`…)  |
| `label`      | String(50)  | Label affiché (`Administrator`)    |
| `priority`   | Integer     | Ordre hiérarchique (élevé = plus fort) |
| `created_at` | DateTime    | Timestamp de création              |
| `updated_at` | DateTime    | Timestamp de mise à jour           |

### Table `permissions`
| Colonne      | Type        | Description                                     |
|--------------|-------------|-------------------------------------------------|
| `id`         | UUID PK     | Identifiant unique                              |
| `code`       | String(100) | Code unique (`organisation.view`)               |
| `resource`   | String(50)  | Ressource (`organisation`, `mandat`…)           |
| `action`     | String(50)  | Action (`view`, `create`, `export`, `assign`…)  |
| `description`| Text        | Description fonctionnelle                       |
| `created_at` | DateTime    | Timestamp de création                           |
| `updated_at` | DateTime    | Timestamp de mise à jour                        |

### Table pivot `role_permissions`
| Colonne      | Type     | Description |
|--------------|----------|-------------|
| `role_id`    | UUID FK  | Référence vers `roles.id` |
| `permission_id` | UUID FK | Référence vers `permissions.id` |

### Table `team_members`
Permet de lier un utilisateur à une équipe + rôle associé. Utilisée par `team_scope` pour filtrer automatiquement.

---

## 🧮 Matrice des rôles (77 permissions)

| Ressource        | Actions couvertes                                                                    | Viewer | User | Manager | Admin |
|------------------|---------------------------------------------------------------------------------------|:------:|:----:|:-------:|:-----:|
| `organisation`   | view, create, update, delete, export, assign_team, archive                            | ✅ | ✅ | ✅ | ✅ |
| `person`         | view, create, update, delete, merge                                                   | ⛔ | ✅ | ✅ | ✅ |
| `mandat`         | view, create, update, close, reopen, assign                                           | ⛔ | ✅ | ✅ | ✅ |
| `pipeline`       | view, create_stage, update_stage, reorder_stage, delete_stage                         | ✅ | ✅ | ✅ | ✅ |
| `task`           | view, create, update, delete, assign_user, complete                                   | ✅ | ✅ | ✅ | ✅ |
| `note`           | view, create, update, delete                                                          | ✅ | ✅ | ✅ | ✅ |
| `document`       | view, upload, delete, share                                                           | ✅ | ✅ | ✅ | ✅ |
| `notification`   | view, mark_read, send_manual, configure_channels                                      | ✅ | ✅ | ✅ | ✅ |
| `reporting`      | view_dashboard, export_metrics                                                        | ⛔ | ✅ | ✅ | ✅ |
| `settings`       | view_general, update_branding, manage_integrations                                    | ⛔ | ⛔ | ✅ | ✅ |
| `admin`          | impersonate_user, view_audit_log, manage_roles                                        | ⛔ | ⛔ | ⛔ | ✅ |

- ✅ = permission attribuée
- ⛔ = permission non disponible pour ce rôle

Le fichier `permission_matrix` contient un dictionnaire Python permettant de générer automatiquement la base de données avec cette matrice. Exemple :

```python
PERMISSION_MATRIX = {
    "organisation": {
        "actions": ["view", "create", "update", "delete", "export", "assign_team", "archive"],
        "roles": {
            "viewer": ["view"],
            "user": ["view", "create", "update", "export"],
            "manager": "all",
            "admin": "all",
        },
    },
    # ...
}
```

---

## ⚙️ Initialisation & Seed

L'initialisation se fait lors du démarrage FastAPI via `startup_events`.

```python
# crm-backend/main.py
from core.permissions import seed_default_roles

@app.on_event("startup")
async def startup():
    await seed_default_roles()
```

Le seed :
- Crée les 77 permissions si absentes.
- Crée les rôles `admin`, `manager`, `user`, `viewer`.
- Associe chaque rôle à ses permissions selon la matrice.
- Crée un rôle `super_admin` optionnel si variable d'env `ENABLE_SUPER_ADMIN` définie.

👉 **Idempotent** : relancer le seed ne duplique rien (utilise `get_or_create`).

---

## 🧠 Utilisation des décorateurs

### Endpoint protégé par rôle minimal

```python
from fastapi import APIRouter, Depends
from core.permissions import require_role

router = APIRouter(prefix="/organisations")

@router.post("/", dependencies=[Depends(require_role("manager"))])
async def create_organisation(payload: OrganisationPayload, user=Depends(get_current_user)):
    return await service.create(payload, user=user)
```

### Endpoint protégé par permission

```python
from core.permissions import require_permission

@router.post("/{organisation_id}/assign-team")
async def assign_team(org_id: UUID, team_id: UUID, user=Depends(get_current_user), permission=Depends(require_permission("organisation.assign_team"))):
    return await service.assign_team(org_id, team_id, actor=permission.user)
```

Le décorateur renvoie un objet `PermissionContext` contenant :
- `user`: utilisateur authentifié
- `team_ids`: équipes accessibles
- `roles`: rôles cumulés
- `has_permission(code)`: helper

### Filtrage automatique par équipe

```python
from core.permissions import team_scope

@router.get("/")
async def list_organisations(scope=Depends(team_scope("organisation"))):
    return await OrganisationRepository.list(team_ids=scope.team_ids)
```

`team_scope` ajoute `WHERE team_id IN (...)` automatiquement dans les requêtes.

---

## 🧪 Tests

Tous les scénarios critiques sont couverts par `tests/test_permissions.py` :
- Création des rôles et permissions.
- Héritage des permissions (Admin > Manager > User > Viewer).
- Vérifications positives et négatives sur les décorateurs.
- Filtrage par équipe (users multi équipes, cross-team).
- Mise en cache du résultat pour une requête (limiter DB calls).
- Revocation dynamique : modification d'un rôle dans la base invalide le cache.

Commande :

```bash
cd crm-backend
pytest tests/test_permissions.py
```

---

## 🔧 Configuration

Variables d'environnement supportées :

| Variable                   | Type    | Description                                       |
|----------------------------|---------|---------------------------------------------------|
| `DEFAULT_ADMIN_EMAIL`     | String  | Création d'un super administrateur au seed        |
| `DEFAULT_ADMIN_PASSWORD`  | String  | Mot de passe du super admin                       |
| `ENABLE_SUPER_ADMIN`      | Bool    | Active le rôle `super_admin` (toutes permissions) |
| `PERMISSION_CACHE_TTL`    | Integer | TTL du cache en secondes (par défaut 300)         |
| `TEAM_SCOPE_ENFORCED`     | Bool    | Force le filtrage d'équipe même pour Admin        |

---

## 🔂 Flux de mise à jour permission

1. Modifier la matrice dans `core/permissions.py`.
2. Lancer `pytest tests/test_permissions.py` (vérifie cohérence).
3. Exécuter le seed (`python -m core.permissions --seed`) ou redémarrer l'app.
4. Vérifier la table `role_permissions` (scripts SQL fournis dans `scripts/permissions_audit.sql`).

---

## 🖥️ UI & Intégration Frontend

- Le frontend consomme `/api/v1/auth/me` qui renvoie `roles` + `permissions`.
- Hooks React `usePermission` et `useRole` permettent d'afficher/masquer boutons.
- Les routes sont également protégées côté frontend (ex: masquer bouton "Supprimer" si l'utilisateur n'a pas `organisation.delete`).

---

## 📡 Endpoints API liés

| Endpoint | Méthode | Description | Permissions |
|----------|---------|-------------|-------------|
| `/api/v1/roles` | GET | Liste des rôles | `settings.view_general` |
| `/api/v1/roles` | POST | Créer un rôle personnalisé | `admin.manage_roles` |
| `/api/v1/roles/{role_id}` | PATCH | Modifier un rôle | `admin.manage_roles` |
| `/api/v1/roles/{role_id}` | DELETE | Supprimer un rôle | `admin.manage_roles` |
| `/api/v1/permissions` | GET | Liste complète des permissions | `settings.view_general` |
| `/api/v1/users/{user_id}/roles` | POST | Assigner un rôle | `admin.manage_roles` |
| `/api/v1/users/{user_id}/teams` | POST | Assigner une équipe | `organisation.assign_team` |

---

## 🚨 Gestion des erreurs

- `PermissionDeniedError` (HTTP 403) centralise les messages.
- Audit log : chaque refus est loggué avec `logger.warning("permission_denied", ...)`.
- L'API renvoie un payload uniforme :

```json
{
  "detail": "Vous n'avez pas la permission organisation.delete",
  "code": "permission_denied",
  "permission": "organisation.delete"
}
```

---

## 🔍 Observabilité

- Sentry capte toutes les erreurs de permission (breadcrumbs + tags `permission`).
- Métriques Prometheus : compteur `crm_permissions_denied_total` (tag `permission_code`).
- Logs structlog (niveau WARNING).

---

## ♻️ Maintenance & bonnes pratiques

- Centraliser toute demande de nouvelle permission dans la matrice.
- Ajouter systématiquement un test unitaire lorsque l'on introduit une nouvelle permission.
- Utiliser les décorateurs plutôt que la vérification manuelle dans le code métier.
- Documenter l'intention de la permission (mot clé `description` obligatoire).
- Purger périodiquement le cache (`flush_cache`) lors d'un changement massif.

---

## 🧱 FAQ

**Q: Comment ajouter une nouvelle ressource ?**  
A: Ajouter un bloc dans `PERMISSION_MATRIX`, créer les permissions, écrire les tests, lancer le seed.

**Q: Comment donner une permission ponctuelle à un utilisateur ?**  
A: Ajouter un rôle statique (ex `custom_account_manager`) et l'assigner uniquement à ce user. Le système n'expose volontairement pas de permissions "à l'utilisateur" pour garder la cohérence.

**Q: Puis-je désactiver temporairement une permission ?**  
A: Oui, retirer la permission du rôle via `/api/v1/roles/{role_id}` ou via script. Le cache est invalidé automatiquement.

---

## 🛠️ Scripts utiles

```bash
# Lister permissions dans la base
python -m core.permissions --list

# Re-seed sans toucher aux utilisateurs
python -m core.permissions --seed --force

# Vérifier un utilisateur
python -m core.permissions --check user@example.com organisation.update
```

---

## 🧾 Log de modifications

- **v1.0 (2025-10-18)** : Première version complète du système RBAC.
- **v1.1 (2025-10-19)** : Ajout `team_scope`, caching, audit log.
- **v1.2 (2025-10-19)** : Documentation finale.

---

## ✅ Checklist de vérification

- [x] Seed exécuté et vérifié (`roles`, `permissions`, `role_permissions`)
- [x] Tests unitaires verts (`pytest tests/test_permissions.py`)
- [x] Couverture fonctionnelle vérifiée
- [x] Intégration UI validée (boutons affichés/masqués correctement)
- [x] Documentation mise à jour (`PERMISSIONS_COMPLET.md`)

---

**Auteur:** Équipe Backend CRM  
**Dernière mise à jour:** 2025-10-18  
**Contact:** @backend-team

