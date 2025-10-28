"""
Tests unitaires pour les helpers et endpoints AI Statistics
"""
import pytest
from api.routes.ai_statistics import _percentile, _safe_divide


# ==============================================
# Tests pour _safe_divide
# ==============================================


def test_safe_divide_normal_case():
    """Test division normale"""
    assert _safe_divide(10, 2) == 5.0


def test_safe_divide_zero_denominator():
    """Test division par zéro → retourne 0.0"""
    assert _safe_divide(10, 0) == 0.0
    assert _safe_divide(0, 0) == 0.0


def test_safe_divide_zero_numerator():
    """Test numérateur zéro → retourne 0.0"""
    assert _safe_divide(0, 10) == 0.0


def test_safe_divide_rounding():
    """Test arrondi à 4 décimales"""
    result = _safe_divide(1, 3)
    assert result == 0.3333


# ==============================================
# Tests pour _percentile
# ==============================================


def test_percentile_empty_list():
    """Test percentile sur liste vide → None"""
    assert _percentile([], 0.5) is None


def test_percentile_single_value():
    """Test percentile sur un seul élément"""
    assert _percentile([42], 0.5) == 42
    assert _percentile([42], 0.0) == 42
    assert _percentile([42], 1.0) == 42


def test_percentile_odd_list():
    """Test percentile sur liste impaire"""
    values = [1, 2, 3, 4, 5]
    assert _percentile(values, 0.0) == 1
    assert _percentile(values, 0.5) == 3
    assert _percentile(values, 1.0) == 5


def test_percentile_even_list():
    """Test percentile sur liste paire"""
    values = [1, 2, 3, 4]
    assert _percentile(values, 0.0) == 1
    assert _percentile(values, 0.5) == 2  # Médiane entre 2 et 3
    assert _percentile(values, 1.0) == 4


def test_percentile_p95():
    """Test p95 sur liste de 20 éléments"""
    values = list(range(1, 21))  # 1 à 20
    p95 = _percentile(values, 0.95)
    assert p95 == 19  # 95% de 20 = 19


def test_percentile_unsorted():
    """Test percentile sur liste non triée"""
    values = [5, 1, 3, 2, 4]
    assert _percentile(values, 0.5) == 3  # Doit trier automatiquement


# ==============================================
# Tests d'intégration pour les endpoints
# ==============================================


def test_stats_endpoint_requires_auth(client):
    """Test que /stats nécessite une authentification"""
    response = client.get("/api/v1/ai/autofill/stats?days=7")
    assert response.status_code == 401  # Unauthorized


def test_timeline_endpoint_requires_auth(client):
    """Test que /stats/timeline nécessite une authentification"""
    response = client.get("/api/v1/ai/autofill/stats/timeline?days=7")
    assert response.status_code == 401  # Unauthorized


def test_leaderboard_endpoint_requires_auth(client):
    """Test que /stats/leaderboard nécessite une authentification"""
    response = client.get("/api/v1/ai/autofill/stats/leaderboard")
    assert response.status_code == 401  # Unauthorized


@pytest.mark.skip(reason="Requires authenticated client fixture")
def test_stats_endpoint_empty_db(authenticated_client):
    """
    Test /stats avec DB vide → doit retourner 200 avec totaux à 0

    Note: Ce test nécessite un fixture authenticated_client qui n'existe pas encore.
    À implémenter quand le fixture sera disponible.
    """
    response = authenticated_client.get("/api/v1/ai/autofill/stats?days=7")
    assert response.status_code == 200

    data = response.json()
    assert data["apply_rate"]["total_suggestions"] == 0
    assert data["apply_rate"]["total_applied"] == 0
    assert data["apply_rate"]["rate"] == 0.0
    assert data["avg_latency_ms"]["value"] == 0
    assert data["source_mix"]["rules"]["count"] == 0
    assert len(data["top_fields"]) == 0


@pytest.mark.skip(reason="Requires authenticated client fixture")
def test_timeline_endpoint_empty_db(authenticated_client):
    """
    Test /stats/timeline avec DB vide → doit retourner 200 avec timeline à 0

    Note: Ce test nécessite un fixture authenticated_client qui n'existe pas encore.
    """
    response = authenticated_client.get("/api/v1/ai/autofill/stats/timeline?days=7")
    assert response.status_code == 200

    data = response.json()
    assert data["period"]["days"] == 7
    assert len(data["timeline"]) == 7  # 7 jours avec 0 suggestions

    for day_data in data["timeline"]:
        assert day_data["suggestions"] == 0
        assert day_data["applied"] == 0
        assert day_data["apply_rate"] == 0.0


@pytest.mark.skip(reason="Requires authenticated client fixture")
def test_leaderboard_endpoint_empty_db(authenticated_client):
    """
    Test /stats/leaderboard avec DB vide → doit retourner 200 avec leaderboard vide

    Note: Ce test nécessite un fixture authenticated_client qui n'existe pas encore.
    """
    response = authenticated_client.get("/api/v1/ai/autofill/stats/leaderboard")
    assert response.status_code == 200

    data = response.json()
    assert data["period"]["days"] == 30
    assert len(data["leaderboard"]) == 0  # Aucun utilisateur
