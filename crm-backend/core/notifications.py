"""
Module Notifications - Système de notifications temps réel

Ce module fournit:
- WebSocket server pour notifications temps réel (multi-tenant safe)
- Service de création et envoi de notifications
- Rooms par org/user/resource avec heartbeat timeout
- Helpers pour notifier les utilisateurs

Usage:
    from core.notifications import notify_user, NotificationService

    # Créer et envoyer une notification
    await notify_user(
        user_id=user.id,
        type=NotificationType.TASK_ASSIGNED,
        title="Nouvelle tâche",
        message="Vous avez une nouvelle tâche",
        link="/dashboard/tasks/123",
        db=db
    )
"""

from __future__ import annotations

import asyncio
import atexit
import json
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set, Union

from anyio import from_thread as anyio_from_thread
from anyio.from_thread import BlockingPortal, start_blocking_portal
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from models.notification import (
    NOTIFICATION_TEMPLATES,
    Notification,
    NotificationPriority,
    NotificationType,
)
from models.user import User

# ============================================
# WebSocket Connection Manager (Multi-Tenant)
# ============================================

HEARTBEAT_TIMEOUT_SEC = 90  # Ferme si pas d'activité depuis N sec
HEARTBEAT_SWEEP_INTERVAL_SEC = 20  # Fréquence de vérification des timeouts


class ClientMeta:
    """Métadonnées d'un client WebSocket connecté"""

    __slots__ = ("ws", "org_id", "user_id", "rooms", "last_seen")

    def __init__(self, ws: WebSocket, org_id: int, user_id: int):
        self.ws = ws
        self.org_id = org_id
        self.user_id = user_id
        self.rooms: Set[str] = set()
        self.last_seen: float = time.time()


class ConnectionManager:
    """
    Gestion des connexions WebSocket avec isolation multi-tenant

    Features:
    - Rooms par org/user/resource (isolation tenant)
    - Heartbeat timeout automatique (évite connexions zombies)
    - Close codes explicites (1000/1001/1011)
    - Envoi ciblé: user, org, room
    """

    def __init__(self) -> None:
        # rooms -> clients
        self.rooms: Dict[str, Set[ClientMeta]] = {}
        # reverse index
        self.clients: Dict[WebSocket, ClientMeta] = {}
        # surveillance heartbeat
        self._sweeper_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        """Démarre le sweeper de heartbeat si pas déjà lancé"""
        if self._sweeper_task is None or self._sweeper_task.done():
            self._sweeper_task = asyncio.create_task(self._heartbeat_sweeper())

    async def stop(self) -> None:
        """Arrête le sweeper de heartbeat"""
        if self._sweeper_task:
            self._sweeper_task.cancel()
            self._sweeper_task = None

    async def accept(self, ws: WebSocket, org_id: int, user_id: int) -> ClientMeta:
        """
        Accepte une connexion WebSocket et crée les rooms de base

        Args:
            ws: WebSocket
            org_id: ID de l'organisation
            user_id: ID de l'utilisateur

        Returns:
            ClientMeta: Métadonnées du client
        """
        await ws.accept()
        meta = ClientMeta(ws, org_id, user_id)

        async with self._lock:
            self.clients[ws] = meta
            # Rooms de base
            await self._join_internal(meta, f"org:{org_id}")
            await self._join_internal(meta, f"org:{org_id}:user:{user_id}")

        print(f"✅ WebSocket connecté: Org#{org_id} User#{user_id} ({len(self.clients)} total)")
        return meta

    async def join(self, ws: WebSocket, room: str) -> None:
        """Ajoute le client à une room"""
        async with self._lock:
            meta = self.clients.get(ws)
            if not meta:
                return
            await self._join_internal(meta, room)

    async def _join_internal(self, meta: ClientMeta, room: str) -> None:
        """Join interne sans lock (appelé depuis un contexte déjà locké)"""
        meta.rooms.add(room)
        self.rooms.setdefault(room, set()).add(meta)

    async def leave(self, ws: WebSocket, room: str) -> None:
        """Retire le client d'une room"""
        async with self._lock:
            meta = self.clients.get(ws)
            if not meta:
                return
            if room in meta.rooms:
                meta.rooms.remove(room)
            if room in self.rooms:
                self.rooms[room].discard(meta)
                if not self.rooms[room]:
                    self.rooms.pop(room, None)

    async def disconnect(self, ws: WebSocket, code: int = 1000, reason: str = "normal") -> None:
        """
        Déconnecte un client proprement avec close code explicite

        Args:
            ws: WebSocket
            code: Code de fermeture (1000=normal, 1001=going away, 1011=error)
            reason: Raison de la fermeture
        """
        try:
            await ws.close(code=code, reason=reason)
        except Exception:
            pass

        async with self._lock:
            meta = self.clients.pop(ws, None)
            if not meta:
                return

            # Retirer de toutes les rooms
            for room in list(meta.rooms):
                group = self.rooms.get(room)
                if group:
                    group.discard(meta)
                    if not group:
                        self.rooms.pop(room, None)

        print(f"❌ WebSocket déconnecté: Org#{meta.org_id} User#{meta.user_id} ({code}: {reason})")

    async def send_to_room(self, room: str, event: dict) -> None:
        """Envoie un event à tous les clients d'une room"""
        payload = json.dumps(event, ensure_ascii=False)

        async with self._lock:
            targets = list(self.rooms.get(room, set()))

        for meta in targets:
            try:
                await meta.ws.send_text(payload)
            except Exception:
                await self.disconnect(meta.ws, code=1011, reason="send failed")

    async def broadcast_org(self, org_id: int, event: dict) -> None:
        """Broadcast à toute une organisation"""
        await self.send_to_room(f"org:{org_id}", event)

    async def send_to_user(self, org_id: int, user_id: int, event: dict) -> None:
        """Envoie à un utilisateur spécifique"""
        await self.send_to_room(f"org:{org_id}:user:{user_id}", event)

    async def mark_seen(self, ws: WebSocket) -> None:
        """Met à jour le timestamp de dernière activité (heartbeat)"""
        async with self._lock:
            meta = self.clients.get(ws)
            if meta:
                meta.last_seen = time.time()

    async def _heartbeat_sweeper(self) -> None:
        """Task qui ferme les connexions inactives (timeout)"""
        try:
            while True:
                await asyncio.sleep(HEARTBEAT_SWEEP_INTERVAL_SEC)
                now = time.time()
                stale: list[WebSocket] = []

                async with self._lock:
                    for ws, meta in list(self.clients.items()):
                        if now - meta.last_seen > HEARTBEAT_TIMEOUT_SEC:
                            stale.append(ws)

                for ws in stale:
                    await self.disconnect(ws, code=1001, reason="heartbeat timeout")

        except asyncio.CancelledError:
            return

    # ============================================
    # Méthodes de compatibilité avec l'ancien manager
    # ============================================

    async def send_personal_message(self, message: dict, user_id: int):
        """Compatibilité: envoie à un user (suppose org_id=1 par défaut)"""
        # Note: Cette méthode est conservée pour compatibilité mais dépréciée
        # Utiliser send_to_user(org_id, user_id, message) à la place
        async with self._lock:
            # Trouver tous les clients de cet user_id
            targets = [m for m in self.clients.values() if m.user_id == user_id]

        payload = json.dumps(message, ensure_ascii=False)
        for meta in targets:
            try:
                await meta.ws.send_text(payload)
            except Exception:
                await self.disconnect(meta.ws, code=1011, reason="send failed")

    def is_user_connected(self, user_id: int) -> bool:
        """Vérifie si un utilisateur est connecté"""
        return any(m.user_id == user_id for m in self.clients.values())

    def get_connected_users_count(self) -> int:
        """Retourne le nombre de clients connectés"""
        return len(self.clients)


# S'assurer qu'un portail AnyIO est disponible pour les appels from_thread (tests WS)
_blocking_portal: Optional[BlockingPortal] = None
_blocking_portal_cm = None
_portal_shutdown_registered = False
_original_anyio_run = anyio_from_thread.run


def _close_blocking_portal():
    global _blocking_portal, _blocking_portal_cm
    if _blocking_portal_cm is not None:
        try:
            _blocking_portal_cm.__exit__(None, None, None)
        finally:
            _blocking_portal_cm = None
            _blocking_portal = None


def _ensure_blocking_portal() -> BlockingPortal:
    global _blocking_portal, _blocking_portal_cm, _portal_shutdown_registered
    if _blocking_portal is None:
        _blocking_portal_cm = start_blocking_portal()
        _blocking_portal = _blocking_portal_cm.__enter__()
        if not _portal_shutdown_registered:
            atexit.register(_close_blocking_portal)
            _portal_shutdown_registered = True
    return _blocking_portal


def _run_with_portal_fallback(func, *args):
    try:
        return _original_anyio_run(func, *args)
    except RuntimeError as exc:
        if "AnyIO worker thread" not in str(exc):
            raise
        portal = _ensure_blocking_portal()
        return portal.call(func, *args)


anyio_from_thread.run = _run_with_portal_fallback

# Instance globale du manager
manager = ConnectionManager()


# ============================================
# Service de Notifications
# ============================================


class NotificationService:
    """
    Service pour créer et envoyer des notifications

    Gère:
    - Création de notifications en DB
    - Envoi temps réel via WebSocket
    - Application des templates
    - Nettoyage des anciennes notifications
    """

    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        type: NotificationType,
        title: str,
        message: Optional[str] = None,
        link: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        expires_at: Optional[datetime] = None,
        metadata: Optional[dict] = None,
    ) -> Notification:
        """
        Crée une notification en base de données

        Args:
            db: Session database
            user_id: ID de l'utilisateur destinataire
            type: Type de notification
            title: Titre de la notification
            message: Message (optionnel)
            link: Lien de redirection (optionnel)
            resource_type: Type de ressource liée (optionnel)
            resource_id: ID de la ressource liée (optionnel)
            priority: Priorité (par défaut NORMAL)
            expires_at: Date d'expiration (optionnel)
            metadata: Métadonnées JSON (optionnel)

        Returns:
            Notification: Notification créée
        """
        payload = {
            "user_id": user_id,
            "type": type,
            "title": title,
            "message": message,
            "link": link,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "priority": priority,
            "expires_at": expires_at,
        }

        if metadata is not None:
            payload["metadata"] = metadata

        notification = Notification(**payload)

        db.add(notification)
        db.commit()
        db.refresh(notification)

        return notification

    @staticmethod
    async def send_notification(
        notification: Notification,
        user_id: int,
    ):
        """
        Envoie une notification via WebSocket en temps réel

        Args:
            notification: Notification à envoyer
            user_id: ID de l'utilisateur
        """
        # Construire le message WebSocket
        message = {"type": "notification", "data": notification.to_dict()}

        # Envoyer via WebSocket si l'utilisateur est connecté
        await manager.send_personal_message(message, user_id)

    @staticmethod
    def create_from_template(
        db: Session,
        user_id: int,
        type: NotificationType,
        params: dict,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
    ) -> Notification:
        """
        Crée une notification à partir d'un template prédéfini

        Args:
            db: Session database
            user_id: ID de l'utilisateur
            type: Type de notification
            params: Paramètres pour remplir le template
            resource_type: Type de ressource (optionnel)
            resource_id: ID de la ressource (optionnel)

        Returns:
            Notification: Notification créée
        """
        template = NOTIFICATION_TEMPLATES.get(type)
        if not template:
            raise ValueError(f"Template non trouvé pour le type: {type}")

        class _SafeDict(dict):
            def __missing__(self, key):
                return ""

        safe_params = _SafeDict({k: v for k, v in (params or {}).items()})

        title = template["title"].format_map(safe_params)
        message = template["message"].format_map(safe_params)
        link_template = template.get("link")
        link = link_template.format_map(safe_params) if link_template else None
        priority = template.get("priority", NotificationPriority.NORMAL)

        return NotificationService.create_notification(
            db=db,
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            link=link,
            resource_type=resource_type,
            resource_id=resource_id,
            priority=priority,
        )

    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        """
        Retourne le nombre de notifications non lues

        Args:
            db: Session database
            user_id: ID de l'utilisateur

        Returns:
            int: Nombre de notifications non lues
        """
        return (
            db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False,
                Notification.is_archived == False,
            )
            .count()
        )

    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: int,
        limit: int = 50,
        include_read: bool = True,
        include_archived: bool = False,
    ) -> List[Notification]:
        """
        Récupère les notifications d'un utilisateur

        Args:
            db: Session database
            user_id: ID de l'utilisateur
            limit: Nombre max de notifications
            include_read: Inclure les notifications lues
            include_archived: Inclure les notifications archivées

        Returns:
            List[Notification]: Liste des notifications
        """
        query = db.query(Notification).filter(Notification.user_id == user_id)

        if not include_read:
            query = query.filter(Notification.is_read == False)

        if not include_archived:
            query = query.filter(Notification.is_archived == False)

        query = query.order_by(Notification.created_at.desc())
        query = query.limit(limit)

        return query.all()

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int):
        """
        Marque toutes les notifications d'un utilisateur comme lues

        Args:
            db: Session database
            user_id: ID de l'utilisateur
        """
        db.query(Notification).filter(
            Notification.user_id == user_id, Notification.is_read == False
        ).update({"is_read": True, "read_at": datetime.now(timezone.utc)})
        db.commit()

    @staticmethod
    def cleanup_old_notifications(db: Session, days: int = 30) -> int:
        """Supprime les notifications archivées plus anciennes que ``days`` jours."""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        deleted_count = (
            db.query(Notification)
            .filter(Notification.created_at < cutoff_date, Notification.is_archived.is_(True))
            .delete()
        )

        db.commit()
        return deleted_count


class NotificationManager:
    """Facilite la création et l'envoi de notifications côté services métier."""

    def __init__(self, db: Session):
        self.db = db

    def create_notification(
        self,
        user_id: int,
        type: NotificationType,
        title: str,
        message: Optional[str] = None,
        link: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        expires_at: Optional[datetime] = None,
        metadata: Optional[dict] = None,
        data: Optional[dict] = None,
    ) -> Notification:
        if metadata is None and data is not None:
            metadata = data

        notification = NotificationService.create_notification(
            db=self.db,
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            link=link,
            resource_type=resource_type,
            resource_id=resource_id,
            priority=priority,
            expires_at=expires_at,
            metadata=metadata,
        )

        return notification

    async def send_notification(self, notification: Notification, user_id: int) -> None:
        await NotificationService.send_notification(notification, user_id)

    def get_unread_count(self, user_id: int) -> int:
        return NotificationService.get_unread_count(self.db, user_id)

    @staticmethod
    def cleanup_old_notifications(db: Session, days: int = 30):
        """
        Supprime les notifications anciennes

        Args:
            db: Session database
            days: Nombre de jours (supprimer notifications plus vieilles)
        """
        return NotificationService.cleanup_old_notifications(db, days=days)


# ============================================
# Helpers Simplifiés
# ============================================


async def notify_user(
    user_id: int,
    type: NotificationType,
    title: str,
    message: Optional[str] = None,
    link: Optional[str] = None,
    db: Session = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    send_realtime: bool = True,
) -> Notification:
    """
    Helper pour créer et envoyer une notification rapidement

    Args:
        user_id: ID de l'utilisateur
        type: Type de notification
        title: Titre
        message: Message (optionnel)
        link: Lien (optionnel)
        db: Session database
        resource_type: Type de ressource (optionnel)
        resource_id: ID de la ressource (optionnel)
        priority: Priorité
        send_realtime: Envoyer en temps réel via WebSocket

    Returns:
        Notification: Notification créée
    """
    # Créer en DB
    notification = NotificationService.create_notification(
        db=db,
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        link=link,
        resource_type=resource_type,
        resource_id=resource_id,
        priority=priority,
    )

    # Envoyer en temps réel si demandé
    if send_realtime:
        await NotificationService.send_notification(notification, user_id)

    return notification


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str = "reminder",
    priority: str = "normal",
    link: Optional[str] = None,
) -> Notification:
    """
    Version synchrone pour créer une notification (sans WebSocket)

    Utilisé par les workers synchrones (reminder_worker, etc.)

    Args:
        db: Session database
        user_id: ID utilisateur
        title: Titre
        message: Message
        type: Type ('reminder', 'task', etc.)
        priority: Priorité ('low', 'normal', 'high', 'urgent')
        link: Lien optionnel

    Returns:
        Notification créée
    """
    # Mapper les types string vers enum
    type_map = {
        "reminder": NotificationType.INTERACTION_REMINDER,
        "task": NotificationType.TASK_ASSIGNED,
        "mention": NotificationType.MENTION,
    }

    priority_map = {
        "low": NotificationPriority.LOW,
        "normal": NotificationPriority.NORMAL,
        "high": NotificationPriority.HIGH,
        "urgent": NotificationPriority.URGENT,
    }

    notification = Notification(
        user_id=user_id,
        type=type_map.get(type, NotificationType.INTERACTION_REMINDER),
        priority=priority_map.get(priority, NotificationPriority.NORMAL),
        title=title,
        message=message,
        link=link,
        created_at=datetime.now(timezone.utc),
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


async def notify_from_template(
    user_id: int,
    type: NotificationType,
    params: dict,
    db: Session,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    send_realtime: bool = True,
) -> Notification:
    """
    Helper pour créer une notification depuis un template

    Args:
        user_id: ID de l'utilisateur
        type: Type de notification
        params: Paramètres du template
        db: Session database
        resource_type: Type de ressource (optionnel)
        resource_id: ID de la ressource (optionnel)
        send_realtime: Envoyer en temps réel

    Returns:
        Notification: Notification créée
    """
    # Créer depuis template
    notification = NotificationService.create_from_template(
        db=db,
        user_id=user_id,
        type=type,
        params=params,
        resource_type=resource_type,
        resource_id=resource_id,
    )

    # Envoyer en temps réel
    if send_realtime:
        await NotificationService.send_notification(notification, user_id)

    return notification


# ============================================
# WebSocket Endpoint Handler
# ============================================


async def websocket_endpoint(websocket: WebSocket, user_id: int, org_id: int):
    """
    Handler pour l'endpoint WebSocket des notifications (multi-tenant)

    Usage dans FastAPI:
        @app.websocket("/ws/notifications")
        async def notifications_websocket(
            websocket: WebSocket,
            current_user: User = Depends(get_current_websocket_user)
        ):
            await websocket_endpoint(websocket, current_user.id, current_user.org_id)

    Args:
        websocket: Connexion WebSocket
        user_id: ID de l'utilisateur connecté
        org_id: ID de l'organisation (multi-tenant)

    Messages supportés (client -> serveur):
        - {"type": "ping"} -> heartbeat (met à jour last_seen)
        - {"type": "join", "room": "org:42:resource:contact:123"} -> rejoint une room
        - {"type": "leave", "room": "org:42:resource:contact:123"} -> quitte une room
    """
    # Démarrer le sweeper si pas déjà fait
    await manager.start()

    # Accepter la connexion et créer les rooms de base
    await manager.accept(websocket, org_id=org_id, user_id=user_id)

    try:
        # Envoyer un message de connexion réussie
        await websocket.send_json(
            {
                "type": "connected",
                "data": {
                    "user_id": user_id,
                    "org_id": org_id,
                    "connected_at": datetime.now(timezone.utc).isoformat(),
                },
            }
        )

        # Boucle de réception des messages
        while True:
            # Recevoir les messages du client
            msg = await websocket.receive_text()

            # Mettre à jour heartbeat
            await manager.mark_seen(websocket)

            try:
                data = json.loads(msg)
            except json.JSONDecodeError:
                # Message invalide, on ignore
                continue

            msg_type = data.get("type")

            # Heartbeat ping
            if msg_type == "ping":
                # On peut répondre un pong si besoin
                await websocket.send_json({"type": "pong"})
                continue

            # Rejoindre une room
            elif msg_type == "join" and isinstance(data.get("room"), str):
                room = data["room"]
                # Sécurité: n'autorise que des rooms de cette org
                if not room.startswith(f"org:{org_id}"):
                    # Policy violation
                    await manager.disconnect(websocket, code=1008, reason="invalid room")
                    break
                await manager.join(websocket, room)
                continue

            # Quitter une room
            elif msg_type == "leave" and isinstance(data.get("room"), str):
                await manager.leave(websocket, data["room"])
                continue

            # Marquer notification comme lue
            elif msg_type == "mark_read":
                notification_id = data.get("notification_id")
                # TODO: Implémenter la logique de marquage
                continue

            # Autres commandes: à étendre selon besoin

    except WebSocketDisconnect:
        # Déconnecter proprement
        await manager.disconnect(websocket, code=1000, reason="client left")

    except Exception as e:
        print(f"❌ Erreur WebSocket Org#{org_id} User#{user_id}: {e}")
        await manager.disconnect(websocket, code=1011, reason="server error")
