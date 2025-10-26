"""Modèle DashboardKPI - Stockage des KPI mensuels par organisation."""

from __future__ import annotations

from sqlalchemy import Boolean, Column, Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from models.base import BaseModel


class DashboardKPI(BaseModel):
    """
    KPI mensuel consolidé par organisation.

    Ce modèle remplace l'ancien stockage KPI par investisseur/fournisseur.
    """

    __tablename__ = "dashboard_kpis"
    __table_args__ = (
        UniqueConstraint(
            "organisation_id",
            "year",
            "month",
            name="uq_dashboard_kpis_org_year_month",
        ),
        Index("idx_dashboard_kpis_org", "organisation_id"),
        Index("idx_dashboard_kpis_period", "year", "month"),
    )

    organisation_id = Column(
        Integer,
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
    )
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)

    # Métriques
    rdv_count = Column(Integer, nullable=False, default=0)
    pitchs = Column(Integer, nullable=False, default=0)
    due_diligences = Column(Integer, nullable=False, default=0)
    closings = Column(Integer, nullable=False, default=0)
    revenue = Column(Float, nullable=False, default=0.0)
    commission_rate = Column(Float, nullable=True)

    # Métadonnées
    notes = Column(String, nullable=True)
    auto_generated = Column(Boolean, nullable=False, default=False)
    data_source = Column(String(255), nullable=True)

    organisation = relationship(
        "Organisation",
        back_populates="kpis",
        lazy="joined",
    )

    def mark_manual(self):
        """Convenience helper pour marquer le KPI comme saisi manuellement."""
        self.auto_generated = False
        self.data_source = "manual"
