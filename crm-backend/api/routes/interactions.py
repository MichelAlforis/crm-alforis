"""
⚠️  DEPRECATED: Legacy Interactions routes
🔄 MIGRATION COMPLETE (Phase 5)

These endpoints have been migrated to:
- GET /api/v1/organisations/{id}/activity  → Use for listing activities/interactions
- GET /api/v1/dashboards/stats/*           → Use for KPI and metrics data

Interactions are now auto-tracked as OrganisationActivity events.
See: /crm-backend/api/routes/organisations.py (activity endpoint)
"""

from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/interactions", tags=["interactions"])

@router.get("")
async def list_interactions():
    """❌ DEPRECATED - Use GET /organisations/{id}/activity instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use GET /organisations/{id}/activity instead."
    )

@router.get("/search")
async def search_interactions():
    """❌ DEPRECATED - Use GET /organisations/{id}/activity instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use GET /organisations/{id}/activity instead."
    )

@router.get("/{interaction_id}")
async def get_interaction():
    """❌ DEPRECATED - Interactions are auto-tracked as activities"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Interactions are now auto-tracked."
    )

@router.post("")
async def create_interaction():
    """❌ DEPRECATED - Interactions are created automatically"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Interactions are created automatically by the system."
    )

@router.put("/{interaction_id}")
async def update_interaction():
    """❌ DEPRECATED - Interactions are read-only"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Interactions are read-only."
    )

@router.delete("/{interaction_id}")
async def delete_interaction():
    """❌ DEPRECATED - Interactions cannot be deleted"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Interactions cannot be deleted."
    )