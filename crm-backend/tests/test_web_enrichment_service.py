"""
Unit tests pour WebEnrichmentService (Acte V)

Tests:
1. Enrichissement success avec haute confidence
2. Enrichissement échec (company not found)
3. Cache hit (Redis)
4. Rate limiting
5. Validation données (website URL, phone format)
"""

import json
import pytest
import time
from unittest.mock import Mock, patch, MagicMock

from services.web_enrichment_service import WebEnrichmentService, get_enrichment_service


class TestWebEnrichmentService:
    """Tests unitaires WebEnrichmentService"""

    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client"""
        redis_mock = MagicMock()
        redis_mock.get.return_value = None  # Par défaut pas de cache
        redis_mock.setex.return_value = True
        redis_mock.incr.return_value = 1  # Rate limit count
        redis_mock.expire.return_value = True
        return redis_mock

    @pytest.fixture
    def service(self, mock_redis, monkeypatch):
        """Instance du service avec Redis mocké"""
        # Mock environment variables
        monkeypatch.setenv("SERPAPI_API_KEY", "test_key_123")
        monkeypatch.setenv("AUTOFILL_CACHE_TTL", "604800")
        monkeypatch.setenv("AUTOFILL_WEB_MIN_CONFIDENCE", "0.3")
        monkeypatch.setenv("AUTOFILL_RATE_LIMIT", "10")

        service = WebEnrichmentService()
        service.redis = mock_redis
        return service

    @pytest.fixture
    def mock_serpapi_success(self):
        """Mock réponse SerpAPI success"""
        return {
            "search_metadata": {"status": "Success"},
            "knowledge_graph": {
                "title": "Alforis Finance",
                "website": "https://alforis.com",
                "address": "75 Boulevard Haussmann, 75008 Paris, France",
                "phone": "+33 1 23 45 67 89",
                "profiles": [
                    {"link": "https://linkedin.com/company/alforis"}
                ]
            }
        }

    @pytest.fixture
    def mock_serpapi_no_results(self):
        """Mock réponse SerpAPI sans résultats"""
        return {
            "search_metadata": {"status": "Success"},
            "organic_results": []
        }

    def test_enrich_organisation_success(self, service, mock_serpapi_success):
        """Test enrichissement réussi avec haute confidence"""
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_serpapi_success

            result = service.enrich_organisation("Alforis Finance", "FR")

            assert result["success"] is True
            assert result["confidence"] > 0.8
            assert result["website"] == "https://alforis.com"
            assert result["address"] == "75 Boulevard Haussmann, 75008 Paris, France"
            assert result["phone"] == "+33 1 23 45 67 89"
            assert result["linkedin"] == "https://linkedin.com/company/alforis"
            assert result["source"] == "serpapi"
            assert result["cached"] is False

    def test_enrich_organisation_not_found(self, service, mock_serpapi_no_results):
        """Test enrichissement échoué (entreprise introuvable)"""
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_serpapi_no_results

            result = service.enrich_organisation("CompanyThatDoesNotExist123456", "FR")

            assert result["success"] is True  # Service répond
            assert result["confidence"] == 0.0
            assert result["website"] is None
            assert result["address"] is None

    def test_cache_hit(self, service, mock_redis):
        """Test cache Redis hit (pas d'appel API)"""
        # Setup cache with data
        cached_data = {
            "success": True,
            "website": "https://alforis.com",
            "address": "75 Boulevard Haussmann",
            "phone": "+33 1 23 45 67 89",
            "linkedin": None,
            "confidence": 0.85,
            "source": "serpapi",
            "cached": True
        }
        mock_redis.get.return_value = json.dumps(cached_data).encode()

        with patch('requests.get') as mock_get:
            result = service.enrich_organisation("Alforis Finance", "FR")

            # Vérifie qu'il n'y a PAS eu d'appel API
            mock_get.assert_not_called()

            # Vérifie résultat du cache
            assert result["success"] is True
            assert result["cached"] is True
            assert result["website"] == "https://alforis.com"
            assert result["confidence"] == 0.85

    def test_rate_limiting(self, service, mock_redis):
        """Test rate limiting (10 req/min)"""
        # Simulate 11th request in same minute
        mock_redis.incr.return_value = 11

        result = service.enrich_organisation("Test Company", "FR")

        assert result["success"] is False
        assert "rate limit" in result["error"].lower()

    def test_url_normalization(self, service):
        """Test normalisation URLs (http/https, trailing slash)"""
        # Test avec différents formats d'URL
        test_cases = [
            ("http://alforis.com", "https://alforis.com"),
            ("www.alforis.com", "https://www.alforis.com"),
            ("alforis.com/", "https://alforis.com"),
            ("https://alforis.com/", "https://alforis.com"),
        ]

        for input_url, expected_url in test_cases:
            normalized = service._normalize_url(input_url)
            assert normalized == expected_url, f"Failed for {input_url}"

    def test_confidence_scoring(self, service):
        """Test calcul confidence score"""
        # Test avec différents niveaux de données
        test_cases = [
            # (website, address, phone, linkedin, expected_min_confidence)
            ("https://alforis.com", "75 Bd Haussmann", "+33123456789", "linkedin.com/alforis", 0.9),
            ("https://alforis.com", "75 Bd Haussmann", None, None, 0.6),
            ("https://alforis.com", None, None, None, 0.4),
            (None, None, None, None, 0.0),
        ]

        for website, address, phone, linkedin, min_conf in test_cases:
            confidence = service._calculate_confidence(
                website=website,
                address=address,
                phone=phone,
                linkedin=linkedin
            )
            assert confidence >= min_conf, f"Confidence {confidence} < {min_conf} for {website}"

    def test_force_refresh(self, service, mock_redis, mock_serpapi_success):
        """Test force_refresh bypass cache"""
        # Setup cache
        mock_redis.get.return_value = json.dumps({"cached": "data"}).encode()

        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_serpapi_success

            result = service.enrich_organisation("Alforis Finance", "FR", force_refresh=True)

            # Vérifie qu'il y a eu appel API malgré cache
            mock_get.assert_called_once()
            assert result["cached"] is False

    def test_serpapi_error_handling(self, service):
        """Test gestion erreur API SerpAPI"""
        with patch('requests.get') as mock_get:
            # Simulate API error (500)
            mock_get.return_value.status_code = 500
            mock_get.return_value.text = "Internal Server Error"

            result = service.enrich_organisation("Test Company", "FR")

            assert result["success"] is False
            assert "error" in result

    def test_phone_number_cleaning(self, service):
        """Test nettoyage numéros de téléphone"""
        test_cases = [
            ("+33 1 23 45 67 89", "+33123456789"),
            ("01 23 45 67 89", "0123456789"),
            ("+33 (0)1 23 45 67 89", "+330123456789"),
            ("01.23.45.67.89", "01.23.45.67.89"),  # Garde les points
        ]

        for input_phone, expected in test_cases:
            cleaned = service._clean_phone(input_phone)
            assert cleaned == expected, f"Failed for {input_phone}"

    def test_linkedin_url_extraction(self, service):
        """Test extraction URL LinkedIn depuis profiles"""
        profiles = [
            {"link": "https://twitter.com/alforis"},
            {"link": "https://linkedin.com/company/alforis"},
            {"link": "https://facebook.com/alforis"}
        ]

        linkedin = service._extract_linkedin(profiles)
        assert linkedin == "https://linkedin.com/company/alforis"

    def test_singleton_pattern(self):
        """Test pattern singleton get_enrichment_service()"""
        service1 = get_enrichment_service()
        service2 = get_enrichment_service()

        assert service1 is service2, "Service should be singleton"

    @pytest.mark.integration
    def test_real_enrichment_alforis(self, service):
        """
        Integration test avec vraie API (skip si pas de clé)
        Marquer avec @pytest.mark.integration
        """
        import os
        if not os.getenv("SERPAPI_API_KEY") or os.getenv("SERPAPI_API_KEY") == "test_key_123":
            pytest.skip("Requires real SERPAPI_API_KEY")

        result = service.enrich_organisation("Alforis Finance", "FR")

        assert result["success"] is True
        assert result.get("website") is not None or result.get("confidence") == 0.0
        # Note: peut échouer si Alforis pas dans Google Knowledge Graph

    def test_cache_key_generation(self, service):
        """Test génération clé cache unique"""
        key1 = service._get_cache_key("Alforis Finance", "FR")
        key2 = service._get_cache_key("Alforis Finance", "FR")
        key3 = service._get_cache_key("Alforis Finance", "US")
        key4 = service._get_cache_key("Other Company", "FR")

        assert key1 == key2, "Same input should give same key"
        assert key1 != key3, "Different country should give different key"
        assert key1 != key4, "Different company should give different key"

    def test_empty_company_name(self, service):
        """Test avec nom entreprise vide"""
        result = service.enrich_organisation("", "FR")

        assert result["success"] is False
        assert "error" in result

    def test_special_characters_company_name(self, service, mock_serpapi_success):
        """Test avec caractères spéciaux dans nom"""
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_serpapi_success

            # Devrait encoder correctement
            result = service.enrich_organisation("L'Oréal & Cie", "FR")

            assert result["success"] is True
            # Vérifie que l'URL contient query encodée
            call_args = mock_get.call_args
            assert "L" in call_args[1]["params"]["q"]  # Devrait être encodé

    def test_rate_limit_reset(self, service, mock_redis):
        """Test reset rate limit après 1 minute"""
        # Simulate rate limit key expired
        mock_redis.incr.return_value = 1
        mock_redis.get.return_value = None

        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {"search_metadata": {"status": "Success"}}

            result = service.enrich_organisation("Test", "FR")

            assert result["success"] is True
            # Vérifie que expire a été appelé pour rate limit key
            assert mock_redis.expire.called


# Run tests:
# pytest crm-backend/tests/test_web_enrichment_service.py -v
# pytest crm-backend/tests/test_web_enrichment_service.py -v -m "not integration"
# pytest crm-backend/tests/test_web_enrichment_service.py::TestWebEnrichmentService::test_cache_hit -v
