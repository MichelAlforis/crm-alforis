"""
Service d'automatisation des tâches
Création automatique de tâches basée sur des événements CRM
"""

import logging
from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from models.organisation import Organisation, PipelineStage
from models.person import Person, StagePerson
from models.task import Task, TaskCategory, TaskPriority, TaskStatus
from services.task import TaskService

logger = logging.getLogger(__name__)


class TaskAutomationService:
    """Service pour créer automatiquement des tâches basées sur des événements"""

    def __init__(self, db: Session):
        self.db = db
        self.task_service = TaskService(db)

    # ============= RÈGLES POUR INVESTISSEURS =============

    async def on_organisation_pipeline_change(
        self,
        Organisation_id: int,
        old_stage: Optional[PipelineStage],
        new_stage: PipelineStage,
    ) -> Optional[Task]:
        """
        Créer une tâche automatique quand le pipeline d'un investisseur change

        Règles :
        - prospect_chaud → Créer "Relance J+3"
        - en_negociation → Créer "Suivi négociation J+7"
        - client → Créer "Onboarding J+1"
        """
        o = self.db.query(Organisation).filter(Organisation.id == Organisation_id).first()
        if not Organisation:
            return None

        # Règle : Prospect Chaud → Relance J+3
        if new_stage == PipelineStage.PROSPECT_CHAUD:
            return await self.task_service.create_auto_task(
                title=f"Relancer {Organisation.name}",
                description=f"Le prospect est maintenant chaud. Faire un suivi pour maintenir l'intérêt.",
                due_date=date.today() + timedelta(days=3),
                priority=TaskPriority.HAUTE,
                category=TaskCategory.RELANCE,
                rule_name="prospect_chaud_j3",
                Organisation_id=Organisation_id,
            )

        # Règle : En Négociation → Suivi J+7
        elif new_stage == PipelineStage.EN_NEGOCIATION:
            return await self.task_service.create_auto_task(
                title=f"Suivi négociation {Organisation.name}",
                description=f"Faire le point sur l'avancement de la négociation.",
                due_date=date.today() + timedelta(days=7),
                priority=TaskPriority.HAUTE,
                category=TaskCategory.NEGOCIATION,
                rule_name="negociation_j7",
                Organisation_id=Organisation_id,
            )

        # Règle : Client → Onboarding J+1
        elif new_stage == PipelineStage.CLIENT:
            return await self.task_service.create_auto_task(
                title=f"Onboarding {Organisation.name}",
                description=f"Planifier la session d'onboarding et l'intégration du nouveau client.",
                due_date=date.today() + timedelta(days=1),
                priority=TaskPriority.CRITIQUE,
                category=TaskCategory.RDV,
                rule_name="client_onboarding_j1",
                Organisation_id=Organisation_id,
            )

        return None

    # ============= RÈGLES POUR personS =============

    async def on_person_stage_change(
        self,
        person_id: int,
        old_stage: Optional[StagePerson],
        new_stage: StagePerson,
    ) -> Optional[Task]:
        """
        Créer une tâche automatique quand le stage d'un person change

        Règles similaires aux investisseurs
        """
        person = self.db.query(person).filter(person.id == person_id).first()
        if not person:
            return None

        # Règle : Prospect Chaud → Relance J+3
        if new_stage == StagePerson.PROSPECT_CHAUD:
            return await self.task_service.create_auto_task(
                title=f"Relancer person {person.full_name}",
                description=f"Le person est maintenant chaud. Faire un suivi pour finaliser le partenariat.",
                due_date=date.today() + timedelta(days=3),
                priority=TaskPriority.HAUTE,
                category=TaskCategory.RELANCE,
                rule_name="person_prospect_chaud_j3",
                person_id=person_id,
            )

        # Règle : En Négociation → Suivi J+5
        elif new_stage == StagePerson.EN_NEGOCIATION:
            return await self.task_service.create_auto_task(
                title=f"Suivi négociation {person.full_name}",
                description=f"Faire le point sur les termes du contrat person.",
                due_date=date.today() + timedelta(days=5),
                priority=TaskPriority.HAUTE,
                category=TaskCategory.NEGOCIATION,
                rule_name="person_negociation_j5",
                person_id=person_id,
            )

        return None

    # ============= RÈGLES POUR INTERACTIONS =============

    async def on_interaction_created(
        self,
        Organisation_id: Optional[int] = None,
        person_id: Optional[int] = None,
        interaction_type: str = "autre",
        notes: Optional[str] = None,
    ) -> Optional[Task]:
        """
        Créer une tâche automatique après une interaction

        Règles :
        - Interaction type "reunion" → Créer "Compte-rendu J+1"
        - Interaction type "appel" → Créer "Relance J+3"
        - Interaction type "email" → Créer "Suivi email J+5"
        """
        entity_name = "Contact"
        entity_id_Organisation = None
        entity_id_person = None

        # Déterminer l'entité concernée
        if Organisation_id:
            Organisation = (
                self.db.query(Organisation).filter(Organisation.id == Organisation_id).first()
            )
            if Organisation:
                entity_name = Organisation.name
                entity_id_Organisation = Organisation_id

        if person_id:
            person = self.db.query(Person).filter(Person.id == person_id).first()
            if person:
                entity_name = person.full_name
                entity_id_person = person_id

        # Règle : Réunion → Compte-rendu J+1
        if interaction_type.lower() in ["reunion", "rdv", "meeting"]:
            return await self.task_service.create_auto_task(
                title=f"Compte-rendu réunion avec {entity_name}",
                description=f"Rédiger et envoyer le compte-rendu de la réunion.",
                due_date=date.today() + timedelta(days=1),
                priority=TaskPriority.HAUTE,
                category=TaskCategory.ADMIN,
                rule_name="reunion_cr_j1",
                Organisation_id=entity_id_Organisation,
                person_id=entity_id_person,
            )

        # Règle : Appel → Relance J+3
        elif interaction_type.lower() in ["appel", "call", "phone"]:
            return await self.task_service.create_auto_task(
                title=f"Relance après appel avec {entity_name}",
                description=f"Faire un suivi suite à l'appel téléphonique.",
                due_date=date.today() + timedelta(days=3),
                priority=TaskPriority.MOYENNE,
                category=TaskCategory.RELANCE,
                rule_name="appel_relance_j3",
                Organisation_id=entity_id_Organisation,
                person_id=entity_id_person,
            )

        # Règle : Email → Suivi J+5
        elif interaction_type.lower() in ["email", "mail"]:
            return await self.task_service.create_auto_task(
                title=f"Suivi email avec {entity_name}",
                description=f"Vérifier si une réponse a été reçue et faire un suivi si nécessaire.",
                due_date=date.today() + timedelta(days=5),
                priority=TaskPriority.BASSE,
                category=TaskCategory.EMAIL,
                rule_name="email_suivi_j5",
                Organisation_id=entity_id_Organisation,
                person_id=entity_id_person,
            )

        return None

    # ============= RÈGLE GÉNÉRIQUE =============

    async def create_followup_task(
        self,
        title: str,
        description: str,
        days_from_now: int,
        priority: TaskPriority,
        category: str,  # TaskCategory
        Organisation_id: Optional[int] = None,
        person_id: Optional[int] = None,
    ) -> Task:
        """Créer une tâche de suivi personnalisée"""
        return await self.task_service.create_auto_task(
            title=title,
            description=description,
            due_date=date.today() + timedelta(days=days_from_now),
            priority=priority,
            category=category,
            rule_name="custom_followup",
            Organisation_id=Organisation_id,
            person_id=person_id,
            person_id=person_id,
        )
