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


@pytest.mark.skip(reason="SQLite in-memory doesn't enforce unique constraints reliably")
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
    assert isinstance(data, dict)
    assert "items" in data
    assert isinstance(data["items"], list)
    assert len(data["items"]) == 0
    assert data["total"] == 0


def test_list_organisations(client, auth_headers, sample_organisations):
    """Test liste des organisations"""
    response = client.get("/api/v1/organisations", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "items" in data
    assert len(data["items"]) == 5
    assert data["total"] == 5
    assert data["items"][0]["name"] == "Company 0"


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
    assert isinstance(data, dict)
    assert "items" in data
    assert len(data["items"]) == 1
    assert data["total"] == 1
    assert data["items"][0]["category"] == "Institution"


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
    assert isinstance(data, dict)
    assert "items" in data
    assert len(data["items"]) == 1
    assert data["total"] == 1
    assert "Alforis" in data["items"][0]["name"]


# ============================================================================
# Tests Permissions
# ============================================================================

@pytest.mark.skip(reason="Test environment doesn't enforce authentication (dependency override)")
def test_unauthenticated_access(client):
    """Test accès sans authentification"""
    response = client.get("/api/v1/organisations")

    assert response.status_code == 401  # Unauthorized


def test_list_organisations_pagination(client, auth_headers, test_db, create_organisation):
    """Test pagination"""
    # Créer 15 organisations
    for i in range(15):
        create_organisation(test_db, name=f"Company {i}", email=f"company{i}@test.com")

    # Page 1 (10 résultats par défaut) - skip=0, limit=10
    response = client.get(
        "/api/v1/organisations?skip=0&limit=10",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "items" in data
    assert len(data["items"]) == 10
    assert data["total"] == 15

    # Page 2 - skip=10, limit=10
    response = client.get(
        "/api/v1/organisations?skip=10&limit=10",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "items" in data
    assert len(data["items"]) == 5  # 15 total - 10 page 1 = 5 page 2
    assert data["total"] == 15


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
        "/api/v1/organisations?is_active=true",
        headers=auth_headers
    )

    data = response.json()
    assert isinstance(data, dict)
    assert "items" in data
    assert len(data["items"]) == 0 or all(org["id"] != sample_organisation.id for org in data["items"])


# ============================================================================
# Tests Filtres Avancés
# ============================================================================

class TestOrganisationFilters:
    """Tests des différentes combinaisons de filtres"""

    def test_filter_by_country_code(self, client, auth_headers, test_db, create_organisation):
        """Test filtrage par pays"""
        create_organisation(test_db, name="French Company", country_code="FR")
        create_organisation(test_db, name="German Company", country_code="DE")
        create_organisation(test_db, name="Spanish Company", country_code="ES")

        response = client.get("/api/v1/organisations?country_code=FR", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["country_code"] == "FR"

    def test_filter_by_country_code_lowercase(self, client, auth_headers, test_db, create_organisation):
        """Test filtrage par pays avec lowercase (doit être normalisé en uppercase)"""
        create_organisation(test_db, name="French Company", country_code="FR")

        response = client.get("/api/v1/organisations?country_code=fr", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["country_code"] == "FR"

    def test_filter_by_language(self, client, auth_headers, test_db, create_organisation):
        """Test filtrage par langue"""
        create_organisation(test_db, name="French Org", language="FR")
        create_organisation(test_db, name="English Org", language="EN")
        create_organisation(test_db, name="Spanish Org", language="ES")

        response = client.get("/api/v1/organisations?language=EN", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["language"] == "EN"

    def test_filter_by_language_lowercase(self, client, auth_headers, test_db, create_organisation):
        """Test filtrage par langue avec lowercase"""
        create_organisation(test_db, name="French Org", language="FR")

        response = client.get("/api/v1/organisations?language=fr", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["language"] == "FR"

    def test_filter_by_is_active_true(self, client, auth_headers, test_db, create_organisation):
        """Test filtrage organisations actives"""
        create_organisation(test_db, name="Active Org", is_active=True)
        create_organisation(test_db, name="Inactive Org", is_active=False)

        response = client.get("/api/v1/organisations?is_active=true", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert all(org["is_active"] is True for org in data["items"])

    def test_filter_by_is_active_false(self, client, auth_headers, test_db, create_organisation):
        """Test filtrage organisations inactives"""
        create_organisation(test_db, name="Active Org", is_active=True)
        create_organisation(test_db, name="Inactive Org", is_active=False)

        response = client.get("/api/v1/organisations?is_active=false", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert all(org["is_active"] is False for org in data["items"])

    def test_filter_multiple_category_and_country(self, client, auth_headers, test_db, create_organisation):
        """Test filtrage combiné catégorie + pays"""
        create_organisation(
            test_db,
            name="French Institution",
            category=OrganisationCategory.INSTITUTION,
            country_code="FR"
        )
        create_organisation(
            test_db,
            name="German Institution",
            category=OrganisationCategory.INSTITUTION,
            country_code="DE"
        )
        create_organisation(
            test_db,
            name="French CGPI",
            category=OrganisationCategory.CGPI,
            country_code="FR"
        )

        response = client.get(
            "/api/v1/organisations?category=Institution&country_code=FR",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["category"] == "Institution"
        assert data["items"][0]["country_code"] == "FR"

    def test_filter_multiple_all_filters(self, client, auth_headers, test_db, create_organisation):
        """Test filtrage avec tous les filtres combinés"""
        create_organisation(
            test_db,
            name="Target Org",
            category=OrganisationCategory.WHOLESALE,
            country_code="FR",
            language="FR",
            is_active=True
        )
        create_organisation(
            test_db,
            name="Other Org",
            category=OrganisationCategory.WHOLESALE,
            country_code="DE",
            language="EN",
            is_active=True
        )

        response = client.get(
            "/api/v1/organisations?category=Wholesale&country_code=FR&language=FR&is_active=true",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "Target Org"

    def test_filter_by_wholesale_category(self, client, auth_headers, test_db, create_organisation):
        """Test filtrage par catégorie Wholesale"""
        create_organisation(test_db, name="Wholesale 1", category=OrganisationCategory.WHOLESALE)
        create_organisation(test_db, name="Institution 1", category=OrganisationCategory.INSTITUTION)

        response = client.get("/api/v1/organisations?category=Wholesale", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["category"] == "Wholesale"

    def test_filter_by_cgpi_category(self, client, auth_headers, test_db, create_organisation):
        """Test filtrage par catégorie CGPI"""
        create_organisation(test_db, name="CGPI 1", category=OrganisationCategory.CGPI)
        create_organisation(test_db, name="SDG 1", category=OrganisationCategory.SDG)

        response = client.get("/api/v1/organisations?category=CGPI", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["category"] == "CGPI"

    def test_filter_by_sdg_category(self, client, auth_headers, test_db, create_organisation):
        """Test filtrage par catégorie SDG"""
        create_organisation(test_db, name="SDG 1", category=OrganisationCategory.SDG)
        create_organisation(test_db, name="CGPI 1", category=OrganisationCategory.CGPI)

        response = client.get("/api/v1/organisations?category=SDG", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["category"] == "SDG"


# ============================================================================
# Tests Endpoints Statistiques
# ============================================================================

class TestOrganisationStatistics:
    """Tests des endpoints de statistiques"""

    def test_get_stats_empty(self, client, auth_headers):
        """Test statistiques avec base vide"""
        response = client.get("/api/v1/organisations/stats", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "by_category" in data
        assert "by_language" in data
        assert data["total"] == 0
        assert isinstance(data["by_category"], dict)
        assert isinstance(data["by_language"], dict)

    def test_get_stats_with_data(self, client, auth_headers, test_db, create_organisation):
        """Test statistiques avec données"""
        create_organisation(test_db, category=OrganisationCategory.INSTITUTION, language="FR")
        create_organisation(test_db, category=OrganisationCategory.INSTITUTION, language="FR")
        create_organisation(test_db, category=OrganisationCategory.WHOLESALE, language="EN")
        create_organisation(test_db, category=OrganisationCategory.CGPI, language="FR")

        response = client.get("/api/v1/organisations/stats", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 4
        assert data["by_category"]["Institution"] == 2
        assert data["by_category"]["Wholesale"] == 1
        assert data["by_category"]["CGPI"] == 1
        assert data["by_language"]["FR"] == 3
        assert data["by_language"]["EN"] == 1

    def test_get_available_countries_empty(self, client, auth_headers):
        """Test liste pays avec base vide"""
        response = client.get("/api/v1/organisations/countries", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_get_available_countries_with_data(self, client, auth_headers, test_db, create_organisation):
        """Test liste pays avec données"""
        create_organisation(test_db, name="French Org", country_code="FR")
        create_organisation(test_db, name="German Org", country_code="DE")
        create_organisation(test_db, name="Spanish Org", country_code="ES")
        create_organisation(test_db, name="Another French Org", country_code="FR")

        response = client.get("/api/v1/organisations/countries", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3
        assert "FR" in data
        assert "DE" in data
        assert "ES" in data

    def test_get_available_countries_ignores_null(self, client, auth_headers, test_db, create_organisation):
        """Test que les pays NULL sont ignorés"""
        create_organisation(test_db, name="With Country", country_code="FR")
        create_organisation(test_db, name="Without Country", country_code=None)
        create_organisation(test_db, name="Empty Country", country_code="")

        response = client.get("/api/v1/organisations/countries", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0] == "FR"


# ============================================================================
# Tests Endpoints par Langue
# ============================================================================

class TestOrganisationsByLanguage:
    """Tests de l'endpoint de récupération par langue"""

    def test_get_by_language_empty(self, client, auth_headers):
        """Test récupération par langue avec base vide"""
        response = client.get("/api/v1/organisations/by-language/FR", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert len(data["items"]) == 0

    def test_get_by_language_with_data(self, client, auth_headers, test_db, create_organisation):
        """Test récupération par langue"""
        create_organisation(test_db, name="French Org 1", language="FR")
        create_organisation(test_db, name="French Org 2", language="FR")
        create_organisation(test_db, name="English Org", language="EN")

        response = client.get("/api/v1/organisations/by-language/FR", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2
        assert all(org["language"] == "FR" for org in data["items"])

    def test_get_by_language_lowercase(self, client, auth_headers, test_db, create_organisation):
        """Test récupération par langue avec lowercase (normalisé en uppercase)"""
        create_organisation(test_db, name="French Org", language="FR")

        response = client.get("/api/v1/organisations/by-language/fr", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1

    def test_get_by_language_pagination(self, client, auth_headers, test_db, create_organisation):
        """Test pagination de l'endpoint par langue"""
        for i in range(15):
            create_organisation(
                test_db,
                name=f"French Org {i}",
                email=f"org{i}@test.fr",
                language="FR"
            )

        response = client.get("/api/v1/organisations/by-language/FR?skip=0&limit=10", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 15
        assert len(data["items"]) == 10

        response = client.get("/api/v1/organisations/by-language/FR?skip=10&limit=10", headers=auth_headers)
        data = response.json()
        assert len(data["items"]) == 5

    def test_get_by_language_nonexistent(self, client, auth_headers, test_db, create_organisation):
        """Test récupération par langue inexistante"""
        create_organisation(test_db, name="French Org", language="FR")

        response = client.get("/api/v1/organisations/by-language/ZZ", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert len(data["items"]) == 0


# ============================================================================
# Tests Recherche Avancée
# ============================================================================

class TestOrganisationSearch:
    """Tests de la fonctionnalité de recherche"""

    def test_search_pagination(self, client, auth_headers, test_db, create_organisation):
        """Test pagination de la recherche"""
        for i in range(15):
            create_organisation(
                test_db,
                name=f"Finance Company {i}",
                email=f"finance{i}@test.com"
            )

        response = client.get(
            "/api/v1/organisations/search?q=finance&skip=0&limit=10",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 15
        assert len(data["items"]) == 10

    def test_search_by_website(self, client, auth_headers, test_db, create_organisation):
        """Test recherche par website"""
        create_organisation(test_db, name="Company A", website="https://example.com")
        create_organisation(test_db, name="Company B", website="https://other.com")

        response = client.get("/api/v1/organisations/search?q=example", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert "example.com" in data["items"][0]["website"]

    def test_search_by_notes(self, client, auth_headers, test_db, create_organisation):
        """Test recherche par notes"""
        create_organisation(test_db, name="Company A", notes="Important client with good track record")
        create_organisation(test_db, name="Company B", notes="New prospect")

        response = client.get("/api/v1/organisations/search?q=track", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "Company A"

    def test_search_case_insensitive(self, client, auth_headers, test_db, create_organisation):
        """Test recherche insensible à la casse"""
        create_organisation(test_db, name="ALFORIS Finance")

        response = client.get("/api/v1/organisations/search?q=alforis", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "ALFORIS Finance"

    def test_search_partial_match(self, client, auth_headers, test_db, create_organisation):
        """Test recherche partielle"""
        create_organisation(test_db, name="International Banking Corporation")

        response = client.get("/api/v1/organisations/search?q=Bank", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1

    def test_search_no_results(self, client, auth_headers, test_db, create_organisation):
        """Test recherche sans résultats"""
        create_organisation(test_db, name="Company A")

        response = client.get("/api/v1/organisations/search?q=nonexistent", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert len(data["items"]) == 0

    def test_search_empty_query_validation(self, client, auth_headers):
        """Test validation requête vide"""
        response = client.get("/api/v1/organisations/search?q=", headers=auth_headers)

        # Devrait échouer validation (min_length=1)
        assert response.status_code == 422


# ============================================================================
# Tests CRUD Avancés
# ============================================================================

class TestOrganisationCRUDAdvanced:
    """Tests CRUD avancés et cas limites"""

    def test_update_organisation_not_found(self, client, auth_headers):
        """Test mise à jour d'une organisation inexistante"""
        update_data = {"name": "Updated Name"}

        response = client.put(
            "/api/v1/organisations/99999",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 404

    def test_update_organisation_empty_data(self, client, auth_headers, sample_organisation):
        """Test mise à jour avec données vides (devrait retourner l'organisation inchangée)"""
        original_name = sample_organisation.name

        response = client.put(
            f"/api/v1/organisations/{sample_organisation.id}",
            json={},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == original_name

    def test_update_organisation_partial(self, client, auth_headers, sample_organisation):
        """Test mise à jour partielle"""
        response = client.put(
            f"/api/v1/organisations/{sample_organisation.id}",
            json={"website": "https://newwebsite.com"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["website"] == "https://newwebsite.com"
        assert data["name"] == sample_organisation.name  # Inchangé

    def test_update_organisation_multiple_fields(self, client, auth_headers, sample_organisation):
        """Test mise à jour de plusieurs champs"""
        update_data = {
            "name": "New Name",
            "website": "https://new.com",
            "country_code": "DE",
            "language": "DE"
        }

        response = client.put(
            f"/api/v1/organisations/{sample_organisation.id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["website"] == "https://new.com"
        assert data["country_code"] == "DE"
        assert data["language"] == "DE"

    def test_delete_organisation_not_found(self, client, auth_headers):
        """Test suppression d'une organisation inexistante"""
        response = client.delete("/api/v1/organisations/99999", headers=auth_headers)

        assert response.status_code == 404

    def test_create_organisation_minimal(self, client, auth_headers):
        """Test création avec champs minimaux requis"""
        org_data = {
            "name": "Minimal Company",
            "category": "Institution"
        }

        response = client.post("/api/v1/organisations", json=org_data, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Minimal Company"
        assert data["category"] == "Institution"

    def test_create_organisation_all_fields(self, client, auth_headers):
        """Test création avec tous les champs"""
        org_data = {
            "name": "Complete Company",
            "category": "Institution",
            "email": "complete@company.com",
            "website": "https://complete.com",
            "country_code": "FR",
            "language": "FR",
            "notes": "Test notes",
            "is_active": True
        }

        response = client.post("/api/v1/organisations", json=org_data, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Complete Company"
        assert data["email"] == "complete@company.com"
        assert data["website"] == "https://complete.com"

    def test_create_organisation_invalid_category(self, client, auth_headers):
        """Test création avec catégorie invalide"""
        org_data = {
            "name": "Test",
            "category": "InvalidCategory"
        }

        response = client.post("/api/v1/organisations", json=org_data, headers=auth_headers)

        assert response.status_code == 422

    def test_create_organisation_missing_name(self, client, auth_headers):
        """Test création sans nom"""
        org_data = {
            "category": "Institution"
        }

        response = client.post("/api/v1/organisations", json=org_data, headers=auth_headers)

        assert response.status_code == 422


# ============================================================================
# Tests Activités Organisation
# ============================================================================

class TestOrganisationActivities:
    """Tests des endpoints d'activités"""

    def test_get_activities_empty(self, client, auth_headers, sample_organisation):
        """Test récupération activités organisation vide"""
        response = client.get(
            f"/api/v1/organisations/{sample_organisation.id}/activity",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        # Devrait avoir au moins une activité de création
        assert "items" in data or isinstance(data, list)

    def test_get_activities_with_limit(self, client, auth_headers, sample_organisation):
        """Test récupération activités avec limite"""
        response = client.get(
            f"/api/v1/organisations/{sample_organisation.id}/activity?limit=5",
            headers=auth_headers
        )

        assert response.status_code == 200

    def test_get_activities_with_cursor(self, client, auth_headers, sample_organisation):
        """Test pagination avec curseur"""
        response = client.get(
            f"/api/v1/organisations/{sample_organisation.id}/activity?before_id=100",
            headers=auth_headers
        )

        assert response.status_code == 200

    def test_get_activities_with_type_filter(self, client, auth_headers, sample_organisation):
        """Test filtrage par type d'activité"""
        response = client.get(
            f"/api/v1/organisations/{sample_organisation.id}/activity?types=organisation_created",
            headers=auth_headers
        )

        assert response.status_code == 200

    def test_get_activities_with_multiple_type_filters(self, client, auth_headers, sample_organisation):
        """Test filtrage avec plusieurs types"""
        response = client.get(
            f"/api/v1/organisations/{sample_organisation.id}/activity?types=organisation_created&types=organisation_updated",
            headers=auth_headers
        )

        assert response.status_code == 200

    def test_get_activities_invalid_type_filter(self, client, auth_headers, sample_organisation):
        """Test filtrage avec type invalide (devrait être ignoré)"""
        response = client.get(
            f"/api/v1/organisations/{sample_organisation.id}/activity?types=invalid_type",
            headers=auth_headers
        )

        assert response.status_code == 200

    def test_get_activities_limit_validation(self, client, auth_headers, sample_organisation):
        """Test validation de la limite"""
        response = client.get(
            f"/api/v1/organisations/{sample_organisation.id}/activity?limit=150",
            headers=auth_headers
        )

        # Limite max est 100, devrait échouer
        assert response.status_code == 422

    def test_get_activities_limit_minimum(self, client, auth_headers, sample_organisation):
        """Test limite minimum"""
        response = client.get(
            f"/api/v1/organisations/{sample_organisation.id}/activity?limit=0",
            headers=auth_headers
        )

        # Limite min est 1, devrait échouer
        assert response.status_code == 422


# ============================================================================
# Tests Suppression d'Activités
# ============================================================================

class TestOrganisationActivityDeletion:
    """Tests de suppression d'activités"""

    def test_delete_activity_not_found(self, client, auth_headers, sample_organisation):
        """Test suppression d'une activité inexistante"""
        response = client.delete(
            f"/api/v1/organisations/{sample_organisation.id}/activity/99999",
            headers=auth_headers
        )

        assert response.status_code == 404

    def test_delete_activity_wrong_organisation(self, client, auth_headers, test_db, create_organisation):
        """Test suppression d'une activité d'une autre organisation"""
        org1 = create_organisation(test_db, name="Org 1")
        org2 = create_organisation(test_db, name="Org 2")

        # Pour ce test, on vérifie juste que l'endpoint existe et gère le cas
        # (il faudrait créer une vraie activité pour tester complètement)
        response = client.delete(
            f"/api/v1/organisations/{org1.id}/activity/{org2.id}",
            headers=auth_headers
        )

        # Devrait retourner 404 ou 403
        assert response.status_code in [403, 404]


# ============================================================================
# Tests Pagination Avancée
# ============================================================================

class TestOrganisationPaginationAdvanced:
    """Tests de pagination avancés"""

    def test_pagination_skip_beyond_total(self, client, auth_headers, test_db, create_organisation):
        """Test pagination au-delà du total"""
        for i in range(5):
            create_organisation(test_db, name=f"Org {i}", email=f"org{i}@test.com")

        response = client.get("/api/v1/organisations?skip=100&limit=10", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5
        assert len(data["items"]) == 0

    def test_pagination_large_limit(self, client, auth_headers, test_db, create_organisation):
        """Test avec limite large"""
        for i in range(10):
            create_organisation(test_db, name=f"Org {i}", email=f"org{i}@test.com")

        response = client.get("/api/v1/organisations?skip=0&limit=200", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 10

    def test_pagination_limit_exceeds_max(self, client, auth_headers):
        """Test limite dépassant le maximum"""
        response = client.get("/api/v1/organisations?limit=300", headers=auth_headers)

        # Devrait échouer validation (le=200)
        assert response.status_code == 422

    def test_pagination_negative_skip(self, client, auth_headers):
        """Test skip négatif"""
        response = client.get("/api/v1/organisations?skip=-1", headers=auth_headers)

        # Devrait échouer validation (ge=0)
        assert response.status_code == 422

    def test_pagination_negative_limit(self, client, auth_headers):
        """Test limite négative"""
        response = client.get("/api/v1/organisations?limit=-1", headers=auth_headers)

        # Devrait échouer validation (ge=1)
        assert response.status_code == 422


# ============================================================================
# Tests Endpoint Detail
# ============================================================================

class TestOrganisationDetail:
    """Tests de l'endpoint de détail"""

    def test_get_detail_with_mandats(self, client, auth_headers, sample_organisation):
        """Test récupération détail avec mandats"""
        response = client.get(
            f"/api/v1/organisations/{sample_organisation.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "name" in data
        assert data["id"] == sample_organisation.id

    def test_get_detail_invalid_id(self, client, auth_headers):
        """Test récupération détail avec ID invalide"""
        response = client.get("/api/v1/organisations/abc", headers=auth_headers)

        assert response.status_code == 422

    def test_get_detail_zero_id(self, client, auth_headers):
        """Test récupération avec ID zéro"""
        response = client.get("/api/v1/organisations/0", headers=auth_headers)

        assert response.status_code == 404
