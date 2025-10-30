"""
Enrichment API Routes - ACTE V
Endpoints pour enrichissement web automatique

Routes:
- POST /api/v1/enrichment/organisation - Enrichir une organisation
- GET  /api/v1/enrichment/cache-stats   - Statistiques cache

Author: Claude AI
Created: 2025-10-30
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
import logging

from services.web_enrichment_service import get_enrichment_service
from core import get_current_user
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/enrichment", tags=["enrichment"])


# === Schemas ===

class EnrichOrganisationRequest(BaseModel):
    """Request pour enrichir une organisation"""
    name: str = Field(..., min_length=2, max_length=255, description="Nom de l'organisation")
    country: str = Field(default="FR", min_length=2, max_length=2, description="Code pays ISO (ex: FR, US)")
    force_refresh: bool = Field(default=False, description="Bypass cache et re-fetch")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Alforis Finance",
                "country": "FR",
                "force_refresh": False
            }
        }


class EnrichOrganisationResponse(BaseModel):
    """Response enrichissement organisation"""
    website: Optional[str] = Field(None, description="Site web (sans http://)")
    address: Optional[str] = Field(None, description="Adresse complète")
    phone: Optional[str] = Field(None, description="Téléphone au format international")
    linkedin: Optional[str] = Field(None, description="URL LinkedIn entreprise")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Score de confiance (0-1)")
    source: str = Field(..., description="Source des données (serpapi, cache, error)")
    cached: bool = Field(..., description="Données depuis cache?")
    enriched_at: str = Field(..., description="Timestamp ISO8601")
    error: Optional[str] = Field(None, description="Message d'erreur si échec")

    class Config:
        json_schema_extra = {
            "example": {
                "website": "alforis.com",
                "address": "123 Avenue des Champs-Élysées, 75008 Paris",
                "phone": "+33123456789",
                "linkedin": "linkedin.com/company/alforis",
                "confidence": 0.85,
                "source": "serpapi",
                "cached": False,
                "enriched_at": "2025-10-30T18:30:00Z",
                "error": None
            }
        }


class CacheStatsResponse(BaseModel):
    """Statistiques cache enrichment"""
    total_keys: int
    hit_rate: float
    size_mb: float


# === Routes ===

@router.post("/organisation", response_model=EnrichOrganisationResponse)
async def enrich_organisation(
    request: EnrichOrganisationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    🔍 Enrichit une organisation via recherche web

    Extrait automatiquement:
    - Site web
    - Adresse
    - Téléphone
    - LinkedIn

    **Limitations:**
    - SerpAPI: 100 req/mois gratuit
    - Cache: 7 jours
    - Rate limit: 10 req/min par user

    **Exemple:**
    ```bash
    curl -X POST "/api/v1/enrichment/organisation" \\
      -H "Authorization: Bearer $TOKEN" \\
      -d '{"name": "Alforis Finance", "country": "FR"}'
    ```
    """

    try:
        logger.info(f"🔍 Enriching '{request.name}' (country={request.country}, force={request.force_refresh})")

        service = get_enrichment_service()

        result = service.enrich_organisation(
            name=request.name,
            country=request.country,
            force_refresh=request.force_refresh
        )

        # Log success
        if result.get("confidence", 0) > 0.5:
            logger.info(f"✅ Enrichment success for '{request.name}' (confidence={result['confidence']})")
        else:
            logger.warning(f"⚠️ Low confidence enrichment for '{request.name}' (confidence={result['confidence']})")

        return EnrichOrganisationResponse(**result)

    except ValueError as e:
        # Configuration error (missing API key)
        logger.error(f"❌ Configuration error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Service configuration error: {str(e)}"
        )

    except requests.exceptions.RequestException as e:
        # Network/API error
        logger.error(f"❌ API request failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="External API unavailable. Please try again later."
        )

    except Exception as e:
        # Unexpected error
        logger.exception(f"❌ Unexpected error enriching '{request.name}'")
        raise HTTPException(
            status_code=500,
            detail=f"Enrichment failed: {str(e)}"
        )


@router.get("/cache-stats", response_model=CacheStatsResponse)
async def get_cache_stats(
    current_user: User = Depends(get_current_user)
):
    """
    📊 Statistiques cache enrichment

    Retourne:
    - Nombre de clés en cache
    - Hit rate (%)
    - Taille cache (MB)
    """

    try:
        service = get_enrichment_service()

        if not service.redis_client:
            return CacheStatsResponse(
                total_keys=0,
                hit_rate=0.0,
                size_mb=0.0
            )

        # Count keys
        pattern = "enrichment:org:*"
        keys = service.redis_client.keys(pattern)
        total_keys = len(keys)

        # Calculate hit rate (from Redis INFO stats)
        info = service.redis_client.info("stats")
        hits = info.get("keyspace_hits", 0)
        misses = info.get("keyspace_misses", 0)
        total = hits + misses

        hit_rate = (hits / total * 100) if total > 0 else 0.0

        # Estimate size
        size_bytes = sum(
            len(service.redis_client.get(key) or "")
            for key in keys
        )
        size_mb = size_bytes / (1024 * 1024)

        return CacheStatsResponse(
            total_keys=total_keys,
            hit_rate=round(hit_rate, 2),
            size_mb=round(size_mb, 2)
        )

    except Exception as e:
        logger.error(f"❌ Error fetching cache stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch cache stats: {str(e)}"
        )


# Import requests for type hint
import requests
