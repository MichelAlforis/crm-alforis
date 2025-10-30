"""
AI routes for Phase 2 - Semantic Parsing
Includes: signatures, command suggestions
"""

from fastapi import APIRouter
from .signatures import router as signatures_router
from .command_suggest import router as command_suggest_router

router = APIRouter()
router.include_router(signatures_router)
router.include_router(command_suggest_router)
