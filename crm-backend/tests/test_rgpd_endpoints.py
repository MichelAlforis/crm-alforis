"""
Tests d'intégration pour les endpoints RGPD

Teste les endpoints API:
- GET /api/v1/rgpd/export
- DELETE /api/v1/rgpd/delete
- GET /api/v1/rgpd/access-logs (admin)
- GET /api/v1/rgpd/my-access-logs
"""

import json
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from models.data_access_log import DataAccessLog
from models.person import Person
from models.user import User


def test_export_my_data_success(client, auth_headers, test_db, test_user):
    """Test export réussi des données utilisateur"""
    response = client.get("/api/v1/rgpd/export", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()

    # Vérifier la structure
    assert "export_date" in data
    assert "user_id" in data
    assert data["user_id"] == test_user.id
    assert "data" in data

    # Vérifier les sections
    export_data = data["data"]
    assert "user" in export_data
    assert "people" in export_data
    assert "organisations" in export_data
    assert "interactions" in export_data
    assert "tasks" in export_data
    assert "email_messages" in export_data


def test_export_my_data_unauthorized(client):
    """Test export sans authentification"""
    response = client.get("/api/v1/rgpd/export")
    assert response.status_code == 401


def test_export_my_data_with_people(client, auth_headers, test_db, test_user):
    """Test export avec des personnes créées"""
    # Créer une personne
    person = Person(
        first_name="John",
        last_name="Doe",
        email="john@example.com",
        created_by_id=test_user.id,
    )
    test_db.add(person)
    test_db.commit()

    response = client.get("/api/v1/rgpd/export", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    people = data["data"]["people"]

    assert len(people) >= 1
    person_found = any(p["first_name"] == "John" and p["last_name"] == "Doe" for p in people)
    assert person_found


def test_export_creates_access_log(client, auth_headers, test_db, test_user):
    """Test que l'export crée un log d'accès"""
    # Vérifier qu'il n'y a pas de logs avant
    logs_before = test_db.query(DataAccessLog).count()

    response = client.get("/api/v1/rgpd/export", headers=auth_headers)
    assert response.status_code == 200

    # Vérifier qu'un log a été créé
    logs_after = test_db.query(DataAccessLog).count()
    assert logs_after == logs_before + 1

    # Vérifier le contenu du log
    log = (
        test_db.query(DataAccessLog)
        .filter(DataAccessLog.access_type == "export")
        .order_by(DataAccessLog.accessed_at.desc())
        .first()
    )

    assert log is not None
    assert log.entity_type == "user"
    assert log.entity_id == test_user.id
    assert log.user_id == test_user.id
    assert "Export RGPD" in log.purpose


# ============================================================================
# Tests DELETE /api/v1/rgpd/delete
# ============================================================================


def test_delete_my_data_success(client, auth_headers, test_db, test_user):
    """Test suppression réussie des données utilisateur"""
    payload = {"reason": "Je n'utilise plus le service et souhaite supprimer mes données", "confirm": True}

    response = client.delete("/api/v1/rgpd/delete", headers=auth_headers, json=payload)

    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert "anonymized" in data["message"].lower()
    assert "anonymized_records" in data

    # Vérifier que l'utilisateur a été anonymisé
    test_db.refresh(test_user)
    assert "@anonymized.local" in test_user.email
    assert test_user.is_active is False


def test_delete_my_data_without_confirm(client, auth_headers):
    """Test suppression sans confirmation"""
    payload = {"reason": "Test reason that is long enough", "confirm": False}

    response = client.delete("/api/v1/rgpd/delete", headers=auth_headers, json=payload)

    assert response.status_code == 400
    assert "not confirmed" in response.json()["detail"].lower()


def test_delete_my_data_short_reason(client, auth_headers):
    """Test suppression avec raison trop courte"""
    payload = {"reason": "Short", "confirm": True}

    response = client.delete("/api/v1/rgpd/delete", headers=auth_headers, json=payload)

    # Le validator Pydantic devrait rejeter
    assert response.status_code == 422


def test_delete_my_data_unauthorized(client):
    """Test suppression sans authentification"""
    payload = {"reason": "Test reason that is long enough", "confirm": True}

    response = client.delete("/api/v1/rgpd/delete", json=payload)
    assert response.status_code == 401


def test_delete_creates_access_log_before_deletion(client, auth_headers, test_db, test_user):
    """Test que la suppression crée un log AVANT l'anonymisation"""
    payload = {"reason": "Test deletion for access log verification", "confirm": True}

    response = client.delete("/api/v1/rgpd/delete", headers=auth_headers, json=payload)
    assert response.status_code == 200

    # Vérifier qu'un log de type "delete" a été créé
    log = (
        test_db.query(DataAccessLog)
        .filter(
            DataAccessLog.entity_type == "user",
            DataAccessLog.entity_id == test_user.id,
            DataAccessLog.access_type == "delete",
        )
        .first()
    )

    assert log is not None
    assert "Deletion request" in log.purpose
    assert log.user_id == test_user.id


# ============================================================================
# Tests GET /api/v1/rgpd/access-logs (Admin)
# ============================================================================


def test_access_logs_admin_success(client, admin_headers, test_db, admin_user):
    """Test récupération des logs par un admin"""
    # Créer des logs de test
    log = DataAccessLog(
        entity_type="person",
        entity_id=1,
        access_type="read",
        endpoint="/api/v1/people/1",
        user_id=admin_user.id,
        accessed_at=datetime.utcnow(),
    )
    test_db.add(log)
    test_db.commit()

    response = client.get("/api/v1/rgpd/access-logs", headers=admin_headers)

    assert response.status_code == 200
    data = response.json()

    assert "total" in data
    assert "logs" in data
    assert len(data["logs"]) >= 1


def test_access_logs_non_admin_forbidden(client, auth_headers):
    """Test récupération des logs par un non-admin"""
    response = client.get("/api/v1/rgpd/access-logs", headers=auth_headers)

    assert response.status_code == 403
    assert "admin" in response.json()["detail"].lower()


def test_access_logs_filter_by_user_id(client, admin_headers, test_db, admin_user, test_user):
    """Test filtrage des logs par user_id"""
    # Créer des logs pour différents utilisateurs
    log1 = DataAccessLog(
        entity_type="person",
        entity_id=1,
        access_type="read",
        user_id=admin_user.id,
        accessed_at=datetime.utcnow(),
    )
    log2 = DataAccessLog(
        entity_type="person",
        entity_id=2,
        access_type="read",
        user_id=test_user.id,
        accessed_at=datetime.utcnow(),
    )
    test_db.add_all([log1, log2])
    test_db.commit()

    response = client.get(f"/api/v1/rgpd/access-logs?user_id={test_user.id}", headers=admin_headers)

    assert response.status_code == 200
    data = response.json()

    # Tous les logs doivent être pour test_user
    for log in data["logs"]:
        assert log["user_id"] == test_user.id


def test_access_logs_filter_by_access_type(client, admin_headers, test_db, admin_user):
    """Test filtrage des logs par access_type"""
    log1 = DataAccessLog(
        entity_type="person",
        entity_id=1,
        access_type="read",
        user_id=admin_user.id,
        accessed_at=datetime.utcnow(),
    )
    log2 = DataAccessLog(
        entity_type="person",
        entity_id=2,
        access_type="export",
        user_id=admin_user.id,
        accessed_at=datetime.utcnow(),
    )
    test_db.add_all([log1, log2])
    test_db.commit()

    response = client.get("/api/v1/rgpd/access-logs?access_type=export", headers=admin_headers)

    assert response.status_code == 200
    data = response.json()

    # Tous les logs doivent être de type "export"
    for log in data["logs"]:
        assert log["access_type"] == "export"


def test_access_logs_unauthorized(client):
    """Test récupération des logs sans authentification"""
    response = client.get("/api/v1/rgpd/access-logs")
    assert response.status_code == 401


# ============================================================================
# Tests GET /api/v1/rgpd/my-access-logs
# ============================================================================


def test_my_access_logs_success(client, auth_headers, test_db, test_user):
    """Test récupération des propres logs utilisateur"""
    # Créer des logs pour cet utilisateur
    log = DataAccessLog(
        entity_type="person",
        entity_id=1,
        access_type="read",
        user_id=test_user.id,
        accessed_at=datetime.utcnow(),
    )
    test_db.add(log)
    test_db.commit()

    response = client.get("/api/v1/rgpd/my-access-logs", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()

    assert "total" in data
    assert "logs" in data
    assert len(data["logs"]) >= 1

    # Tous les logs doivent être pour cet utilisateur
    for log in data["logs"]:
        assert log["user_id"] == test_user.id


def test_my_access_logs_only_shows_own_logs(client, auth_headers, test_db, test_user, admin_user):
    """Test que l'utilisateur ne voit que ses propres logs"""
    # Créer des logs pour l'utilisateur test
    log1 = DataAccessLog(
        entity_type="person",
        entity_id=1,
        access_type="read",
        user_id=test_user.id,
        accessed_at=datetime.utcnow(),
    )
    # Créer des logs pour un autre utilisateur (admin)
    log2 = DataAccessLog(
        entity_type="person",
        entity_id=2,
        access_type="read",
        user_id=admin_user.id,
        accessed_at=datetime.utcnow(),
    )
    test_db.add_all([log1, log2])
    test_db.commit()

    response = client.get("/api/v1/rgpd/my-access-logs", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()

    # Ne doit retourner que les logs de test_user
    assert data["total"] == 1
    assert data["logs"][0]["user_id"] == test_user.id


def test_my_access_logs_limit(client, auth_headers, test_db, test_user):
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

    response = client.get("/api/v1/rgpd/my-access-logs?limit=5", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()

    assert len(data["logs"]) == 5


def test_my_access_logs_unauthorized(client):
    """Test récupération des logs sans authentification"""
    response = client.get("/api/v1/rgpd/my-access-logs")
    assert response.status_code == 401
