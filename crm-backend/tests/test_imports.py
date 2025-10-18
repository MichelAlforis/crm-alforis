from models.organisation import Organisation
from models.person import Person


def test_bulk_create_organisations_success(client, test_db):
    payload = [
        {
            "name": "Alpha Capital",
            "category": "Institution",
            "website": "https://alpha.example",
            "country_code": "FR",
            "language": "FR",
        },
        {
            "name": "Beta Partners",
            "category": "Wholesale",
            "country_code": "FR",
            "language": "FR",
        },
    ]

    response = client.post(
        "/api/v1/imports/organisations/bulk",
        json=payload,
        params={"type_org": "client"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["created"]) == 2
    assert data["failed"] == 0
    assert data["errors"] == []

    created_names = {org.name for org in test_db.query(Organisation).all()}
    assert {"Alpha Capital", "Beta Partners"} <= created_names


def test_bulk_create_organisations_deduplicates_payload(client, test_db):
    payload = [
        {
            "name": "Gamma Advisors",
            "category": "Institution",
            "country_code": "FR",
            "language": "FR",
        },
        {
            "name": "gamma advisors",  # same name, different casing
            "category": "Institution",
            "country_code": "FR",
            "language": "FR",
        },
    ]

    response = client.post(
        "/api/v1/imports/organisations/bulk",
        json=payload,
        params={"type_org": "client"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["created"]) == 1
    assert data["failed"] == 1
    assert len(data["errors"]) == 1
    assert "Doublon dans le payload" in data["errors"][0]["error"]


def test_bulk_create_organisations_skips_existing(client, test_db, sample_organisation):
    payload = [
        {
            "name": sample_organisation.name,
            "category": "Institution",
            "country_code": "FR",
            "language": "FR",
        },
        {
            "name": "Delta Holdings",
            "category": "Institution",
            "country_code": "FR",
            "language": "FR",
        },
    ]

    response = client.post(
        "/api/v1/imports/organisations/bulk",
        json=payload,
        params={"type_org": "client"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["created"]) == 1
    assert data["failed"] == 1
    assert any("déjà existante" in error["error"].lower() for error in data["errors"])

    names = {org.name for org in test_db.query(Organisation).all()}
    assert "Delta Holdings" in names
    existing_count = test_db.query(Organisation).filter(Organisation.name == sample_organisation.name).count()
    assert existing_count == 1


def test_bulk_create_people_success(client, test_db):
    payload = [
        {
            "first_name": "Alice",
            "last_name": "Martin",
            "personal_email": "alice@example.com",
            "language": "FR",
        },
        {
            "first_name": "Bob",
            "last_name": "Durand",
            "personal_email": "bob@example.com",
            "language": "FR",
        },
    ]

    response = client.post("/api/v1/imports/people/bulk", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["created"]) == 2
    assert data["failed"] == 0

    emails = {person.personal_email for person in test_db.query(Person).all()}
    assert {"alice@example.com", "bob@example.com"} <= emails


def test_bulk_create_people_rejects_duplicate_emails(client):
    payload = [
        {
            "first_name": "Claire",
            "last_name": "Dupont",
            "personal_email": "claire@example.com",
            "language": "FR",
        },
        {
            "first_name": "Clara",
            "last_name": "Dupont",
            "personal_email": "CLAIRE@example.com",  # duplicate, different case
            "language": "FR",
        },
    ]

    response = client.post("/api/v1/imports/people/bulk", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["failed"] == 1
    assert len(data["errors"]) == 1
    assert "Doublon dans le payload" in data["errors"][0]["error"]
