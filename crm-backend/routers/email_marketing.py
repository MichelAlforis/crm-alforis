"""
Router API pour Email Marketing & Lead Scoring

Endpoints:
- POST /marketing/email/ingest : Webhook pour tracking emails (Resend, etc.)
- GET /marketing/leads-hot : Top N leads par score DESC

Business Logic:
- Ingest: upsert EmailSend, create Interaction si first open, update LeadScore
- Scoring: opened (+3 first, +1 after), clicked (+8 first, +2 after), bounced (-10)

Security:
- Webhook signature verification (HMAC SHA-256)
- Timestamp validation (reject events > 5min old)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
import os

from core import get_db, get_current_user
from core.webhook_security import verify_webhook_signature, validate_webhook_timestamp
from models.email_marketing import EmailSend, EmailStatus, LeadScore
from models.interaction import Interaction, InteractionType, InteractionStatus
from models.person import Person
from schemas.email_marketing import (
    EmailIngestPayload,
    EmailSendOut,
    LeadScoreOut,
    HotLeadsResponse,
)

router = APIRouter(prefix="/marketing", tags=["email-marketing"])


# ===== Lead Scoring Service =====

def calculate_score_delta(email_send: EmailSend, event: str) -> int:
    """
    Calcule le delta de score selon l'événement.

    Règles:
    - opened: +3 si premier open (open_count=0), +1 sinon
    - clicked: +8 si premier clic (click_count=0), +2 sinon
    - bounced: -10 (minimum 0 au total)
    """
    if event == "opened":
        return 3 if email_send.open_count == 0 else 1
    elif event == "clicked":
        return 8 if email_send.click_count == 0 else 2
    elif event == "bounced":
        return -10
    else:  # sent
        return 0


def update_lead_score(db: Session, person_id: int, delta: int, event_at: datetime):
    """
    Met à jour le LeadScore pour une personne.

    Upsert: crée si n'existe pas, sinon update.
    Score minimum: 0 (ne peut pas être négatif).
    """
    lead_score = db.query(LeadScore).filter(LeadScore.person_id == person_id).first()

    if not lead_score:
        # Create new
        lead_score = LeadScore(
            person_id=person_id,
            score=max(0, delta),  # Min 0
            last_event_at=event_at,
        )
        db.add(lead_score)
    else:
        # Update existing
        lead_score.score = max(0, lead_score.score + delta)  # Min 0
        lead_score.last_event_at = event_at
        lead_score.updated_at = datetime.utcnow()

    return lead_score


def create_interaction_from_email(
    db: Session,
    email_send: EmailSend,
    user_id: int = 1  # Default system user
) -> Interaction:
    """
    Crée une Interaction automatique lors du premier open d'un email.

    Type: 'email'
    Title: subject ou "Email marketing"
    Status: 'done' (déjà envoyé et ouvert)
    """
    interaction = Interaction(
        org_id=email_send.organisation_id,
        person_id=email_send.person_id,
        type=InteractionType.EMAIL,
        title=email_send.subject or "Email marketing",
        description=f"Email envoyé via {email_send.provider} (ID: {email_send.external_id})",
        status=InteractionStatus.DONE,
        created_by=user_id,
        attachments=[],
        external_participants=[],
    )
    db.add(interaction)
    db.flush()  # Get ID

    # Link EmailSend to Interaction
    email_send.interaction_id = interaction.id

    return interaction


# ===== Endpoints =====

@router.post("/email/ingest", response_model=EmailSendOut, status_code=status.HTTP_200_OK)
async def ingest_email_event(
    payload: EmailIngestPayload,
    x_signature: Optional[str] = Header(None, description="HMAC signature (provider-specific format)"),
    x_timestamp: Optional[str] = Header(None, description="Event timestamp (ISO 8601 or Unix)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    POST /marketing/email/ingest - Webhook pour tracking emails

    Security:
    - Requires JWT auth (via current_user)
    - Validates HMAC signature (X-Signature header)
    - Validates timestamp (X-Timestamp header, max 5min old)

    Logic:
    1. Upsert EmailSend via (provider, external_id)
    2. Update status, compteurs, timestamps
    3. Si premier open ET interaction_id NULL => créer Interaction
    4. Update LeadScore (si person_id existe)

    Returns: EmailSendOut
    """
    # Security: Validate webhook signature
    webhook_secret = os.getenv("WEBHOOK_SECRET")
    if webhook_secret and x_signature:
        # Verify HMAC signature
        payload_dict = payload.dict()
        if not verify_webhook_signature(payload_dict, x_signature, webhook_secret):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid webhook signature"
            )
    elif webhook_secret:
        # Secret configured but signature missing
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-Signature header"
        )

    # Security: Validate timestamp (reject old events)
    if x_timestamp:
        validate_webhook_timestamp(x_timestamp, max_age_seconds=300)  # 5 min
    # 1. Upsert EmailSend
    email_send = db.query(EmailSend).filter(
        EmailSend.provider == payload.provider,
        EmailSend.external_id == payload.external_id,
    ).first()

    if not email_send:
        # Create new
        email_send = EmailSend(
            organisation_id=payload.organisation_id,
            person_id=payload.person_id,
            provider=payload.provider,
            external_id=payload.external_id,
            subject=payload.subject,
            status=EmailStatus(payload.event),
            sent_at=payload.occurred_at if payload.event == "sent" else None,
        )
        db.add(email_send)
        db.flush()

    # 2. Calculate score delta BEFORE incrementing counters
    delta_before_update = calculate_score_delta(email_send, payload.event)

    # 3. Update status, compteurs, timestamps
    if payload.event == "opened":
        is_first_open = (email_send.open_count == 0)
        email_send.status = EmailStatus.OPENED
        email_send.open_count += 1
        email_send.last_open_at = payload.occurred_at

        # 4. Create Interaction on first open
        if is_first_open and email_send.interaction_id is None:
            user_id = current_user.get("user_id", 1)
            create_interaction_from_email(db, email_send, user_id)

    elif payload.event == "clicked":
        email_send.status = EmailStatus.CLICKED
        email_send.click_count += 1
        email_send.last_click_at = payload.occurred_at

    elif payload.event == "bounced":
        email_send.status = EmailStatus.BOUNCED

    elif payload.event == "sent":
        # Already set in create
        if not email_send.sent_at:
            email_send.sent_at = payload.occurred_at

    email_send.updated_at = datetime.utcnow()

    # 5. Update LeadScore (if person_id) - use pre-calculated delta
    if payload.person_id and delta_before_update != 0:
        update_lead_score(db, payload.person_id, delta_before_update, payload.occurred_at)

    db.commit()
    db.refresh(email_send)

    return email_send


@router.get("/leads-hot", response_model=HotLeadsResponse)
async def get_hot_leads(
    limit: int = Query(10, ge=1, le=100, description="Max leads to return"),
    threshold: int = Query(15, ge=0, description="Min score for hot lead"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    GET /marketing/leads-hot - Top N leads par score DESC

    Returns: HotLeadsResponse avec scores >= threshold
    Tri: score DESC
    Inclut: person_name, person_email (via join)
    """
    # Query with join to Person
    query = (
        db.query(LeadScore, Person.first_name, Person.last_name, Person.personal_email)
        .join(Person, LeadScore.person_id == Person.id)
        .filter(LeadScore.score >= threshold)
        .order_by(desc(LeadScore.score))
        .limit(limit)
    )

    results = query.all()

    # Build response items
    items = []
    for lead_score, first_name, last_name, email in results:
        person_name = f"{first_name} {last_name}".strip() if first_name or last_name else None
        items.append(
            LeadScoreOut(
                person_id=lead_score.person_id,
                score=lead_score.score,
                last_event_at=lead_score.last_event_at,
                created_at=lead_score.created_at,
                updated_at=lead_score.updated_at,
                person_name=person_name,
                person_email=email,
            )
        )

    # Count total (with same threshold)
    total = db.query(LeadScore).filter(LeadScore.score >= threshold).count()

    return HotLeadsResponse(
        items=items,
        threshold=threshold,
        total=total,
    )
