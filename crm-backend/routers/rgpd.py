"""
RGPD API - Data Export & Deletion Endpoints

Compliant with:
- RGPD Article 15 (Right of access)
- RGPD Article 17 (Right to erasure)
- RGPD Article 20 (Right to data portability)
- CNIL Guidelines
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.database import get_db
from models.data_access_log import DataAccessLog
from models.user import User
from services.rgpd_service import RGPDService

router = APIRouter(prefix="/rgpd", tags=["rgpd"])


# ============================================================================
# Pydantic Models
# ============================================================================


class ExportRequest(BaseModel):
    """Request model for data export"""

    include_access_logs: bool = Field(
        default=False, description="Include access logs in export (admin only)"
    )


class ExportResponse(BaseModel):
    """Response model for data export"""

    export_date: str
    user_id: int
    data: Dict[str, Any]


class DeleteRequest(BaseModel):
    """Request model for data deletion/anonymization"""

    reason: str = Field(..., description="Reason for deletion request", min_length=10, max_length=500)
    confirm: bool = Field(..., description="Confirmation flag (must be true)")


class DeleteResponse(BaseModel):
    """Response model for data deletion"""

    success: bool
    message: str
    anonymized_records: Dict[str, int]


class AccessLogResponse(BaseModel):
    """Response model for access logs"""

    id: int
    entity_type: str
    entity_id: int
    access_type: str
    endpoint: Optional[str]
    purpose: Optional[str]
    user_id: Optional[int]
    ip_address: Optional[str]
    accessed_at: str


class AccessLogsListResponse(BaseModel):
    """Response model for access logs list"""

    total: int
    logs: List[AccessLogResponse]


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/export", response_model=ExportResponse, summary="Export my personal data (RGPD)")
async def export_my_data(
    request: Request,
    include_access_logs: bool = Query(False, description="Include access logs (admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export all personal data for the current user.

    Compliant with RGPD Article 15 (Right of access) and Article 20 (Data portability).

    Returns a comprehensive JSON export including:
    - User profile
    - People/Contacts created or assigned
    - Organisations created or owned
    - Interactions
    - Tasks
    - Email messages
    - Access logs (if admin)

    **RGPD Compliance**: This endpoint automatically logs the export request
    in the data_access_logs table.
    """
    try:
        service = RGPDService(db)

        # Only admins can include access logs
        if include_access_logs and not current_user.is_admin:
            include_access_logs = False

        data = service.export_user_data(
            user_id=current_user.id, include_access_logs=include_access_logs
        )

        # Log the export action
        log_entry = DataAccessLog(
            entity_type="user",
            entity_id=current_user.id,
            access_type="export",
            endpoint=request.url.path,
            purpose="Export RGPD - User request",
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent", "")[:500],
            accessed_at=datetime.utcnow(),
        )
        db.add(log_entry)
        db.commit()

        return ExportResponse(
            export_date=data["export_date"], user_id=current_user.id, data=data
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.delete("/delete", response_model=DeleteResponse, summary="Delete my personal data (RGPD)")
async def delete_my_data(
    request: Request,
    delete_request: DeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete/Anonymize all personal data for the current user.

    Compliant with RGPD Article 17 (Right to erasure / Right to be forgotten).

    **WARNING**: This action is IRREVERSIBLE and will:
    - Anonymize your user profile
    - Anonymize all contacts you created
    - Anonymize all organisations you own
    - Anonymize all interactions
    - Anonymize all email messages
    - Disable your account

    **RGPD Compliance**: This endpoint automatically logs the deletion request
    in the data_access_logs table before anonymization.

    **Note**: Statistical and aggregated data may be retained for legal compliance.
    """
    if not delete_request.confirm:
        raise HTTPException(
            status_code=400,
            detail="Deletion not confirmed. Set 'confirm' to true to proceed.",
        )

    try:
        service = RGPDService(db)

        # Log the deletion request BEFORE anonymization
        log_entry = DataAccessLog(
            entity_type="user",
            entity_id=current_user.id,
            access_type="delete",
            endpoint=request.url.path,
            purpose=f"Deletion request: {delete_request.reason}",
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent", "")[:500],
            accessed_at=datetime.utcnow(),
        )
        db.add(log_entry)
        db.commit()

        # Perform anonymization
        counts = service.anonymize_user_data(
            user_id=current_user.id, reason=delete_request.reason
        )

        return DeleteResponse(
            success=True,
            message="Your personal data has been successfully anonymized.",
            anonymized_records=counts,
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")


@router.get(
    "/access-logs",
    response_model=AccessLogsListResponse,
    summary="View access logs (Admin only)",
)
async def get_access_logs(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    entity_id: Optional[int] = Query(None, description="Filter by entity ID"),
    access_type: Optional[str] = Query(None, description="Filter by access type"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve access logs for compliance audits.

    **Admin only endpoint** for viewing data access history.

    Compliant with CNIL requirements for data access traceability.

    Query parameters allow filtering by:
    - user_id: Who accessed the data
    - entity_type: Type of entity (person, organisation, user, etc.)
    - entity_id: Specific entity ID
    - access_type: Type of access (read, export, delete, anonymize)
    """
    # Only admins can view access logs
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        service = RGPDService(db)
        logs = service.get_access_logs(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            access_type=access_type,
            limit=limit,
        )

        return AccessLogsListResponse(total=len(logs), logs=logs)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve logs: {str(e)}")


@router.get("/my-access-logs", response_model=AccessLogsListResponse, summary="View my access logs")
async def get_my_access_logs(
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    View your own access logs.

    Allows users to see when and how their personal data has been accessed.

    Compliant with RGPD transparency requirements.
    """
    try:
        service = RGPDService(db)
        logs = service.get_access_logs(user_id=current_user.id, limit=limit)

        return AccessLogsListResponse(total=len(logs), logs=logs)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve logs: {str(e)}")
