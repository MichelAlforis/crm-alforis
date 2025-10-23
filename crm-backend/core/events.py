"""
Module Events - Event Bus avec Redis Pub/Sub

Ce module fournit un système d'événements asynchrone basé sur Redis Pub/Sub.
Permet de déclencher des notifications et actions en réponse à des événements
du système (création organisation, mandat signé, etc.)

Usage:
    from core.events import event_bus, EventType

    # Publier un événement
    await event_bus.publish(
        EventType.ORGANISATION_CREATED,
        data={"organisation_id": org.id, "name": org.name}
    )

    # S'abonner à un événement
    @event_bus.subscribe(EventType.MANDAT_SIGNED)
    async def on_mandat_signed(event_data: dict):
        # Envoyer notification, etc.
        await notify_user(...)
"""

from typing import Callable, Dict, List, Any, Optional
from datetime import datetime, timezone
import enum
import json
import asyncio
import redis.asyncio as aioredis

from core.config import settings


class EventType(str, enum.Enum):
    """Types d'événements système"""

    # Organisations
    ORGANISATION_CREATED = "organisation.created"
    ORGANISATION_UPDATED = "organisation.updated"
    ORGANISATION_DELETED = "organisation.deleted"
    ORGANISATION_PIPELINE_CHANGED = "organisation.pipeline_changed"

    # People
    PERSON_CREATED = "person.created"
    PERSON_UPDATED = "person.updated"
    PERSON_DELETED = "person.deleted"

    # Mandats
    MANDAT_CREATED = "mandat.created"
    MANDAT_UPDATED = "mandat.updated"
    MANDAT_SIGNED = "mandat.signed"
    MANDAT_EXPIRED = "mandat.expired"
    MANDAT_EXPIRING_SOON = "mandat.expiring_soon"

    # Interactions
    INTERACTION_CREATED = "interaction.created"
    INTERACTION_UPDATED = "interaction.updated"

    # Tasks
    TASK_CREATED = "task.created"
    TASK_ASSIGNED = "task.assigned"
    TASK_COMPLETED = "task.completed"
    TASK_DUE = "task.due"

    # Documents
    DOCUMENT_UPLOADED = "document.uploaded"
    DOCUMENT_DELETED = "document.deleted"

    # Users
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_LOGIN = "user.login"

    # Exports/Imports
    EXPORT_STARTED = "export.started"
    EXPORT_COMPLETED = "export.completed"
    IMPORT_STARTED = "import.started"
    IMPORT_COMPLETED = "import.completed"

    # Email Automation
    EMAIL_TEMPLATE_CREATED = "email.template_created"
    EMAIL_CAMPAIGN_CREATED = "email.campaign_created"
    EMAIL_CAMPAIGN_SCHEDULED = "email.campaign_scheduled"
    EMAIL_CAMPAIGN_DELETED = "email.campaign_deleted"
    EMAIL_SEND_FAILED = "email.send_failed"
    EMAIL_EVENT_RECEIVED = "email.event_received"

    # Système
    SYSTEM_STARTUP = "system.startup"
    SYSTEM_SHUTDOWN = "system.shutdown"


class Event:
    """
    Classe représentant un événement

    Un événement contient:
    - type: Type d'événement
    - data: Données associées
    - timestamp: Horodatage
    - user_id: Utilisateur déclencheur (optionnel)
    """

    def __init__(
        self,
        type: EventType,
        data: dict,
        user_id: Optional[int] = None,
        timestamp: Optional[datetime] = None,
    ):
        self.type = type
        self.data = data
        self.user_id = user_id
        self.timestamp = timestamp or datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        """Convertit l'événement en dictionnaire"""
        return {
            "type": self.type,
            "data": self.data,
            "user_id": self.user_id,
            "timestamp": self.timestamp.isoformat(),
        }

    def to_json(self) -> str:
        """Convertit l'événement en JSON"""
        return json.dumps(self.to_dict())

    @classmethod
    def from_json(cls, json_str: str) -> "Event":
        """Crée un événement depuis JSON"""
        data = json.loads(json_str)
        return cls(
            type=EventType(data["type"]),
            data=data["data"],
            user_id=data.get("user_id"),
            timestamp=datetime.fromisoformat(data["timestamp"]),
        )


class EventBus:
    """
    Event Bus basé sur Redis Pub/Sub

    Gère la publication et l'abonnement aux événements
    via Redis Pub/Sub pour scalabilité multi-instances.
    """

    def __init__(self):
        self.redis_client: Optional[aioredis.Redis] = None
        self.pubsub = None
        self.subscribers: Dict[EventType, List[Callable]] = {}
        self.is_listening = False
        self._listener_task = None

    async def connect(self):
        """Connecte au serveur Redis"""
        if not settings.redis_enabled:
            return
        if self.redis_client is None:
            try:
                self.redis_client = await aioredis.from_url(
                    f"redis://{settings.redis_host}:{settings.redis_port}",
                    password=settings.redis_password if settings.redis_password else None,
                    db=settings.redis_db,
                    decode_responses=True,
                )
                self.pubsub = self.redis_client.pubsub()
                # Vérifier la connexion
                await self.redis_client.ping()
                print("✅ Event Bus connecté à Redis")
            except Exception as e:
                print(f"❌ Erreur connexion Event Bus Redis: {e}")
                self.redis_client = None

    async def disconnect(self):
        """Déconnecte du serveur Redis"""
        if self.pubsub:
            await self.pubsub.close()

        if self.redis_client:
            await self.redis_client.close()
            self.redis_client = None

        print("🔌 Event Bus déconnecté de Redis")

    def is_available(self) -> bool:
        """Vérifie si Redis est disponible"""
        return self.redis_client is not None

    async def publish(
        self,
        event_type: EventType,
        data: dict,
        user_id: Optional[int] = None,
    ) -> bool:
        """
        Publie un événement sur le bus

        Args:
            event_type: Type d'événement
            data: Données de l'événement
            user_id: ID de l'utilisateur déclencheur (optionnel)

        Returns:
            bool: True si publié avec succès
        """
        if not settings.redis_enabled:
            return False
        # Connecter si pas encore fait
        if not self.is_available():
            await self.connect()

        if not self.is_available():
            print(f"⚠️  Event Bus non disponible, événement non publié: {event_type}")
            return False

        # Créer l'événement
        event = Event(
            type=event_type,
            data=data,
            user_id=user_id,
        )

        try:
            # Publier sur Redis Pub/Sub
            channel = f"events:{event_type.value}"
            await self.redis_client.publish(channel, event.to_json())

            # Également publier sur un canal global
            await self.redis_client.publish("events:all", event.to_json())

            print(f"📡 Événement publié: {event_type.value}")
            return True

        except Exception as e:
            print(f"❌ Erreur publication événement {event_type}: {e}")
            return False

    def subscribe(self, event_type: EventType):
        """
        Décorateur pour s'abonner à un type d'événement

        Usage:
            @event_bus.subscribe(EventType.MANDAT_SIGNED)
            async def on_mandat_signed(event: Event):
                print(f"Mandat signé: {event.data}")

        Args:
            event_type: Type d'événement à écouter
        """
        def decorator(func: Callable):
            if event_type not in self.subscribers:
                self.subscribers[event_type] = []

            self.subscribers[event_type].append(func)
            print(f"📌 Abonnement: {func.__name__} -> {event_type.value}")

            return func

        return decorator

    async def _listen_to_redis(self):
        """
        Écoute les événements Redis Pub/Sub en arrière-plan

        Cette fonction tourne en boucle infinie et traite
        les événements reçus via Redis Pub/Sub.
        """
        if not self.is_available():
            print("⚠️  Event Bus non disponible, écoute impossible")
            return

        # S'abonner aux canaux des événements enregistrés
        channels = [f"events:{event_type.value}" for event_type in self.subscribers.keys()]
        if channels:
            await self.pubsub.subscribe(*channels)
            print(f"👂 Écoute des événements: {', '.join(channels)}")

        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    try:
                        # Décoder l'événement
                        event = Event.from_json(message["data"])

                        # Appeler les subscribers
                        if event.type in self.subscribers:
                            for callback in self.subscribers[event.type]:
                                try:
                                    # Exécuter le callback
                                    if asyncio.iscoroutinefunction(callback):
                                        await callback(event)
                                    else:
                                        callback(event)
                                except Exception as e:
                                    print(f"❌ Erreur callback {callback.__name__}: {e}")

                    except Exception as e:
                        print(f"❌ Erreur traitement événement: {e}")

        except Exception as e:
            print(f"❌ Erreur écoute Redis Pub/Sub: {e}")

    async def start_listening(self):
        """
        Démarre l'écoute des événements en arrière-plan

        À appeler au démarrage de l'application.
        """
        if not settings.redis_enabled:
            print("ℹ️  Event Bus désactivé (redis_enabled=False)")
            return
        if self.is_listening:
            print("⚠️  Event Bus déjà en écoute")
            return

        # Connecter si nécessaire
        if not self.is_available():
            await self.connect()

        if not self.is_available():
            print("❌ Impossible de démarrer l'écoute Event Bus")
            return

        # Lancer la tâche d'écoute
        self.is_listening = True
        self._listener_task = asyncio.create_task(self._listen_to_redis())
        print("✅ Event Bus démarré")

    async def stop_listening(self):
        """
        Arrête l'écoute des événements

        À appeler à l'arrêt de l'application.
        """
        if not settings.redis_enabled:
            return
        self.is_listening = False

        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass

        await self.disconnect()
        print("⏹️  Event Bus arrêté")


# Instance globale du bus d'événements
event_bus = EventBus()


# ============================================
# Helpers Utilitaires
# ============================================

async def emit_event(
    event_type: EventType,
    data: dict,
    user_id: Optional[int] = None,
) -> bool:
    """
    Helper pour émettre un événement rapidement

    Args:
        event_type: Type d'événement
        data: Données de l'événement
        user_id: ID de l'utilisateur (optionnel)

    Returns:
        bool: True si publié avec succès
    """
    return await event_bus.publish(event_type, data, user_id)


# ============================================
# Listeners par Défaut
# ============================================

# Exemple: Écouter les mandats signés pour notifier
@event_bus.subscribe(EventType.MANDAT_SIGNED)
async def on_mandat_signed(event: Event):
    """
    Listener: Mandat signé -> Notifier l'utilisateur

    Déclenché automatiquement quand un mandat est signé.
    """
    from core.notifications import notify_from_template
    from models.notification import NotificationType
    from core.database import SessionLocal

    print(f"🎉 Mandat signé: {event.data.get('mandat_id')}")

    # Créer session DB
    db = SessionLocal()

    try:
        # Notifier l'utilisateur responsable
        if event.user_id:
            await notify_from_template(
                user_id=event.user_id,
                type=NotificationType.MANDAT_SIGNED,
                params={
                    "organisation_name": event.data.get("organisation_name", "Organisation"),
                    "mandat_number": event.data.get("mandat_number", "N/A"),
                    "mandat_id": event.data.get("mandat_id"),
                },
                resource_type="mandat",
                resource_id=event.data.get("mandat_id"),
                db=db,
            )

    finally:
        db.close()


# Enregistrer les listeners webhooks après la définition de l'event bus
from core.webhooks import register_webhook_listeners

register_webhook_listeners(event_bus)


@event_bus.subscribe(EventType.TASK_ASSIGNED)
async def on_task_assigned(event: Event):
    """
    Listener: Tâche assignée -> Notifier l'utilisateur assigné
    """
    from core.notifications import notify_from_template
    from models.notification import NotificationType
    from core.database import SessionLocal

    print(f"📋 Tâche assignée: {event.data.get('task_id')}")

    db = SessionLocal()

    try:
        # Notifier l'utilisateur assigné
        assigned_user_id = event.data.get("assigned_to")
        if assigned_user_id:
            await notify_from_template(
                user_id=assigned_user_id,
                type=NotificationType.TASK_ASSIGNED,
                params={
                    "assigner_name": event.data.get("assigner_name", "Un utilisateur"),
                    "task_title": event.data.get("task_title", "Tâche"),
                    "task_id": event.data.get("task_id"),
                },
                resource_type="task",
                resource_id=event.data.get("task_id"),
                db=db,
            )

    finally:
        db.close()


@event_bus.subscribe(EventType.ORGANISATION_PIPELINE_CHANGED)
async def on_pipeline_changed(event: Event):
    """
    Listener: Pipeline changé -> Notifier l'équipe
    """
    from core.notifications import notify_from_template
    from models.notification import NotificationType
    from core.database import SessionLocal

    print(f"📊 Pipeline changé: {event.data.get('organisation_id')}")

    db = SessionLocal()

    try:
        # Notifier le propriétaire
        if event.user_id:
            await notify_from_template(
                user_id=event.user_id,
                type=NotificationType.PIPELINE_MOVED,
                params={
                    "organisation_name": event.data.get("organisation_name", "Organisation"),
                    "old_stage": event.data.get("old_stage", "Ancien stage"),
                    "new_stage": event.data.get("new_stage", "Nouveau stage"),
                    "organisation_id": event.data.get("organisation_id"),
                },
                resource_type="organisation",
                resource_id=event.data.get("organisation_id"),
                db=db,
            )

    finally:
        db.close()
