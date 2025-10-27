"""
Tests pour les organisations

Teste toutes les opérations CRUD sur les organisations.
"""

import pytest

from models.organisation import Organisation, OrganisationCategory

# ============================================================================
# Tests Modèles
# ============================================================================

def test_create_organisation(test_db):
    """Test création d'une organisation"""
    org = Organisation(
        name="Alforis Finance",
        category=OrganisationCategory.INSTITUTION,
        email="contact@alforis.fr",
        website="https://alforis.fr",
        country_code="FR",
        language="FR",
        is_active=True,
    )

    test_db.add(org)
    test_db.commit()
    test_db.refresh(org)

    assert org.id is not None
    assert org.name == "Alforis Finance"
    assert org.category == OrganisationCategory.INSTITUTION
    assert org.is_active is True


def test_organisation_relationships(test_db, sample_organisation):
    """Test des relations de l'organisation"""
    assert sample_organisation.mandats is not None
    assert sample_organisation.contacts is not None
    assert sample_organisation.interactions is not None
    assert isinstance(sample_organisation.mandats, list)


def test_organisation_unique_email(test_db, sample_organisation):
    """Test unicité de l'email"""
    # Tenter de créer une organisation avec le même email
    duplicate_org = Organisation(
        name="Another Company",
        category=OrganisationCategory.WHOLESALE,
        email=sample_organisation.email,  # Même email
        country_code="FR",
        language="FR",
    )

    test_db.add(duplicate_org)

    with pytest.raises(Exception):  # IntegrityError
        test_db.commit()


# ============================================================================
# Tests API Endpoints
# ============================================================================

def test_list_organisations_empty(client, auth_headers):
    """Test liste vide d'organisations"""
    response = client.get("/api/v1/organisations", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


def test_list_organisations(client, auth_headers, sample_organisations):
    """Test liste des organisations"""
    response = client.get("/api/v1/organisations", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 5
    assert data[0]["name"] == "Company 0"


def test_get_organisation(client, auth_headers, sample_organisation):
    """Test récupération d'une organisation"""
    response = client.get(
        f"/api/v1/organisations/{sample_organisation.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == sample_organisation.id
    assert data["name"] == "Test Company"
    assert data["category"] == "Institution"


def test_get_organisation_not_found(client, auth_headers):
    """Test organisation inexistante"""
    response = client.get("/api/v1/organisations/99999", headers=auth_headers)

    assert response.status_code == 404


def test_create_organisation_api(client, auth_headers):
    """Test création via API"""
    org_data = {
        "name": "New Company",
        "category": "Institution",
        "email": "new@company.com",
        "website": "https://newcompany.com",
        "country_code": "FR",
        "language": "FR",
    }

    response = client.post(
        "/api/v1/organisations",
        json=org_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Company"
    assert data["email"] == "new@company.com"
    assert data["id"] is not None


def test_create_organisation_validation_error(client, auth_headers):
    """Test validation des données"""
    invalid_data = {
        "name": "",  # Nom vide
        "category": "Invalid",  # Catégorie invalide
    }

    response = client.post(
        "/api/v1/organisations",
        json=invalid_data,
        headers=auth_headers
    )

    assert response.status_code == 422  # Validation error


def test_update_organisation(client, auth_headers, sample_organisation):
    """Test mise à jour d'une organisation"""
    update_data = {
        "name": "Updated Company Name",
        "website": "https://updated.com",
    }

    response = client.put(
        f"/api/v1/organisations/{sample_organisation.id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Company Name"
    assert data["website"] == "https://updated.com"


def test_delete_organisation(client, auth_headers, sample_organisation):
    """Test suppression d'une organisation"""
    org_id = sample_organisation.id

    response = client.delete(
        f"/api/v1/organisations/{org_id}",
        headers=auth_headers
    )

    assert response.status_code == 204

    # Vérifier que l'organisation n'existe plus
    response = client.get(
        f"/api/v1/organisations/{org_id}",
        headers=auth_headers
    )
    assert response.status_code == 404


def test_filter_organisations_by_category(client, auth_headers, test_db, create_organisation):
    """Test filtrage par catégorie"""
    # Créer des organisations de différentes catégories
    create_organisation(test_db, name="Institution 1", category=OrganisationCategory.INSTITUTION)
    create_organisation(test_db, name="Wholesale 1", category=OrganisationCategory.WHOLESALE)
    create_organisation(test_db, name="CGPI 1", category=OrganisationCategory.CGPI)

    # Filtrer par catégorie Institution
    response = client.get(
        "/api/v1/organisations?category=Institution",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["category"] == "Institution"


def test_search_organisations(client, auth_headers, test_db, create_organisation):
    """Test recherche par nom"""
    create_organisation(test_db, name="Alforis Finance")
    create_organisation(test_db, name="BNP Paribas")
    create_organisation(test_db, name="Société Générale")

    # Rechercher "finance"
    response = client.get(
        "/api/v1/organisations/search?q=finance",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert "Alforis" in data[0]["name"]


# ============================================================================
# Tests Permissions
# ============================================================================

def test_unauthenticated_access(client):
    """Test accès sans authentification"""
    response = client.get("/api/v1/organisations")

    assert response.status_code == 401  # Unauthorized


def test_list_organisations_pagination(client, auth_headers, test_db, create_organisation):
    """Test pagination"""
    # Créer 15 organisations
    for i in range(15):
        create_organisation(test_db, name=f"Company {i}", email=f"company{i}@test.com")

    # Page 1 (10 résultats par défaut)
    response = client.get(
        "/api/v1/organisations?page=1&limit=10",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) <= 10

    # Page 2
    response = client.get(
        "/api/v1/organisations?page=2&limit=10",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5  # 15 total - 10 page 1 = 5 page 2


# ============================================================================
# Tests Edge Cases
# ============================================================================

def test_organisation_with_special_characters(client, auth_headers):
    """Test avec caractères spéciaux"""
    org_data = {
        "name": "Société Française d'Épargne & Crédit",
        "category": "Institution",
        "email": "contact@société-française.fr",
        "country_code": "FR",
        "language": "FR",
    }

    response = client.post(
        "/api/v1/organisations",
        json=org_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Société Française d'Épargne & Crédit"


def test_organisation_with_long_name(client, auth_headers):
    """Test avec nom très long"""
    long_name = "A" * 300  # Plus de 255 caractères

    org_data = {
        "name": long_name,
        "category": "Institution",
        "email": "long@company.com",
        "country_code": "FR",
        "language": "FR",
    }

    response = client.post(
        "/api/v1/organisations",
        json=org_data,
        headers=auth_headers
    )

    # Devrait échouer (validation max_length=255)
    assert response.status_code == 422


def test_deactivate_organisation(client, auth_headers, sample_organisation):
    """Test désactivation d'une organisation"""
    update_data = {"is_active": False}

    response = client.put(
        f"/api/v1/organisations/{sample_organisation.id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is False

    # Vérifier que l'organisation n'apparaît plus dans la liste par défaut
    response = client.get(
        "/api/v1/organisations?active_only=true",
        headers=auth_headers
    )

    data = response.json()
    assert len(data) == 0 or all(org["id"] != sample_organisation.id for org in data)
