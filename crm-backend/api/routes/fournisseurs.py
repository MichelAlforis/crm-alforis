"""
⚠️  DEPRECATED: Legacy Fournisseurs routes
🔄 MIGRATION COMPLETE (Phase 5)

These endpoints have been migrated to:
- GET  /api/v1/organisations           → Use for listing
- GET  /api/v1/organisations/{id}      → Use for details
- POST /api/v1/organisations           → Use for creation
- PUT  /api/v1/organisations/{id}      → Use for updates
- DELETE /api/v1/organisations/{id}    → Use for deletion

All fournisseur data is now stored in the organisations table.
See: /crm-backend/api/routes/organisations.py
"""

from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/fournisseurs", tags=["fournisseurs"])

@router.get("")
async def list_fournisseurs():
    """❌ DEPRECATED - Use GET /organisations instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use GET /organisations instead."
    )

@router.get("/search")
async def search_fournisseurs():
    """❌ DEPRECATED - Use GET /search/autocomplete instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use GET /search/autocomplete instead."
    )

@router.get("/{fournisseur_id}")
async def get_fournisseur():
    """❌ DEPRECATED - Use GET /organisations/{id} instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use GET /organisations/{id} instead."
    )

@router.post("")
async def create_fournisseur():
    """❌ DEPRECATED - Use POST /organisations instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use POST /organisations instead."
    )

@router.put("/{fournisseur_id}")
async def update_fournisseur():
    """❌ DEPRECATED - Use PUT /organisations/{id} instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use PUT /organisations/{id} instead."
    )

@router.delete("/{fournisseur_id}")
async def delete_fournisseur():
    """❌ DEPRECATED - Use DELETE /organisations/{id} instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use DELETE /organisations/{id} instead."
    )