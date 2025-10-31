"""
Tests pour le middleware de logging RGPD

Teste le logging automatique des accès aux données personnelles.
"""

import pytest

from middleware.rgpd_logging import extract_entity_from_path, get_access_type, mask_sensitive_value


# ============================================================================
# Tests Helper Functions
# ============================================================================


def test_extract_entity_from_path_person():
    """Test extraction entité personne"""
    entity_type, entity_id = extract_entity_from_path("/api/v1/people/123")
    assert entity_type == "person"
    assert entity_id == 123


def test_extract_entity_from_path_organisation():
    """Test extraction entité organisation"""
    entity_type, entity_id = extract_entity_from_path("/api/v1/organisations/456")
    assert entity_type == "organisation"
    assert entity_id == 456


def test_extract_entity_from_path_user():
    """Test extraction entité utilisateur"""
    entity_type, entity_id = extract_entity_from_path("/api/v1/users/789")
    assert entity_type == "user"
    assert entity_id == 789


def test_extract_entity_from_path_email_message():
    """Test extraction entité email message"""
    entity_type, entity_id = extract_entity_from_path("/api/v1/email/messages/321")
    assert entity_type == "email_message"
    assert entity_id == 321


def test_extract_entity_from_path_interaction():
    """Test extraction entité interaction"""
    entity_type, entity_id = extract_entity_from_path("/api/v1/interactions/999")
    assert entity_type == "interaction"
    assert entity_id == 999


def test_extract_entity_from_path_task():
    """Test extraction entité task"""
    entity_type, entity_id = extract_entity_from_path("/api/v1/tasks/111")
    assert entity_type == "task"
    assert entity_id == 111


def test_extract_entity_from_path_no_match():
    """Test extraction sans correspondance"""
    entity_type, entity_id = extract_entity_from_path("/api/v1/unknown/123")
    assert entity_type is None
    assert entity_id is None


def test_extract_entity_from_path_list_endpoint():
    """Test extraction sur endpoint liste (pas d'ID)"""
    entity_type, entity_id = extract_entity_from_path("/api/v1/people")
    assert entity_type is None
    assert entity_id is None


# ============================================================================
# Tests Access Type Detection
# ============================================================================


def test_get_access_type_read():
    """Test détection type d'accès lecture"""
    access_type = get_access_type("GET", "/api/v1/people/123")
    assert access_type == "read"


def test_get_access_type_export():
    """Test détection type d'accès export"""
    access_type = get_access_type("GET", "/api/v1/rgpd/export")
    assert access_type == "export"


def test_get_access_type_delete():
    """Test détection type d'accès suppression"""
    access_type = get_access_type("DELETE", "/api/v1/people/123")
    assert access_type == "delete"


def test_get_access_type_anonymize():
    """Test détection type d'accès anonymisation"""
    access_type = get_access_type("DELETE", "/api/v1/rgpd/anonymize")
    assert access_type == "anonymize"


def test_get_access_type_post():
    """Test type d'accès non tracké (POST)"""
    access_type = get_access_type("POST", "/api/v1/people")
    assert access_type is None


def test_get_access_type_put():
    """Test type d'accès non tracké (PUT)"""
    access_type = get_access_type("PUT", "/api/v1/people/123")
    assert access_type is None


# ============================================================================
# Tests Sensitive Value Masking
# ============================================================================


def test_mask_sensitive_value_long():
    """Test masquage valeur longue"""
    masked = mask_sensitive_value("postgresql://user:password@localhost:5432/db")
    assert masked.startswith("post")
    assert masked.endswith("2/db")
    assert "***" in masked
    assert "password" not in masked


def test_mask_sensitive_value_short():
    """Test masquage valeur courte (<12 chars)"""
    masked = mask_sensitive_value("short")
    assert masked == "***"


def test_mask_sensitive_value_empty():
    """Test masquage valeur vide"""
    masked = mask_sensitive_value("")
    assert masked == "***"


def test_mask_sensitive_value_api_key():
    """Test masquage API key"""
    api_key = "sk-1234567890abcdefghijklmnopqrstuvwxyz"
    masked = mask_sensitive_value(api_key)
    assert masked.startswith("sk-1")
    assert masked.endswith("wxyz")
    assert "***" in masked
    assert len(api_key) > len(masked)


def test_mask_sensitive_value_database_url():
    """Test masquage database URL avec mot de passe"""
    db_url = "postgresql://crm_user:SuperSecret123!@postgres:5432/crm_db"
    masked = mask_sensitive_value(db_url)
    assert "SuperSecret123!" not in masked
    assert "***" in masked
    assert masked.startswith("post")


# ============================================================================
# Tests Integration avec Endpoints (via test client)
# ============================================================================


def test_middleware_logs_person_access(client, auth_headers, test_db, test_user):
    """Test que le middleware log l'accès à une personne"""
    from models.data_access_log import DataAccessLog
    from models.person import Person

    # Créer une personne
    person = Person(
        first_name="Test",
        last_name="Person",
        email="test@example.com",
        created_by_id=test_user.id,
    )
    test_db.add(person)
    test_db.commit()
    test_db.refresh(person)

    # Compter les logs avant
    logs_before = test_db.query(DataAccessLog).count()

    # Accéder à la personne
    response = client.get(f"/api/v1/people/{person.id}", headers=auth_headers)
    assert response.status_code == 200

    # Vérifier qu'un log a été créé
    logs_after = test_db.query(DataAccessLog).count()
    assert logs_after == logs_before + 1

    # Vérifier le contenu du log
    log = (
        test_db.query(DataAccessLog)
        .filter(
            DataAccessLog.entity_type == "person",
            DataAccessLog.entity_id == person.id,
            DataAccessLog.access_type == "read",
        )
        .first()
    )

    assert log is not None
    assert log.user_id == test_user.id
    assert log.endpoint == f"/api/v1/people/{person.id}"


def test_middleware_logs_organisation_access(client, auth_headers, test_db, test_user):
    """Test que le middleware log l'accès à une organisation"""
    from models.data_access_log import DataAccessLog
    from models.organisation import Organisation

    # Créer une organisation
    org = Organisation(name="Test Org", created_by_id=test_user.id)
    test_db.add(org)
    test_db.commit()
    test_db.refresh(org)

    # Compter les logs avant
    logs_before = test_db.query(DataAccessLog).count()

    # Accéder à l'organisation
    response = client.get(f"/api/v1/organisations/{org.id}", headers=auth_headers)
    assert response.status_code == 200

    # Vérifier qu'un log a été créé
    logs_after = test_db.query(DataAccessLog).count()
    assert logs_after == logs_before + 1

    # Vérifier le type
    log = (
        test_db.query(DataAccessLog)
        .filter(
            DataAccessLog.entity_type == "organisation",
            DataAccessLog.entity_id == org.id,
        )
        .first()
    )

    assert log is not None
    assert log.access_type == "read"


def test_middleware_does_not_log_list_endpoints(client, auth_headers, test_db):
    """Test que le middleware ne log pas les endpoints liste"""
    from models.data_access_log import DataAccessLog

    logs_before = test_db.query(DataAccessLog).count()

    # Accéder à la liste des personnes
    response = client.get("/api/v1/people", headers=auth_headers)
    # Note: ce test peut échouer si l'endpoint nécessite des permissions spécifiques

    # Ne devrait pas créer de log (pas d'ID spécifique)
    logs_after = test_db.query(DataAccessLog).count()
    assert logs_after == logs_before


def test_middleware_captures_ip_address(client, auth_headers, test_db, test_user):
    """Test que le middleware capture l'adresse IP"""
    from models.data_access_log import DataAccessLog
    from models.person import Person

    # Créer une personne
    person = Person(first_name="Test", last_name="IP", created_by_id=test_user.id)
    test_db.add(person)
    test_db.commit()
    test_db.refresh(person)

    # Accéder avec un header X-Forwarded-For
    headers = {**auth_headers, "X-Forwarded-For": "203.0.113.195, 70.41.3.18"}

    response = client.get(f"/api/v1/people/{person.id}", headers=headers)
    assert response.status_code == 200

    # Vérifier l'IP dans le log
    log = (
        test_db.query(DataAccessLog)
        .filter(DataAccessLog.entity_id == person.id)
        .order_by(DataAccessLog.accessed_at.desc())
        .first()
    )

    assert log is not None
    # Devrait extraire la première IP du X-Forwarded-For
    assert log.ip_address == "203.0.113.195"
