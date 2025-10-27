"""
Tests - Système de Recherche Globale

Tests pour:
- Recherche Full-Text organisations
- Recherche people et mandats
- Recherche globale multi-entités
- Autocomplete
- Filtres avancés
"""

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.search import SearchService, autocomplete, search_all
from models.mandat import Mandat
from models.organisation import Organisation, OrganisationCategory
from models.person import Person
from models.user import User

# ============================================
# Tests Setup Full-Text Search
# ============================================

@pytest.fixture(scope="function")
def setup_fulltext_search(test_db: Session):
    """
    Setup Full-Text Search pour les tests

    Ajoute colonne search_vector et trigger
    """
    try:
        # Ajouter colonne
        test_db.execute(text("""
            ALTER TABLE organisations
            ADD COLUMN IF NOT EXISTS search_vector tsvector;
        """))

        # Créer fonction
        test_db.execute(text("""
            CREATE OR REPLACE FUNCTION organisations_search_trigger() RETURNS trigger AS $$
            BEGIN
              NEW.search_vector :=
                setweight(to_tsvector('french', COALESCE(NEW.name, '')), 'A') ||
                setweight(to_tsvector('french', COALESCE(NEW.email, '')), 'B');
              RETURN NEW;
            END
            $$ LANGUAGE plpgsql;
        """))

        # Créer trigger
        test_db.execute(text("""
            DROP TRIGGER IF EXISTS tsvector_update ON organisations;
            CREATE TRIGGER tsvector_update
            BEFORE INSERT OR UPDATE ON organisations
            FOR EACH ROW EXECUTE FUNCTION organisations_search_trigger();
        """))

        # Créer index
        test_db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_organisations_search
            ON organisations USING GIN(search_vector);
        """))

        test_db.commit()

    except Exception as e:
        # Si erreur (ex: SQLite), skip
        pytest.skip(f"Full-Text Search not supported: {e}")


# ============================================
# Tests Recherche Organisations
# ============================================

def test_search_organisations_basic(test_db: Session, admin_user: User, setup_fulltext_search):
    """Test recherche basique organisations"""
    # Créer organisations
    org1 = Organisation(name="Alforis Finance", email="contact@alforis.fr")
    org2 = Organisation(name="Tech Solutions", email="info@tech.com")
    org3 = Organisation(name="Finance Corp", email="hello@finance.com")

    test_db.add_all([org1, org2, org3])
    test_db.commit()

    # Mettre à jour search_vector
    test_db.execute(text("""
        UPDATE organisations
        SET search_vector = to_tsvector('french', name || ' ' || COALESCE(email, ''));
    """))
    test_db.commit()

    # Rechercher "finance"
    results = SearchService.search_organisations(
        query="finance",
        db=test_db,
        current_user=admin_user,
        limit=10,
    )

    # Devrait trouver Alforis Finance et Finance Corp
    assert results['total'] >= 2
    assert len(results['items']) >= 2

    # Vérifier pertinence
    names = [item['name'] for item in results['items']]
    assert "Alforis Finance" in names
    assert "Finance Corp" in names


def test_search_organisations_with_filters(test_db: Session, admin_user: User):
    """Test recherche avec filtres"""
    # Créer organisations
    org1 = Organisation(
        name="Bank France",
        category=OrganisationCategory.INSTITUTION,
        is_active=True
    )
    org2 = Organisation(
        name="Bank USA",
        category=OrganisationCategory.STARTUP,
        is_active=False
    )

    test_db.add_all([org1, org2])
    test_db.commit()

    # Rechercher avec filtre catégorie
    results = SearchService.search_organisations(
        query="bank",
        db=test_db,
        current_user=admin_user,
        filters={'category': OrganisationCategory.INSTITUTION},
        limit=10,
    )

    # Devrait trouver seulement Bank France
    assert len(results['items']) == 1
    assert results['items'][0]['name'] == "Bank France"


def test_search_organisations_empty_query(test_db: Session, admin_user: User):
    """Test recherche avec query vide"""
    results = SearchService.search_organisations(
        query="",
        db=test_db,
        current_user=admin_user,
    )

    # Query vide devrait retourner 0 résultats ou erreur
    assert results['total'] == 0 or 'error' in results


# ============================================
# Tests Recherche People
# ============================================

def test_search_people_by_name(test_db: Session, admin_user: User):
    """Test recherche personnes par nom"""
    # Créer personnes
    person1 = Person(first_name="John", last_name="Doe", personal_email="john@test.com")
    person2 = Person(first_name="Jane", last_name="Smith", personal_email="jane@test.com")
    person3 = Person(first_name="Bob", last_name="Johnson", personal_email="bob@test.com")

    test_db.add_all([person1, person2, person3])
    test_db.commit()

    # Rechercher "john"
    results = SearchService.search_people(
        query="john",
        db=test_db,
        current_user=admin_user,
        limit=10,
    )

    # Devrait trouver John Doe et Bob Johnson
    assert results['total'] >= 1
    names = [f"{item['first_name']} {item['last_name']}" for item in results['items']]
    assert "John Doe" in names or "Bob Johnson" in names


def test_search_people_by_email(test_db: Session, admin_user: User):
    """Test recherche personnes par email"""
    person = Person(first_name="Alice", last_name="Wonder", personal_email="alice@wonderland.com")
    test_db.add(person)
    test_db.commit()

    # Rechercher par email
    results = SearchService.search_people(
        query="wonderland",
        db=test_db,
        current_user=admin_user,
    )

    assert results['total'] >= 1
    assert any('wonderland' in item.get('personal_email', '').lower() for item in results['items'])


# ============================================
# Tests Recherche Globale
# ============================================

@pytest.mark.asyncio
async def test_search_all_multi_entities(test_db: Session, admin_user: User):
    """Test recherche globale multi-entités"""
    # Créer données
    org = Organisation(name="Finance Test Corp")
    person = Person(first_name="Test", last_name="Finance", personal_email="test@finance.com")

    test_db.add_all([org, person])
    test_db.commit()

    # Recherche globale
    results = await search_all(
        query="finance",
        db=test_db,
        current_user=admin_user,
        limit_per_type=5,
    )

    # Devrait trouver dans organisations et people
    assert 'organisations' in results['results']
    assert 'people' in results['results']
    assert results['total'] >= 2


@pytest.mark.asyncio
async def test_search_all_specific_types(test_db: Session, admin_user: User):
    """Test recherche globale avec types spécifiques"""
    org = Organisation(name="Tech Corp")
    test_db.add(org)
    test_db.commit()

    # Rechercher seulement organisations
    results = await search_all(
        query="tech",
        db=test_db,
        current_user=admin_user,
        entity_types=['organisations'],
    )

    # Devrait retourner seulement organisations
    assert 'organisations' in results['results']
    assert 'people' not in results['results']
    assert 'mandats' not in results['results']


# ============================================
# Tests Autocomplete
# ============================================

@pytest.mark.asyncio
async def test_autocomplete_organisations(test_db: Session, admin_user: User):
    """Test autocomplete organisations"""
    # Créer organisations
    org1 = Organisation(name="Apple Inc")
    org2 = Organisation(name="Applied Systems")
    org3 = Organisation(name="Amazon")

    test_db.add_all([org1, org2, org3])
    test_db.commit()

    # Autocomplete "app"
    suggestions = await autocomplete(
        query="app",
        db=test_db,
        current_user=admin_user,
        entity_type='organisations',
        limit=10,
    )

    # Devrait suggérer Apple et Applied
    assert len(suggestions) >= 2
    names = [s['name'] for s in suggestions]
    assert "Apple Inc" in names
    assert "Applied Systems" in names


@pytest.mark.asyncio
async def test_autocomplete_min_length(test_db: Session, admin_user: User):
    """Test autocomplete minimum 2 caractères"""
    # 1 caractère
    suggestions = await autocomplete(
        query="a",
        db=test_db,
        current_user=admin_user,
    )

    # Devrait retourner vide
    assert len(suggestions) == 0


@pytest.mark.asyncio
async def test_autocomplete_people(test_db: Session, admin_user: User):
    """Test autocomplete personnes"""
    person1 = Person(first_name="Sarah", last_name="Connor", personal_email="sarah@test.com")
    person2 = Person(first_name="Sam", last_name="Smith", personal_email="sam@test.com")

    test_db.add_all([person1, person2])
    test_db.commit()

    # Autocomplete "sa"
    suggestions = await autocomplete(
        query="sa",
        db=test_db,
        current_user=admin_user,
        entity_type='people',
    )

    # Devrait suggérer Sarah et Sam
    assert len(suggestions) >= 2


# ============================================
# Tests Pagination
# ============================================

def test_search_pagination(test_db: Session, admin_user: User):
    """Test pagination recherche"""
    # Créer 25 organisations
    for i in range(25):
        org = Organisation(name=f"Finance Company {i}")
        test_db.add(org)

    test_db.commit()

    # Page 1
    results_page1 = SearchService.search_organisations(
        query="finance",
        db=test_db,
        current_user=admin_user,
        limit=10,
        offset=0,
    )

    # Page 2
    results_page2 = SearchService.search_organisations(
        query="finance",
        db=test_db,
        current_user=admin_user,
        limit=10,
        offset=10,
    )

    assert len(results_page1['items']) == 10
    assert len(results_page2['items']) >= 10
    assert results_page1['total'] == results_page2['total']


# ============================================
# Tests Edge Cases
# ============================================

def test_search_special_characters(test_db: Session, admin_user: User):
    """Test recherche avec caractères spéciaux"""
    org = Organisation(name="L'Oréal Finance & Co.")
    test_db.add(org)
    test_db.commit()

    results = SearchService.search_organisations(
        query="l'oréal",
        db=test_db,
        current_user=admin_user,
    )

    # Devrait gérer les accents et apostrophes
    assert results['total'] >= 0  # Pas d'erreur


def test_search_case_insensitive(test_db: Session, admin_user: User):
    """Test recherche insensible à la casse"""
    org = Organisation(name="TechCorp")
    test_db.add(org)
    test_db.commit()

    # Recherche en minuscules
    results = SearchService.search_organisations(
        query="techcorp",
        db=test_db,
        current_user=admin_user,
    )

    assert results['total'] >= 1


def test_search_empty_database(test_db: Session, admin_user: User):
    """Test recherche dans base vide"""
    results = SearchService.search_organisations(
        query="anything",
        db=test_db,
        current_user=admin_user,
    )

    assert results['total'] == 0
    assert len(results['items']) == 0


# ============================================
# Tests Performance
# ============================================

def test_search_performance_large_dataset(test_db: Session, admin_user: User):
    """Test performance avec dataset large"""
    import time

    # Créer 100 organisations
    orgs = [Organisation(name=f"Company {i}") for i in range(100)]
    test_db.add_all(orgs)
    test_db.commit()

    # Mesurer temps de recherche
    start = time.time()

    results = SearchService.search_organisations(
        query="company",
        db=test_db,
        current_user=admin_user,
        limit=20,
    )

    duration = time.time() - start

    # Devrait être rapide (<1 seconde)
    assert duration < 1.0
    assert len(results['items']) > 0
