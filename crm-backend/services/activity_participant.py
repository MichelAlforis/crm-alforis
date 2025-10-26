"""Service pour gérer les participants aux activités."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import desc
from sqlalchemy.orm import Session

from core.exceptions import ResourceNotFound, ValidationError
from models.activity_participant import ActivityParticipant
from models.organisation_activity import OrganisationActivity, OrganisationActivityType
from schemas.activity_participant import (
    ActivityParticipantCreate,
    ActivityParticipantUpdate,
    ActivityWithParticipantsCreate,
)
from services.base import BaseService


class ActivityParticipantService(BaseService[ActivityParticipant, ActivityParticipantCreate, ActivityParticipantUpdate]):
    """Service pour gérer les participants aux activités."""

    def __init__(self, db: Session):
        super().__init__(ActivityParticipant, db)

    async def get_by_activity(self, activity_id: int) -> List[ActivityParticipant]:
        """Récupère tous les participants d'une activité."""
        return self.db.query(ActivityParticipant).filter(
            ActivityParticipant.activity_id == activity_id
        ).all()

    async def get_by_person(
        self,
        person_id: int,
        limit: int = 5,
        activity_types: Optional[List[str]] = None
    ) -> List[ActivityParticipant]:
        """
        Récupère les participations récentes d'une personne.

        Args:
            person_id: ID de la personne
            limit: Nombre max de résultats (défaut 5)
            activity_types: Filtrer par types d'activité (appel, reunion, etc.)

        Returns:
            Liste des participations ordonnées par date décroissante
        """
        query = (
            self.db.query(ActivityParticipant)
            .join(OrganisationActivity)
            .filter(ActivityParticipant.person_id == person_id)
        )

        if activity_types:
            query = query.filter(OrganisationActivity.type.in_(activity_types))

        return (
            query.order_by(desc(OrganisationActivity.occurred_at))
            .limit(limit)
            .all()
        )

    async def get_by_organisation(
        self,
        organisation_id: int,
        limit: int = 5,
        activity_types: Optional[List[str]] = None
    ) -> List[OrganisationActivity]:
        """
        Récupère les activités récentes d'une organisation.

        Args:
            organisation_id: ID de l'organisation
            limit: Nombre max de résultats (défaut 5)
            activity_types: Filtrer par types (appel, reunion, dejeuner, etc.)

        Returns:
            Liste des activités avec participants
        """
        query = self.db.query(OrganisationActivity).filter(
            OrganisationActivity.organisation_id == organisation_id
        )

        if activity_types:
            query = query.filter(OrganisationActivity.type.in_(activity_types))

        return (
            query.order_by(desc(OrganisationActivity.occurred_at))
            .limit(limit)
            .all()
        )

    async def create_activity_with_participants(
        self,
        activity_data: ActivityWithParticipantsCreate,
        created_by: Optional[int] = None
    ) -> OrganisationActivity:
        """
        Crée une activité avec ses participants en une transaction.

        Args:
            activity_data: Données de l'activité + participants
            created_by: ID de l'utilisateur créateur

        Returns:
            OrganisationActivity avec participants créés
        """
        # Valider le type d'activité
        try:
            activity_type = OrganisationActivityType(activity_data.type)
        except ValueError:
            raise ValidationError(f"Type d'activité invalide: {activity_data.type}")

        # Créer l'activité
        activity = OrganisationActivity(
            organisation_id=activity_data.organisation_id,
            type=activity_type,
            title=activity_data.title,
            description=activity_data.description,
            activity_metadata=activity_data.metadata,
            created_by=created_by,
            occurred_at=activity_data.occurred_at or datetime.utcnow()
        )

        self.db.add(activity)
        self.db.flush()  # Pour obtenir l'ID de l'activité

        # Créer les participants
        for participant_data in activity_data.participants:
            # Validation: au moins person_id OU external_name
            if not participant_data.person_id and not participant_data.external_name:
                raise ValidationError(
                    "Chaque participant doit avoir soit person_id soit external_name"
                )

            participant = ActivityParticipant(
                activity_id=activity.id,
                person_id=participant_data.person_id,
                organisation_id=participant_data.organisation_id,
                external_name=participant_data.external_name,
                external_email=participant_data.external_email,
                external_role=participant_data.external_role,
                is_organizer=participant_data.is_organizer,
                attendance_status=participant_data.attendance_status,
                notes=participant_data.notes
            )
            self.db.add(participant)

        self.db.commit()
        self.db.refresh(activity)
        return activity

    async def add_participant_to_activity(
        self,
        activity_id: int,
        participant_data: ActivityParticipantCreate
    ) -> ActivityParticipant:
        """Ajoute un participant à une activité existante."""
        # Vérifier que l'activité existe
        activity = self.db.query(OrganisationActivity).filter(
            OrganisationActivity.id == activity_id
        ).first()

        if not activity:
            raise ResourceNotFound(f"Activity {activity_id} not found")

        # Créer le participant
        participant_data.activity_id = activity_id
        return await self.create(participant_data)

    async def remove_participant(self, participant_id: int) -> bool:
        """Supprime un participant d'une activité."""
        return await self.delete(participant_id)
