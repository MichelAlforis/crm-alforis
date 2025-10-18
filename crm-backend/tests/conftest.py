"""
Fixtures communes pour les tests

Ce fichier contient toutes les fixtures pytest réutilisables.
"""

import inspect
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from core.database import Base, get_db
from core.security import get_password_hash
from models.user import User
from models.organisation import Organisation, OrganisationCategory
from models.person import Person, PersonOrganizationLink, OrganizationType
from models.role import Role, UserRole
from core.permissions import init_default_permissions


# ============================================================================
# Database Fixtures
# ============================================================================

@pytest.fixture(scope="function")
def test_db():
    """
    Crée une base de données SQLite en mémoire pour chaque test
    """
    # Créer engine SQLite en mémoire
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Créer toutes les tables
    Base.metadata.create_all(bind=engine)

    # Créer une session
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    """
    Client de test FastAPI avec base de données de test
    """
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# ============================================================================
# User Fixtures
# ============================================================================

@pytest.fixture
def test_user(test_db):
    """
    Crée un utilisateur de test
    """
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test User",
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def admin_user(test_db):
    """
    Crée un administrateur de test
    """
    # S'assurer que les rôles/permissions legacy existent
    init_default_permissions(test_db)

    admin_role = (
        test_db.query(Role)
        .filter(Role.name == UserRole.ADMIN)
        .first()
    )
    if admin_role is None:
        admin_role = Role(
            name=UserRole.ADMIN,
            display_name="Admin",
            level=3,
            is_system=True,
        )
        test_db.add(admin_role)
        test_db.flush()

    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("adminpassword123"),
        full_name="Admin User",
        is_active=True,
        role=admin_role,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def auth_headers(client, test_user):
    """
    Headers d'authentification pour les requêtes
    """
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "test@example.com",
            "password": "testpassword123",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ============================================================================
# Organisation Fixtures
# ============================================================================

@pytest.fixture
def sample_organisation(test_db):
    """
    Crée une organisation de test
    """
    org = Organisation(
        name="Test Company",
        category=OrganisationCategory.INSTITUTION,
        email="contact@testcompany.com",
        website="https://testcompany.com",
        country_code="FR",
        language="FR",
        is_active=True,
    )
    test_db.add(org)
    test_db.commit()
    test_db.refresh(org)
    return org


@pytest.fixture
def sample_organisations(test_db):
    """
    Crée plusieurs organisations de test
    """
    orgs = []
    for i in range(5):
        org = Organisation(
            name=f"Company {i}",
            category=OrganisationCategory.INSTITUTION,
            email=f"contact{i}@company.com",
            country_code="FR",
            language="FR",
            is_active=True,
        )
        test_db.add(org)
        orgs.append(org)

    test_db.commit()
    for org in orgs:
        test_db.refresh(org)

    return orgs


# ============================================================================
# Person Fixtures
# ============================================================================

@pytest.fixture
def sample_person(test_db):
    """
    Crée une personne de test
    """
    person = Person(
        first_name="John",
        last_name="Doe",
        personal_email="john.doe@example.com",
        personal_phone="+33612345678",
        country_code="FR",
        language="FR",
    )
    test_db.add(person)
    test_db.commit()
    test_db.refresh(person)
    return person


@pytest.fixture
def sample_person_with_org(test_db, sample_person, sample_organisation):
    """
    Crée une personne liée à une organisation
    """
    link = PersonOrganizationLink(
        person_id=sample_person.id,
        organization_type=OrganizationType.INVESTOR,
        organization_id=sample_organisation.id,
        job_title="CEO",
        work_email="john.doe@testcompany.com",
        work_phone="+33123456789",
        is_primary=True,
    )
    test_db.add(link)
    test_db.commit()
    test_db.refresh(link)

    test_db.refresh(sample_person)
    return sample_person


# ============================================================================
# Helper Functions
# ============================================================================

@pytest.fixture
def create_organisation():
    """
    Factory pour créer des organisations
    """
    def _create(test_db, **kwargs):
        defaults = {
            "name": "Default Company",
            "category": OrganisationCategory.INSTITUTION,
            "email": "default@company.com",
            "country_code": "FR",
            "language": "FR",
            "is_active": True,
        }
        defaults.update(kwargs)

        org = Organisation(**defaults)
        test_db.add(org)
        test_db.commit()
        test_db.refresh(org)
        return org

    return _create


@pytest.fixture
def create_person():
    """
    Factory pour créer des personnes
    """
    def _create(test_db, **kwargs):
        defaults = {
            "first_name": "John",
            "last_name": "Doe",
            "personal_email": "john@example.com",
            "country_code": "FR",
            "language": "FR",
        }
        defaults.update(kwargs)

        person = Person(**defaults)
        test_db.add(person)
        test_db.commit()
        test_db.refresh(person)
        return person

    return _create


# ============================================================
# Pytest Hooks
# ============================================================


def pytest_collection_modifyitems(items):
    for item in items:
        test_obj = getattr(item, "obj", None)
        if inspect.iscoroutinefunction(test_obj):
            item.add_marker(pytest.mark.anyio)


def pytest_pyfunc_call(pyfuncitem):
    test_obj = getattr(pyfuncitem, "obj", None)
    if inspect.iscoroutinefunction(test_obj):
        import asyncio

        asyncio.run(test_obj(**pyfuncitem.funcargs))
        return True
    return None
