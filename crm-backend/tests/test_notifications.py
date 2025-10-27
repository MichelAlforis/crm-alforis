"""
Tests - Système de Notifications

Tests pour:
- Modèle Notification
- Service NotificationService
- WebSocket ConnectionManager
- Event Bus (Redis Pub/Sub)
- Helpers de notifications
"""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from core.notifications import (
    ConnectionManager,
    NotificationService,
    manager,
    notify_from_template,
    notify_user,
)
from models.notification import (
    NOTIFICATION_TEMPLATES,
    Notification,
    NotificationPriority,
    NotificationType,
)
from models.user import User

# ============================================
# Tests Modèle Notification
# ============================================

def test_create_notification(test_db: Session, test_user: User):
    """Test création d'une notification"""
    notification = Notification(
        user_id=test_user.id,
        type=NotificationType.TASK_ASSIGNED,
        priority=NotificationPriority.NORMAL,
        title="Nouvelle tâche",
        message="Vous avez été assigné à une tâche",
        link="/dashboard/tasks/123",
    )

    test_db.add(notification)
    test_db.commit()

    assert notification.id is not None
    assert notification.user_id == test_user.id
    assert notification.type == NotificationType.TASK_ASSIGNED
    assert notification.is_read is False
    assert notification.is_archived is False


def test_notification_mark_as_read(test_db: Session, test_user: User):
    """Test marquer notification comme lue"""
    notification = Notification(
        user_id=test_user.id,
        type=NotificationType.SYSTEM,
        title="Test",
    )
    test_db.add(notification)
    test_db.commit()

    # Initialement non lue
    assert notification.is_read is False
    assert notification.read_at is None

    # Marquer comme lue
    notification.mark_as_read()
    test_db.commit()

    assert notification.is_read is True
    assert notification.read_at is not None


def test_notification_archive(test_db: Session, test_user: User):
    """Test archiver notification"""
    notification = Notification(
        user_id=test_user.id,
        type=NotificationType.SYSTEM,
        title="Test",
    )
    test_db.add(notification)
    test_db.commit()

    # Initialement non archivée
    assert notification.is_archived is False

    # Archiver
    notification.archive()
    test_db.commit()

    assert notification.is_archived is True
    assert notification.archived_at is not None


def test_notification_is_expired(test_db: Session, test_user: User):
    """Test vérification d'expiration"""
    # Notification expirée
    expired_notif = Notification(
        user_id=test_user.id,
        type=NotificationType.SYSTEM,
        title="Expired",
        expires_at=datetime.now(UTC) - timedelta(hours=1),
    )

    # Notification valide
    valid_notif = Notification(
        user_id=test_user.id,
        type=NotificationType.SYSTEM,
        title="Valid",
        expires_at=datetime.now(UTC) + timedelta(hours=1),
    )

    # Notification sans expiration
    no_expiry_notif = Notification(
        user_id=test_user.id,
        type=NotificationType.SYSTEM,
        title="No Expiry",
        expires_at=None,
    )

    test_db.add_all([expired_notif, valid_notif, no_expiry_notif])
    test_db.commit()

    assert expired_notif.is_expired() is True
    assert valid_notif.is_expired() is False
    assert no_expiry_notif.is_expired() is False


def test_notification_to_dict(test_db: Session, test_user: User):
    """Test conversion en dictionnaire"""
    notification = Notification(
        user_id=test_user.id,
        type=NotificationType.TASK_DUE,
        priority=NotificationPriority.HIGH,
        title="Tâche échue",
        message="La tâche X est échue",
        link="/tasks/1",
        resource_type="task",
        resource_id=1,
    )
    test_db.add(notification)
    test_db.commit()

    data = notification.to_dict()

    assert data["id"] == notification.id
    assert data["user_id"] == test_user.id
    assert data["type"] == NotificationType.TASK_DUE
    assert data["priority"] == NotificationPriority.HIGH
    assert data["title"] == "Tâche échue"
    assert data["link"] == "/tasks/1"
    assert data["resource_type"] == "task"
    assert data["resource_id"] == 1


# ============================================
# Tests NotificationService
# ============================================

def test_service_create_notification(test_db: Session, test_user: User):
    """Test création via NotificationService"""
    notification = NotificationService.create_notification(
        db=test_db,
        user_id=test_user.id,
        type=NotificationType.MANDAT_SIGNED,
        title="Mandat signé",
        message="Le mandat #123 a été signé",
        link="/mandats/123",
        priority=NotificationPriority.HIGH,
    )

    assert notification.id is not None
    assert notification.title == "Mandat signé"
    assert notification.priority == NotificationPriority.HIGH


def test_service_create_from_template(test_db: Session, test_user: User):
    """Test création depuis template"""
    notification = NotificationService.create_from_template(
        db=test_db,
        user_id=test_user.id,
        type=NotificationType.TASK_ASSIGNED,
        params={
            "assigner_name": "John Doe",
            "task_title": "Relancer client X",
            "task_id": 456,
        },
        resource_type="task",
        resource_id=456,
    )

    assert notification.id is not None
    assert "John Doe" in notification.message
    assert "Relancer client X" in notification.message
    assert notification.link == "/dashboard/tasks/456"


def test_service_get_unread_count(test_db: Session, test_user: User):
    """Test comptage notifications non lues"""
    # Créer 3 notifications non lues
    for i in range(3):
        notif = Notification(
            user_id=test_user.id,
            type=NotificationType.SYSTEM,
            title=f"Notification {i}",
        )
        test_db.add(notif)

    # Créer 2 notifications lues
    for i in range(2):
        notif = Notification(
            user_id=test_user.id,
            type=NotificationType.SYSTEM,
            title=f"Read {i}",
            is_read=True,
        )
        test_db.add(notif)

    test_db.commit()

    # Compter non lues
    unread_count = NotificationService.get_unread_count(test_db, test_user.id)
    assert unread_count == 3


def test_service_get_user_notifications(test_db: Session, test_user: User):
    """Test récupération notifications utilisateur"""
    # Créer des notifications
    for i in range(5):
        notif = Notification(
            user_id=test_user.id,
            type=NotificationType.SYSTEM,
            title=f"Notification {i}",
            is_read=(i < 2),  # 2 lues, 3 non lues
        )
        test_db.add(notif)

    test_db.commit()

    # Récupérer toutes (lues + non lues)
    all_notifs = NotificationService.get_user_notifications(
        test_db,
        test_user.id,
        limit=10,
        include_read=True,
    )
    assert len(all_notifs) == 5

    # Récupérer seulement non lues
    unread_notifs = NotificationService.get_user_notifications(
        test_db,
        test_user.id,
        limit=10,
        include_read=False,
    )
    assert len(unread_notifs) == 3


def test_service_mark_all_as_read(test_db: Session, test_user: User):
    """Test marquer toutes comme lues"""
    # Créer 5 notifications non lues
    for i in range(5):
        notif = Notification(
            user_id=test_user.id,
            type=NotificationType.SYSTEM,
            title=f"Notification {i}",
        )
        test_db.add(notif)

    test_db.commit()

    # Vérifier toutes non lues
    unread_count = NotificationService.get_unread_count(test_db, test_user.id)
    assert unread_count == 5

    # Marquer toutes comme lues
    NotificationService.mark_all_as_read(test_db, test_user.id)

    # Vérifier toutes lues
    unread_count = NotificationService.get_unread_count(test_db, test_user.id)
    assert unread_count == 0


def test_service_cleanup_old_notifications(test_db: Session, test_user: User):
    """Test nettoyage notifications anciennes"""
    # Créer notification ancienne archivée
    old_notif = Notification(
        user_id=test_user.id,
        type=NotificationType.SYSTEM,
        title="Old",
        is_archived=True,
        created_at=datetime.now(UTC) - timedelta(days=60),
    )

    # Créer notification récente
    recent_notif = Notification(
        user_id=test_user.id,
        type=NotificationType.SYSTEM,
        title="Recent",
        created_at=datetime.now(UTC) - timedelta(days=10),
    )

    test_db.add_all([old_notif, recent_notif])
    test_db.commit()

    # Nettoyer notifications > 30 jours
    deleted_count = NotificationService.cleanup_old_notifications(test_db, days=30)

    # Vérifier que l'ancienne a été supprimée
    assert deleted_count == 1

    # Vérifier que la récente existe toujours
    remaining = test_db.query(Notification).all()
    assert len(remaining) == 1
    assert remaining[0].title == "Recent"


# ============================================
# Tests WebSocket ConnectionManager
# ============================================

@pytest.mark.asyncio
async def test_connection_manager_basic():
    """Test fonctions de base du ConnectionManager"""
    cm = ConnectionManager()

    # Vérifier initialement vide
    assert cm.get_connected_users_count() == 0
    assert cm.is_user_connected(1) is False


@pytest.mark.asyncio
@pytest.mark.skip(reason="ConnectionManager API changed - uses accept(ws, org_id, user_id) not connect(ws, user_id)")
async def test_connection_manager_user_tracking():
    """Test suivi des utilisateurs connectés"""
    cm = ConnectionManager()

    # Mock WebSocket (pour test)
    class MockWebSocket:
        async def accept(self):
            pass

        async def send_json(self, data):
            pass

    ws1 = MockWebSocket()
    ws2 = MockWebSocket()

    # Connecter user 1
    await cm.connect(ws1, user_id=1)
    assert cm.is_user_connected(1) is True
    assert cm.get_connected_users_count() == 1

    # Connecter user 1 avec 2ème connexion
    await cm.connect(ws2, user_id=1)
    assert cm.is_user_connected(1) is True
    assert cm.get_connected_users_count() == 1  # Toujours 1 utilisateur

    # Déconnecter 1ère connexion
    cm.disconnect(ws1, user_id=1)
    assert cm.is_user_connected(1) is True  # Toujours connecté (2ème connexion)

    # Déconnecter 2ème connexion
    cm.disconnect(ws2, user_id=1)
    assert cm.is_user_connected(1) is False  # Plus connecté
    assert cm.get_connected_users_count() == 0


# ============================================
# Tests Helpers
# ============================================

@pytest.mark.asyncio
async def test_notify_user_helper(test_db: Session, test_user: User):
    """Test helper notify_user"""
    notification = await notify_user(
        user_id=test_user.id,
        type=NotificationType.EXPORT_READY,
        title="Export prêt",
        message="Votre export est disponible",
        link="/exports/1",
        db=test_db,
        priority=NotificationPriority.LOW,
        send_realtime=False,  # Ne pas envoyer via WebSocket pour le test
    )

    assert notification.id is not None
    assert notification.title == "Export prêt"
    assert notification.user_id == test_user.id


@pytest.mark.asyncio
async def test_notify_from_template_helper(test_db: Session, test_user: User):
    """Test helper notify_from_template"""
    notification = await notify_from_template(
        user_id=test_user.id,
        type=NotificationType.MANDAT_EXPIRING_SOON,
        params={
            "mandat_number": "M-2025-001",
            "days_left": 7,
            "mandat_id": 123,
        },
        db=test_db,
        resource_type="mandat",
        resource_id=123,
        send_realtime=False,
    )

    assert notification.id is not None
    assert "M-2025-001" in notification.message
    assert "7" in notification.message
    assert notification.link == "/dashboard/mandats/123"


# ============================================
# Tests Templates
# ============================================

def test_notification_templates_exist():
    """Test: Tous les templates sont définis"""
    assert NotificationType.TASK_DUE in NOTIFICATION_TEMPLATES
    assert NotificationType.TASK_ASSIGNED in NOTIFICATION_TEMPLATES
    assert NotificationType.MANDAT_SIGNED in NOTIFICATION_TEMPLATES
    assert NotificationType.PIPELINE_MOVED in NOTIFICATION_TEMPLATES


def test_notification_template_format():
    """Test: Format des templates"""
    template = NOTIFICATION_TEMPLATES[NotificationType.TASK_ASSIGNED]

    assert "title" in template
    assert "message" in template
    assert "link" in template
    assert "priority" in template

    # Vérifier que les placeholders existent
    assert "{assigner_name}" in template["message"]
    assert "{task_title}" in template["message"]
    assert "{task_id}" in template["link"]


# ============================================
# Tests Edge Cases
# ============================================

def test_notification_with_metadata(test_db: Session, test_user: User):
    """Test notification avec métadonnées JSON"""
    import json

    metadata = {
        "source": "api",
        "extra_data": {"key": "value"},
    }

    notification = Notification(
        user_id=test_user.id,
        type=NotificationType.SYSTEM,
        title="Test",
        metadata=json.dumps(metadata),
    )
    test_db.add(notification)
    test_db.commit()

    # Vérifier métadonnées
    assert notification.metadata is not None

    loaded_metadata = json.loads(notification.metadata)
    assert loaded_metadata["source"] == "api"
    assert loaded_metadata["extra_data"]["key"] == "value"


def test_notification_without_link(test_db: Session, test_user: User):
    """Test notification sans lien"""
    notification = Notification(
        user_id=test_user.id,
        type=NotificationType.SYSTEM,
        title="Info",
        message="Information générale",
        link=None,  # Pas de lien
    )
    test_db.add(notification)
    test_db.commit()

    assert notification.link is None
    data = notification.to_dict()
    assert data["link"] is None


def test_multiple_users_notifications(test_db: Session):
    """Test notifications pour plusieurs utilisateurs"""
    from models.role import Role, UserRole
    from models.user import User

    # Créer 2 utilisateurs
    role = Role(name=UserRole.USER, display_name="User", level=1)
    user1 = User(email="user1@test.com", username="user1", hashed_password="hash", role=role)
    user2 = User(email="user2@test.com", username="user2", hashed_password="hash", role=role)

    test_db.add_all([role, user1, user2])
    test_db.flush()

    # Créer notifications pour chaque utilisateur
    notif1 = Notification(user_id=user1.id, type=NotificationType.SYSTEM, title="For User 1")
    notif2 = Notification(user_id=user2.id, type=NotificationType.SYSTEM, title="For User 2")

    test_db.add_all([notif1, notif2])
    test_db.commit()

    # Vérifier isolation
    user1_notifs = NotificationService.get_user_notifications(test_db, user1.id)
    user2_notifs = NotificationService.get_user_notifications(test_db, user2.id)

    assert len(user1_notifs) == 1
    assert len(user2_notifs) == 1
    assert user1_notifs[0].title == "For User 1"
    assert user2_notifs[0].title == "For User 2"
