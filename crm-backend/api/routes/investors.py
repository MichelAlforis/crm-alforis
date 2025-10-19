"""
⚠️  DEPRECATED: Legacy Investors routes
🔄 MIGRATION COMPLETE (Phase 5)

These endpoints have been migrated to:
- GET  /api/v1/organisations           → Use for listing
- GET  /api/v1/organisations/{id}      → Use for details
- POST /api/v1/organisations           → Use for creation
- PUT  /api/v1/organisations/{id}      → Use for updates
- DELETE /api/v1/organisations/{id}    → Use for deletion

All investor data is now stored in the organisations table.
See: /crm-backend/api/routes/organisations.py
"""

from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/investors", tags=["investors"])

@router.get("")
async def list_investors():
    """❌ DEPRECATED - Use GET /organisations instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use GET /organisations instead."
    )

@router.get("/search")
async def search_investors():
    """❌ DEPRECATED - Use GET /search/autocomplete instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use GET /search/autocomplete instead."
    )

@router.get("/stats")
async def get_investor_stats():
    """❌ DEPRECATED - Use GET /dashboards/stats/global instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use GET /dashboards/stats/global instead."
    )

@router.get("/{investor_id}")
async def get_investor():
    """❌ DEPRECATED - Use GET /organisations/{id} instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use GET /organisations/{id} instead."
    )

@router.post("")
async def create_investor():
    """❌ DEPRECATED - Use POST /organisations instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use POST /organisations instead."
    )

@router.put("/{investor_id}")
async def update_investor():
    """❌ DEPRECATED - Use PUT /organisations/{id} instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use PUT /organisations/{id} instead."
    )

@router.delete("/{investor_id}")
async def delete_investor():
    """❌ DEPRECATED - Use DELETE /organisations/{id} instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use DELETE /organisations/{id} instead."
    )