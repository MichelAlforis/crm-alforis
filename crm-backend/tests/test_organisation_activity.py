"""Tests pour la timeline unifiée des organisations."""

import pytest

from core.cache import clear_all_cache
from models.organisation_activity import OrganisationActivityType


@pytest.fixture(autouse=True)
def cleanup_cache():
    clear_all_cache()
    yield
    clear_all_cache()


def test_timeline_records_on_crud_operations(client, auth_headers):
    """Vérifie que les opérations principales alimentent la timeline."""
    # Création organisation
    org_payload = {
        "name": "Timeline Test Org",
        "category": "Institution",
        "email": "timeline@test.org",
        "country_code": "FR",
        "language": "FR",
    }
    response = client.post("/api/v1/organisations", json=org_payload, headers=auth_headers)
    assert response.status_code == 201
    organisation = response.json()
    organisation_id = organisation["id"]

    # Mise à jour organisation
    update_payload = {"website": "https://timeline.example"}
    update_resp = client.put(
        f"/api/v1/organisations/{organisation_id}",
        json=update_payload,
        headers=auth_headers,
    )
    assert update_resp.status_code == 200

    # Création mandat lié
    mandat_payload = {
        "organisation_id": organisation_id,
        "status": "proposé",
    }
    mandat_resp = client.post("/api/v1/mandats", json=mandat_payload, headers=auth_headers)
    assert mandat_resp.status_code == 201

    # Récupérer la timeline
    timeline_resp = client.get(
        f"/api/v1/organisations/{organisation_id}/activity",
        headers=auth_headers,
        params={"limit": 10},
    )
    assert timeline_resp.status_code == 200
    timeline = timeline_resp.json()

    assert timeline["total"] >= 3
    types = {item["type"] for item in timeline["items"]}
    assert OrganisationActivityType.ORGANISATION_CREATED.value in types
    assert OrganisationActivityType.ORGANISATION_UPDATED.value in types
    assert OrganisationActivityType.MANDAT_CREATED.value in types


def test_activity_widget_endpoint(client, auth_headers):
    """Vérifie que l'endpoint widget retourne des activités récentes."""
    widget_resp = client.get("/api/v1/dashboards/widgets/activity", headers=auth_headers)
    assert widget_resp.status_code == 200
    payload = widget_resp.json()
    # L'endpoint peut être vide mais doit retourner une structure paginée valide
    assert {"total", "skip", "limit", "items"}.issubset(payload.keys())
    assert isinstance(payload["items"], list)
