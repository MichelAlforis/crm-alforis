"""
Service pour la gestion des KPIs (Organisation)
Remplace l'ancien KPIService qui utilisait les modèles legacy
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional, Dict, Any
import logging

from models.kpi import OrganisationKPI
from models.organisation import Organisation
from core.exceptions import ValidationError, ResourceNotFound

logger = logging.getLogger(__name__)


class OrganisationKPIService:
    """Service de gestion des KPIs d'organisation"""

    def __init__(self, db: Session):
        self.db = db

    # ============= LECTURE =============

    async def get_kpis_by_organisation(
        self,
        organisation_id: int,
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> List[OrganisationKPI]:
        """
        Récupère les KPIs d'une organisation pour une période donnée
        """
        try:
            # Vérifier que l'organisation existe
            org = self.db.query(Organisation).filter(Organisation.id == organisation_id).first()
            if not org:
                raise ResourceNotFound("Organisation", organisation_id)

            query = self.db.query(OrganisationKPI).filter(
                OrganisationKPI.organisation_id == organisation_id
            )

            if year is not None:
                query = query.filter(OrganisationKPI.year == year)

            if month is not None:
                query = query.filter(OrganisationKPI.month == month)

            kpis = query.order_by(
                OrganisationKPI.year.desc(),
                OrganisationKPI.month.desc()
            ).all()

            return kpis

        except ResourceNotFound:
            raise
        except Exception as e:
            logger.error(f"Error fetching KPIs for org {organisation_id}: {e}")
            raise

    async def get_kpi_by_id(self, kpi_id: int) -> OrganisationKPI:
        """Récupère un KPI par son ID"""
        try:
            kpi = self.db.query(OrganisationKPI).filter(OrganisationKPI.id == kpi_id).first()
            if not kpi:
                raise ResourceNotFound("OrganisationKPI", kpi_id)
            return kpi
        except ResourceNotFound:
            raise
        except Exception as e:
            logger.error(f"Error fetching KPI {kpi_id}: {e}")
            raise

    # ============= CRÉATION / MISE À JOUR =============

    async def create_or_update_kpi(
        self,
        organisation_id: int,
        year: int,
        month: int,
        data: Dict[str, Any]
    ) -> OrganisationKPI:
        """
        Crée ou met à jour un KPI (upsert)
        """
        try:
            # Vérifier que l'organisation existe
            org = self.db.query(Organisation).filter(Organisation.id == organisation_id).first()
            if not org:
                raise ResourceNotFound("Organisation", organisation_id)

            # Valider le mois et l'année
            if not (1 <= month <= 12):
                raise ValidationError(f"Invalid month: {month}. Must be between 1 and 12.")

            if not (2020 <= year <= 2100):
                raise ValidationError(f"Invalid year: {year}. Must be between 2020 and 2100.")

            # Chercher un KPI existant
            existing_kpi = self.db.query(OrganisationKPI).filter(
                and_(
                    OrganisationKPI.organisation_id == organisation_id,
                    OrganisationKPI.year == year,
                    OrganisationKPI.month == month
                )
            ).first()

            if existing_kpi:
                # Mise à jour
                for key, value in data.items():
                    if hasattr(existing_kpi, key) and value is not None:
                        setattr(existing_kpi, key, value)

                self.db.commit()
                self.db.refresh(existing_kpi)
                logger.info(f"Updated KPI for org {organisation_id}, {year}-{month:02d}")
                return existing_kpi
            else:
                # Création
                kpi_data = {
                    "organisation_id": organisation_id,
                    "year": year,
                    "month": month,
                    "rdv_count": data.get("rdv_count", 0),
                    "pitchs": data.get("pitchs", 0),
                    "due_diligences": data.get("due_diligences", 0),
                    "closings": data.get("closings", 0),
                    "revenue": data.get("revenue", 0.0),
                    "commission_rate": data.get("commission_rate"),
                    "notes": data.get("notes"),
                }

                new_kpi = OrganisationKPI(**kpi_data)
                self.db.add(new_kpi)
                self.db.commit()
                self.db.refresh(new_kpi)
                logger.info(f"Created KPI for org {organisation_id}, {year}-{month:02d}")
                return new_kpi

        except (ResourceNotFound, ValidationError):
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating/updating KPI: {e}")
            raise

    async def update_kpi(
        self,
        kpi_id: int,
        data: Dict[str, Any]
    ) -> OrganisationKPI:
        """Met à jour un KPI existant par son ID"""
        try:
            kpi = await self.get_kpi_by_id(kpi_id)

            # Mettre à jour les champs fournis
            for key, value in data.items():
                if hasattr(kpi, key) and value is not None:
                    setattr(kpi, key, value)

            self.db.commit()
            self.db.refresh(kpi)
            logger.info(f"Updated KPI {kpi_id}")
            return kpi

        except ResourceNotFound:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating KPI {kpi_id}: {e}")
            raise

    # ============= SUPPRESSION =============

    async def delete_kpi(self, kpi_id: int) -> None:
        """Supprime un KPI"""
        try:
            kpi = await self.get_kpi_by_id(kpi_id)
            self.db.delete(kpi)
            self.db.commit()
            logger.info(f"Deleted KPI {kpi_id}")

        except ResourceNotFound:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting KPI {kpi_id}: {e}")
            raise

    # ============= AGRÉGATIONS =============

    async def get_monthly_aggregate(
        self, year: int, month: int
    ) -> Dict[str, Any]:
        """
        Agrège les KPIs de toutes les organisations pour un mois donné
        """
        try:
            kpis = self.db.query(OrganisationKPI).filter(
                and_(
                    OrganisationKPI.year == year,
                    OrganisationKPI.month == month
                )
            ).all()

            total_rdv = sum(kpi.rdv_count for kpi in kpis)
            total_pitchs = sum(kpi.pitchs for kpi in kpis)
            total_due_diligences = sum(kpi.due_diligences for kpi in kpis)
            total_closings = sum(kpi.closings for kpi in kpis)
            total_revenue = float(sum(kpi.revenue or 0 for kpi in kpis))

            # Calculer la moyenne des taux de commission (en excluant les None)
            commission_rates = [
                float(kpi.commission_rate)
                for kpi in kpis
                if kpi.commission_rate is not None and kpi.commission_rate > 0
            ]
            avg_commission_rate = (
                sum(commission_rates) / len(commission_rates)
                if commission_rates else 0.0
            )

            return {
                "year": year,
                "month": month,
                "total_rdv": total_rdv,
                "total_pitchs": total_pitchs,
                "total_due_diligences": total_due_diligences,
                "total_closings": total_closings,
                "total_revenue": total_revenue,
                "average_commission_rate": avg_commission_rate,
                "organisation_count": len(kpis),
            }

        except Exception as e:
            logger.error(f"Error getting monthly aggregate for {year}-{month}: {e}")
            raise

    async def get_yearly_aggregate(
        self, organisation_id: int, year: int
    ) -> Dict[str, Any]:
        """
        Agrège les KPIs d'une organisation pour une année complète
        """
        try:
            # Vérifier que l'organisation existe
            org = self.db.query(Organisation).filter(Organisation.id == organisation_id).first()
            if not org:
                raise ResourceNotFound("Organisation", organisation_id)

            kpis = await self.get_kpis_by_organisation(organisation_id, year=year)

            total_rdv = sum(kpi.rdv_count for kpi in kpis)
            total_pitchs = sum(kpi.pitchs for kpi in kpis)
            total_due_diligences = sum(kpi.due_diligences for kpi in kpis)
            total_closings = sum(kpi.closings for kpi in kpis)
            total_revenue = float(sum(kpi.revenue or 0 for kpi in kpis))

            # Calculer la moyenne des taux de commission
            commission_rates = [
                float(kpi.commission_rate)
                for kpi in kpis
                if kpi.commission_rate is not None and kpi.commission_rate > 0
            ]
            avg_commission_rate = (
                sum(commission_rates) / len(commission_rates)
                if commission_rates else 0.0
            )

            # Données mensuelles
            monthly_data = [
                {
                    "organisation_id": kpi.organisation_id,
                    "year": kpi.year,
                    "month": kpi.month,
                    "rdv_count": kpi.rdv_count,
                    "pitchs": kpi.pitchs,
                    "due_diligences": kpi.due_diligences,
                    "closings": kpi.closings,
                    "revenue": float(kpi.revenue or 0),
                    "commission_rate": float(kpi.commission_rate or 0),
                    "notes": kpi.notes,
                    "created_at": kpi.created_at.isoformat() if kpi.created_at else None,
                    "updated_at": kpi.updated_at.isoformat() if kpi.updated_at else None,
                }
                for kpi in kpis
            ]

            return {
                "organisation_id": organisation_id,
                "organisation_name": org.name,
                "year": year,
                "total_rdv": total_rdv,
                "total_pitchs": total_pitchs,
                "total_due_diligences": total_due_diligences,
                "total_closings": total_closings,
                "total_revenue": total_revenue,
                "average_commission_rate": avg_commission_rate,
                "monthly_data": monthly_data,
                "months_recorded": len(kpis),
            }

        except ResourceNotFound:
            raise
        except Exception as e:
            logger.error(f"Error getting yearly aggregate for org {organisation_id}, year {year}: {e}")
            raise
