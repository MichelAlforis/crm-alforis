# 📣 Notifications Temps Réel - Guide Complet

Système de notifications multi-canaux avec WebSocket, Event Bus Redis et gestion de templates pour le CRM Alforis.

---

## ✅ Ce qui est inclus

1. `crm-backend/models/notification.py` – Modèle relationnel + ORM (221 lignes)
2. `crm-backend/core/notifications.py` – Service et gestionnaires d'événements (529 lignes)
3. `crm-backend/core/events.py` – Event Bus Redis Pub/Sub + listeners (466 lignes)
4. `crm-backend/tests/test_notifications.py` – Suite de tests complète (520 lignes)
5. `crm-backend/main.py` – Endpoint WebSocket `/ws/notifications`
6. Client frontend React (`NotificationBell`, `NotificationCenter`)

---

## 🎯 Objectifs

- Notifier les utilisateurs en temps réel (UI cloche + centre de notifications).
- Supporter 15 types d'événements métiers (mandats, organisations, tâches, documents…).
- Offrir une priorisation (4 niveaux) et différencier canaux (web, email, mobile).
- Garantir la durabilité (stockage SQL + ack client).
- Être extensible (nouveaux templates + listeners).

---

## 🏗️ Architecture générale

```
┌──────────────┐     Redis Pub/Sub     ┌──────────────┐
│ EventSource  │ ───────────────────▶ │ Event Bus    │
└──────────────┘                       └─────┬────────┘
                                            │ publish(event)
                                            ▼
                                     ┌──────────────┐
                                     │ Notifications │
                                     │   Service     │
                                     └─────┬────────┘
                                           │ persist + fanout
                            ┌──────────────┴──────────────┐
                            ▼                             ▼
                    WebSocket Manager             Email/SMS (optionnel)
```

- Les modules métier émettent des événements (`events.emit("mandat.created", payload)`).
- `NotificationService` persiste l'événement en base et fan-out vers clients connectés.
- `WebSocketManager` gère les connexions utilisateurs (multi onglets / multi sessions).
- Le frontend consomme via `/ws/notifications` + REST `/api/v1/notifications`.

---

## 🗃️ Modèle `Notification`

| Champ             | Type         | Description |
|-------------------|--------------|-------------|
| `id`              | UUID         | Identifiant unique |
| `user_id`         | UUID FK      | Destinataire |
| `team_id`         | UUID FK      | Équipe concernée |
| `type`            | String(100)  | Type (`mandat.created`, `task.assigned`…) |
| `title`           | String(150)  | Titre affiché |
| `body`            | Text         | Message détaillé |
| `data`            | JSON         | Payload additionnel (liens profonds) |
| `priority`        | Enum         | `low`, `normal`, `high`, `critical` |
| `channel`         | Enum         | `web`, `email`, `sms`, `mobile_push` |
| `is_read`         | Boolean      | Statut lu/non lu |
| `read_at`         | DateTime     | Timestamp de lecture |
| `created_at`      | DateTime     | Timestamp création |
| `expires_at`      | DateTime     | TTL optionnel |

Contraintes :
- Index sur `(user_id, is_read)` pour les requêtes rapide du centre de notifications.
- Index full-text (`GIN`) sur `title` + `body` pour recherche locale.
- Trigger update `updated_at`.

---

## 🔌 Event Bus Redis

- Utilise `aioredis` pour la connexion.
- Channel principal : `notifications.events`.
- Format message : JSON sérialisé (`event`, `payload`, `timestamp`).
- Chaque worker FastAPI s'abonne et traite les événements pour garantir la livraison même en multi instances.

```python
# crm-backend/core/events.py
async def emit(event: str, payload: dict[str, Any]) -> None:
    message = {
        "event": event,
        "payload": payload,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await redis.publish("notifications.events", json.dumps(message))
```

---

## 🧠 NotificationService

### 1. Persistance

```python
notification = Notification(
    user_id=target_user.id,
    title=template.render_title(context),
    body=template.render_body(context),
    data=template.build_payload(context),
    priority=template.priority,
    channel=template.channel,
)
session.add(notification)
session.commit()
```

- Support du mode **bulk** (`create_many`).
- Sauvegarde de `data` en JSON simplifie les actions côté UI (lien direct vers entité).

### 2. Diffusion WebSocket

```python
await websocket_manager.send_json(
    user_id=target_user.id,
    message=NotificationSerializer(notification).dict(),
)
```

- Garantie de publication même si le client est déconnecté : le message reste en base et sera récupéré via REST à la reconnexion.

### 3. Accusé de réception

- Le frontend appelle `POST /api/v1/notifications/{id}/ack` lorsque l'utilisateur marque la notification comme lue.
- Le service met `is_read = True` + `read_at = now()` + envoie un message WebSocket pour synchroniser les autres onglets.

---

## 🧩 Templates disponibles

| Code template             | Description                                    | Canal par défaut | Priorité |
|---------------------------|------------------------------------------------|------------------|----------|
| `mandat.created`          | Nouveau mandat attribué                        | `web`            | normal   |
| `mandat.status_changed`   | Statut mandat modifié                          | `web`            | normal   |
| `mandat.overdue`          | Mandat en retard                               | `web`            | high     |
| `organisation.assigned`   | Organisation assignée à un collaborateur       | `web`            | high     |
| `organisation.updated`    | Organisation modifiée                          | `web`            | low      |
| `task.assigned`           | Tâche assignée                                 | `web`            | normal   |
| `task.overdue`            | Tâche en retard                                | `web`            | high     |
| `task.completed`          | Tâche terminée                                 | `web`            | low      |
| `note.mentioned`          | Mention @user dans une note                    | `web`            | high     |
| `document.uploaded`       | Nouveau document ajouté                        | `web`            | normal   |
| `document.expiring`       | Document expirant bientôt                      | `web`            | high     |
| `meeting.reminder`        | Rappel de réunion                              | `web`            | normal   |
| `pipeline.stage_changed`  | Changement d'étape pipeline                    | `web`            | normal   |
| `report.generated`        | Rapport disponible (exports)                   | `web`            | low      |
| `system.announcement`     | Message important (broadcast)                  | `web`            | critical |

Changer le canal est possible via configuration template (ex: `email` ou `sms`).

---

## 🔒 Gestion des permissions

- Création/lecture des notifications liées aux actions RBAC (ex: `notification.send_manual` requiert `manager`).
- Les endpoints REST sont protégés via `@require_permission("notification.view")`.
- Les notifications ne sont livrées qu'aux utilisateurs ayant accès à l'entité (cross-check via `team_scope`).

---

## 🌐 Endpoint WebSocket

```python
# crm-backend/main.py
@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket, token: str):
    user = await authenticate(token)
    await manager.connect(user.id, websocket)
    try:
        while True:
            await manager.handle_message(user.id, await websocket.receive_json())
    finally:
        manager.disconnect(user.id, websocket)
```

Fonctionnalités :
- Authentification via token JWT passé en query string.
- Support multi-connexion (tableau de websockets par user).
- Ping/pong automatique (heartbeat 30 secondes).
- Gestion des reconnexions : replay des notifications non lues à la connexion.

---

## 📡 Endpoints REST

| Endpoint | Méthode | Description | Permissions |
|----------|---------|-------------|-------------|
| `/api/v1/notifications` | GET | Liste paginée (non lues en priorité) | `notification.view` |
| `/api/v1/notifications/unread` | GET | Compteur + liste des non lues | `notification.view` |
| `/api/v1/notifications/{id}/ack` | POST | Marquer comme lue | `notification.mark_read` |
| `/api/v1/notifications/{id}/read` | POST | Marquer plusieurs comme lues | `notification.mark_read` |
| `/api/v1/notifications/{id}` | DELETE | Supprimer une notification | `notification.delete` |
| `/api/v1/notifications/test` | POST | Créer une notification manuelle | `notification.send_manual` |

Pagination standard (`limit`, `offset`) + filtres (`type`, `priority`, `channel`, `is_read`, `team_id`).

---

## 🧪 Tests

`tests/test_notifications.py` couvre :
- Création d'événements (15 templates).
- Fan-out multi utilisateurs.
- Garantie que les utilisateurs non concernés ne reçoivent rien.
- Gestion des priorités + tri.
- Tests WebSocket (utilisation de `websockets.connect` + `asyncio`).
- Acknowledgement et idempotence (`mark_as_read` plusieurs fois).
- Nettoyage des notifications expirées (`cleanup_expired`).

Commandes :

```bash
cd crm-backend
pytest tests/test_notifications.py
pytest tests/test_notifications.py -k websocket  # focus WebSocket
```

---

## 🧾 Configuration

| Variable                      | Type    | Description |
|-------------------------------|---------|-------------|
| `REDIS_URL`                   | String  | Connexion Event Bus (`redis://localhost:6379/0`) |
| `NOTIFICATION_WS_MAX_CONN`    | Integer | Limite connections simultanées par user (par défaut 5) |
| `NOTIFICATION_REPLAY_LIMIT`   | Integer | Nombre max de notifications rejouées à la connexion (100 par défaut) |
| `NOTIFICATION_DEFAULT_TTL`    | Integer | Durée de vie en heures (0 = infini) |
| `NOTIFICATION_EMAIL_ENABLED`  | Bool    | Active l'envoi email via Celery |
| `NOTIFICATION_SMS_ENABLED`    | Bool    | Active l'envoi SMS (Twilio) |
| `NOTIFICATION_LOG_LEVEL`      | String  | Ajuste logs dédiés |

---

## 🔄 Nettoyage & maintenance

- Commande `python -m core.notifications --cleanup` pour supprimer les notifications expirées.
- Tâche cron (`scripts/cleanup_notifications.sh`) à placer toutes les 24h.
- Métadonnées `processed_at` pour suivre les notifications traitées côté worker.
- Script `scripts/notifications_repair.py` pour reconstruire la file en cas de désync Redis.

---

## 📊 Monitoring

- **Sentry** : capture des erreurs via `NotificationService`.
- **Prometheus** : métriques `notifications_sent_total`, `notifications_ws_active_connections`.
- **Grafana** : dashboards temps réel (latence, backlog, erreurs).
- **Logs** : structlog (`notification.sent`, `notification.skipped`).

---

## 🎨 Frontend

- `NotificationBell` (icône cloche) affiche compteur non lu en temps réel.
- `NotificationCenter` liste les notifications + actions "Mark all as read".
- WebSocket reconnect automatique (exponential backoff).
- State management via Zustand (`useNotificationsStore`).
- Badges de priorité (rouge = critical, orange = high).
- Deep links vers la ressource (`data.url`).

---

## 🔐 Sécurité

- Signature des messages WebSocket via JWT.
- Filtrage par équipe (`team_scope`) avant persistence (empêche notification cross-team).
- Protection contre le spam : throttling (max 20 notifications / minute / user).
- Audit log des actions manuelles (`notification.send_manual`).

---

## 🛠️ Checklist de livraison

- [x] Event Bus Redis configuré (`docker-compose.redis.yml`)
- [x] Service notifications démarré (`NotificationService`)
- [x] Endpoint WebSocket opérationnel (`/ws/notifications`)
- [x] Frontend connecté (cloche + centre)
- [x] Tests unitaires + WebSocket verts
- [x] Documentation finalisée (`NOTIFICATIONS_COMPLET.md`)

---

## 🧭 Extensions possibles

1. **Canal Email** : intégrer Celery + SMTP (template Jinja).
2. **Push mobile** : connexion à Firebase Cloud Messaging.
3. **Digest quotidien** : regroupement des notifications faibles priorités.
4. **Snooze** : permettre de snoozer une notification pour X minutes.
5. **Analytics** : traquer le taux d'ouverture, le temps de réaction.

---

## 🔍 Débogage rapide

```bash
# Écouter les événements Redis
redis-cli SUBSCRIBE notifications.events

# Générer une notification test
python -m core.notifications --fake --user user@example.com

# Inspecter en base
psql -c "SELECT * FROM notifications WHERE user_id = '...';"
```

**Logs utiles :**
- `notification.sent`
- `notification.ws.broadcast`
- `notification.ws.error`
- `notification.cleanup`

---

## 🧾 Historique

- **v1.0 (2025-10-18)** : Ajout notifications temps réel (WebSocket + Redis).
- **v1.1 (2025-10-18)** : Ajout priorités + replay.
- **v1.2 (2025-10-19)** : Documentation finale et checklist déploiement.

---

**Auteur:** Équipe Backend CRM  
**Dernière mise à jour:** 2025-10-18  
**Contact:** @backend-team

