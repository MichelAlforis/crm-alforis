"""
Service pour les statistiques Dashboard
Remplace progressivement le système KPI legacy
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from models.kpi import DashboardKPI
from models.kpi import DashboardKPI as OrganisationKPI
from models.organisation import Organisation
from models.organisation_activity import OrganisationActivity, OrganisationActivityType
from models.task import Task, TaskStatus
from schemas.dashboard_stats import (
    GlobalDashboardStats,
    MonthlyAggregateStats,
    OrganisationMonthlyKPI,
    OrganisationStatsResponse,
    YearlyAggregateStats,
)
from services.kpi import OrganisationKPIService

logger = logging.getLogger(__name__)


class DashboardStatsService:
    """Service de calcul des statistiques dashboard"""

    ACTIVITY_METADATA_FIELD_MAPPING = {
        "rdv": "rdv_count",
        "rdv_count": "rdv_count",
        "meeting": "rdv_count",
        "reunion": "rdv_count",
        "pitch": "pitchs",
        "pitchs": "pitchs",
        "due_diligence": "due_diligences",
        "due_diligences": "due_diligences",
        "closing": "closings",
        "signing": "closings",
    }

    ACTIVITY_TYPE_FIELD_MAPPING = {
        OrganisationActivityType.REUNION: "rdv_count",
        OrganisationActivityType.APPEL: "pitchs",
        OrganisationActivityType.EMAIL: "pitchs",
        OrganisationActivityType.MANDAT_CREATED: "due_diligences",
        OrganisationActivityType.MANDAT_UPDATED: "due_diligences",
        OrganisationActivityType.MANDAT_SIGNED: "closings",
    }

    REVENUE_METADATA_KEYS = (
        "revenue",
        "montant",
        "amount",
        "deal_amount",
        "contract_value",
    )

    COMMISSION_METADATA_KEYS = (
        "commission_rate",
        "commission",
        "fee_rate",
        "taux_commission",
    )

    def __init__(self, db: Session):
        self.db = db

    # ---------- Helpers ----------

    @staticmethod
    def _get_period_bounds(year: int, month: int) -> Tuple[datetime, datetime]:
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        return start, end

    @classmethod
    def _infer_kpi_field(cls, activity: OrganisationActivity) -> Optional[str]:
        metadata = activity.activity_metadata or {}

        # 1. Métadonnées explicites
        raw_category = metadata.get("kpi_category") or metadata.get("category")
        if isinstance(raw_category, str):
            key = raw_category.lower().strip()
            if key in cls.ACTIVITY_METADATA_FIELD_MAPPING:
                return cls.ACTIVITY_METADATA_FIELD_MAPPING[key]

        # 2. Type d'activité
        mapped = cls.ACTIVITY_TYPE_FIELD_MAPPING.get(activity.type)
        if mapped:
            return mapped

        # 3. Tenter via metadata flags (boolean)
        for meta_key, field in cls.ACTIVITY_METADATA_FIELD_MAPPING.items():
            value = metadata.get(meta_key)
            if isinstance(value, bool) and value:
                return field

        return None

    @classmethod
    def _extract_numeric(cls, metadata: Dict[str, Any], keys: Tuple[str, ...]) -> Optional[float]:
        for key in keys:
            if key in metadata and metadata[key] is not None:
                try:
                    return float(metadata[key])
                except (TypeError, ValueError):
                    continue
        return None

    def _aggregate_kpis_from_activities(
        self,
        organisation_id: Optional[int] = None,
        year: Optional[int] = None,
        month: Optional[int] = None,
    ) -> Dict[Tuple[int, int, int], Dict[str, Any]]:
        """
        Agrège les activités pour suggérer des KPI automatiquement.

        Retourne un dict { (organisation_id, year, month): {metrics...} }
        """
        query = self.db.query(OrganisationActivity)
        if organisation_id:
            query = query.filter(OrganisationActivity.organisation_id == organisation_id)

        # Filtre par période
        if year and month:
            start, end = self._get_period_bounds(year, month)
            query = query.filter(
                and_(
                    OrganisationActivity.occurred_at >= start,
                    OrganisationActivity.occurred_at < end,
                )
            )
        elif year:
            start = datetime(year, 1, 1, tzinfo=timezone.utc)
            end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
            query = query.filter(
                and_(
                    OrganisationActivity.occurred_at >= start,
                    OrganisationActivity.occurred_at < end,
                )
            )

        activities = query.all()
        buckets: Dict[Tuple[int, int, int], Dict[str, Any]] = defaultdict(
            lambda: {
                "rdv_count": 0,
                "pitchs": 0,
                "due_diligences": 0,
                "closings": 0,
                "revenue": 0.0,
                "commission_values": [],
            }
        )

        for activity in activities:
            occurred_at = activity.occurred_at or activity.created_at
            if not occurred_at:
                continue

            # Normalise timezone
            if occurred_at.tzinfo is None:
                occurred_at = occurred_at.replace(tzinfo=timezone.utc)

            bucket_key = (
                activity.organisation_id,
                occurred_at.year,
                occurred_at.month,
            )
            bucket = buckets[bucket_key]

            field = self._infer_kpi_field(activity)
            if field:
                bucket[field] += 1

            metadata = activity.activity_metadata or {}

            revenue_value = self._extract_numeric(metadata, self.REVENUE_METADATA_KEYS)
            if revenue_value:
                bucket["revenue"] += revenue_value

            commission = self._extract_numeric(metadata, self.COMMISSION_METADATA_KEYS)
            if commission is not None:
                bucket["commission_values"].append(commission)

        # Finalise commission rate
        for bucket in buckets.values():
            if bucket["commission_values"]:
                bucket["commission_rate"] = sum(bucket["commission_values"]) / len(bucket["commission_values"])
            else:
                bucket["commission_rate"] = None
            bucket.pop("commission_values", None)

        return buckets

    # ============= STATISTIQUES GLOBALES =============

    async def get_global_stats(self) -> GlobalDashboardStats:
        """
        Calcule les statistiques globales pour le dashboard principal
        """
        try:
            # Compter les organisations
            total_orgs = self.db.query(func.count(Organisation.id)).filter(
                Organisation.is_active == True
            ).scalar() or 0

            # Organisations par catégorie
            orgs_by_category_raw = (
                self.db.query(
                    Organisation.category,
                    func.count(Organisation.id)
                )
                .filter(Organisation.is_active == True)
                .group_by(Organisation.category)
                .all()
            )
            orgs_by_category = {
                str(cat): count for cat, count in orgs_by_category_raw if cat
            }

            # Organisations par type (pipeline)
            orgs_by_type_raw = (
                self.db.query(
                    Organisation.type,
                    func.count(Organisation.id)
                )
                .filter(Organisation.is_active == True)
                .group_by(Organisation.type)
                .all()
            )
            orgs_by_pipeline = {
                str(type_): count for type_, count in orgs_by_type_raw if type_
            }

            # Tâches
            total_tasks = self.db.query(func.count(Task.id)).scalar() or 0

            completed_tasks = (
                self.db.query(func.count(Task.id))
                .filter(Task.status == TaskStatus.DONE)
                .scalar() or 0
            )

            today = datetime.now().date()
            overdue_tasks = (
                self.db.query(func.count(Task.id))
                .filter(
                    and_(
                        Task.status != TaskStatus.DONE,
                        Task.due_date < today
                    )
                )
                .scalar() or 0
            )

            tasks_due_today = (
                self.db.query(func.count(Task.id))
                .filter(
                    and_(
                        Task.status != TaskStatus.DONE,
                        Task.due_date == today
                    )
                )
                .scalar() or 0
            )

            # Activités récentes
            seven_days_ago = datetime.now() - timedelta(days=7)
            thirty_days_ago = datetime.now() - timedelta(days=30)

            activities_7d = (
                self.db.query(func.count(OrganisationActivity.id))
                .filter(OrganisationActivity.occurred_at >= seven_days_ago)
                .scalar() or 0
            )

            activities_30d = (
                self.db.query(func.count(OrganisationActivity.id))
                .filter(OrganisationActivity.occurred_at >= thirty_days_ago)
                .scalar() or 0
            )

            return GlobalDashboardStats(
                total_organisations=total_orgs,
                organisations_by_category=orgs_by_category,
                organisations_by_pipeline=orgs_by_pipeline,
                total_people=0,  # À implémenter si besoin
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                overdue_tasks=overdue_tasks,
                tasks_due_today=tasks_due_today,
                total_mandats=0,  # À implémenter si besoin
                active_mandats=0,
                expiring_soon_mandats=0,
                total_revenue=0.0,  # À implémenter avec KPI
                activities_last_7_days=activities_7d,
                activities_last_30_days=activities_30d,
            )

        except Exception as e:
            logger.error(f"Error calculating global stats: {e}")
            raise

    # ============= STATISTIQUES PAR ORGANISATION =============

    async def get_organisation_stats(
        self, organisation_id: int
    ) -> OrganisationStatsResponse:
        """
        Calcule les statistiques pour une organisation spécifique
        """
        try:
            org = self.db.query(Organisation).filter(Organisation.id == organisation_id).first()
            if not org:
                raise ValueError(f"Organisation {organisation_id} not found")

            # Compter les tâches
            total_tasks = (
                self.db.query(func.count(Task.id))
                .filter(Task.organisation_id == organisation_id)
                .scalar() or 0
            )

            completed_tasks = (
                self.db.query(func.count(Task.id))
                .filter(
                    and_(
                        Task.organisation_id == organisation_id,
                        Task.status == TaskStatus.DONE
                    )
                )
                .scalar() or 0
            )

            pending_tasks = total_tasks - completed_tasks

            total_interactions = (
                self.db.query(func.count(OrganisationActivity.id))
                .filter(OrganisationActivity.organisation_id == organisation_id)
                .scalar() or 0
            )

            # Dernière activité
            last_activity = (
                self.db.query(OrganisationActivity.occurred_at)
                .filter(OrganisationActivity.organisation_id == organisation_id)
                .order_by(OrganisationActivity.occurred_at.desc())
                .first()
            )

            return OrganisationStatsResponse(
                organisation_id=organisation_id,
                organisation_name=org.name,
                total_interactions=total_interactions,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                pending_tasks=pending_tasks,
                total_mandats=0,
                active_mandats=0,
                total_revenue=0.0,
                pipeline_stage=str(org.type) if org.type else None,
                last_activity_date=last_activity[0].isoformat() if last_activity else None,
            )

        except Exception as e:
            logger.error(f"Error calculating org stats for {organisation_id}: {e}")
            raise

    # ============= KPI MENSUELS (COMPATIBILITÉ LEGACY) =============

    async def get_monthly_kpis(
        self,
        organisation_id: int,
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> List[OrganisationMonthlyKPI]:
        """
        Retourne les KPI mensuels pour une organisation.
        Priorité aux KPI enregistrés manuellement, puis suggestions calculées depuis les activités.
        """
        stored_query = (
            self.db.query(DashboardKPI)
            .filter(DashboardKPI.organisation_id == organisation_id)
        )
        if year:
            stored_query = stored_query.filter(DashboardKPI.year == year)
        if month:
            stored_query = stored_query.filter(DashboardKPI.month == month)

        stored_kpis = stored_query.order_by(
            DashboardKPI.year.desc(),
            DashboardKPI.month.desc(),
        ).all()

        stored_map: Dict[Tuple[int, int], DashboardKPI] = {
            (k.year, k.month): k for k in stored_kpis
        }

        activity_suggestions = self._aggregate_kpis_from_activities(
            organisation_id=organisation_id,
            year=year,
            month=month,
        )

        results: List[OrganisationMonthlyKPI] = []

        def serialize(record: DashboardKPI) -> OrganisationMonthlyKPI:
            return OrganisationMonthlyKPI(
                id=record.id,
                organisation_id=record.organisation_id,
                year=record.year,
                month=record.month,
                rdv_count=record.rdv_count,
                pitchs=record.pitchs,
                due_diligences=record.due_diligences,
                closings=record.closings,
                revenue=record.revenue,
                commission_rate=record.commission_rate,
                notes=record.notes,
                created_at=record.created_at.isoformat() if record.created_at else None,
                updated_at=record.updated_at.isoformat() if record.updated_at else None,
                auto_generated=record.auto_generated,
                source=record.data_source or ("activity" if record.auto_generated else "manual"),
            )

        # 1. KPI enregistrés
        for record in stored_kpis:
            results.append(serialize(record))

        # 2. Suggestions automatiques pour les mois sans KPI
        for key, values in activity_suggestions.items():
            org_id, year_value, month_value = key
            if org_id != organisation_id:
                continue

            if (year_value, month_value) in stored_map:
                # Ne pas dupliquer si un KPI manuel existe déjà
                continue

            if not any(
                values[field] for field in ("rdv_count", "pitchs", "due_diligences", "closings", "revenue")
            ):
                continue

            results.append(
                OrganisationMonthlyKPI(
                    id=None,
                    organisation_id=organisation_id,
                    year=year_value,
                    month=month_value,
                    rdv_count=values["rdv_count"],
                    pitchs=values["pitchs"],
                    due_diligences=values["due_diligences"],
                    closings=values["closings"],
                    revenue=values["revenue"],
                    commission_rate=values.get("commission_rate"),
                    notes=None,
                    created_at=None,
                    updated_at=None,
                    auto_generated=True,
                    source="activity",
                )
            )

        results.sort(key=lambda item: (item.year, item.month), reverse=True)
        return results

    async def create_or_update_monthly_kpi(
        self,
        organisation_id: int,
        year: int,
        month: int,
        data: Dict[str, Any]
    ) -> OrganisationMonthlyKPI:
        """
        Crée ou met à jour un KPI mensuel pour une organisation.
        Les KPI créés par cette méthode sont considérés comme manuels.
        """
        fields = {
            "rdv_count": int(data.get("rdv_count", 0) or 0),
            "pitchs": int(data.get("pitchs", 0) or 0),
            "due_diligences": int(data.get("due_diligences", 0) or 0),
            "closings": int(data.get("closings", 0) or 0),
            "revenue": float(data.get("revenue", 0) or 0.0),
            "commission_rate": data.get("commission_rate"),
            "notes": data.get("notes"),
        }

        record = (
            self.db.query(DashboardKPI)
            .filter(
                DashboardKPI.organisation_id == organisation_id,
                DashboardKPI.year == year,
                DashboardKPI.month == month,
            )
            .first()
        )

        if record:
            for field, value in fields.items():
                setattr(record, field, value)
            record.auto_generated = bool(data.get("auto_generated", False))
            record.data_source = data.get(
                "source",
                "activity" if record.auto_generated else "manual",
            )
        else:
            record = DashboardKPI(
                organisation_id=organisation_id,
                year=year,
                month=month,
                **fields,
            )
            record.auto_generated = bool(data.get("auto_generated", False))
            record.data_source = data.get(
                "source",
                "activity" if record.auto_generated else "manual",
            )
            self.db.add(record)

        self.db.commit()
        self.db.refresh(record)

        return OrganisationMonthlyKPI(
            id=record.id,
            organisation_id=record.organisation_id,
            year=record.year,
            month=record.month,
            rdv_count=record.rdv_count,
            pitchs=record.pitchs,
            due_diligences=record.due_diligences,
            closings=record.closings,
            revenue=record.revenue,
            commission_rate=record.commission_rate,
            notes=record.notes,
            created_at=record.created_at.isoformat() if record.created_at else None,
            updated_at=record.updated_at.isoformat() if record.updated_at else None,
            auto_generated=record.auto_generated,
            source=record.data_source or ("activity" if record.auto_generated else "manual"),
        )

    def _update_kpi_fields(self, record: DashboardKPI, data: Dict[str, Any]) -> None:
        """Met à jour les champs du KPI selon leur type."""
        # Mapping: champ -> type de conversion
        field_converters = {
            "rdv_count": int,
            "pitchs": int,
            "due_diligences": int,
            "closings": int,
            "revenue": float,
            "commission_rate": float,
            "notes": str,
            "auto_generated": bool,
        }

        for field, converter in field_converters.items():
            if field in data and data[field] is not None:
                setattr(record, field, converter(data[field]))

        if "source" in data and data["source"]:
            record.data_source = data["source"]

        # Déterminer la source par défaut selon auto_generated
        default_source = "activity" if record.auto_generated else "manual"
        record.data_source = record.data_source or default_source

    async def update_kpi_by_id(self, kpi_id: int, data: Dict[str, Any]) -> OrganisationMonthlyKPI:
        record = self.db.query(DashboardKPI).filter(DashboardKPI.id == kpi_id).first()
        if not record:
            raise ValueError(f"KPI {kpi_id} not found")

        self._update_kpi_fields(record, data)

        self.db.commit()
        self.db.refresh(record)

        return OrganisationMonthlyKPI(
            organisation_id=record.organisation_id,
            year=record.year,
            month=record.month,
            rdv_count=record.rdv_count,
            pitchs=record.pitchs,
            due_diligences=record.due_diligences,
            closings=record.closings,
            revenue=record.revenue,
            commission_rate=record.commission_rate,
            notes=record.notes,
            created_at=record.created_at.isoformat() if record.created_at else None,
            updated_at=record.updated_at.isoformat() if record.updated_at else None,
            auto_generated=record.auto_generated,
            source=record.data_source or ("activity" if record.auto_generated else "manual"),
        )

    async def delete_kpi(self, kpi_id: int) -> None:
        record = self.db.query(DashboardKPI).filter(DashboardKPI.id == kpi_id).first()
        if not record:
            raise ValueError(f"KPI {kpi_id} not found")
        self.db.delete(record)
        self.db.commit()

    # ============= AGRÉGATIONS MENSUELLES =============

    async def get_monthly_aggregate(
        self, year: int, month: int
    ) -> MonthlyAggregateStats:
        """
        Agrège les KPIs de toutes les organisations pour un mois donné
        """
        stored = (
            self.db.query(DashboardKPI)
            .filter(
                DashboardKPI.year == year,
                DashboardKPI.month == month,
            )
            .all()
        )

        stored_map = {
            (record.organisation_id, record.year, record.month): record for record in stored
        }

        activity_suggestions = self._aggregate_kpis_from_activities(
            organisation_id=None,
            year=year,
            month=month,
        )

        organisations_entries: List[OrganisationMonthlyKPI] = []
        commission_values: List[float] = []
        org_ids = set()

        def append_record(record: DashboardKPI):
            organisations_entries.append(
                OrganisationMonthlyKPI(
                    id=record.id,
                    organisation_id=record.organisation_id,
                    year=record.year,
                    month=record.month,
                    rdv_count=record.rdv_count,
                    pitchs=record.pitchs,
                    due_diligences=record.due_diligences,
                    closings=record.closings,
                    revenue=record.revenue,
                    commission_rate=record.commission_rate,
                    notes=record.notes,
                    created_at=record.created_at.isoformat() if record.created_at else None,
                    updated_at=record.updated_at.isoformat() if record.updated_at else None,
                    auto_generated=record.auto_generated,
                    source=record.data_source or ("activity" if record.auto_generated else "manual"),
                )
            )
            if record.commission_rate is not None:
                commission_values.append(record.commission_rate)
            org_ids.add(record.organisation_id)

        def append_auto(org_id: int, data: Dict[str, Any]):
            organisations_entries.append(
                OrganisationMonthlyKPI(
                    id=None,
                    organisation_id=org_id,
                    year=year,
                    month=month,
                    rdv_count=data["rdv_count"],
                    pitchs=data["pitchs"],
                    due_diligences=data["due_diligences"],
                    closings=data["closings"],
                    revenue=data["revenue"],
                    commission_rate=data.get("commission_rate"),
                    notes=None,
                    auto_generated=True,
                    source="activity",
                )
            )
            if data.get("commission_rate") is not None:
                commission_values.append(data["commission_rate"])
            org_ids.add(org_id)

        for record in stored:
            append_record(record)

        for key, data in activity_suggestions.items():
            org_id, _, _ = key
            if (org_id, year, month) in stored_map:
                continue
            if not any(
                data[field] for field in ("rdv_count", "pitchs", "due_diligences", "closings", "revenue")
            ):
                continue
            append_auto(org_id, data)

        total_rdv = sum(item.rdv_count for item in organisations_entries)
        total_pitchs = sum(item.pitchs for item in organisations_entries)
        total_due = sum(item.due_diligences for item in organisations_entries)
        total_closings = sum(item.closings for item in organisations_entries)
        total_revenue = sum(item.revenue or 0 for item in organisations_entries)

        average_commission_rate = (
            sum(commission_values) / len(commission_values) if commission_values else 0.0
        )

        organisations_entries.sort(key=lambda item: (item.organisation_id, item.month))

        return MonthlyAggregateStats(
            year=year,
            month=month,
            total_rdv=total_rdv,
            total_pitchs=total_pitchs,
            total_due_diligences=total_due,
            total_closings=total_closings,
            total_revenue=total_revenue,
            average_commission_rate=average_commission_rate,
            organisation_count=len(org_ids),
            organisations=organisations_entries or None,
        )

    async def get_yearly_aggregate(
        self, organisation_id: int, year: int
    ) -> YearlyAggregateStats:
        """
        Agrège les KPIs d'une organisation pour une année complète
        """
        org = (
            self.db.query(Organisation)
            .filter(Organisation.id == organisation_id)
            .first()
        )
        if not org:
            raise ValueError(f"Organisation {organisation_id} not found")

        stored_kpis = (
            self.db.query(DashboardKPI)
            .filter(
                DashboardKPI.organisation_id == organisation_id,
                DashboardKPI.year == year,
            )
            .order_by(DashboardKPI.month.asc())
            .all()
        )

        stored_map = {(k.month): k for k in stored_kpis}

        activity_suggestions = self._aggregate_kpis_from_activities(
            organisation_id=organisation_id,
            year=year,
            month=None,
        )

        monthly_data: List[OrganisationMonthlyKPI] = []

        totals = {
            "rdv": 0,
            "pitchs": 0,
            "due": 0,
            "closings": 0,
            "revenue": 0.0,
            "commissions": [],
        }

        for record in stored_kpis:
            monthly = OrganisationMonthlyKPI(
                id=record.id,
                organisation_id=organisation_id,
                year=record.year,
                month=record.month,
                rdv_count=record.rdv_count,
                pitchs=record.pitchs,
                due_diligences=record.due_diligences,
                closings=record.closings,
                revenue=record.revenue,
                commission_rate=record.commission_rate,
                notes=record.notes,
                created_at=record.created_at.isoformat() if record.created_at else None,
                updated_at=record.updated_at.isoformat() if record.updated_at else None,
                auto_generated=record.auto_generated,
                source=record.data_source or ("activity" if record.auto_generated else "manual"),
            )
            monthly_data.append(monthly)
            totals["rdv"] += record.rdv_count
            totals["pitchs"] += record.pitchs
            totals["due"] += record.due_diligences
            totals["closings"] += record.closings
            totals["revenue"] += record.revenue or 0
            if record.commission_rate is not None:
                totals["commissions"].append(record.commission_rate)

        for key, data in activity_suggestions.items():
            org_id, y, m = key
            if org_id != organisation_id or y != year:
                continue
            if m in stored_map:
                continue
            if not any(
                data[field] for field in ("rdv_count", "pitchs", "due_diligences", "closings", "revenue")
            ):
                continue
            monthly = OrganisationMonthlyKPI(
                id=None,
                organisation_id=organisation_id,
                year=year,
                month=m,
                rdv_count=data["rdv_count"],
                pitchs=data["pitchs"],
                due_diligences=data["due_diligences"],
                closings=data["closings"],
                revenue=data["revenue"],
                commission_rate=data.get("commission_rate"),
                notes=None,
                auto_generated=True,
                source="activity",
            )
            monthly_data.append(monthly)
            totals["rdv"] += data["rdv_count"]
            totals["pitchs"] += data["pitchs"]
            totals["due"] += data["due_diligences"]
            totals["closings"] += data["closings"]
            totals["revenue"] += data["revenue"]
            if data.get("commission_rate") is not None:
                totals["commissions"].append(data["commission_rate"])

        monthly_data.sort(key=lambda item: item.month)

        average_commission = (
            sum(totals["commissions"]) / len(totals["commissions"])
            if totals["commissions"]
            else 0.0
        )

        return YearlyAggregateStats(
            organisation_id=organisation_id,
            organisation_name=org.name,
            year=year,
            total_rdv=totals["rdv"],
            total_pitchs=totals["pitchs"],
            total_due_diligences=totals["due"],
            total_closings=totals["closings"],
            total_revenue=totals["revenue"],
            average_commission_rate=average_commission,
            monthly_data=monthly_data,
            months_recorded=len(monthly_data),
        )
