from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from datetime import datetime, UTC
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
from services.organisation_activity import OrganisationActivityService
from models.organisation_activity import OrganisationActivityType
from core.exceptions import ResourceNotFound, ValidationError, DatabaseError
import logging

logger = logging.getLogger(__name__)


def _normalize_actor(actor: Optional[dict]) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Normalise les informations acteur (id, nom, avatar)."""
    if not actor:
        return None, None, None

    actor_id = actor.get("user_id")
    if actor_id is not None:
        actor_id = str(actor_id)

    actor_name = (
        actor.get("full_name")
        or actor.get("name")
        or actor.get("email")
        or (str(actor.get("user_id")) if actor.get("user_id") is not None else None)
    )

    actor_avatar = actor.get("avatar_url")
    return actor_id, actor_name, actor_avatar


class OrganisationService(BaseService[Organisation, OrganisationCreate, OrganisationUpdate]):
    """Service pour la gestion des organisations"""

    def __init__(self, db: Session):
        super().__init__(Organisation, db)

    @staticmethod
    def _extract_actor(actor: Optional[dict]) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        return _normalize_actor(actor)

    @staticmethod
    def _organisation_metadata(org: Organisation) -> Dict[str, Any]:
        """Construit les métadonnées standard pour une organisation."""
        return {
            "organisation_id": org.id,
            "name": org.name,
            "category": org.category.value if getattr(org, "category", None) else None,
            "country_code": getattr(org, "country_code", None),
            "language": getattr(org, "language", None),
            "is_active": getattr(org, "is_active", None),
        }

    async def _record_activity(
        self,
        organisation: Organisation,
        activity_type: OrganisationActivityType,
        title: str,
        *,
        actor: Optional[dict] = None,
        preview: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        occurred_at: Optional[datetime] = None,
    ) -> None:
        """Centralise l'enregistrement d'une activité organisation."""
        activity_service = OrganisationActivityService(self.db)
        actor_id, actor_name, actor_avatar = self._extract_actor(actor)

        base_metadata = self._organisation_metadata(organisation)
        if metadata:
            base_metadata.update(metadata)

        await activity_service.record(
            organisation_id=organisation.id,
            activity_type=activity_type,
            title=title,
            preview=preview,
            occurred_at=occurred_at or datetime.now(UTC),
            actor_id=actor_id,
            actor_name=actor_name,
            actor_avatar_url=actor_avatar,
            resource_type="organisation",
            resource_id=organisation.id,
            metadata=base_metadata,
        )

    async def create(
        self,
        schema: OrganisationCreate,
        *,
        actor: Optional[dict] = None,
    ) -> Organisation:
        """Créer une organisation et enregistrer l'activité associée."""
        organisation = await super().create(schema)

        preview_parts = [
            organisation.category.value if getattr(organisation, "category", None) else None,
            getattr(organisation, "country_code", None),
        ]
        preview = " • ".join([p for p in preview_parts if p])

        await self._record_activity(
            organisation,
            OrganisationActivityType.ORGANISATION_CREATED,
            title=f"Organisation créée • {organisation.name}",
            actor=actor,
            preview=preview or None,
        )

        return organisation

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[dict] = None
    ) -> Tuple[List[Organisation], int]:
        """
        Récupérer les organisations avec leurs relations clés préchargées pour éviter le N+1.
        """
        try:
            query = (
                self.db.query(Organisation)
                .options(
                    joinedload(Organisation.mandats),
                    joinedload(Organisation.contacts),
                )
            )

            if filters:
                for key, value in filters.items():
                    column = getattr(Organisation, key, None)
                    if column is not None and value is not None:
                        query = query.filter(column == value)

            total = query.count()
            items = query.offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error fetching organisations with relations: {e}")
            raise DatabaseError("Failed to fetch organisations")

    async def update(
        self,
        organisation_id: int,
        schema: OrganisationUpdate,
        *,
        actor: Optional[dict] = None,
    ) -> Organisation:
        """Mettre à jour une organisation avec historisation timeline."""
        organisation = await self.get_by_id(organisation_id)

        update_data = schema.model_dump(exclude_unset=True)
        if not update_data:
            return organisation

        previous_values = {
            field: getattr(organisation, field, None)
            for field in update_data.keys()
        }

        for key, value in update_data.items():
            if hasattr(organisation, key):
                setattr(organisation, key, value)

        self.db.add(organisation)
        self.db.commit()
        self.db.refresh(organisation)

        changes = []
        for field, old_value in previous_values.items():
            new_value = getattr(organisation, field, None)
            serialized_old = getattr(old_value, "value", old_value)
            serialized_new = getattr(new_value, "value", new_value)
            if serialized_new != serialized_old:
                changes.append(
                    {
                        "field": field,
                        "old": serialized_old,
                        "new": serialized_new,
                    }
                )

        if changes:
            preview = " • ".join(
                f"{change['field']} → {change['new']}" for change in changes[:3]
            )
            await self._record_activity(
                organisation,
                OrganisationActivityType.ORGANISATION_UPDATED,
                title=f"Organisation mise à jour • {organisation.name}",
                actor=actor,
                preview=preview,
                metadata={"changes": changes},
            )

        return organisation

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

    async def create(
        self,
        schema: MandatDistributionCreate,
        *,
        actor: Optional[dict] = None,
    ) -> MandatDistribution:
        mandat = await super().create(schema)

        status_display = mandat.status.value if getattr(mandat, "status", None) else "proposé"
        preview_parts = []
        if getattr(mandat, "date_debut", None):
            preview_parts.append(f"Début {mandat.date_debut.strftime('%d/%m/%Y')}")
        if getattr(mandat, "date_fin", None):
            preview_parts.append(f"Fin {mandat.date_fin.strftime('%d/%m/%Y')}")

        await self._record_activity(
            mandat,
            OrganisationActivityType.MANDAT_CREATED,
            title=f"Mandat créé • {status_display}",
            actor=actor,
            preview=" • ".join(preview_parts) if preview_parts else None,
        )

        return mandat

    async def update(
        self,
        mandat_id: int,
        schema: MandatDistributionUpdate,
        *,
        actor: Optional[dict] = None,
    ) -> MandatDistribution:
        mandat = await self.get_by_id(mandat_id)

        update_data = schema.model_dump(exclude_unset=True)
        if not update_data:
            return mandat

        previous_values = {
            field: getattr(mandat, field, None)
            for field in update_data.keys()
        }

        for key, value in update_data.items():
            if hasattr(mandat, key):
                setattr(mandat, key, value)

        self.db.add(mandat)
        self.db.commit()
        self.db.refresh(mandat)

        changes = []
        for field, old_value in previous_values.items():
            new_value = getattr(mandat, field, None)
            old_serialized = getattr(old_value, "value", old_value)
            new_serialized = getattr(new_value, "value", new_value)
            if new_serialized != old_serialized:
                changes.append(
                    {
                        "field": field,
                        "old": old_serialized,
                        "new": new_serialized,
                    }
                )

        if changes:
            activity_type = (
                OrganisationActivityType.MANDAT_STATUS_CHANGED
                if any(change["field"] == "status" for change in changes)
                else OrganisationActivityType.MANDAT_UPDATED
            )

            preview = " • ".join(
                f"{change['field']} → {change['new']}" for change in changes[:3]
            )

            await self._record_activity(
                mandat,
                activity_type,
                title=f"Mandat mis à jour • {mandat.status.value if getattr(mandat, 'status', None) else ''}",
                actor=actor,
                preview=preview,
                metadata={"changes": changes},
            )

        return mandat

    @staticmethod
    def _mandat_metadata(mandat: MandatDistribution) -> Dict[str, Any]:
        return {
            "mandat_id": mandat.id,
            "organisation_id": mandat.organisation_id,
            "status": mandat.status.value if getattr(mandat, "status", None) else None,
            "date_signature": mandat.date_signature.isoformat() if getattr(mandat, "date_signature", None) else None,
            "date_debut": mandat.date_debut.isoformat() if getattr(mandat, "date_debut", None) else None,
            "date_fin": mandat.date_fin.isoformat() if getattr(mandat, "date_fin", None) else None,
            "organisation_name": getattr(getattr(mandat, "organisation", None), "name", None),
        }

    async def _record_activity(
        self,
        mandat: MandatDistribution,
        activity_type: OrganisationActivityType,
        title: str,
        *,
        actor: Optional[dict] = None,
        preview: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        if not mandat.organisation_id:
            return

        activity_service = OrganisationActivityService(self.db)
        actor_id, actor_name, actor_avatar = _normalize_actor(actor)

        payload = self._mandat_metadata(mandat)
        if metadata:
            payload.update(metadata)

        await activity_service.record(
            organisation_id=mandat.organisation_id,
            activity_type=activity_type,
            title=title,
            preview=preview,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_avatar_url=actor_avatar,
            resource_type="mandat",
            resource_id=mandat.id,
            metadata=payload,
        )

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

    def get_by_isin(self, isin: str) -> Optional[Produit]:
        """Récupérer un produit par son code ISIN"""
        try:
            return self.db.query(Produit).filter(Produit.isin == isin).first()
        except Exception as e:
            logger.error(f"Error fetching produit by ISIN {isin}: {e}")
            raise

    def search(
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

    def get_by_mandat(self, mandat_id: int) -> List[Produit]:
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

    def create(self, schema: MandatProduitCreate) -> MandatProduit:
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

    def get_by_mandat_and_produit(
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
