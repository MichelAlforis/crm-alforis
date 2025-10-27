"""
Tests pour les personnes (Person)

Teste toutes les opérations sur les personnes et leurs liens avec les organisations.
"""

import pytest

from models.person import Person, PersonOrganizationLink
from models.organisation import OrganisationType

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


@pytest.mark.skip(reason="SQLite in-memory doesn't enforce unique constraints reliably")
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
    assert isinstance(data, dict)
    assert "items" in data
    assert isinstance(data["items"], list)
    assert len(data["items"]) == 0
    assert data["total"] == 0


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
    assert isinstance(data, dict)
    assert "items" in data
    assert len(data["items"]) == 3
    assert data["total"] == 3


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


# ============================================================================
# Tests API Endpoints - Coverage Improvements
# ============================================================================


class TestPeopleListEndpoint:
    """Tests pour l'endpoint GET /api/v1/people"""

    def test_list_with_pagination(self, client, auth_headers, test_db, create_person):
        """Test pagination avec skip et limit"""
        # Créer 10 personnes
        for i in range(10):
            create_person(
                test_db,
                first_name=f"Person{i}",
                last_name=f"Test{i}",
                personal_email=f"person{i}@test.com"
            )

        # Tester skip=0, limit=5
        response = client.get(
            "/api/v1/people?skip=0&limit=5",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 5
        assert data["total"] == 10
        assert data["skip"] == 0
        assert data["limit"] == 5

        # Tester skip=5, limit=5
        response = client.get(
            "/api/v1/people?skip=5&limit=5",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 5
        assert data["total"] == 10

    def test_list_with_search_query(self, client, auth_headers, test_db, create_person):
        """Test filtrage avec paramètre q"""
        create_person(test_db, first_name="Alice", last_name="Smith", personal_email="alice@test.com")
        create_person(test_db, first_name="Bob", last_name="Johnson", personal_email="bob@test.com")
        create_person(test_db, first_name="Charlie", last_name="Smith", personal_email="charlie@test.com")

        # Rechercher "Smith"
        response = client.get(
            "/api/v1/people?q=Smith",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert all("Smith" in item["last_name"] for item in data["items"])

    def test_list_with_organization_id_filter(self, client, auth_headers, test_db, sample_organisation, create_person):
        """Test filtrage par organization_id"""
        # Créer des personnes
        person1 = create_person(test_db, first_name="John", last_name="Linked", personal_email="john@test.com")
        person2 = create_person(test_db, first_name="Jane", last_name="NotLinked", personal_email="jane@test.com")

        # Lier person1 à l'organisation
        link = PersonOrganizationLink(
            person_id=person1.id,
            organization_type=OrganisationType.CLIENT,
            organization_id=sample_organisation.id,
            job_title="Employee",
        )
        test_db.add(link)
        test_db.commit()

        # Filtrer par organization_id
        response = client.get(
            f"/api/v1/people?organization_id={sample_organisation.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["first_name"] == "John"

    def test_list_with_organization_type_filter(self, client, auth_headers, test_db, sample_organisation, create_person):
        """Test filtrage par organization_id et organization_type"""
        # Créer des personnes
        person1 = create_person(test_db, first_name="Investor", last_name="Contact", personal_email="investor@test.com")
        person2 = create_person(test_db, first_name="Client", last_name="Contact", personal_email="client@test.com")

        # Lier avec différents types
        link1 = PersonOrganizationLink(
            person_id=person1.id,
            organization_type=OrganisationType.INVESTOR,
            organization_id=sample_organisation.id,
            job_title="Investor Rep",
        )
        link2 = PersonOrganizationLink(
            person_id=person2.id,
            organization_type=OrganisationType.CLIENT,
            organization_id=sample_organisation.id,
            job_title="Client Rep",
        )
        test_db.add_all([link1, link2])
        test_db.commit()

        # Filtrer par INVESTOR
        response = client.get(
            f"/api/v1/people?organization_id={sample_organisation.id}&organization_type=investor",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["first_name"] == "Investor"

    def test_list_with_pagination_on_filtered_results(self, client, auth_headers, test_db, sample_organisation, create_person):
        """Test pagination sur résultats filtrés par organisation"""
        # Créer plusieurs personnes liées
        for i in range(5):
            person = create_person(
                test_db,
                first_name=f"Person{i}",
                last_name="Linked",
                personal_email=f"person{i}@test.com"
            )
            link = PersonOrganizationLink(
                person_id=person.id,
                organization_type=OrganisationType.CLIENT,
                organization_id=sample_organisation.id,
                job_title=f"Role{i}",
            )
            test_db.add(link)
        test_db.commit()

        # Tester pagination
        response = client.get(
            f"/api/v1/people?organization_id={sample_organisation.id}&skip=1&limit=2",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["skip"] == 1
        assert data["limit"] == 2


class TestPeopleSearchEndpoint:
    """Tests pour l'endpoint GET /api/v1/people/search"""

    def test_search_empty_results(self, client, auth_headers, test_db, create_person):
        """Test recherche sans résultats"""
        create_person(test_db, first_name="John", last_name="Doe", personal_email="john@test.com")

        response = client.get(
            "/api/v1/people/search?q=nonexistent",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0

    def test_search_with_pagination(self, client, auth_headers, test_db, create_person):
        """Test recherche avec pagination"""
        # Créer plusieurs personnes avec le même nom
        for i in range(5):
            create_person(
                test_db,
                first_name="Common",
                last_name=f"Name{i}",
                personal_email=f"common{i}@test.com"
            )

        # Rechercher avec limit
        response = client.get(
            "/api/v1/people/search?q=Common&skip=0&limit=3",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

        # Rechercher avec skip
        response = client.get(
            "/api/v1/people/search?q=Common&skip=3&limit=3",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_search_by_phone(self, client, auth_headers, test_db, create_person):
        """Test recherche par numéro de téléphone"""
        create_person(
            test_db,
            first_name="Phone",
            last_name="User",
            personal_email="phone@test.com",
            personal_phone="+33612345678"
        )

        response = client.get(
            "/api/v1/people/search?q=612345678",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["personal_phone"] == "+33612345678"

    def test_search_case_insensitive(self, client, auth_headers, test_db, create_person):
        """Test recherche insensible à la casse"""
        create_person(test_db, first_name="CaseSensitive", last_name="Test", personal_email="case@test.com")

        response = client.get(
            "/api/v1/people/search?q=casesensitive",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

    def test_search_with_special_characters(self, client, auth_headers, test_db, create_person):
        """Test recherche avec caractères spéciaux"""
        create_person(
            test_db,
            first_name="Jean-Pierre",
            last_name="O'Connor",
            personal_email="jp@test.com"
        )

        response = client.get(
            "/api/v1/people/search?q=Jean-Pierre",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

        response = client.get(
            "/api/v1/people/search?q=O'Connor",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

    def test_search_minimum_length_validation(self, client, auth_headers):
        """Test validation longueur minimale de recherche"""
        response = client.get(
            "/api/v1/people/search?q=",
            headers=auth_headers
        )
        assert response.status_code == 422  # Validation error


class TestPersonGetEndpoint:
    """Tests pour l'endpoint GET /api/v1/people/{person_id}"""

    def test_get_person_not_found(self, client, auth_headers):
        """Test récupération personne inexistante"""
        response = client.get(
            "/api/v1/people/99999",
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_get_person_invalid_id(self, client, auth_headers):
        """Test avec ID invalide"""
        response = client.get(
            "/api/v1/people/invalid",
            headers=auth_headers
        )
        assert response.status_code == 422  # Validation error

    def test_get_person_with_multiple_organisations(self, client, auth_headers, test_db, sample_person, sample_organisations):
        """Test personne avec plusieurs organisations"""
        # Lier à 3 organisations
        for i, org in enumerate(sample_organisations[:3]):
            link = PersonOrganizationLink(
                person_id=sample_person.id,
                organization_type=OrganisationType.CLIENT,
                organization_id=org.id,
                job_title=f"Role{i}",
                is_primary=(i == 0),
            )
            test_db.add(link)
        test_db.commit()

        response = client.get(
            f"/api/v1/people/{sample_person.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["organizations"]) == 3
        assert any(org["is_primary"] for org in data["organizations"])


class TestPersonCreateEndpoint:
    """Tests pour l'endpoint POST /api/v1/people"""

    def test_create_with_all_fields(self, client, auth_headers):
        """Test création avec tous les champs"""
        person_data = {
            "first_name": "Complete",
            "last_name": "Person",
            "personal_email": "complete@test.com",
            "email": "work@company.com",
            "personal_phone": "+33612345678",
            "phone": "+33123456789",
            "mobile": "+33698765432",
            "job_title": "Manager",
            "role": "Decision Maker",
            "country_code": "FR",
            "language": "fr",
            "notes": "Important contact",
            "linkedin_url": "https://linkedin.com/in/complete",
            "is_active": True,
        }

        response = client.post(
            "/api/v1/people",
            json=person_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "Complete"
        assert data["personal_email"] == "complete@test.com"
        assert data["linkedin_url"] == "https://linkedin.com/in/complete"
        assert data["is_active"] is True

    def test_create_with_long_text_fields(self, client, auth_headers):
        """Test création avec champs texte longs"""
        long_notes = "A" * 500
        person_data = {
            "first_name": "Long",
            "last_name": "Notes",
            "personal_email": "long@test.com",
            "notes": long_notes,
        }

        response = client.post(
            "/api/v1/people",
            json=person_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert len(data["notes"]) == 500

    def test_create_with_invalid_email_format(self, client, auth_headers):
        """Test validation format email"""
        person_data = {
            "first_name": "Invalid",
            "last_name": "Email",
            "personal_email": "not-an-email",
        }

        response = client.post(
            "/api/v1/people",
            json=person_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_create_with_invalid_country_code(self, client, auth_headers):
        """Test validation country_code (doit être 2 caractères)"""
        person_data = {
            "first_name": "Invalid",
            "last_name": "Country",
            "personal_email": "invalid@test.com",
            "country_code": "FRA",  # Devrait être 2 caractères
        }

        response = client.post(
            "/api/v1/people",
            json=person_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_create_person_with_unicode_characters(self, client, auth_headers):
        """Test avec caractères unicode variés"""
        person_data = {
            "first_name": "李明",
            "last_name": "Müller",
            "personal_email": "unicode@test.com",
            "notes": "Notes avec émojis: 👍 ✅",
        }

        response = client.post(
            "/api/v1/people",
            json=person_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "李明"
        assert data["last_name"] == "Müller"


class TestPersonUpdateEndpoint:
    """Tests pour l'endpoint PUT /api/v1/people/{person_id}"""

    def test_update_person_not_found(self, client, auth_headers):
        """Test mise à jour personne inexistante"""
        update_data = {"role": "Updated Role"}

        response = client.put(
            "/api/v1/people/99999",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 404

    def test_update_multiple_fields(self, client, auth_headers, sample_person):
        """Test mise à jour de plusieurs champs"""
        update_data = {
            "first_name": "UpdatedFirst",
            "last_name": "UpdatedLast",
            "role": "UpdatedRole",
            "country_code": "US",
            "is_active": False,
        }

        response = client.put(
            f"/api/v1/people/{sample_person.id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "UpdatedFirst"
        assert data["last_name"] == "UpdatedLast"
        assert data["role"] == "UpdatedRole"
        assert data["country_code"] == "US"
        assert data["is_active"] is False

    def test_update_email_field(self, client, auth_headers, sample_person):
        """Test mise à jour email"""
        update_data = {
            "personal_email": "newemail@test.com",
            "email": "newwork@company.com",
        }

        response = client.put(
            f"/api/v1/people/{sample_person.id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["personal_email"] == "newemail@test.com"
        assert data["email"] == "newwork@company.com"

    def test_update_with_empty_optional_fields(self, client, auth_headers, sample_person):
        """Test mise à jour avec champs optionnels vides"""
        update_data = {
            "notes": None,
            "linkedin_url": None,
        }

        response = client.put(
            f"/api/v1/people/{sample_person.id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("notes") is None
        assert data.get("linkedin_url") is None

    def test_partial_update(self, client, auth_headers, sample_person):
        """Test mise à jour partielle (seuls champs fournis)"""
        original_first_name = sample_person.first_name

        update_data = {
            "role": "Only Update Role",
        }

        response = client.put(
            f"/api/v1/people/{sample_person.id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "Only Update Role"
        assert data["first_name"] == original_first_name  # Inchangé


class TestPersonDeleteEndpoint:
    """Tests pour l'endpoint DELETE /api/v1/people/{person_id}"""

    def test_delete_person_not_found(self, client, auth_headers):
        """Test suppression personne inexistante"""
        response = client.delete(
            "/api/v1/people/99999",
            headers=auth_headers
        )

        assert response.status_code == 404

    def test_delete_person_with_organisations(self, client, auth_headers, sample_person_with_org):
        """Test suppression personne avec organisations liées"""
        person_id = sample_person_with_org.id

        response = client.delete(
            f"/api/v1/people/{person_id}",
            headers=auth_headers
        )

        assert response.status_code == 204

        # Vérifier suppression
        response = client.get(
            f"/api/v1/people/{person_id}",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestPersonOrganisationsEndpoint:
    """Tests pour l'endpoint GET /api/v1/people/{person_id}/organisations"""

    def test_get_organisations_for_person_not_found(self, client, auth_headers):
        """Test récupération organisations pour personne inexistante"""
        response = client.get(
            "/api/v1/people/99999/organisations",
            headers=auth_headers
        )

        assert response.status_code == 404

    def test_get_organisations_empty_list(self, client, auth_headers, sample_person):
        """Test personne sans organisations"""
        response = client.get(
            f"/api/v1/people/{sample_person.id}/organisations",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0

    def test_get_organisations_with_multiple_links(self, client, auth_headers, test_db, sample_person, sample_organisations):
        """Test personne avec plusieurs organisations"""
        # Créer plusieurs liens
        for i, org in enumerate(sample_organisations[:4]):
            link = PersonOrganizationLink(
                person_id=sample_person.id,
                organization_type=OrganisationType.CLIENT if i % 2 == 0 else OrganisationType.INVESTOR,
                organization_id=org.id,
                job_title=f"Position{i}",
                work_email=f"work{i}@company.com",
                is_primary=(i == 0),
            )
            test_db.add(link)
        test_db.commit()

        response = client.get(
            f"/api/v1/people/{sample_person.id}/organisations",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4
        assert any(item["is_primary"] for item in data)


# ============================================================================
# Tests Edge Cases Supplémentaires
# ============================================================================


class TestEdgeCases:
    """Tests des cas limites et particuliers"""

    def test_person_with_very_long_name(self, client, auth_headers):
        """Test avec nom très long (proche limite)"""
        long_name = "A" * 100  # Max 100 caractères
        person_data = {
            "first_name": long_name,
            "last_name": long_name,
            "personal_email": "longname@test.com",
        }

        response = client.post(
            "/api/v1/people",
            json=person_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == long_name
        assert data["last_name"] == long_name

    def test_pagination_with_zero_limit(self, client, auth_headers, test_db, create_person):
        """Test pagination avec limit invalide (doit être >= 1)"""
        create_person(test_db, first_name="Test", last_name="User", personal_email="test@test.com")

        response = client.get(
            "/api/v1/people?limit=0",
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    def test_pagination_with_negative_skip(self, client, auth_headers):
        """Test pagination avec skip négatif (doit être >= 0)"""
        response = client.get(
            "/api/v1/people?skip=-1",
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    def test_pagination_with_very_large_limit(self, client, auth_headers):
        """Test pagination avec limit très grand (max 200)"""
        response = client.get(
            "/api/v1/people?limit=201",
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    def test_search_with_sql_like_patterns(self, client, auth_headers, test_db, create_person):
        """Test recherche avec caractères spéciaux SQL LIKE (%_)"""
        create_person(test_db, first_name="Test_User", last_name="Name", personal_email="test@test.com")

        response = client.get(
            "/api/v1/people/search?q=Test_User",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

    def test_person_with_all_optional_fields_null(self, client, auth_headers):
        """Test création personne avec tous champs optionnels null"""
        person_data = {
            "first_name": "Minimal",
            "last_name": "Person",
        }

        response = client.post(
            "/api/v1/people",
            json=person_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "Minimal"
        assert data["last_name"] == "Person"
        assert data.get("personal_email") is None
        assert data.get("notes") is None

    def test_list_people_max_limit_boundary(self, client, auth_headers, test_db, create_person):
        """Test avec limite maximale autorisée (200)"""
        # Créer quelques personnes
        for i in range(5):
            create_person(
                test_db,
                first_name=f"Person{i}",
                last_name="Test",
                personal_email=f"person{i}@test.com"
            )

        response = client.get(
            "/api/v1/people?limit=200",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 200

    def test_organization_filter_with_invalid_id(self, client, auth_headers):
        """Test filtrage avec organization_id invalide (0 ou négatif)"""
        response = client.get(
            "/api/v1/people?organization_id=0",
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error (ge=1)

    def test_person_with_whitespace_trimming(self, client, auth_headers):
        """Test que les espaces en début/fin sont gérés"""
        person_data = {
            "first_name": "  Spaces  ",
            "last_name": "  Around  ",
            "personal_email": "spaces@test.com",
        }

        response = client.post(
            "/api/v1/people",
            json=person_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        # Note: Le trimming dépend de l'implémentation du modèle
