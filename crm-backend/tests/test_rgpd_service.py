"""
Tests unitaires pour le service RGPD

Teste les fonctionnalités de conformité RGPD/CNIL:
- Export des données utilisateur
- Anonymisation des données
- Récupération des logs d'accès
"""

import json
from datetime import datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from models.data_access_log import DataAccessLog
from models.email_message import EmailMessage
from models.interaction import Interaction, InteractionType
from models.organisation import Organisation
from models.person import Person
from models.task import Task, TaskStatus
from models.user import User
from services.rgpd_service import RGPDService


@pytest.fixture
def rgpd_service(test_db):
    """Fixture pour le service RGPD"""
    return RGPDService(test_db)


@pytest.fixture
def test_user(test_db):
    """Fixture pour créer un utilisateur de test"""
    user = User(
        email="test@example.com",
        password_hash="hashed_password",
        first_name="Test",
        last_name="User",
        phone="+33612345678",
        is_admin=False,
        is_active=True,
        last_login=datetime.utcnow(),
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def test_person(test_db, test_user):
    """Fixture pour créer une personne de test"""
    person = Person(
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com",
        phone="+33698765432",
        created_by_id=test_user.id,
        assigned_to_id=test_user.id,
    )
    test_db.add(person)
    test_db.commit()
    test_db.refresh(person)
    return person


@pytest.fixture
def test_organisation(test_db, test_user):
    """Fixture pour créer une organisation de test"""
    org = Organisation(
        name="Test Company",
        email="contact@testcompany.com",
        phone="+33123456789",
        created_by_id=test_user.id,
        owner_id=test_user.id,
    )
    test_db.add(org)
    test_db.commit()
    test_db.refresh(org)
    return org


# ============================================================================
# Tests Export
# ============================================================================


def test_export_user_data_basic(rgpd_service, test_user):
    """Test export basique des données utilisateur"""
    data = rgpd_service.export_user_data(user_id=test_user.id)

    # Vérifier la structure
    assert "export_date" in data
    assert "user_id" in data
    assert data["user_id"] == test_user.id

    # Vérifier les sections
    assert "user" in data
    assert "people" in data
    assert "organisations" in data
    assert "interactions" in data
    assert "tasks" in data
    assert "email_messages" in data

    # Vérifier le profil utilisateur
    user_data = data["user"]
    assert user_data["email"] == "test@example.com"
    assert user_data["first_name"] == "Test"
    assert user_data["last_name"] == "User"


def test_export_user_data_with_people(rgpd_service, test_user, test_person):
    """Test export avec des personnes créées"""
    data = rgpd_service.export_user_data(user_id=test_user.id)

    people = data["people"]
    assert len(people) == 1
    assert people[0]["first_name"] == "John"
    assert people[0]["last_name"] == "Doe"
    assert people[0]["email"] == "john.doe@example.com"


def test_export_user_data_with_organisations(rgpd_service, test_user, test_organisation):
    """Test export avec des organisations créées"""
    data = rgpd_service.export_user_data(user_id=test_user.id)

    orgs = data["organisations"]
    assert len(orgs) == 1
    assert orgs[0]["name"] == "Test Company"
    assert orgs[0]["email"] == "contact@testcompany.com"


def test_export_user_data_with_tasks(rgpd_service, test_db, test_user):
    """Test export avec des tâches"""
    task = Task(
        title="Test Task",
        description="Test description",
        status=TaskStatus.TODO,
        assigned_to_id=test_user.id,
        created_by_id=test_user.id,
    )
    test_db.add(task)
    test_db.commit()

    data = rgpd_service.export_user_data(user_id=test_user.id)

    tasks = data["tasks"]
    assert len(tasks) == 1
    assert tasks[0]["title"] == "Test Task"
    assert tasks[0]["description"] == "Test description"


def test_export_user_data_nonexistent(rgpd_service):
    """Test export d'un utilisateur inexistant"""
    with pytest.raises(ValueError, match="User 99999 not found"):
        rgpd_service.export_user_data(user_id=99999)


# ============================================================================
# Tests Anonymization
# ============================================================================


def test_anonymize_user_basic(rgpd_service, test_db, test_user):
    """Test anonymisation basique d'un utilisateur"""
    user_id = test_user.id
    original_email = test_user.email

    counts = rgpd_service.anonymize_user_data(user_id=user_id, reason="Test anonymization")

    # Vérifier que l'utilisateur a été anonymisé
    test_db.refresh(test_user)
    assert test_user.email != original_email
    assert "@anonymized.local" in test_user.email
    assert test_user.first_name == "Anonymized"
    assert test_user.last_name == "User"
    assert test_user.phone is None
    assert test_user.is_active is False

    # Vérifier les counts
    assert counts["user"] == 1


def test_anonymize_user_with_people(rgpd_service, test_db, test_user, test_person):
    """Test anonymisation avec des personnes liées"""
    counts = rgpd_service.anonymize_user_data(user_id=test_user.id, reason="Test anonymization")

    # Vérifier que la personne a été anonymisée
    test_db.refresh(test_person)
    assert test_person.first_name == "Anonymized"
    assert test_person.last_name == "Person"
    assert test_person.email is None
    assert test_person.phone is None

    # Vérifier les counts
    assert counts["people"] == 1


def test_anonymize_user_with_organisations(rgpd_service, test_db, test_user, test_organisation):
    """Test anonymisation avec des organisations liées"""
    counts = rgpd_service.anonymize_user_data(user_id=test_user.id, reason="Test anonymization")

    # Vérifier que l'organisation a été anonymisée
    test_db.refresh(test_organisation)
    assert test_organisation.name == "Anonymized Organisation"
    assert test_organisation.email is None
    assert test_organisation.phone is None

    # Vérifier les counts
    assert counts["organisations"] == 1


def test_anonymize_user_nonexistent(rgpd_service):
    """Test anonymisation d'un utilisateur inexistant"""
    with pytest.raises(ValueError, match="User 99999 not found"):
        rgpd_service.anonymize_user_data(user_id=99999, reason="Test")


def test_anonymize_creates_log(rgpd_service, test_db, test_user):
    """Test que l'anonymisation crée un log d'accès"""
    rgpd_service.anonymize_user_data(user_id=test_user.id, reason="Test anonymization")

    # Vérifier qu'un log a été créé
    logs = test_db.query(DataAccessLog).filter(
        DataAccessLog.entity_type == "user",
        DataAccessLog.entity_id == test_user.id,
        DataAccessLog.access_type == "anonymize",
    ).all()

    assert len(logs) == 1
    assert logs[0].purpose == "Anonymization: Test anonymization"


# ============================================================================
# Tests Access Logs
# ============================================================================


def test_get_access_logs_empty(rgpd_service):
    """Test récupération des logs quand vide"""
    logs = rgpd_service.get_access_logs()
    assert logs == []


def test_get_access_logs_basic(rgpd_service, test_db, test_user):
    """Test récupération basique des logs"""
    # Créer des logs de test
    log1 = DataAccessLog(
        entity_type="person",
        entity_id=1,
        access_type="read",
        endpoint="/api/v1/people/1",
        purpose="Test read",
        user_id=test_user.id,
        accessed_at=datetime.utcnow(),
    )
    log2 = DataAccessLog(
        entity_type="organisation",
        entity_id=2,
        access_type="export",
        endpoint="/api/v1/rgpd/export",
        purpose="Test export",
        user_id=test_user.id,
        accessed_at=datetime.utcnow(),
    )
    test_db.add_all([log1, log2])
    test_db.commit()

    # Récupérer tous les logs
    logs = rgpd_service.get_access_logs(limit=100)

    assert len(logs) == 2
    # Les logs sont triés par date décroissante
    assert logs[0]["access_type"] == "export"
    assert logs[1]["access_type"] == "read"


def test_get_access_logs_filter_by_user(rgpd_service, test_db, test_user):
    """Test filtrage des logs par user_id"""
    # Créer un autre utilisateur
    other_user = User(
        email="other@example.com",
        password_hash="hash",
        is_admin=False,
        is_active=True,
    )
    test_db.add(other_user)
    test_db.commit()

    # Créer des logs pour les deux utilisateurs
    log1 = DataAccessLog(
        entity_type="person",
        entity_id=1,
        access_type="read",
        user_id=test_user.id,
        accessed_at=datetime.utcnow(),
    )
    log2 = DataAccessLog(
        entity_type="person",
        entity_id=2,
        access_type="read",
        user_id=other_user.id,
        accessed_at=datetime.utcnow(),
    )
    test_db.add_all([log1, log2])
    test_db.commit()

    # Filtrer par test_user
    logs = rgpd_service.get_access_logs(user_id=test_user.id)

    assert len(logs) == 1
    assert logs[0]["user_id"] == test_user.id


def test_get_access_logs_filter_by_entity_type(rgpd_service, test_db, test_user):
    """Test filtrage des logs par entity_type"""
    log1 = DataAccessLog(
        entity_type="person",
        entity_id=1,
        access_type="read",
        user_id=test_user.id,
        accessed_at=datetime.utcnow(),
    )
    log2 = DataAccessLog(
        entity_type="organisation",
        entity_id=2,
        access_type="read",
        user_id=test_user.id,
        accessed_at=datetime.utcnow(),
    )
    test_db.add_all([log1, log2])
    test_db.commit()

    # Filtrer par entity_type
    logs = rgpd_service.get_access_logs(entity_type="person")

    assert len(logs) == 1
    assert logs[0]["entity_type"] == "person"


def test_get_access_logs_filter_by_access_type(rgpd_service, test_db, test_user):
    """Test filtrage des logs par access_type"""
    log1 = DataAccessLog(
        entity_type="person",
        entity_id=1,
        access_type="read",
        user_id=test_user.id,
        accessed_at=datetime.utcnow(),
    )
    log2 = DataAccessLog(
        entity_type="person",
        entity_id=2,
        access_type="export",
        user_id=test_user.id,
        accessed_at=datetime.utcnow(),
    )
    test_db.add_all([log1, log2])
    test_db.commit()

    # Filtrer par access_type
    logs = rgpd_service.get_access_logs(access_type="export")

    assert len(logs) == 1
    assert logs[0]["access_type"] == "export"


def test_get_access_logs_limit(rgpd_service, test_db, test_user):
    """Test limite du nombre de logs retournés"""
    # Créer 10 logs
    for i in range(10):
        log = DataAccessLog(
            entity_type="person",
            entity_id=i,
            access_type="read",
            user_id=test_user.id,
            accessed_at=datetime.utcnow(),
        )
        test_db.add(log)
    test_db.commit()

    # Limiter à 5
    logs = rgpd_service.get_access_logs(limit=5)

    assert len(logs) == 5


# ============================================================================
# Tests Serialization
# ============================================================================


def test_serialize_access_log(rgpd_service, test_db, test_user):
    """Test sérialisation d'un log d'accès"""
    log = DataAccessLog(
        entity_type="person",
        entity_id=123,
        access_type="read",
        endpoint="/api/v1/people/123",
        purpose="Test purpose",
        user_id=test_user.id,
        ip_address="192.168.1.1",
        user_agent="Mozilla/5.0",
        extra_data=json.dumps({"test": "data"}),
        accessed_at=datetime(2025, 10, 31, 12, 0, 0),
    )
    test_db.add(log)
    test_db.commit()
    test_db.refresh(log)

    serialized = rgpd_service._serialize_access_log(log)

    assert serialized["entity_type"] == "person"
    assert serialized["entity_id"] == 123
    assert serialized["access_type"] == "read"
    assert serialized["endpoint"] == "/api/v1/people/123"
    assert serialized["purpose"] == "Test purpose"
    assert serialized["user_id"] == test_user.id
    assert serialized["ip_address"] == "192.168.1.1"
    assert serialized["user_agent"] == "Mozilla/5.0"
    assert serialized["extra_data"] == {"test": "data"}
    assert "2025-10-31" in serialized["accessed_at"]
