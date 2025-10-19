"""
⚠️  DEPRECATED: Legacy KPIs routes
🔄 MIGRATION COMPLETE (Phase 5)

These endpoints have been migrated to:
- GET  /api/v1/dashboards/stats/organisation/{id}/kpis
- POST /api/v1/dashboards/stats/organisation/{id}/kpis
- PUT  /api/v1/dashboards/stats/kpis/{kpi_id}
- DELETE /api/v1/dashboards/stats/kpis/{kpi_id}

All KPI data is now stored in the organisation_kpis table.
See: /crm-backend/api/routes/dashboards.py (stats endpoints)
"""

from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/kpis", tags=["kpis"])

@router.get("")
async def list_kpis():
    """❌ DEPRECATED - Use GET /dashboards/stats/organisation/{id}/kpis instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use GET /dashboards/stats/organisation/{id}/kpis instead."
    )

@router.get("/search")
async def search_kpis():
    """❌ DEPRECATED - Use GET /dashboards/stats/organisation/{id}/kpis instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use GET /dashboards/stats/organisation/{id}/kpis instead."
    )

@router.get("/{kpi_id}")
async def get_kpi():
    """❌ DEPRECATED - Use GET /dashboards/stats/kpis/{kpi_id} instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use GET /dashboards/stats/kpis/{kpi_id} instead."
    )

@router.post("")
async def create_kpi():
    """❌ DEPRECATED - Use POST /dashboards/stats/organisation/{id}/kpis instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use POST /dashboards/stats/organisation/{id}/kpis instead."
    )

@router.put("/{kpi_id}")
async def update_kpi():
    """❌ DEPRECATED - Use PUT /dashboards/stats/kpis/{kpi_id} instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use PUT /dashboards/stats/kpis/{kpi_id} instead."
    )

@router.delete("/{kpi_id}")
async def delete_kpi():
    """❌ DEPRECATED - Use DELETE /dashboards/stats/kpis/{kpi_id} instead"""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint has been deprecated. Use DELETE /dashboards/stats/kpis/{kpi_id} instead."
    )