"""
AI Signature Parsing Routes - Phase 2

POST /ai/parse-signature - Parse email signature with AI
POST /ai/detect-intent - Detect email intent
GET /ai/suggestions - List pending HITL suggestions
POST /ai/suggestions/{id}/approve - Approve suggestion
POST /ai/suggestions/{id}/reject - Reject suggestion
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from models.autofill_suggestion import AutofillSuggestion
from models.email_message import EmailMessage
from models.person import Person
from models.user import User
from services.signature_parser_service import SignatureParserService

logger = logging.getLogger("crm-api")
router = APIRouter(prefix="/ai", tags=["AI"])


# ===== Schemas =====

class ParseSignatureRequest(BaseModel):
    email_body: str
    email_id: Optional[int] = None


class ParseSignatureResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    confidence: Optional[float] = None
    model_used: Optional[str] = None
    processing_time_ms: Optional[int] = None
    error: Optional[str] = None
    from_cache: Optional[bool] = False


# ===== Endpoints =====

@router.post("/parse-signature", response_model=ParseSignatureResponse)
async def parse_signature(
    request: ParseSignatureRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **Phase 2: Parse email signature with AI**

    Cascade fallback: Ollama → Mistral API → OpenAI → Claude

    Returns extracted fields:
    - name, first_name, last_name
    - job_title, company
    - email, phone, mobile, website
    - confidence score (0-1)
    """
    try:
        # Get user context
        user_id = current_user.get("user_id") or current_user.get("sub")
        user = db.query(User).filter(User.id == int(user_id)).first()

        if not user or not user.team_id:
            raise HTTPException(403, "User has no team assigned")

        # Parse with AI
        service = SignatureParserService(db)
        result = await service.parse_signature(
            email_body=request.email_body,
            team_id=user.team_id,
            email_id=request.email_id
        )

        return ParseSignatureResponse(**result)

    except Exception as e:
        logger.error(f"Parse signature error: {e}", exc_info=True)
        raise HTTPException(500, f"Failed to parse signature: {str(e)}")


@router.get("/suggestions")
async def list_suggestions(
    status: str = "pending",
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **List HITL suggestions for validation**

    Query params:
    - status: pending | approved | rejected | auto_applied
    """
    try:
        user_id = current_user.get("user_id") or current_user.get("sub")
        user = db.query(User).filter(User.id == int(user_id)).first()

        if not user or not user.team_id:
            raise HTTPException(403, "User has no team assigned")

        # Get suggestions for team
        suggestions = db.query(AutofillSuggestion).filter(
            AutofillSuggestion.team_id == user.team_id,
            AutofillSuggestion.status == status
        ).order_by(AutofillSuggestion.created_at.desc()).limit(50).all()

        return {
            "success": True,
            "count": len(suggestions),
            "suggestions": [
                {
                    "id": s.id,
                    "person_id": s.person_id,
                    "field_name": s.field_name,
                    "current_value": s.current_value,
                    "suggested_value": s.suggested_value,
                    "confidence": s.confidence_score,
                    "source_model": s.source_model,
                    "created_at": s.created_at.isoformat(),
                    "auto_applied": s.auto_applied
                }
                for s in suggestions
            ]
        }

    except Exception as e:
        logger.error(f"List suggestions error: {e}", exc_info=True)
        raise HTTPException(500, str(e))


@router.post("/suggestions/{suggestion_id}/approve")
async def approve_suggestion(
    suggestion_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **Approve HITL suggestion and apply to Person**
    """
    try:
        user_id = current_user.get("user_id") or current_user.get("sub")
        user = db.query(User).filter(User.id == int(user_id)).first()

        if not user or not user.team_id:
            raise HTTPException(403, "User has no team assigned")

        # Get suggestion
        suggestion = db.query(AutofillSuggestion).filter(
            AutofillSuggestion.id == suggestion_id,
            AutofillSuggestion.team_id == user.team_id
        ).first()

        if not suggestion:
            raise HTTPException(404, "Suggestion not found")

        if suggestion.status != "pending":
            raise HTTPException(400, f"Suggestion already {suggestion.status}")

        # Apply to person
        if suggestion.person_id:
            person = db.query(Person).filter(Person.id == suggestion.person_id).first()

            if person:
                # Update field
                setattr(person, suggestion.field_name, suggestion.suggested_value)
                db.commit()

        # Update suggestion status
        suggestion.status = "approved"
        suggestion.reviewed_by = int(user_id)
        suggestion.reviewed_at = datetime.utcnow()
        db.commit()

        return {
            "success": True,
            "message": f"Suggestion approved and applied to {suggestion.field_name}"
        }

    except Exception as e:
        logger.error(f"Approve suggestion error: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(500, str(e))


@router.post("/suggestions/{suggestion_id}/reject")
async def reject_suggestion(
    suggestion_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **Reject HITL suggestion**
    """
    try:
        user_id = current_user.get("user_id") or current_user.get("sub")
        user = db.query(User).filter(User.id == int(user_id)).first()

        if not user or not user.team_id:
            raise HTTPException(403, "User has no team assigned")

        # Get suggestion
        suggestion = db.query(AutofillSuggestion).filter(
            AutofillSuggestion.id == suggestion_id,
            AutofillSuggestion.team_id == user.team_id
        ).first()

        if not suggestion:
            raise HTTPException(404, "Suggestion not found")

        if suggestion.status != "pending":
            raise HTTPException(400, f"Suggestion already {suggestion.status}")

        # Update status
        suggestion.status = "rejected"
        suggestion.reviewed_by = int(user_id)
        suggestion.reviewed_at = datetime.utcnow()
        db.commit()

        return {
            "success": True,
            "message": "Suggestion rejected"
        }

    except Exception as e:
        logger.error(f"Reject suggestion error: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(500, str(e))
