"""Service pour créer automatiquement des interactions depuis les hooks."""

import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from models.activity_participant import ActivityParticipant
from models.email import EmailSend
from models.organisation_activity import OrganisationActivity, OrganisationActivityType
from schemas.activity_participant import ActivityParticipantBase, ActivityWithParticipantsCreate
from services.activity_participant import ActivityParticipantService

logger = logging.getLogger(__name__)


class InteractionAutoCreatorService:
    """
    Service pour créer automatiquement des interactions depuis différentes sources:
    - Envois d'emails (campagnes, emails simples)
    - Hooks personnalisés
    - Intégrations externes
    """

    def __init__(self, db: Session):
        self.db = db
        self.participant_service = ActivityParticipantService(db)

    async def create_from_email_send(
        self,
        email_send: EmailSend,
        created_by: Optional[int] = None,
        additional_context: Optional[dict] = None
    ) -> Optional[OrganisationActivity]:
        """
        Crée automatiquement une interaction EMAIL depuis un EmailSend.

        Args:
            email_send: L'objet EmailSend qui vient d'être envoyé
            created_by: ID de l'utilisateur ayant déclenché l'envoi
            additional_context: Contexte additionnel à ajouter aux métadonnées

        Returns:
            OrganisationActivity créée, ou None si impossible
        """
        # Vérifier qu'on a une organisation
        if not email_send.organisation_id:
            logger.warning(
                "Cannot create interaction from email_send without organisation_id",
                extra={"send_id": email_send.id}
            )
            return None

        # Construire le titre de l'interaction
        subject = ""
        if email_send.step and email_send.step.subject:
            subject = email_send.step.subject
        elif email_send.campaign and email_send.campaign.subject:
            subject = email_send.campaign.subject
        elif email_send.template and email_send.template.subject:
            subject = email_send.template.subject

        title = f"Email: {subject}" if subject else f"Email envoyé à {email_send.recipient_email}"

        # Construire la description
        description_parts = [
            f"Email envoyé à {email_send.recipient_name or email_send.recipient_email}",
        ]
        if email_send.campaign:
            description_parts.append(f"Campagne: {email_send.campaign.name}")
        if email_send.template:
            description_parts.append(f"Template: {email_send.template.name}")

        description = "\n".join(description_parts)

        # Métadonnées enrichies
        metadata = {
            "source": "email_send",
            "email_send_id": email_send.id,
            "campaign_id": email_send.campaign_id,
            "template_id": email_send.template_id,
            "recipient_email": email_send.recipient_email,
            "subject": subject,
            **(additional_context or {})
        }

        # Créer le participant (destinataire)
        participants: List[ActivityParticipantBase] = []

        if email_send.recipient_person_id:
            # Participant dans le CRM
            participants.append(ActivityParticipantBase(
                person_id=email_send.recipient_person_id,
                organisation_id=email_send.organisation_id,
                is_organizer=False,
                attendance_status="confirmed",
                notes=f"Destinataire de l'email: {email_send.recipient_email}"
            ))
        else:
            # Participant externe
            participants.append(ActivityParticipantBase(
                external_name=email_send.recipient_name or email_send.recipient_email,
                external_email=email_send.recipient_email,
                organisation_id=email_send.organisation_id,
                is_organizer=False,
                attendance_status="confirmed",
                notes="Destinataire externe (non dans le CRM)"
            ))

        # Créer l'activité avec participant
        activity_data = ActivityWithParticipantsCreate(
            organisation_id=email_send.organisation_id,
            type=OrganisationActivityType.EMAIL.value,
            title=title,
            description=description,
            metadata=metadata,
            occurred_at=email_send.sent_at or datetime.utcnow(),
            participants=participants
        )

        try:
            activity = await self.participant_service.create_activity_with_participants(
                activity_data=activity_data,
                created_by=created_by
            )
            logger.info(
                "Interaction auto-created from email_send",
                extra={
                    "activity_id": activity.id,
                    "email_send_id": email_send.id,
                    "organisation_id": email_send.organisation_id
                }
            )
            return activity
        except Exception as exc:
            logger.exception(
                "Failed to auto-create interaction from email_send: %s",
                exc,
                extra={"email_send_id": email_send.id}
            )
            return None

    async def create_from_newsletter(
        self,
        campaign_id: int,
        organisation_id: int,
        recipients: List[dict],
        created_by: Optional[int] = None
    ) -> Optional[OrganisationActivity]:
        """
        Crée une interaction pour une newsletter envoyée.

        Args:
            campaign_id: ID de la campagne email
            organisation_id: ID de l'organisation
            recipients: Liste des destinataires [{email, name, person_id?}]
            created_by: ID de l'utilisateur

        Returns:
            OrganisationActivity créée
        """
        from models.email import EmailCampaign

        # Récupérer la campagne
        campaign = self.db.query(EmailCampaign).filter(
            EmailCampaign.id == campaign_id
        ).first()

        if not campaign:
            logger.warning(f"Campaign {campaign_id} not found")
            return None

        title = f"Newsletter: {campaign.name}"
        description = f"Newsletter envoyée à {len(recipients)} destinataire(s)"
        if campaign.description:
            description += f"\n\n{campaign.description}"

        metadata = {
            "source": "newsletter",
            "campaign_id": campaign_id,
            "campaign_name": campaign.name,
            "total_recipients": len(recipients),
            "provider": campaign.provider.value if campaign.provider else None
        }

        # Créer les participants
        participants: List[ActivityParticipantBase] = []
        for recipient in recipients[:50]:  # Limite à 50 pour éviter les listes trop longues
            if recipient.get("person_id"):
                participants.append(ActivityParticipantBase(
                    person_id=recipient["person_id"],
                    organisation_id=organisation_id,
                    is_organizer=False,
                    attendance_status="confirmed"
                ))
            else:
                participants.append(ActivityParticipantBase(
                    external_name=recipient.get("name") or recipient["email"],
                    external_email=recipient["email"],
                    organisation_id=organisation_id,
                    is_organizer=False,
                    attendance_status="confirmed"
                ))

        activity_data = ActivityWithParticipantsCreate(
            organisation_id=organisation_id,
            type=OrganisationActivityType.EMAIL.value,
            title=title,
            description=description,
            metadata=metadata,
            occurred_at=campaign.scheduled_at or datetime.utcnow(),
            participants=participants
        )

        try:
            activity = await self.participant_service.create_activity_with_participants(
                activity_data=activity_data,
                created_by=created_by
            )
            logger.info(
                "Interaction auto-created from newsletter",
                extra={
                    "activity_id": activity.id,
                    "campaign_id": campaign_id,
                    "organisation_id": organisation_id
                }
            )
            return activity
        except Exception as exc:
            logger.exception(
                "Failed to auto-create interaction from newsletter: %s",
                exc,
                extra={"campaign_id": campaign_id}
            )
            return None

    async def create_simple_interaction(
        self,
        organisation_id: int,
        activity_type: str,
        title: str,
        description: Optional[str] = None,
        recipients: Optional[List[dict]] = None,
        metadata: Optional[dict] = None,
        created_by: Optional[int] = None,
        occurred_at: Optional[datetime] = None
    ) -> Optional[OrganisationActivity]:
        """
        Crée une interaction simple depuis le frontend.

        Args:
            organisation_id: ID de l'organisation
            activity_type: Type (email, appel, note, etc.)
            title: Titre de l'interaction
            description: Description
            recipients: Liste [{email, name, person_id?, role?}]
            metadata: Métadonnées additionnelles
            created_by: ID utilisateur
            occurred_at: Date de l'événement

        Returns:
            OrganisationActivity créée
        """
        # Valider le type
        try:
            OrganisationActivityType(activity_type)
        except ValueError:
            logger.error(f"Invalid activity type: {activity_type}")
            return None

        # Créer les participants
        participants: List[ActivityParticipantBase] = []
        if recipients:
            for recipient in recipients:
                if recipient.get("person_id"):
                    participants.append(ActivityParticipantBase(
                        person_id=recipient["person_id"],
                        organisation_id=organisation_id,
                        external_role=recipient.get("role"),
                        is_organizer=recipient.get("is_organizer", False),
                        attendance_status="confirmed"
                    ))
                else:
                    participants.append(ActivityParticipantBase(
                        external_name=recipient.get("name", ""),
                        external_email=recipient.get("email"),
                        external_role=recipient.get("role"),
                        organisation_id=organisation_id,
                        is_organizer=recipient.get("is_organizer", False),
                        attendance_status="confirmed"
                    ))

        activity_data = ActivityWithParticipantsCreate(
            organisation_id=organisation_id,
            type=activity_type,
            title=title,
            description=description,
            metadata=metadata or {},
            occurred_at=occurred_at or datetime.utcnow(),
            participants=participants
        )

        try:
            activity = await self.participant_service.create_activity_with_participants(
                activity_data=activity_data,
                created_by=created_by
            )
            logger.info(
                "Simple interaction created",
                extra={
                    "activity_id": activity.id,
                    "organisation_id": organisation_id,
                    "type": activity_type
                }
            )
            return activity
        except Exception as exc:
            logger.exception(
                "Failed to create simple interaction: %s",
                exc,
                extra={"organisation_id": organisation_id}
            )
            return None


__all__ = ["InteractionAutoCreatorService"]
