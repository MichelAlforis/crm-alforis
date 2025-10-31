"""
Routes API HITL v2 - Human-In-The-Loop pour suggestions autofill

Endpoints:
✅ GET  /suggestions       - Liste suggestions avec filtres avancés
✅ POST /bulk-approve      - Validation en masse
✅ POST /bulk-reject       - Rejet en masse
✅ POST /{id}/enrich       - Enrichissement manuel web
✅ GET  /{id}/audit-trail  - Historique décisions (RGPD)
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from models.autofill_decision_log import AutofillDecisionLog
from models.autofill_suggestion import AutofillSuggestion
from models.email_blacklist import EmailBlacklist
from models.email_message import EmailMessage
from models.user import User

logger = logging.getLogger("crm-api")

router = APIRouter(prefix="/autofill-hitl", tags=["autofill-hitl"])


# ========== SCHEMAS ==========

class SuggestionFilter(BaseModel):
    """Filtres avancés pour HITL v2"""
    status: Optional[str] = None  # pending, approved, rejected, applied
    web_enriched: Optional[bool] = None
    min_confidence: Optional[float] = None
    max_confidence: Optional[float] = None
    enrichment_source: Optional[str] = None  # serpapi, brave, custom
    field_changed: Optional[str] = None  # email, phone, website, etc.
    limit: int = 50
    offset: int = 0


class SuggestionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)

    id: int
    source_email_id: Optional[int]
    target_type: str  # contact, organisation
    target_id: Optional[int]
    suggested_data: dict
    confidence_score: float
    model_used: Optional[str]
    status: str
    web_enriched: bool
    enrichment_confidence: Optional[float]
    enrichment_source: Optional[str]
    enriched_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]


class BulkActionRequest(BaseModel):
    suggestion_ids: List[int]


class BulkActionResponse(BaseModel):
    success: int
    failed: int
    errors: List[dict]


class EnrichManualRequest(BaseModel):
    company_name: str
    country: str = "FR"
    force_refresh: bool = False


class EnrichManualResponse(BaseModel):
    success: bool
    enrichment_data: Optional[dict]
    confidence: Optional[float]
    cached: bool


class AuditTrailEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_email: Optional[str]
    action: str
    previous_data: Optional[dict]
    new_data: Optional[dict]
    ip_address: Optional[str]
    created_at: datetime


class AuditTrailResponse(BaseModel):
    suggestion_id: int
    entries: List[AuditTrailEntry]


# ========== ENDPOINTS ==========

@router.get("/suggestions", response_model=List[SuggestionResponse])
async def list_suggestions(
    status: Optional[str] = Query(None, description="Filter by status"),
    web_enriched: Optional[bool] = Query(None, description="Filter by web enrichment"),
    min_confidence: Optional[float] = Query(None, ge=0, le=1),
    max_confidence: Optional[float] = Query(None, ge=0, le=1),
    enrichment_source: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Liste les suggestions autofill avec filtres avancés (HITL v2)

    Filtres disponibles:
    - status: pending, approved, rejected, applied
    - web_enriched: true/false
    - min_confidence/max_confidence: 0-1
    - enrichment_source: serpapi, brave, custom
    """

    team_id = current_user.get("team_id")
    if not team_id:
        raise HTTPException(status_code=400, detail="No team_id in token")

    # Build query
    query = db.query(AutofillSuggestion).filter(
        AutofillSuggestion.team_id == team_id
    )

    # Apply filters
    if status:
        query = query.filter(AutofillSuggestion.status == status)

    if web_enriched is not None:
        query = query.filter(AutofillSuggestion.web_enriched == web_enriched)

    if min_confidence is not None:
        query = query.filter(AutofillSuggestion.confidence_score >= min_confidence)

    if max_confidence is not None:
        query = query.filter(AutofillSuggestion.confidence_score <= max_confidence)

    if enrichment_source:
        query = query.filter(AutofillSuggestion.enrichment_source == enrichment_source)

    # Order by created_at desc
    query = query.order_by(AutofillSuggestion.created_at.desc())

    # Pagination
    query = query.limit(limit).offset(offset)

    suggestions = query.all()

    return suggestions


@router.post("/bulk-approve", response_model=BulkActionResponse)
async def bulk_approve_suggestions(
    request: BulkActionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Validation en masse de suggestions (HITL v2)

    Met à jour le status à 'approved' et crée des logs de décision.
    """

    team_id = current_user.get("team_id")
    user_id = current_user.get("user_id")

    success_count = 0
    failed_count = 0
    errors = []

    for suggestion_id in request.suggestion_ids:
        try:
            suggestion = db.query(AutofillSuggestion).filter(
                AutofillSuggestion.id == suggestion_id,
                AutofillSuggestion.team_id == team_id
            ).first()

            if not suggestion:
                errors.append({
                    "suggestion_id": suggestion_id,
                    "error": "Suggestion not found or access denied"
                })
                failed_count += 1
                continue

            # Update status
            previous_status = suggestion.status
            suggestion.status = "approved"
            suggestion.updated_at = datetime.now(timezone.utc)

            # Log decision (RGPD)
            decision_log = AutofillDecisionLog(
                suggestion_id=suggestion_id,
                user_id=user_id,
                action="approved",
                previous_data={"status": previous_status},
                new_data={"status": "approved"},
                created_at=datetime.now(timezone.utc)
            )
            db.add(decision_log)

            success_count += 1

        except Exception as e:
            logger.error(f"Failed to approve suggestion {suggestion_id}: {e}")
            errors.append({
                "suggestion_id": suggestion_id,
                "error": str(e)
            })
            failed_count += 1

    db.commit()

    logger.info(f"Bulk approve: {success_count} success, {failed_count} failed")

    return BulkActionResponse(
        success=success_count,
        failed=failed_count,
        errors=errors
    )


@router.post("/bulk-reject", response_model=BulkActionResponse)
async def bulk_reject_suggestions(
    request: BulkActionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Rejet en masse de suggestions (HITL v2)

    Met à jour le status à 'rejected' et crée des logs de décision.
    """

    team_id = current_user.get("team_id")
    user_id = current_user.get("user_id")

    success_count = 0
    failed_count = 0
    errors = []

    for suggestion_id in request.suggestion_ids:
        try:
            suggestion = db.query(AutofillSuggestion).filter(
                AutofillSuggestion.id == suggestion_id,
                AutofillSuggestion.team_id == team_id
            ).first()

            if not suggestion:
                errors.append({
                    "suggestion_id": suggestion_id,
                    "error": "Suggestion not found or access denied"
                })
                failed_count += 1
                continue

            # Update status
            previous_status = suggestion.status
            suggestion.status = "rejected"
            suggestion.updated_at = datetime.now(timezone.utc)

            # Log decision (RGPD)
            decision_log = AutofillDecisionLog(
                suggestion_id=suggestion_id,
                user_id=user_id,
                action="rejected",
                previous_data={"status": previous_status},
                new_data={"status": "rejected"},
                created_at=datetime.now(timezone.utc)
            )
            db.add(decision_log)

            success_count += 1

        except Exception as e:
            logger.error(f"Failed to reject suggestion {suggestion_id}: {e}")
            errors.append({
                "suggestion_id": suggestion_id,
                "error": str(e)
            })
            failed_count += 1

    db.commit()

    logger.info(f"Bulk reject: {success_count} success, {failed_count} failed")

    return BulkActionResponse(
        success=success_count,
        failed=failed_count,
        errors=errors
    )


@router.post("/{suggestion_id}/enrich", response_model=EnrichManualResponse)
async def enrich_suggestion_manually(
    suggestion_id: int,
    request: EnrichManualRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Enrichissement manuel via web search (HITL v2)

    Permet de lancer manuellement l'enrichissement web pour une suggestion.
    Utile si l'auto-enrichment a échoué ou pour forcer un refresh.
    """

    team_id = current_user.get("team_id")
    user_id = current_user.get("user_id")

    # Check suggestion exists
    suggestion = db.query(AutofillSuggestion).filter(
        AutofillSuggestion.id == suggestion_id,
        AutofillSuggestion.team_id == team_id
    ).first()

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    # Call enrichment service
    try:
        from services.web_enrichment_service import get_enrichment_service

        enrichment_service = get_enrichment_service()
        result = enrichment_service.enrich_organisation(
            name=request.company_name,
            country=request.country,
            force_refresh=request.force_refresh
        )

        if not result or result.get("confidence", 0) < 0.3:
            return EnrichManualResponse(
                success=False,
                enrichment_data=None,
                confidence=result.get("confidence", 0) if result else 0,
                cached=False
            )

        # Update suggestion with enrichment data
        previous_data = suggestion.suggested_data.copy()

        # Merge enriched data
        if result.get("website"):
            suggestion.suggested_data["website"] = result["website"]
        if result.get("address"):
            suggestion.suggested_data["address"] = result["address"]
        if result.get("phone"):
            suggestion.suggested_data["phone"] = result["phone"]
        if result.get("linkedin"):
            suggestion.suggested_data["linkedin"] = result["linkedin"]

        suggestion.web_enriched = True
        suggestion.enrichment_confidence = result.get("confidence")
        suggestion.enrichment_source = result.get("source", "serpapi")
        suggestion.enriched_at = datetime.now(timezone.utc)
        suggestion.updated_at = datetime.now(timezone.utc)

        # Log manual enrichment action
        decision_log = AutofillDecisionLog(
            suggestion_id=suggestion_id,
            user_id=user_id,
            action="enriched_manually",
            previous_data=previous_data,
            new_data=suggestion.suggested_data,
            created_at=datetime.now(timezone.utc)
        )
        db.add(decision_log)

        db.commit()

        logger.info(f"Manual enrichment for suggestion {suggestion_id}: confidence={result.get('confidence'):.2f}")

        return EnrichManualResponse(
            success=True,
            enrichment_data=result,
            confidence=result.get("confidence"),
            cached=result.get("cached", False)
        )

    except Exception as e:
        logger.error(f"Manual enrichment failed for suggestion {suggestion_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Enrichment failed: {str(e)}")


@router.get("/{suggestion_id}/audit-trail", response_model=AuditTrailResponse)
async def get_audit_trail(
    suggestion_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Historique des décisions pour une suggestion (RGPD compliance)

    Retourne tous les logs d'actions (viewed, approved, rejected, enriched)
    avec timestamps, utilisateurs, et données avant/après.
    """

    team_id = current_user.get("team_id")

    # Check suggestion exists and belongs to team
    suggestion = db.query(AutofillSuggestion).filter(
        AutofillSuggestion.id == suggestion_id,
        AutofillSuggestion.team_id == team_id
    ).first()

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    # Get all decision logs
    logs = db.query(AutofillDecisionLog).filter(
        AutofillDecisionLog.suggestion_id == suggestion_id
    ).order_by(AutofillDecisionLog.created_at.asc()).all()

    # Enrich with user emails
    entries = []
    for log in logs:
        user_email = None
        if log.user_id:
            user = db.query(User).filter(User.id == log.user_id).first()
            if user:
                user_email = user.email

        entries.append(AuditTrailEntry(
            id=log.id,
            user_email=user_email,
            action=log.action,
            previous_data=log.previous_data,
            new_data=log.new_data,
            ip_address=log.ip_address,
            created_at=log.created_at
        ))

    return AuditTrailResponse(
        suggestion_id=suggestion_id,
        entries=entries
    )


# ========== BLACKLIST ==========

class BlacklistSenderRequest(BaseModel):
    """Request pour blacklister un expéditeur"""
    email: str  # Email exact ou pattern
    pattern_type: str = "email"  # "email", "domain", "wildcard"
    reason: Optional[str] = None
    delete_existing_suggestions: bool = True  # Supprimer les suggestions existantes


class BlacklistSenderResponse(BaseModel):
    """Response après blacklist"""
    success: bool
    pattern: str
    pattern_type: str
    suggestions_deleted: int


@router.post("/blacklist-sender", response_model=BlacklistSenderResponse)
async def blacklist_sender(
    request: BlacklistSenderRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    🚫 Blacklister un expéditeur pour ne plus créer de suggestions

    Permet de bloquer automatiquement:
    - Email exact: "noreply@microsoft.com"
    - Domaine complet: "@mailchimp.com"
    - Wildcard: "noreply@*"

    Options:
    - delete_existing_suggestions: Supprimer les suggestions existantes de cet expéditeur (défaut: true)
    """
    team_id = current_user.get("team_id")
    user_id = current_user.get("user_id")

    if not team_id:
        raise HTTPException(status_code=400, detail="No team_id in token")

    # Validate pattern_type
    if request.pattern_type not in ["email", "domain", "wildcard"]:
        raise HTTPException(status_code=400, detail="Invalid pattern_type. Must be: email, domain, or wildcard")

    # Normalize pattern
    pattern = request.email.strip().lower()

    # For domain pattern, ensure it starts with @
    if request.pattern_type == "domain" and not pattern.startswith('@'):
        pattern = '@' + pattern

    try:
        # Check if already blacklisted
        existing = db.query(EmailBlacklist).filter(
            EmailBlacklist.team_id == team_id,
            EmailBlacklist.pattern == pattern
        ).first()

        if existing:
            logger.info(f"Pattern already blacklisted: {pattern}")
        else:
            # Add to blacklist
            blacklist_entry = EmailBlacklist(
                team_id=team_id,
                pattern=pattern,
                pattern_type=request.pattern_type,
                reason=request.reason,
                created_by=user_id,
                created_at=datetime.now(timezone.utc)
            )
            db.add(blacklist_entry)
            logger.info(f"✅ Blacklisted {request.pattern_type}: {pattern}")

        # Optionally delete existing suggestions from this sender
        suggestions_deleted = 0
        if request.delete_existing_suggestions:
            # Find all emails matching this pattern
            matching_emails = []

            if request.pattern_type == "email":
                matching_emails = db.query(EmailMessage.id).filter(
                    EmailMessage.sender_email.ilike(pattern)
                ).all()
            elif request.pattern_type == "domain":
                matching_emails = db.query(EmailMessage.id).filter(
                    EmailMessage.sender_email.ilike(f"%{pattern}")
                ).all()
            elif request.pattern_type == "wildcard":
                pattern_prefix = pattern.replace('*', '')
                matching_emails = db.query(EmailMessage.id).filter(
                    EmailMessage.sender_email.ilike(f"{pattern_prefix}%")
                ).all()

            email_ids = [e.id for e in matching_emails]

            if email_ids:
                # Delete suggestions from these emails
                deleted = db.query(AutofillSuggestion).filter(
                    AutofillSuggestion.team_id == team_id,
                    AutofillSuggestion.email_id.in_(email_ids)
                ).delete(synchronize_session=False)

                suggestions_deleted = deleted
                logger.info(f"🗑️  Deleted {suggestions_deleted} suggestions from blacklisted sender")

        db.commit()

        return BlacklistSenderResponse(
            success=True,
            pattern=pattern,
            pattern_type=request.pattern_type,
            suggestions_deleted=suggestions_deleted
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to blacklist sender: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to blacklist: {str(e)}")
