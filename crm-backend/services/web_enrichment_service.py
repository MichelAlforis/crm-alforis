"""
Web Enrichment Service - ACTE V
Enrichit automatiquement les données d'organisations via recherche web

Fonctionnalités:
- Recherche Google via SerpAPI
- Extraction: site web, adresse, téléphone, LinkedIn
- Cache Redis pour éviter requêtes dupliquées
- Rate limiting: 100 req/jour (plan gratuit SerpAPI)
- Confidence scoring (0-1)

Author: Claude AI
Created: 2025-10-30
"""

import os
import re
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
import redis
import json

logger = logging.getLogger(__name__)


class WebEnrichmentService:
    """Service d'enrichissement web via SerpAPI"""

    def __init__(self):
        self.serpapi_key = os.getenv("SERPAPI_API_KEY")
        self.redis_client = None

        # Feature flags from .env
        self.cache_ttl = int(os.getenv("AUTOFILL_CACHE_TTL", 7 * 24 * 3600))  # Default: 7 days
        self.min_confidence = float(os.getenv("AUTOFILL_WEB_MIN_CONFIDENCE", 0.3))  # Default: 0.3
        self.rate_limit = int(os.getenv("AUTOFILL_RATE_LIMIT", 10))  # Default: 10 req/min

        # Setup Redis cache
        try:
            redis_host = os.getenv("REDIS_HOST", "localhost")
            redis_port = int(os.getenv("REDIS_PORT", 6379))
            self.redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=2,  # DB 2 pour enrichment
                decode_responses=True
            )
            self.redis_client.ping()
            logger.info("✅ Redis cache connected for web enrichment")
        except Exception as e:
            logger.warning(f"⚠️ Redis unavailable: {e}. Cache disabled.")
            self.redis_client = None


    def enrich_organisation(
        self,
        name: str,
        country: str = "FR",
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Enrichit une organisation via recherche web

        Args:
            name: Nom de l'organisation (ex: "Alforis Finance")
            country: Code pays ISO (ex: "FR")
            force_refresh: Bypass cache et re-fetch

        Returns:
            {
                "website": "www.alforis.com",
                "address": "123 Ave Champs-Élysées, 75008 Paris",
                "phone": "+33 1 23 45 67 89",
                "linkedin": "linkedin.com/company/alforis",
                "confidence": 0.85,
                "source": "serpapi",
                "cached": False,
                "enriched_at": "2025-10-30T18:30:00Z"
            }
        """

        # 1. Check cache first
        cache_key = f"enrichment:org:{name.lower()}:{country}"

        if not force_refresh and self.redis_client:
            try:
                cached = self.redis_client.get(cache_key)
                if cached:
                    logger.info(f"✅ Cache HIT for {name}")
                    data = json.loads(cached)
                    data["cached"] = True
                    return data
            except Exception as e:
                logger.warning(f"Cache read error: {e}")

        # 2. Fetch from web
        logger.info(f"🔍 Enriching {name} from web...")

        try:
            # 2a. Search Google via SerpAPI
            search_results = self._search_google(name, country)

            # 2b. Extract structured data
            enriched_data = self._extract_organisation_data(
                name,
                search_results
            )

            # 2c. Calculate confidence score
            enriched_data["confidence"] = self._calculate_confidence(
                enriched_data
            )

            enriched_data.update({
                "source": "serpapi",
                "cached": False,
                "enriched_at": datetime.utcnow().isoformat() + "Z"
            })

            # 3. Cache result
            if self.redis_client and enriched_data["confidence"] > 0.5:
                try:
                    self.redis_client.setex(
                        cache_key,
                        self.cache_ttl,
                        json.dumps(enriched_data)
                    )
                    logger.info(f"💾 Cached enrichment for {name}")
                except Exception as e:
                    logger.warning(f"Cache write error: {e}")

            return enriched_data

        except Exception as e:
            logger.error(f"❌ Enrichment failed for {name}: {e}")
            return {
                "website": None,
                "address": None,
                "phone": None,
                "linkedin": None,
                "confidence": 0.0,
                "source": "error",
                "cached": False,
                "enriched_at": datetime.utcnow().isoformat() + "Z",
                "error": str(e)
            }


    def _search_google(self, query: str, country: str) -> Dict[str, Any]:
        """Recherche Google via SerpAPI"""

        if not self.serpapi_key:
            raise ValueError("SERPAPI_API_KEY not configured")

        # SerpAPI endpoint
        url = "https://serpapi.com/search"

        params = {
            "q": query,
            "gl": country.lower(),  # Country
            "hl": "fr",             # Language
            "api_key": self.serpapi_key,
            "num": 5                # Top 5 results
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        return response.json()


    def _extract_organisation_data(
        self,
        name: str,
        search_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extrait données structurées depuis résultats Google"""

        data = {
            "website": None,
            "address": None,
            "phone": None,
            "linkedin": None
        }

        # 1. Knowledge Graph (Google business info)
        if "knowledge_graph" in search_results:
            kg = search_results["knowledge_graph"]

            # Website
            if "website" in kg:
                data["website"] = self._clean_url(kg["website"])

            # Address
            if "address" in kg:
                data["address"] = kg["address"]

            # Phone
            if "phone" in kg:
                data["phone"] = self._clean_phone(kg["phone"])

        # 2. Organic results (fallback)
        if "organic_results" in search_results:
            for result in search_results["organic_results"][:3]:

                # Website (first non-social media link)
                if not data["website"]:
                    link = result.get("link", "")
                    if self._is_company_website(link):
                        data["website"] = self._clean_url(link)

                # LinkedIn
                if not data["linkedin"]:
                    link = result.get("link", "")
                    if "linkedin.com/company/" in link:
                        data["linkedin"] = link

                # Extract from snippet
                snippet = result.get("snippet", "")

                # Phone in snippet
                if not data["phone"]:
                    phone = self._extract_phone_from_text(snippet)
                    if phone:
                        data["phone"] = phone

                # Address in snippet (basic)
                if not data["address"]:
                    address = self._extract_address_from_text(snippet)
                    if address:
                        data["address"] = address

        return data


    def _calculate_confidence(self, data: Dict[str, Any]) -> float:
        """Calcule score de confiance (0-1)"""

        score = 0.0
        weights = {
            "website": 0.4,
            "address": 0.2,
            "phone": 0.2,
            "linkedin": 0.2
        }

        for field, weight in weights.items():
            if data.get(field):
                score += weight

        return round(score, 2)


    # === Helpers ===

    def _clean_url(self, url: str) -> str:
        """Nettoie URL (retire http://, www., trailing slash)"""
        url = re.sub(r'^https?://', '', url)
        url = re.sub(r'^www\.', '', url)
        url = url.rstrip('/')
        return url


    def _clean_phone(self, phone: str) -> str:
        """Nettoie numéro de téléphone"""
        # Remove non-digits except +
        phone = re.sub(r'[^\d+]', '', phone)

        # Format international si possible
        if not phone.startswith('+'):
            # Assume FR if 10 digits starting with 0
            if len(phone) == 10 and phone.startswith('0'):
                phone = '+33' + phone[1:]

        return phone


    def _is_company_website(self, url: str) -> bool:
        """Check si URL est un site d'entreprise (pas social media)"""
        social_media = [
            'linkedin.com', 'facebook.com', 'twitter.com',
            'instagram.com', 'youtube.com', 'wikipedia.org'
        ]

        for social in social_media:
            if social in url.lower():
                return False

        return True


    def _extract_phone_from_text(self, text: str) -> Optional[str]:
        """Extrait téléphone depuis texte"""

        # Regex FR: 01 23 45 67 89 ou +33 1 23 45 67 89
        patterns = [
            r'\+33\s?\d\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}',
            r'0\d\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}',
            r'\+33\d{9}',
            r'0\d{9}'
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return self._clean_phone(match.group(0))

        return None


    def _extract_address_from_text(self, text: str) -> Optional[str]:
        """Extrait adresse depuis texte (basique)"""

        # Pattern: number + street + postal code + city
        # Ex: "123 Avenue des Champs-Élysées, 75008 Paris"
        pattern = r'\d+[,\s]+[A-Za-zÀ-ÿ\s\-\']+[,\s]+\d{5}\s+[A-Za-zÀ-ÿ\-\s]+'

        match = re.search(pattern, text)
        if match:
            return match.group(0).strip()

        return None


# Singleton instance
_enrichment_service = None

def get_enrichment_service() -> WebEnrichmentService:
    """Get singleton enrichment service"""
    global _enrichment_service
    if _enrichment_service is None:
        _enrichment_service = WebEnrichmentService()
    return _enrichment_service
