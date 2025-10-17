# 🧪 Tests CRM Backend

Guide complet pour les tests automatisés du backend.

---

## 📦 Installation

```bash
cd crm-backend

# Installer les dépendances de test
pip install -r requirements-test.txt
```

---

## 🚀 Lancer les Tests

### Tous les tests

```bash
# Lancer tous les tests
pytest

# Avec coverage
pytest --cov=. --cov-report=html

# En parallèle (plus rapide)
pytest -n auto
```

### Tests spécifiques

```bash
# Un fichier
pytest tests/test_organisations.py

# Une fonction
pytest tests/test_organisations.py::test_create_organisation

# Une classe
pytest tests/test_organisations.py::TestOrganisationAPI

# Par marker
pytest -m unit  # Seulement les tests unitaires
pytest -m "not slow"  # Tous sauf les lents
```

### Verbosité

```bash
# Plus de détails
pytest -v

# Encore plus de détails
pytest -vv

# Afficher les prints
pytest -s
```

---

## 📊 Coverage

### Générer le rapport

```bash
# Terminal
pytest --cov=. --cov-report=term-missing

# HTML (ouvrir htmlcov/index.html)
pytest --cov=. --cov-report=html

# XML (pour CI/CD)
pytest --cov=. --cov-report=xml
```

### Objectif Coverage

- **Backend:** 70%+
- **Modèles:** 90%+
- **API Routes:** 80%+
- **Services:** 70%+

---

## 🏗️ Structure des Tests

```
tests/
├── __init__.py
├── conftest.py              # Fixtures communes
├── test_auth.py             # Tests authentification
├── test_organisations.py    # Tests organisations ✅
├── test_people.py           # Tests personnes ✅
├── test_mandats.py          # Tests mandats/produits
├── test_imports.py          # Tests imports CSV/Excel
└── test_api_integration.py  # Tests end-to-end
```

---

## 🛠️ Fixtures Disponibles

### Database

```python
def test_something(test_db):
    # test_db = session SQLite en mémoire
    org = Organisation(name="Test")
    test_db.add(org)
    test_db.commit()
```

### Client HTTP

```python
def test_api(client, auth_headers):
    # client = TestClient FastAPI
    # auth_headers = {"Authorization": "Bearer ..."}
    response = client.get("/api/v1/organisations", headers=auth_headers)
    assert response.status_code == 200
```

### Utilisateurs

```python
def test_with_user(test_user):
    # test_user = User de test
    assert test_user.email == "test@example.com"

def test_with_admin(admin_user):
    # admin_user = Admin de test
    assert admin_user.role == UserRole.ADMIN
```

### Organisations

```python
def test_with_org(sample_organisation):
    # Une organisation de test
    assert sample_organisation.name == "Test Company"

def test_with_orgs(sample_organisations):
    # 5 organisations de test
    assert len(sample_organisations) == 5
```

### Personnes

```python
def test_with_person(sample_person):
    # Une personne de test
    assert sample_person.first_name == "John"

def test_with_linked_person(sample_person_with_org):
    # Personne liée à une organisation
    assert len(sample_person_with_org.organizations) >= 1
```

### Factories

```python
def test_with_factory(test_db, create_organisation):
    # Factory pour créer des organisations custom
    org = create_organisation(
        test_db,
        name="Custom Org",
        category=OrganisationCategory.CGPI
    )
    assert org.name == "Custom Org"
```

---

## ✅ Écrire un Nouveau Test

### Test Unitaire (Modèle)

```python
# tests/test_organisations.py

def test_create_organisation(test_db):
    """Test création d'une organisation"""
    org = Organisation(
        name="New Company",
        category=OrganisationCategory.INSTITUTION,
        email="contact@newcompany.com",
    )

    test_db.add(org)
    test_db.commit()
    test_db.refresh(org)

    assert org.id is not None
    assert org.name == "New Company"
```

### Test API (Integration)

```python
# tests/test_organisations.py

def test_list_organisations_api(client, auth_headers, sample_organisations):
    """Test liste des organisations via API"""
    response = client.get(
        "/api/v1/organisations",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5
```

### Test avec Mock

```python
import pytest
from unittest.mock import patch

def test_external_api_call(client, auth_headers):
    """Test avec mock d'une API externe"""
    with patch('services.external_api.fetch_data') as mock_fetch:
        mock_fetch.return_value = {"data": "mocked"}

        response = client.get("/api/v1/external", headers=auth_headers)

        assert response.status_code == 200
        assert response.json() == {"data": "mocked"}
        mock_fetch.assert_called_once()
```

---

## 🏷️ Markers

### Utiliser les markers

```python
import pytest

@pytest.mark.slow
def test_slow_operation():
    # Test qui prend du temps
    pass

@pytest.mark.integration
def test_full_workflow():
    # Test end-to-end
    pass

@pytest.mark.unit
def test_pure_function():
    # Test unitaire
    pass
```

### Lancer par marker

```bash
# Seulement les tests unitaires
pytest -m unit

# Tous sauf les lents
pytest -m "not slow"

# Tests API seulement
pytest -m api
```

---

## 🐛 Debugging

### Afficher les prints

```bash
pytest -s
```

### Arrêter au premier échec

```bash
pytest -x
```

### Afficher les traceback complets

```bash
pytest --tb=long
```

### Mode debug interactif

```bash
# Ajouter dans le test
import pdb; pdb.set_trace()

# Ou utiliser pytest
pytest --pdb  # S'arrête au premier échec
```

### Logs détaillés

```bash
pytest --log-cli-level=DEBUG
```

---

## 📈 CI/CD

### GitHub Actions

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-test.txt

      - name: Run tests
        run: |
          pytest --cov=. --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
```

---

## 🎯 Best Practices

### 1. Nommage

```python
# ✅ Bon
def test_create_organisation_with_valid_data():
    pass

# ❌ Mauvais
def test1():
    pass
```

### 2. One Assertion Per Test (idéalement)

```python
# ✅ Bon
def test_organisation_has_name():
    org = Organisation(name="Test")
    assert org.name == "Test"

def test_organisation_has_email():
    org = Organisation(email="test@example.com")
    assert org.email == "test@example.com"

# ❌ Mauvais
def test_organisation():
    org = Organisation(name="Test", email="test@example.com")
    assert org.name == "Test"
    assert org.email == "test@example.com"
    assert org.is_active is True
    # Trop d'assertions différentes
```

### 3. Arrange-Act-Assert

```python
def test_update_organisation():
    # Arrange (Préparer)
    org = Organisation(name="Old Name")
    db.add(org)
    db.commit()

    # Act (Agir)
    org.name = "New Name"
    db.commit()

    # Assert (Vérifier)
    assert org.name == "New Name"
```

### 4. Utiliser des Fixtures

```python
# ✅ Bon
def test_list_organisations(client, auth_headers, sample_organisations):
    response = client.get("/api/v1/organisations", headers=auth_headers)
    assert len(response.json()) == len(sample_organisations)

# ❌ Mauvais
def test_list_organisations(client):
    # Créer les données de test ici
    # Créer l'auth ici
    # Puis tester
    pass
```

### 5. Nettoyer après le Test

```python
# ✅ La fixture test_db nettoie automatiquement

# ❌ Si vous gérez manuellement
def test_something():
    try:
        # Test
        pass
    finally:
        # Nettoyer
        pass
```

---

## 📚 Exemples Complets

### Test CRUD Complet

```python
def test_organisation_crud(client, auth_headers):
    """Test CRUD complet d'une organisation"""

    # Create
    create_response = client.post(
        "/api/v1/organisations",
        json={"name": "CRUD Test", "category": "Institution"},
        headers=auth_headers
    )
    assert create_response.status_code == 201
    org_id = create_response.json()["id"]

    # Read
    read_response = client.get(
        f"/api/v1/organisations/{org_id}",
        headers=auth_headers
    )
    assert read_response.status_code == 200
    assert read_response.json()["name"] == "CRUD Test"

    # Update
    update_response = client.put(
        f"/api/v1/organisations/{org_id}",
        json={"name": "CRUD Updated"},
        headers=auth_headers
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "CRUD Updated"

    # Delete
    delete_response = client.delete(
        f"/api/v1/organisations/{org_id}",
        headers=auth_headers
    )
    assert delete_response.status_code == 204

    # Verify deleted
    verify_response = client.get(
        f"/api/v1/organisations/{org_id}",
        headers=auth_headers
    )
    assert verify_response.status_code == 404
```

---

## 🆘 Troubleshooting

### Problème: "No module named 'X'"

```bash
# Vérifier l'installation
pip list | grep X

# Réinstaller
pip install -r requirements-test.txt
```

### Problème: "Database is locked"

```python
# Utiliser la fixture test_db qui gère SQLite en mémoire
def test_something(test_db):
    # Pas de problème de lock
    pass
```

### Problème: Tests lents

```bash
# Lancer en parallèle
pytest -n auto

# Profiler
pytest --durations=10  # Affiche les 10 tests les plus lents
```

### Problème: Fixtures not found

```python
# Vérifier que conftest.py est bien dans tests/
tests/
├── conftest.py  ← Doit être ici
└── test_*.py
```

---

## 📊 Commandes Utiles

```bash
# Lancer tous les tests avec coverage
pytest --cov=. --cov-report=html

# Tests spécifiques
pytest tests/test_organisations.py -v

# Voir les tests disponibles
pytest --collect-only

# Lancer les tests marqués
pytest -m unit

# Lancer en parallèle
pytest -n 4  # 4 workers

# Mode watch (relancer auto à chaque changement)
pip install pytest-watch
ptw
```

---

## 🎉 Conclusion

Vous avez maintenant:
- ✅ Structure de tests complète
- ✅ Fixtures réutilisables
- ✅ Tests organisations et personnes
- ✅ Configuration pytest et coverage
- ✅ Guide complet d'utilisation

**Prochaine étape:** Écrire les tests manquants (auth, mandats, imports)

**Objectif:** Coverage > 70%

---

**Happy Testing! 🧪**
