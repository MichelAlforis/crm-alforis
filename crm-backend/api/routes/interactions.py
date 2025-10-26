"""Routes API pour création simplifiée d'interactions."""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from core.cache import invalidate_organisation_cache
from core.events import EventType, emit_event
from schemas.activity_participant import ActivityWithParticipantsResponse
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


@router.post(
    "",
    response_model=ActivityWithParticipantsResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer une interaction simple",
    description="""
    Endpoint simplifié pour créer rapidement une interaction depuis le frontend.

    **Cas d'usage:**
    - Enregistrer un email envoyé manuellement
    - Noter un appel téléphonique
    - Créer une note rapide
    - Logger une interaction après coup

    **Exemples:**

    1. Email simple:
    ```json
    {
      "organisation_id": 42,
      "type": "email",
      "title": "Email: Proposition commerciale",
      "description": "Envoyé proposition tarifaire 2025",
      "recipients": [
        {"email": "john.doe@example.com", "name": "John Doe"}
      ]
    }
    ```

    2. Appel téléphonique:
    ```json
    {
      "organisation_id": 42,
      "type": "appel",
      "title": "Call découverte produit",
      "description": "Discussion sur leurs besoins en outils CRM",
      "recipients": [
        {"person_id": 123, "role": "CEO"}
      ]
    }
    ```

    3. Note rapide:
    ```json
    {
      "organisation_id": 42,
      "type": "note",
      "title": "Décision de partenariat",
      "description": "Le client a validé le contrat, signature prévue mardi"
    }
    ```
    """,
)
async def create_simple_interaction(
    interaction: SimpleInteractionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Créer une interaction de manière simplifiée.

    Utile pour:
    - Enregistrer un email envoyé depuis un client mail externe
    - Noter un appel téléphonique passé
    - Créer une note suite à une action manuelle
    - Logger toute interaction non automatisée
    """
    # Vérifier que l'organisation existe
    from services.organisation import OrganisationService

    org_service = OrganisationService(db)
    organisation = await org_service.get(interaction.organisation_id)

    if not organisation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organisation {interaction.organisation_id} not found",
        )

    # Convertir recipients en dict
    recipients_dict = [
        {
            "email": r.email,
            "name": r.name,
            "person_id": r.person_id,
            "role": r.role,
            "is_organizer": r.is_organizer,
        }
        for r in (interaction.recipients or [])
    ]

    # Créer l'interaction
    user_id = _extract_user_id(current_user)
    auto_creator = InteractionAutoCreatorService(db)

    activity = await auto_creator.create_simple_interaction(
        organisation_id=interaction.organisation_id,
        activity_type=interaction.type,
        title=interaction.title,
        description=interaction.description,
        recipients=recipients_dict,
        metadata=interaction.metadata,
        created_by=user_id,
        occurred_at=interaction.occurred_at,
    )

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create interaction"
        )

    # Émettre l'événement
    await emit_event(
        EventType.ACTIVITY_CREATED,
        {"organisation_id": interaction.organisation_id, "activity_id": activity.id},
    )

    # Invalider le cache
    invalidate_organisation_cache(interaction.organisation_id)

    # Construire la réponse
    from schemas.activity_participant import ActivityParticipantResponse

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


@router.post(
    "/from-email-send/{send_id}",
    response_model=ActivityWithParticipantsResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer interaction depuis un EmailSend",
    description="Hook appelé automatiquement quand un email est envoyé via le système de campagne",
)
async def create_interaction_from_email_send(
    send_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Crée automatiquement une interaction depuis un EmailSend.

    Endpoint généralement appelé par les hooks internes, mais peut être
    utilisé manuellement pour créer rétroactivement des interactions depuis
    des emails déjà envoyés.
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
    from schemas.activity_participant import ActivityParticipantResponse

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
