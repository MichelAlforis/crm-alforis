"""
Module Notifications - Système de notifications temps réel

Ce module fournit:
- WebSocket server pour notifications temps réel
- Service de création et envoi de notifications
- Intégration avec Redis Pub/Sub pour scalabilité
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

import atexit
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timezone, timedelta
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import asyncio
from anyio import from_thread as anyio_from_thread
from anyio.from_thread import start_blocking_portal, BlockingPortal

from models.notification import (
    Notification,
    NotificationType,
    NotificationPriority,
    NOTIFICATION_TEMPLATES
)
from models.user import User


# ============================================
# WebSocket Connection Manager
# ============================================

class ConnectionManager:
    """
    Gestion des connexions WebSocket

    Permet de:
    - Connecter/déconnecter des clients
    - Envoyer des messages à un utilisateur spécifique
    - Broadcaster des messages à tous les clients
    """

    def __init__(self):
        # Dict: user_id -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """
        Connecte un client WebSocket

        Args:
            websocket: Connexion WebSocket
            user_id: ID de l'utilisateur
        """
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = []

        self.active_connections[user_id].append(websocket)
        print(f"✅ WebSocket connecté: User#{user_id} ({len(self.active_connections[user_id])} connexions)")

    def disconnect(self, websocket: WebSocket, user_id: int):
        """
        Déconnecte un client WebSocket

        Args:
            websocket: Connexion WebSocket
            user_id: ID de l'utilisateur
        """
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)

            # Supprimer l'entrée si plus aucune connexion
            if len(self.active_connections[user_id]) == 0:
                del self.active_connections[user_id]

        print(f"❌ WebSocket déconnecté: User#{user_id}")

    async def send_personal_message(self, message: dict, user_id: int):
        """
        Envoie un message à un utilisateur spécifique

        Args:
            message: Message à envoyer (dict)
            user_id: ID de l'utilisateur
        """
        if user_id not in self.active_connections:
            return  # Utilisateur non connecté

        # Envoyer à toutes les connexions de l'utilisateur
        disconnected = []

        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_json(message)
            except WebSocketDisconnect:
                disconnected.append(websocket)
            except Exception as e:
                print(f"❌ Erreur envoi WebSocket User#{user_id}: {e}")
                disconnected.append(websocket)

        # Nettoyer les connexions mortes
        for ws in disconnected:
            self.disconnect(ws, user_id)

    async def broadcast(self, message: dict):
        """
        Broadcast un message à tous les utilisateurs connectés

        Args:
            message: Message à envoyer (dict)
        """
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(message, user_id)

    def is_user_connected(self, user_id: int) -> bool:
        """Vérifie si un utilisateur est connecté"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    def get_connected_users_count(self) -> int:
        """Retourne le nombre d'utilisateurs connectés"""
        return len(self.active_connections)


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
        message = {
            "type": "notification",
            "data": notification.to_dict()
        }

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
        return db.query(Notification)\
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False,
                Notification.is_archived == False
            )\
            .count()

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
        query = db.query(Notification)\
            .filter(Notification.user_id == user_id)

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
        db.query(Notification)\
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False
            )\
            .update({
                "is_read": True,
                "read_at": datetime.now(timezone.utc)
            })
        db.commit()

    @staticmethod
    def cleanup_old_notifications(db: Session, days: int = 30) -> int:
        """Supprime les notifications archivées plus anciennes que ``days`` jours."""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        deleted_count = db.query(Notification)\
            .filter(
                Notification.created_at < cutoff_date,
                Notification.is_archived.is_(True)
            )\
            .delete()

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
    def cleanup_old_notifications(
        db: Session,
        days: int = 30
    ):
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

async def websocket_endpoint(websocket: WebSocket, user_id: Union[int, str]):
    """
    Handler pour l'endpoint WebSocket des notifications

    Usage dans FastAPI:
        @app.websocket("/ws/notifications")
        async def notifications_websocket(
            websocket: WebSocket,
            current_user: User = Depends(get_current_websocket_user)
        ):
            await websocket_endpoint(websocket, current_user.id)

    Args:
        websocket: Connexion WebSocket
        user_id: ID de l'utilisateur connecté
    """
    # Connecter le client
    await manager.connect(websocket, user_id)

    try:
        # Envoyer un message de connexion réussie
        await websocket.send_json({
            "type": "connected",
            "data": {
                "user_id": user_id,
                "connected_at": datetime.now(timezone.utc).isoformat()
            }
        })

        # Boucle de réception des messages
        while True:
            # Recevoir les messages du client
            data = await websocket.receive_json()

            # Traiter les commandes du client
            if data.get("type") == "ping":
                # Répondre au ping
                await websocket.send_json({"type": "pong"})

            elif data.get("type") == "mark_read":
                # Marquer une notification comme lue
                notification_id = data.get("notification_id")
                # TODO: Implémenter la logique de marquage

            # Ajouter d'autres commandes selon besoin

    except WebSocketDisconnect:
        # Déconnecter proprement
        manager.disconnect(websocket, user_id)

    except Exception as e:
        print(f"❌ Erreur WebSocket User#{user_id}: {e}")
        manager.disconnect(websocket, user_id)
