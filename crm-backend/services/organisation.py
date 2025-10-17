from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from models.organisation import (
    Organisation,
    OrganisationContact,
    MandatDistribution,
    Produit,
    MandatProduit,
    OrganisationInteraction,
    OrganisationCategory,
    MandatStatus,
)
from schemas.organisation import (
    OrganisationCreate,
    OrganisationUpdate,
    OrganisationContactCreate,
    OrganisationContactUpdate,
    MandatDistributionCreate,
    MandatDistributionUpdate,
    ProduitCreate,
    ProduitUpdate,
    MandatProduitCreate,
    InteractionCreate,
    InteractionUpdate,
)
from services.base import BaseService
from core.exceptions import ResourceNotFound, ValidationError
import logging

logger = logging.getLogger(__name__)


class OrganisationService(BaseService[Organisation, OrganisationCreate, OrganisationUpdate]):
    """Service pour la gestion des organisations"""

    def __init__(self, db: Session):
        super().__init__(Organisation, db)

    async def get_by_category(
        self,
        category: OrganisationCategory,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Organisation], int]:
        """Récupérer les organisations par catégorie"""
        try:
            query = self.db.query(Organisation).filter(Organisation.category == category)
            total = query.count()
            items = query.offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error fetching organisations by category {category}: {e}")
            raise

    async def get_with_mandats(self, organisation_id: int) -> Organisation:
        """Récupérer une organisation avec ses mandats"""
        try:
            org = (
                self.db.query(Organisation)
                .options(joinedload(Organisation.mandats))
                .filter(Organisation.id == organisation_id)
                .first()
            )
            if not org:
                raise ResourceNotFound("Organisation", organisation_id)
            return org
        except ResourceNotFound:
            raise
        except Exception as e:
            logger.error(f"Error fetching organisation {organisation_id} with mandats: {e}")
            raise

    async def search(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Organisation], int]:
        """Recherche d'organisations par nom, website ou notes"""
        try:
            search_query = self.db.query(Organisation).filter(
                or_(
                    Organisation.name.ilike(f"%{query}%"),
                    Organisation.website.ilike(f"%{query}%"),
                    Organisation.notes.ilike(f"%{query}%"),
                )
            )
            total = search_query.count()
            items = search_query.offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error searching organisations: {e}")
            raise

    async def get_by_language(
        self,
        language: str,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Organisation], int]:
        """Récupérer les organisations par langue (pour newsletters)"""
        try:
            query = self.db.query(Organisation).filter(Organisation.language == language)
            total = query.count()
            items = query.offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error fetching organisations by language {language}: {e}")
            raise

    async def get_statistics(self) -> dict:
        """Statistiques sur les organisations"""
        try:
            total = self.db.query(Organisation).count()
            by_category = (
                self.db.query(
                    Organisation.category,
                    func.count(Organisation.id).label("count")
                )
                .group_by(Organisation.category)
                .all()
            )
            by_language = (
                self.db.query(
                    Organisation.language,
                    func.count(Organisation.id).label("count")
                )
                .group_by(Organisation.language)
                .all()
            )

            return {
                "total": total,
                "by_category": {cat: count for cat, count in by_category},
                "by_language": {lang: count for lang, count in by_language},
            }
        except Exception as e:
            logger.error(f"Error computing organisation statistics: {e}")
            raise


class OrganisationContactService(BaseService[OrganisationContact, OrganisationContactCreate, OrganisationContactUpdate]):
    """Service pour la gestion des contacts d'organisations"""

    def __init__(self, db: Session):
        super().__init__(OrganisationContact, db)

    async def get_by_organisation(
        self,
        organisation_id: int
    ) -> List[OrganisationContact]:
        """Récupérer tous les contacts d'une organisation"""
        try:
            contacts = (
                self.db.query(OrganisationContact)
                .filter(OrganisationContact.organisation_id == organisation_id)
                .all()
            )
            return contacts
        except Exception as e:
            logger.error(f"Error fetching contacts for organisation {organisation_id}: {e}")
            raise


class MandatDistributionService(BaseService[MandatDistribution, MandatDistributionCreate, MandatDistributionUpdate]):
    """Service pour la gestion des mandats de distribution"""

    def __init__(self, db: Session):
        super().__init__(MandatDistribution, db)

    async def get_by_organisation(
        self,
        organisation_id: int
    ) -> List[MandatDistribution]:
        """Récupérer tous les mandats d'une organisation"""
        try:
            mandats = (
                self.db.query(MandatDistribution)
                .filter(MandatDistribution.organisation_id == organisation_id)
                .all()
            )
            return mandats
        except Exception as e:
            logger.error(f"Error fetching mandats for organisation {organisation_id}: {e}")
            raise

    async def get_active_mandats(
        self,
        organisation_id: Optional[int] = None
    ) -> List[MandatDistribution]:
        """Récupérer les mandats actifs (signés ou actifs)"""
        try:
            query = self.db.query(MandatDistribution).filter(
                MandatDistribution.status.in_([MandatStatus.SIGNE, MandatStatus.ACTIF])
            )
            if organisation_id:
                query = query.filter(MandatDistribution.organisation_id == organisation_id)
            return query.all()
        except Exception as e:
            logger.error(f"Error fetching active mandats: {e}")
            raise

    async def get_with_produits(self, mandat_id: int) -> MandatDistribution:
        """Récupérer un mandat avec ses produits associés"""
        try:
            mandat = (
                self.db.query(MandatDistribution)
                .options(joinedload(MandatDistribution.produits))
                .filter(MandatDistribution.id == mandat_id)
                .first()
            )
            if not mandat:
                raise ResourceNotFound("MandatDistribution", mandat_id)
            return mandat
        except ResourceNotFound:
            raise
        except Exception as e:
            logger.error(f"Error fetching mandat {mandat_id} with produits: {e}")
            raise

    async def is_mandat_actif(self, mandat_id: int) -> bool:
        """Vérifier si un mandat est actif"""
        try:
            mandat = await self.get_by_id(mandat_id)
            return mandat.is_actif
        except Exception as e:
            logger.error(f"Error checking if mandat {mandat_id} is active: {e}")
            raise


class ProduitService(BaseService[Produit, ProduitCreate, ProduitUpdate]):
    """Service pour la gestion des produits"""

    def __init__(self, db: Session):
        super().__init__(Produit, db)

    async def get_by_isin(self, isin: str) -> Optional[Produit]:
        """Récupérer un produit par son code ISIN"""
        try:
            return self.db.query(Produit).filter(Produit.isin == isin).first()
        except Exception as e:
            logger.error(f"Error fetching produit by ISIN {isin}: {e}")
            raise

    async def search(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Produit], int]:
        """Recherche de produits par nom, ISIN ou notes"""
        try:
            search_query = self.db.query(Produit).filter(
                or_(
                    Produit.name.ilike(f"%{query}%"),
                    Produit.isin.ilike(f"%{query}%"),
                    Produit.notes.ilike(f"%{query}%"),
                )
            )
            total = search_query.count()
            items = search_query.offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error searching produits: {e}")
            raise

    async def get_by_mandat(self, mandat_id: int) -> List[Produit]:
        """Récupérer tous les produits associés à un mandat"""
        try:
            produits = (
                self.db.query(Produit)
                .join(MandatProduit)
                .filter(MandatProduit.mandat_id == mandat_id)
                .all()
            )
            return produits
        except Exception as e:
            logger.error(f"Error fetching produits for mandat {mandat_id}: {e}")
            raise


class MandatProduitService(BaseService[MandatProduit, MandatProduitCreate, MandatProduitCreate]):
    """Service pour la gestion des associations mandat-produit"""

    def __init__(self, db: Session):
        super().__init__(MandatProduit, db)

    async def create(self, schema: MandatProduitCreate) -> MandatProduit:
        """
        Créer une association mandat-produit
        Vérifie que le mandat est actif avant de créer l'association
        """
        try:
            # Vérifier que le mandat existe et est actif
            mandat = (
                self.db.query(MandatDistribution)
                .filter(MandatDistribution.id == schema.mandat_id)
                .first()
            )
            if not mandat:
                raise ResourceNotFound("MandatDistribution", schema.mandat_id)

            if not mandat.is_actif:
                raise ValidationError(
                    f"Le mandat {schema.mandat_id} n'est pas actif. "
                    "Seuls les mandats signés ou actifs peuvent avoir des produits associés."
                )

            # Vérifier que le produit existe
            produit = (
                self.db.query(Produit)
                .filter(Produit.id == schema.produit_id)
                .first()
            )
            if not produit:
                raise ResourceNotFound("Produit", schema.produit_id)

            # Vérifier que l'association n'existe pas déjà
            existing = (
                self.db.query(MandatProduit)
                .filter(
                    and_(
                        MandatProduit.mandat_id == schema.mandat_id,
                        MandatProduit.produit_id == schema.produit_id,
                    )
                )
                .first()
            )
            if existing:
                raise ValidationError(
                    f"Le produit {schema.produit_id} est déjà associé au mandat {schema.mandat_id}"
                )

            # Créer l'association
            return await super().create(schema)

        except (ResourceNotFound, ValidationError):
            raise
        except Exception as e:
            logger.error(f"Error creating mandat-produit association: {e}")
            raise

    async def get_by_mandat_and_produit(
        self,
        mandat_id: int,
        produit_id: int
    ) -> Optional[MandatProduit]:
        """Récupérer une association spécifique"""
        try:
            return (
                self.db.query(MandatProduit)
                .filter(
                    and_(
                        MandatProduit.mandat_id == mandat_id,
                        MandatProduit.produit_id == produit_id,
                    )
                )
                .first()
            )
        except Exception as e:
            logger.error(f"Error fetching mandat-produit association: {e}")
            raise


class InteractionService(BaseService[OrganisationInteraction, InteractionCreate, InteractionUpdate]):
    """Service pour la gestion des interactions"""

    def __init__(self, db: Session):
        super().__init__(OrganisationInteraction, db)

    async def create(self, schema: InteractionCreate) -> OrganisationInteraction:
        """
        Créer une interaction
        Vérifie que si un produit est spécifié, un mandat actif existe
        """
        try:
            # Si un produit est spécifié, vérifier qu'un mandat actif existe
            if schema.produit_id:
                # Vérifier que l'organisation a un mandat actif avec ce produit
                mandat_produit = (
                    self.db.query(MandatProduit)
                    .join(MandatDistribution)
                    .filter(
                        and_(
                            MandatProduit.produit_id == schema.produit_id,
                            MandatDistribution.organisation_id == schema.organisation_id,
                            MandatDistribution.status.in_([MandatStatus.SIGNE, MandatStatus.ACTIF])
                        )
                    )
                    .first()
                )

                if not mandat_produit:
                    raise ValidationError(
                        f"Aucun mandat actif trouvé pour le produit {schema.produit_id} "
                        f"et l'organisation {schema.organisation_id}"
                    )

            # Créer l'interaction
            return await super().create(schema)

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error creating interaction: {e}")
            raise

    async def get_by_organisation(
        self,
        organisation_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[OrganisationInteraction], int]:
        """Récupérer toutes les interactions d'une organisation"""
        try:
            query = (
                self.db.query(OrganisationInteraction)
                .filter(OrganisationInteraction.organisation_id == organisation_id)
            )
            total = query.count()
            items = query.offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error fetching interactions for organisation {organisation_id}: {e}")
            raise

    async def get_by_personne(
        self,
        personne_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[OrganisationInteraction], int]:
        """Récupérer toutes les interactions d'une personne"""
        try:
            query = (
                self.db.query(OrganisationInteraction)
                .filter(OrganisationInteraction.personne_id == personne_id)
            )
            total = query.count()
            items = query.offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error fetching interactions for personne {personne_id}: {e}")
            raise

    async def get_by_pipeline(
        self,
        pipeline: str,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[OrganisationInteraction], int]:
        """Récupérer toutes les interactions d'un pipeline"""
        try:
            query = (
                self.db.query(OrganisationInteraction)
                .filter(OrganisationInteraction.pipeline == pipeline)
            )
            total = query.count()
            items = query.offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error fetching interactions for pipeline {pipeline}: {e}")
            raise
