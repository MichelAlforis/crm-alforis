"""
Tests pour les tâches Celery RGPD

Teste les tâches d'automatisation:
- anonymize_inactive_users()
- cleanup_old_access_logs()
- generate_compliance_report()
"""

from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest

from models.data_access_log import DataAccessLog
from models.user import User
from tasks.rgpd_tasks import (
    anonymize_inactive_users,
    cleanup_old_access_logs,
    generate_compliance_report,
)


# ============================================================================
# Tests anonymize_inactive_users
# ============================================================================


@patch("tasks.rgpd_tasks.SessionLocal")
def test_anonymize_inactive_users_finds_inactive(mock_session_local, test_db):
    """Test détection des utilisateurs inactifs"""
    mock_session_local.return_value = test_db

    # Créer un utilisateur inactif depuis 3 ans
    inactive_user = User(
        email="inactive@example.com",
        password_hash="hash",
        is_admin=False,
        is_active=True,
        last_login=datetime.utcnow() - timedelta(days=1100),  # ~3 ans
        created_at=datetime.utcnow() - timedelta(days=1100),
    )
    test_db.add(inactive_user)
    test_db.commit()

    # Exécuter la tâche avec 2 ans (730 jours) comme seuil
    result = anonymize_inactive_users(inactive_days=730)

    # Vérifier le résultat
    assert result["task"] == "anonymize_inactive_users"
    assert result["found"] == 1
    assert result["anonymized"] == 1
    assert result["failed"] == 0

    # Vérifier que l'utilisateur a été anonymisé
    test_db.refresh(inactive_user)
    assert "@anonymized.local" in inactive_user.email
    assert inactive_user.is_active is False


@patch("tasks.rgpd_tasks.SessionLocal")
def test_anonymize_inactive_users_skips_admins(mock_session_local, test_db):
    """Test que les admins ne sont pas anonymisés"""
    mock_session_local.return_value = test_db

    # Créer un admin inactif
    inactive_admin = User(
        email="admin@example.com",
        password_hash="hash",
        is_admin=True,
        is_active=True,
        last_login=datetime.utcnow() - timedelta(days=1100),
        created_at=datetime.utcnow() - timedelta(days=1100),
    )
    test_db.add(inactive_admin)
    test_db.commit()

    result = anonymize_inactive_users(inactive_days=730)

    # L'admin ne doit PAS être anonymisé
    assert result["found"] == 0
    assert result["anonymized"] == 0

    # Vérifier que l'admin est toujours actif
    test_db.refresh(inactive_admin)
    assert inactive_admin.email == "admin@example.com"
    assert inactive_admin.is_active is True


@patch("tasks.rgpd_tasks.SessionLocal")
def test_anonymize_inactive_users_skips_active(mock_session_local, test_db):
    """Test que les utilisateurs actifs ne sont pas anonymisés"""
    mock_session_local.return_value = test_db

    # Créer un utilisateur actif récemment
    active_user = User(
        email="active@example.com",
        password_hash="hash",
        is_admin=False,
        is_active=True,
        last_login=datetime.utcnow() - timedelta(days=30),  # 1 mois
        created_at=datetime.utcnow() - timedelta(days=365),
    )
    test_db.add(active_user)
    test_db.commit()

    result = anonymize_inactive_users(inactive_days=730)

    # L'utilisateur actif ne doit PAS être anonymisé
    assert result["found"] == 0
    assert result["anonymized"] == 0

    # Vérifier que l'utilisateur est toujours actif
    test_db.refresh(active_user)
    assert active_user.email == "active@example.com"
    assert active_user.is_active is True


@patch("tasks.rgpd_tasks.SessionLocal")
def test_anonymize_inactive_users_skips_already_anonymized(mock_session_local, test_db):
    """Test que les utilisateurs déjà anonymisés sont ignorés"""
    mock_session_local.return_value = test_db

    # Créer un utilisateur déjà anonymisé
    anonymized_user = User(
        email="anonymized_123@anonymized.local",
        password_hash="hash",
        is_admin=False,
        is_active=False,
        last_login=datetime.utcnow() - timedelta(days=1100),
        created_at=datetime.utcnow() - timedelta(days=1100),
    )
    test_db.add(anonymized_user)
    test_db.commit()

    result = anonymize_inactive_users(inactive_days=730)

    # Ne doit pas réanonymiser
    assert result["found"] == 0
    assert result["anonymized"] == 0


@patch("tasks.rgpd_tasks.SessionLocal")
def test_anonymize_inactive_users_never_logged_in(mock_session_local, test_db):
    """Test utilisateurs qui ne se sont jamais connectés"""
    mock_session_local.return_value = test_db

    # Créer un utilisateur ancien qui ne s'est jamais connecté
    never_logged_user = User(
        email="never@example.com",
        password_hash="hash",
        is_admin=False,
        is_active=True,
        last_login=None,  # Jamais connecté
        created_at=datetime.utcnow() - timedelta(days=1100),
    )
    test_db.add(never_logged_user)
    test_db.commit()

    result = anonymize_inactive_users(inactive_days=730)

    # Doit être anonymisé car compte > 2 ans et jamais utilisé
    assert result["found"] == 1
    assert result["anonymized"] == 1


# ============================================================================
# Tests cleanup_old_access_logs
# ============================================================================


@patch("tasks.rgpd_tasks.SessionLocal")
def test_cleanup_old_access_logs_deletes_old(mock_session_local, test_db):
    """Test suppression des logs anciens"""
    mock_session_local.return_value = test_db

    # Créer des logs anciens (>3 ans)
    old_log = DataAccessLog(
        entity_type="person",
        entity_id=1,
        access_type="read",
        accessed_at=datetime.utcnow() - timedelta(days=1200),  # ~3.3 ans
    )
    # Créer un log récent
    recent_log = DataAccessLog(
        entity_type="person",
        entity_id=2,
        access_type="read",
        accessed_at=datetime.utcnow() - timedelta(days=30),  # 1 mois
    )
    test_db.add_all([old_log, recent_log])
    test_db.commit()

    # Exécuter la tâche avec 3 ans (1095 jours) comme rétention
    result = cleanup_old_access_logs(retention_days=1095)

    # Vérifier le résultat
    assert result["task"] == "cleanup_old_access_logs"
    assert result["deleted"] == 1

    # Vérifier que le log ancien a été supprimé
    remaining_logs = test_db.query(DataAccessLog).all()
    assert len(remaining_logs) == 1
    assert remaining_logs[0].entity_id == 2  # Le log récent


@patch("tasks.rgpd_tasks.SessionLocal")
def test_cleanup_old_access_logs_keeps_recent(mock_session_local, test_db):
    """Test que les logs récents sont conservés"""
    mock_session_local.return_value = test_db

    # Créer seulement des logs récents
    recent_log1 = DataAccessLog(
        entity_type="person",
        entity_id=1,
        access_type="read",
        accessed_at=datetime.utcnow() - timedelta(days=100),
    )
    recent_log2 = DataAccessLog(
        entity_type="person",
        entity_id=2,
        access_type="read",
        accessed_at=datetime.utcnow() - timedelta(days=200),
    )
    test_db.add_all([recent_log1, recent_log2])
    test_db.commit()

    result = cleanup_old_access_logs(retention_days=1095)

    # Aucun log ne doit être supprimé
    assert result["deleted"] == 0

    # Tous les logs doivent être présents
    remaining_logs = test_db.query(DataAccessLog).all()
    assert len(remaining_logs) == 2


@patch("tasks.rgpd_tasks.SessionLocal")
def test_cleanup_old_access_logs_empty_db(mock_session_local, test_db):
    """Test nettoyage quand aucun log"""
    mock_session_local.return_value = test_db

    result = cleanup_old_access_logs(retention_days=1095)

    # Aucun log à supprimer
    assert result["deleted"] == 0


# ============================================================================
# Tests generate_compliance_report
# ============================================================================


@patch("tasks.rgpd_tasks.SessionLocal")
def test_generate_compliance_report_basic(mock_session_local, test_db):
    """Test génération du rapport de conformité"""
    mock_session_local.return_value = test_db

    # Créer des utilisateurs de test
    active_user = User(
        email="active@example.com",
        password_hash="hash",
        is_admin=False,
        is_active=True,
        last_login=datetime.utcnow() - timedelta(days=10),
        created_at=datetime.utcnow() - timedelta(days=100),
    )
    inactive_user = User(
        email="inactive@example.com",
        password_hash="hash",
        is_admin=False,
        is_active=True,
        last_login=datetime.utcnow() - timedelta(days=400),  # > 1 an
        created_at=datetime.utcnow() - timedelta(days=500),
    )
    anonymized_user = User(
        email="anon@anonymized.local",
        password_hash="hash",
        is_admin=False,
        is_active=False,
        last_login=datetime.utcnow() - timedelta(days=1000),
        created_at=datetime.utcnow() - timedelta(days=1000),
    )
    test_db.add_all([active_user, inactive_user, anonymized_user])
    test_db.commit()

    # Créer des logs d'accès récents
    log1 = DataAccessLog(
        entity_type="person",
        entity_id=1,
        access_type="read",
        accessed_at=datetime.utcnow() - timedelta(days=5),
    )
    log2 = DataAccessLog(
        entity_type="person",
        entity_id=2,
        access_type="export",
        accessed_at=datetime.utcnow() - timedelta(days=10),
    )
    test_db.add_all([log1, log2])
    test_db.commit()

    result = generate_compliance_report()

    # Vérifier le résultat
    assert result["task"] == "generate_compliance_report"
    assert "generation_date" in result
    assert "users" in result
    assert "access_logs" in result

    # Vérifier les stats utilisateurs
    users_stats = result["users"]
    assert users_stats["total"] == 3
    assert users_stats["active"] == 2  # active + inactive (is_active=True)
    assert users_stats["inactive_1year"] == 1  # inactive_user
    assert users_stats["anonymized"] == 1  # anonymized_user

    # Vérifier les stats logs
    logs_stats = result["access_logs"]
    assert logs_stats["last_30_days"] == 2
    assert "by_type" in logs_stats
    assert logs_stats["by_type"]["read"] == 1
    assert logs_stats["by_type"]["export"] == 1


@patch("tasks.rgpd_tasks.SessionLocal")
def test_generate_compliance_report_empty_db(mock_session_local, test_db):
    """Test rapport avec base vide"""
    mock_session_local.return_value = test_db

    result = generate_compliance_report()

    # Vérifier que le rapport est généré même sans données
    assert result["task"] == "generate_compliance_report"
    assert result["users"]["total"] == 0
    assert result["access_logs"]["last_30_days"] == 0


@patch("tasks.rgpd_tasks.SessionLocal")
def test_generate_compliance_report_only_old_logs(mock_session_local, test_db):
    """Test rapport avec seulement des logs anciens (>30 jours)"""
    mock_session_local.return_value = test_db

    # Créer un log ancien (>30 jours)
    old_log = DataAccessLog(
        entity_type="person",
        entity_id=1,
        access_type="read",
        accessed_at=datetime.utcnow() - timedelta(days=60),
    )
    test_db.add(old_log)
    test_db.commit()

    result = generate_compliance_report()

    # Les logs >30 jours ne doivent pas être comptés
    assert result["access_logs"]["last_30_days"] == 0


# ============================================================================
# Tests Error Handling
# ============================================================================


@patch("tasks.rgpd_tasks.SessionLocal")
@patch("tasks.rgpd_tasks.RGPDService")
def test_anonymize_inactive_users_handles_errors(mock_service, mock_session_local, test_db):
    """Test gestion d'erreur lors de l'anonymisation"""
    mock_session_local.return_value = test_db

    # Créer un utilisateur inactif
    inactive_user = User(
        email="inactive@example.com",
        password_hash="hash",
        is_admin=False,
        is_active=True,
        last_login=datetime.utcnow() - timedelta(days=1100),
        created_at=datetime.utcnow() - timedelta(days=1100),
    )
    test_db.add(inactive_user)
    test_db.commit()

    # Simuler une erreur dans le service
    mock_service_instance = Mock()
    mock_service_instance.anonymize_user_data.side_effect = Exception("Test error")
    mock_service.return_value = mock_service_instance

    result = anonymize_inactive_users(inactive_days=730)

    # Vérifier que l'erreur est gérée
    assert result["found"] == 1
    assert result["failed"] == 1
    assert result["anonymized"] == 0
