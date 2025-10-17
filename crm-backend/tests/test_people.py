"""
Tests pour les personnes (Person)

Teste toutes les opérations sur les personnes et leurs liens avec les organisations.
"""

import pytest
from models.person import Person, PersonOrganizationLink, OrganizationType


# ============================================================================
# Tests Modèles
# ============================================================================

def test_create_person(test_db):
    """Test création d'une personne"""
    person = Person(
        first_name="Marie",
        last_name="Dupont",
        personal_email="marie.dupont@gmail.com",
        personal_phone="+33698765432",
        role="Consultante",
        country_code="FR",
        language="FR",
    )

    test_db.add(person)
    test_db.commit()
    test_db.refresh(person)

    assert person.id is not None
    assert person.first_name == "Marie"
    assert person.last_name == "Dupont"
    assert person.personal_email == "marie.dupont@gmail.com"


def test_person_full_name_property(test_db, sample_person):
    """Test de la propriété full_name"""
    # Si vous avez une propriété @property full_name dans le modèle
    assert sample_person.first_name == "John"
    assert sample_person.last_name == "Doe"


def test_person_unique_email(test_db, sample_person):
    """Test unicité de l'email personnel"""
    duplicate_person = Person(
        first_name="Jane",
        last_name="Doe",
        personal_email=sample_person.personal_email,  # Même email
        country_code="FR",
        language="FR",
    )

    test_db.add(duplicate_person)

    with pytest.raises(Exception):  # IntegrityError
        test_db.commit()


# ============================================================================
# Tests Person ↔ Organisation Links
# ============================================================================

def test_create_person_org_link(test_db, sample_person, sample_organisation):
    """Test création lien Person ↔ Organisation"""
    link = PersonOrganizationLink(
        person_id=sample_person.id,
        organization_type=OrganizationType.INVESTOR,
        organization_id=sample_organisation.id,
        job_title="CTO",
        work_email="john.doe@testcompany.com",
        work_phone="+33123456789",
        is_primary=True,
    )

    test_db.add(link)
    test_db.commit()
    test_db.refresh(link)

    assert link.id is not None
    assert link.person_id == sample_person.id
    assert link.organization_id == sample_organisation.id
    assert link.job_title == "CTO"


def test_person_multiple_organisations(test_db, sample_person, sample_organisations):
    """Test personne liée à plusieurs organisations"""
    links = []
    for i, org in enumerate(sample_organisations[:3]):
        link = PersonOrganizationLink(
            person_id=sample_person.id,
            organization_type=OrganizationType.INVESTOR,
            organization_id=org.id,
            job_title=f"Role {i}",
            work_email=f"john{i}@company{i}.com",
            is_primary=(i == 0),
        )
        test_db.add(link)
        links.append(link)

    test_db.commit()

    # Refresh person pour charger les relations
    test_db.refresh(sample_person)

    assert len(sample_person.organizations) == 3
    assert any(link.is_primary for link in sample_person.organizations)


def test_unique_person_org_link(test_db, sample_person_with_org):
    """Test unicité du lien Person ↔ Organisation"""
    # Récupérer le lien existant
    existing_link = sample_person_with_org.organizations[0]

    # Tenter de créer un doublon
    duplicate_link = PersonOrganizationLink(
        person_id=existing_link.person_id,
        organization_type=existing_link.organization_type,
        organization_id=existing_link.organization_id,
        job_title="Autre titre",
    )

    test_db.add(duplicate_link)

    with pytest.raises(Exception):  # IntegrityError (unique constraint)
        test_db.commit()


# ============================================================================
# Tests API Endpoints
# ============================================================================

def test_list_people_empty(client, auth_headers):
    """Test liste vide de personnes"""
    response = client.get("/api/v1/people", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


def test_list_people(client, auth_headers, test_db, create_person):
    """Test liste des personnes"""
    # Créer plusieurs personnes
    for i in range(3):
        create_person(
            test_db,
            first_name=f"First{i}",
            last_name=f"Last{i}",
            personal_email=f"person{i}@test.com"
        )

    response = client.get("/api/v1/people", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3


def test_get_person(client, auth_headers, sample_person):
    """Test récupération d'une personne"""
    response = client.get(
        f"/api/v1/people/{sample_person.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == sample_person.id
    assert data["first_name"] == "John"
    assert data["last_name"] == "Doe"


def test_get_person_with_organisations(client, auth_headers, sample_person_with_org):
    """Test récupération personne avec ses organisations"""
    response = client.get(
        f"/api/v1/people/{sample_person_with_org.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "organizations" in data
    assert len(data["organizations"]) == 1
    assert data["organizations"][0]["job_title"] == "CEO"


def test_create_person_api(client, auth_headers):
    """Test création via API"""
    person_data = {
        "first_name": "Sophie",
        "last_name": "Martin",
        "personal_email": "sophie.martin@example.com",
        "personal_phone": "+33687654321",
        "role": "Directrice",
        "country_code": "FR",
        "language": "FR",
    }

    response = client.post(
        "/api/v1/people",
        json=person_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "Sophie"
    assert data["last_name"] == "Martin"
    assert data["id"] is not None


def test_create_person_validation_error(client, auth_headers):
    """Test validation des données"""
    invalid_data = {
        "first_name": "",  # Prénom vide
        "last_name": "",   # Nom vide
        "personal_email": "invalid-email",  # Email invalide
    }

    response = client.post(
        "/api/v1/people",
        json=invalid_data,
        headers=auth_headers
    )

    assert response.status_code == 422  # Validation error


def test_update_person(client, auth_headers, sample_person):
    """Test mise à jour d'une personne"""
    update_data = {
        "role": "Senior Consultant",
        "personal_phone": "+33600000000",
    }

    response = client.put(
        f"/api/v1/people/{sample_person.id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "Senior Consultant"
    assert data["personal_phone"] == "+33600000000"


def test_delete_person(client, auth_headers, sample_person):
    """Test suppression d'une personne"""
    person_id = sample_person.id

    response = client.delete(
        f"/api/v1/people/{person_id}",
        headers=auth_headers
    )

    assert response.status_code == 204

    # Vérifier que la personne n'existe plus
    response = client.get(
        f"/api/v1/people/{person_id}",
        headers=auth_headers
    )
    assert response.status_code == 404


def test_search_people_by_name(client, auth_headers, test_db, create_person):
    """Test recherche par nom"""
    create_person(test_db, first_name="Jean", last_name="Dupont", personal_email="jean@test.com")
    create_person(test_db, first_name="Marie", last_name="Martin", personal_email="marie@test.com")
    create_person(test_db, first_name="Paul", last_name="Durand", personal_email="paul@test.com")

    # Rechercher "Dupont"
    response = client.get(
        "/api/v1/people/search?q=Dupont",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["last_name"] == "Dupont"


def test_search_people_by_email(client, auth_headers, test_db, create_person):
    """Test recherche par email"""
    create_person(test_db, first_name="Test", last_name="User", personal_email="test.user@alforis.fr")

    response = client.get(
        "/api/v1/people/search?q=alforis",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert "alforis" in data[0]["personal_email"]


# ============================================================================
# Tests API Person ↔ Organisation Links
# ============================================================================

def test_link_person_to_organisation(client, auth_headers, sample_person, sample_organisation):
    """Test lier une personne à une organisation"""
    link_data = {
        "person_id": sample_person.id,
        "organization_type": "investor",
        "organization_id": sample_organisation.id,
        "job_title": "Directeur Général",
        "work_email": "john.doe@testcompany.com",
        "work_phone": "+33123456789",
        "is_primary": True,
    }

    response = client.post(
        "/api/v1/org-links",
        json=link_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["job_title"] == "Directeur Général"
    assert data["is_primary"] is True


def test_get_person_organisations(client, auth_headers, sample_person_with_org):
    """Test récupérer les organisations d'une personne"""
    response = client.get(
        f"/api/v1/people/{sample_person_with_org.id}/organisations",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["job_title"] == "CEO"


def test_update_person_org_link(client, auth_headers, sample_person_with_org):
    """Test mise à jour d'un lien Person ↔ Organisation"""
    link = sample_person_with_org.organizations[0]

    update_data = {
        "job_title": "Directeur Adjoint",
        "work_email": "john.new@testcompany.com",
    }

    response = client.put(
        f"/api/v1/org-links/{link.id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["job_title"] == "Directeur Adjoint"
    assert data["work_email"] == "john.new@testcompany.com"


def test_delete_person_org_link(client, auth_headers, sample_person_with_org):
    """Test suppression d'un lien Person ↔ Organisation"""
    link = sample_person_with_org.organizations[0]
    link_id = link.id

    response = client.delete(
        f"/api/v1/org-links/{link_id}",
        headers=auth_headers
    )

    assert response.status_code == 204

    # Vérifier que le lien n'existe plus
    response = client.get(
        f"/api/v1/org-links/{link_id}",
        headers=auth_headers
    )
    assert response.status_code == 404


# ============================================================================
# Tests Edge Cases
# ============================================================================

def test_person_with_accents(client, auth_headers):
    """Test avec caractères accentués"""
    person_data = {
        "first_name": "François",
        "last_name": "Lefèvre-Dupré",
        "personal_email": "françois@example.com",
        "country_code": "FR",
        "language": "FR",
    }

    response = client.post(
        "/api/v1/people",
        json=person_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "François"
    assert data["last_name"] == "Lefèvre-Dupré"


def test_person_without_optional_fields(client, auth_headers):
    """Test création avec champs minimaux"""
    person_data = {
        "first_name": "John",
        "last_name": "Smith",
        # Pas d'email, phone, etc.
    }

    response = client.post(
        "/api/v1/people",
        json=person_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "John"
    assert data.get("personal_email") is None
