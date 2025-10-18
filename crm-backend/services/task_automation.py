"""
Service d'automatisation des tâches
Création automatique de tâches basée sur des événements CRM
"""

from typing import Optional
from datetime import date, timedelta
from sqlalchemy.orm import Session
import logging

from models.task import Task, TaskPriority, TaskStatus  # TaskCategory n\'existe pas,
# from models.investor import Investor, PipelineStage
# from models.fournisseur import Fournisseur, StageFournisseur
from services.task import TaskService

logger = logging.getLogger(__name__)


class TaskAutomationService:
    """Service pour créer automatiquement des tâches basées sur des événements"""

    def __init__(self, db: Session):
        self.db = db
        self.task_service = TaskService(db)

    # ============= RÈGLES POUR INVESTISSEURS =============

    async def on_investor_pipeline_change(
        self,
        investor_id: int,
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
        investor = self.db.query(Investor).filter(Investor.id == investor_id).first()
        if not investor:
            return None

        # Règle : Prospect Chaud → Relance J+3
        if new_stage == PipelineStage.PROSPECT_CHAUD:
            return await self.task_service.create_auto_task(
                title=f"Relancer {investor.name}",
                description=f"Le prospect est maintenant chaud. Faire un suivi pour maintenir l'intérêt.",
                due_date=date.today() + timedelta(days=3),
                priority=TaskPriority.HAUTE,
                category=TaskCategory.RELANCE,
                rule_name="prospect_chaud_j3",
                investor_id=investor_id,
            )

        # Règle : En Négociation → Suivi J+7
        elif new_stage == PipelineStage.EN_NEGOCIATION:
            return await self.task_service.create_auto_task(
                title=f"Suivi négociation {investor.name}",
                description=f"Faire le point sur l'avancement de la négociation.",
                due_date=date.today() + timedelta(days=7),
                priority=TaskPriority.HAUTE,
                category=TaskCategory.NEGOCIATION,
                rule_name="negociation_j7",
                investor_id=investor_id,
            )

        # Règle : Client → Onboarding J+1
        elif new_stage == PipelineStage.CLIENT:
            return await self.task_service.create_auto_task(
                title=f"Onboarding {investor.name}",
                description=f"Planifier la session d'onboarding et l'intégration du nouveau client.",
                due_date=date.today() + timedelta(days=1),
                priority=TaskPriority.CRITIQUE,
                category=TaskCategory.RDV,
                rule_name="client_onboarding_j1",
                investor_id=investor_id,
            )

        return None

    # ============= RÈGLES POUR FOURNISSEURS =============

    async def on_fournisseur_stage_change(
        self,
        fournisseur_id: int,
        old_stage: Optional[StageFournisseur],
        new_stage: StageFournisseur,
    ) -> Optional[Task]:
        """
        Créer une tâche automatique quand le stage d'un fournisseur change

        Règles similaires aux investisseurs
        """
        fournisseur = self.db.query(Fournisseur).filter(Fournisseur.id == fournisseur_id).first()
        if not fournisseur:
            return None

        # Règle : Prospect Chaud → Relance J+3
        if new_stage == StageFournisseur.PROSPECT_CHAUD:
            return await self.task_service.create_auto_task(
                title=f"Relancer fournisseur {fournisseur.name}",
                description=f"Le fournisseur est maintenant chaud. Faire un suivi pour finaliser le partenariat.",
                due_date=date.today() + timedelta(days=3),
                priority=TaskPriority.HAUTE,
                category=TaskCategory.RELANCE,
                rule_name="fournisseur_prospect_chaud_j3",
                fournisseur_id=fournisseur_id,
            )

        # Règle : En Négociation → Suivi J+5
        elif new_stage == StageFournisseur.EN_NEGOCIATION:
            return await self.task_service.create_auto_task(
                title=f"Suivi négociation {fournisseur.name}",
                description=f"Faire le point sur les termes du contrat fournisseur.",
                due_date=date.today() + timedelta(days=5),
                priority=TaskPriority.HAUTE,
                category=TaskCategory.NEGOCIATION,
                rule_name="fournisseur_negociation_j5",
                fournisseur_id=fournisseur_id,
            )

        return None

    # ============= RÈGLES POUR INTERACTIONS =============

    async def on_interaction_created(
        self,
        investor_id: Optional[int] = None,
        fournisseur_id: Optional[int] = None,
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
        entity_id_investor = None
        entity_id_fournisseur = None

        # Déterminer l'entité concernée
        if investor_id:
            investor = self.db.query(Investor).filter(Investor.id == investor_id).first()
            if investor:
                entity_name = investor.name
                entity_id_investor = investor_id

        if fournisseur_id:
            fournisseur = self.db.query(Fournisseur).filter(Fournisseur.id == fournisseur_id).first()
            if fournisseur:
                entity_name = fournisseur.name
                entity_id_fournisseur = fournisseur_id

        # Règle : Réunion → Compte-rendu J+1
        if interaction_type.lower() in ["reunion", "rdv", "meeting"]:
            return await self.task_service.create_auto_task(
                title=f"Compte-rendu réunion avec {entity_name}",
                description=f"Rédiger et envoyer le compte-rendu de la réunion.",
                due_date=date.today() + timedelta(days=1),
                priority=TaskPriority.HAUTE,
                category=TaskCategory.ADMIN,
                rule_name="reunion_cr_j1",
                investor_id=entity_id_investor,
                fournisseur_id=entity_id_fournisseur,
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
                investor_id=entity_id_investor,
                fournisseur_id=entity_id_fournisseur,
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
                investor_id=entity_id_investor,
                fournisseur_id=entity_id_fournisseur,
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
        investor_id: Optional[int] = None,
        fournisseur_id: Optional[int] = None,
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
            investor_id=investor_id,
            fournisseur_id=fournisseur_id,
            person_id=person_id,
        )
