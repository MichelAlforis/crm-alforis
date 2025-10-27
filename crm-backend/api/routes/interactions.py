"""
Routes API pour Interactions V2.

Organisation des routes:
1. Routes statiques d'abord (/, /create-v2, /from-email-send/{id})
2. Routes dynamiques ensuite (/{id}, /{id}/participants)

Ceci évite les conflits de routing FastAPI.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from core.cache import invalidate_organisation_cache
from core.events import EventType, emit_event
from models.interaction import Interaction, InteractionParticipant, InteractionStatus, InteractionType
from models.person import Person
from schemas.activity_participant import ActivityParticipantResponse, ActivityWithParticipantsResponse
from schemas.interaction import InteractionCreate, InteractionOut, InteractionUpdate
from services.interaction_auto_creator import InteractionAutoCreatorService

router = APIRouter(prefix="/interactions", tags=["interactions"])


def _extract_user_id(current_user: dict) -> Optional[int]:
    """Convertit l'identifiant utilisateur en int si possible."""
    user_id = current_user.get("user_id") if current_user else None
    if user_id is None:
        return None
    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None


# ============================================================
# SCHEMAS (legacy pour compatibilité)
# ============================================================


class SimpleRecipient(BaseModel):
    """Destinataire simplifié pour création rapide d'interaction."""

    email: Optional[str] = None
    name: Optional[str] = None
    person_id: Optional[int] = None
    role: Optional[str] = None
    is_organizer: bool = False


class SimpleInteractionCreate(BaseModel):
    """Schema simplifié pour créer une interaction rapidement."""

    organisation_id: int = Field(..., gt=0, description="ID de l'organisation")
    type: str = Field(..., description="Type: email, appel, reunion, dejeuner, note, autre")
    title: str = Field(..., min_length=1, max_length=500, description="Titre de l'interaction")
    description: Optional[str] = Field(None, description="Description détaillée")
    recipients: Optional[List[SimpleRecipient]] = Field(
        default_factory=list, description="Destinataires/participants"
    )
    metadata: Optional[dict] = Field(None, description="Métadonnées additionnelles")
    occurred_at: Optional[datetime] = Field(None, description="Date/heure de l'événement")


# ============================================================
# ROUTES - Ordre important pour éviter conflits FastAPI!
# ============================================================


# 1️⃣ GET / - List interactions (AVANT POST pour éviter conflit)
@router.get(
    "",
    response_model=List[InteractionOut],
    summary="List interactions with filters",
    operation_id="list_interactions_v2",
    description="Get all interactions with optional filtering by type, status, date range, etc.",
)
async def list_interactions(
    type: Optional[str] = Query(None, description="Filter by interaction type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    org_id: Optional[int] = Query(None, description="Filter by organisation ID"),
    person_id: Optional[int] = Query(None, description="Filter by person ID"),
    start_date: Optional[datetime] = Query(None, description="Filter interactions after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter interactions before this date"),
    overdue: Optional[bool] = Query(None, description="Filter overdue interactions"),
    limit: int = Query(50, le=200, description="Maximum number of results"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    List all interactions with optional filters.
    """
    query = db.query(Interaction)

    # Apply filters
    if type:
        query = query.filter(Interaction.type == type)

    if status:
        query = query.filter(Interaction.status == status)

    if org_id:
        query = query.filter(Interaction.org_id == org_id)

    if person_id:
        query = query.filter(Interaction.person_id == person_id)

    if start_date:
        query = query.filter(Interaction.created_at >= start_date)

    if end_date:
        query = query.filter(Interaction.created_at <= end_date)

    if overdue is not None:
        now = datetime.now(timezone.utc)
        if overdue:
            query = query.filter(
                Interaction.next_action_at.isnot(None), Interaction.next_action_at < now
            )

    # Order by most recent first
    query = query.order_by(Interaction.created_at.desc())

    # Limit results
    interactions = query.limit(limit).all()

    return interactions


# 2️⃣ POST /create-v2 - Create interaction V2 (route statique avant dynamiques)
@router.post(
    "/create-v2",
    response_model=InteractionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create interaction V2",
    operation_id="create_interaction_v2",
    description="Create an interaction using the V2 schema (crm_interactions table)",
)
async def create_interaction_v2(
    interaction_data: InteractionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new interaction using the V2 model.

    Requires either org_id OR person_id (CHECK constraint).
    """
    user_id = _extract_user_id(current_user)

    # Create interaction
    # Convert Pydantic models to dicts for JSON columns
    attachments_dict = [att.model_dump() for att in (interaction_data.attachments or [])]
    external_participants_dict = [
        ep.model_dump() for ep in (interaction_data.external_participants or [])
    ]

    interaction = Interaction(
        org_id=interaction_data.org_id,
        person_id=interaction_data.person_id,
        type=InteractionType(interaction_data.type),
        title=interaction_data.title,
        description=interaction_data.body,  # body maps to description
        created_by=user_id or 1,  # Fallback to user 1 if not found
        status=interaction_data.status,
        assignee_id=interaction_data.assignee_id,
        next_action_at=interaction_data.next_action_at,
        attachments=attachments_dict,
        external_participants=external_participants_dict,
    )

    db.add(interaction)
    db.flush()  # Get the ID

    # Add participants if provided
    if interaction_data.participants:
        for p_data in interaction_data.participants:
            participant = InteractionParticipant(
                interaction_id=interaction.id,
                person_id=p_data.person_id,
                role=p_data.role,
                present=p_data.present,
            )
            db.add(participant)

    db.commit()
    db.refresh(interaction)

    return interaction


# 3️⃣ POST /from-email-send/{send_id} - Legacy endpoint (route statique)
@router.post(
    "/from-email-send/{send_id}",
    response_model=ActivityWithParticipantsResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer interaction depuis un EmailSend",
    operation_id="create_interaction_from_email",
    description="Hook appelé automatiquement quand un email est envoyé",
)
async def create_interaction_from_email_send(
    send_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Crée automatiquement une interaction depuis un EmailSend.
    """
    from models.email import EmailSend

    # Récupérer l'EmailSend
    send = db.query(EmailSend).filter(EmailSend.id == send_id).first()

    if not send:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"EmailSend {send_id} not found"
        )

    if not send.organisation_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="EmailSend must have an organisation_id to create interaction",
        )

    # Créer l'interaction
    user_id = _extract_user_id(current_user)
    auto_creator = InteractionAutoCreatorService(db)

    activity = await auto_creator.create_from_email_send(email_send=send, created_by=user_id)

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create interaction from email send",
        )

    # Émettre l'événement
    await emit_event(
        EventType.ACTIVITY_CREATED,
        {"organisation_id": send.organisation_id, "activity_id": activity.id},
    )

    # Invalider le cache
    invalidate_organisation_cache(send.organisation_id)

    # Construire la réponse
    return ActivityWithParticipantsResponse(
        id=activity.id,
        organisation_id=activity.organisation_id,
        type=activity.type.value,
        title=activity.title,
        description=activity.description,
        metadata=activity.metadata,
        occurred_at=activity.occurred_at,
        created_at=activity.created_at,
        updated_at=activity.updated_at,
        participants=[
            ActivityParticipantResponse(
                id=p.id,
                activity_id=p.activity_id,
                person_id=p.person_id,
                organisation_id=p.organisation_id,
                external_name=p.external_name,
                external_email=p.external_email,
                external_role=p.external_role,
                is_organizer=p.is_organizer,
                attendance_status=p.attendance_status,
                notes=p.notes,
                created_at=p.created_at,
                updated_at=p.updated_at,
                display_name=p.display_name,
            )
            for p in (activity.participants or [])
        ],
        attachments_count=len(activity.attachments) if activity.attachments else 0,
    )


# 4️⃣ PATCH /{interaction_id} - Update interaction (route dynamique)
@router.patch(
    "/{interaction_id}",
    response_model=InteractionOut,
    summary="Update an interaction",
    operation_id="update_interaction_v2",
    description="Update interaction fields like status, title, body, etc.",
)
async def update_interaction(
    interaction_id: int,
    update_data: InteractionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Update an existing interaction.
    """
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()

    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Interaction {interaction_id} not found"
        )

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)

    for field, value in update_dict.items():
        setattr(interaction, field, value)

    db.commit()
    db.refresh(interaction)

    return interaction


# 5️⃣ POST /{interaction_id}/participants - Add participant (route dynamique)
@router.post(
    "/{interaction_id}/participants",
    status_code=status.HTTP_201_CREATED,
    summary="Add participant to interaction",
    operation_id="add_participant_to_interaction_v2",
    description="Add a person as a participant to an interaction",
)
async def add_participant_to_interaction(
    interaction_id: int,
    person_id: int = Query(..., description="Person ID to add as participant"),
    present: bool = Query(True, description="Whether the person was present"),
    role: Optional[str] = Query(None, description="Role of the participant"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Add a participant to an existing interaction.
    """
    # Check interaction exists
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Interaction {interaction_id} not found"
        )

    # Check person exists
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Person {person_id} not found"
        )

    # Check if participant already exists
    existing = (
        db.query(InteractionParticipant)
        .filter(
            InteractionParticipant.interaction_id == interaction_id,
            InteractionParticipant.person_id == person_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=f"Person {person_id} is already a participant"
        )

    # Create participant
    participant = InteractionParticipant(
        interaction_id=interaction_id, person_id=person_id, present=present, role=role
    )

    db.add(participant)
    db.commit()

    return {"message": "Participant added successfully", "person_id": person_id}
