from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import List, Tuple, Optional
from models.investor import Investor, Contact, PipelineStage, ClientType
from models.person import PersonOrganizationLink, OrganizationType
from schemas.investor import InvestorCreate, InvestorUpdate, InvestorFilterParams
from services.base import BaseService
from core.exceptions import ConflictError, ValidationError
import logging

logger = logging.getLogger(__name__)

# Import différé pour éviter la dépendance circulaire
def get_automation_service(db):
    from services.task_automation import TaskAutomationService
    return TaskAutomationService(db)

class InvestorService(BaseService[Investor, InvestorCreate, InvestorUpdate]):
    """Service métier pour les investisseurs avec logique spécifique"""
    
    def __init__(self, db: Session):
        super().__init__(Investor, db)
    
    async def create_investor_with_contact(
        self,
        investor_schema: InvestorCreate,
        contact_data: dict = None
    ) -> Investor:
        """Créer un investisseur avec un contact initial (optionnel)"""
        try:
            # Vérifier que l'email est unique
            existing = self.db.query(Investor).filter(Investor.email == investor_schema.email).first()
            if existing:
                raise ConflictError(f"Investor with email {investor_schema.email} already exists")
            
            # Créer l'investisseur
            investor = await self.create(investor_schema)
            
            # Ajouter un contact initial si fourni
            if contact_data:
                contact = Contact(**contact_data, investor_id=investor.id)
                self.db.add(contact)
                self.db.commit()
                logger.info(f"Created contact for investor {investor.id}")
            
            return investor
        except ConflictError:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating investor with contact: {e}")
            raise
    
    async def get_by_pipeline_stage(
        self,
        stage: PipelineStage,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Investor], int]:
        """Récupérer les investisseurs par étape du pipeline"""
        try:
            query = self.db.query(Investor).filter(Investor.pipeline_stage == stage)
            total = query.count()
            items = query.offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error fetching investors by pipeline stage: {e}")
            raise
    
    async def get_by_client_type(
        self,
        client_type: ClientType,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Investor], int]:
        """Récupérer les investisseurs par type de client"""
        try:
            query = self.db.query(Investor).filter(Investor.client_type == client_type)
            total = query.count()
            items = query.offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error fetching investors by client type: {e}")
            raise
    
    async def search(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Investor], int]:
        """Rechercher des investisseurs par nom, email ou entreprise"""
        try:
            search = f"%{search_term}%"
            query = self.db.query(Investor).filter(
                or_(
                    Investor.name.ilike(search),
                    Investor.email.ilike(search),
                    Investor.company.ilike(search),
                )
            )
            total = query.count()
            items = query.offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error searching investors: {e}")
            raise
    
    async def advanced_filter(
        self,
        filter_params: InvestorFilterParams
    ) -> Tuple[List[Investor], int]:
        """Filtrage avancé avec plusieurs critères"""
        try:
            query = self.db.query(Investor)
            
            # Filtres optionnels
            if filter_params.pipeline_stage:
                query = query.filter(Investor.pipeline_stage == filter_params.pipeline_stage)
            
            if filter_params.client_type:
                query = query.filter(Investor.client_type == filter_params.client_type)
            
            if filter_params.is_active is not None:
                query = query.filter(Investor.is_active == filter_params.is_active)

            if filter_params.country_code:
                query = query.filter(Investor.country_code == filter_params.country_code)

            if filter_params.language:
                query = query.filter(Investor.language == filter_params.language)
    
            # Recherche textuelle
            if filter_params.search:
                search = f"%{filter_params.search}%"
                query = query.filter(
                    or_(
                        Investor.name.ilike(search),
                        Investor.email.ilike(search),
                        Investor.company.ilike(search),
                    )
                )
            
            total = query.count()
            items = query.offset(filter_params.skip).limit(filter_params.limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error in advanced filter: {e}")
            raise
    
    async def move_to_next_stage(self, investor_id: int) -> Investor:
        """Déplacer un investisseur à l'étape suivante du pipeline"""
        try:
            investor = await self.get_by_id(investor_id)
            
            # Pipeline: prospect_froid → prospect_tiede → prospect_chaud → en_negociation → client
            pipeline_order = [
                PipelineStage.PROSPECT_FROID,
                PipelineStage.PROSPECT_TIEDE,
                PipelineStage.PROSPECT_CHAUD,
                PipelineStage.EN_NEGOCIATION,
                PipelineStage.CLIENT,
            ]
            
            current_idx = pipeline_order.index(investor.pipeline_stage)
            if current_idx < len(pipeline_order) - 1:
                investor.pipeline_stage = pipeline_order[current_idx + 1]
                self.db.add(investor)
                self.db.commit()
                logger.info(f"Investor {investor_id} moved to {investor.pipeline_stage}")
            
            return investor
        except Exception as e:
            logger.error(f"Error moving investor to next stage: {e}")
            raise
    
    async def get_statistics(self) -> dict:
        """Obtenir des statistiques sur les investisseurs"""
        try:
            total = await self.count()
            active = await self.count({"is_active": True})
            
            # Compter par étape du pipeline
            by_stage = {}
            for stage in PipelineStage:
                count = self.db.query(Investor).filter(Investor.pipeline_stage == stage).count()
                by_stage[stage.value] = count
            
            # Compter par type de client
            by_type = {}
            for client_type in ClientType:
                count = self.db.query(Investor).filter(Investor.client_type == client_type).count()
                by_type[client_type.value] = count
            
            return {
                "total_count": total,
                "active_count": active,
                "by_pipeline_stage": by_stage,
                "by_client_type": by_type,
            }
        except Exception as e:
            logger.error(f"Error getting investor statistics: {e}")
            raise
    
    async def add_contact(self, investor_id: int, contact_data: dict) -> Contact:
        """Ajouter un contact à un investisseur"""
        try:
            investor = await self.get_by_id(investor_id)
            contact = Contact(**contact_data, investor_id=investor_id)
            self.db.add(contact)
            self.db.commit()
            logger.info(f"Added contact to investor {investor_id}")
            return contact
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error adding contact: {e}")
            raise
    
    async def update(self, entity_id: int, update_data: InvestorUpdate) -> Investor:
        """Override update pour déclencher l'auto-création de tâches lors du changement de pipeline"""
        # Récupérer l'ancien stage avant la mise à jour
        old_investor = await self.get_by_id(entity_id)
        old_stage = old_investor.pipeline_stage

        # Appeler la méthode update du parent
        updated_investor = await super().update(entity_id, update_data)

        # Si le pipeline a changé, créer une tâche automatique
        if hasattr(update_data, 'pipeline_stage') and update_data.pipeline_stage and update_data.pipeline_stage != old_stage:
            try:
                automation = get_automation_service(self.db)
                await automation.on_investor_pipeline_change(
                    investor_id=entity_id,
                    old_stage=old_stage,
                    new_stage=update_data.pipeline_stage
                )
                logger.info(f"Auto-created task for investor {entity_id} pipeline change: {old_stage} → {update_data.pipeline_stage}")
            except Exception as e:
                logger.warning(f"Failed to auto-create task for investor {entity_id}: {e}")
                # Ne pas faire échouer la mise à jour si la création de tâche échoue

        return updated_investor

    async def get_investor_with_details(self, investor_id: int) -> dict:
        """Obtenir un investisseur avec tous ses détails (contacts, interactions, KPIs)"""
        try:
            investor = await self.get_by_id(investor_id)

            # Lazy load les relations
            people_links = (
                self.db.query(PersonOrganizationLink)
                .options(joinedload(PersonOrganizationLink.person))
                .filter(
                    PersonOrganizationLink.organization_type == OrganizationType.INVESTOR,
                    PersonOrganizationLink.organization_id == investor_id,
                )
                .all()
            )

            details = {
                "investor": investor,
                "contacts": investor.contacts,
                "interactions": investor.interactions,
                "kpis": investor.kpis,
                "people_links": people_links,
            }

            return details
        except Exception as e:
            logger.error(f"Error getting investor details: {e}")
            raise
