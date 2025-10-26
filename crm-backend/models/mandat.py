"""
Mandat model (legacy compatibility layer)

Provides a simplified mandate entity leveraged by exports and tests while
staying consistent with the unified Organisation architecture.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from models.base import BaseModel
from models.constants import (
    ENUM_MANDAT_STATUS,
    FK_MANDATS_ID,
    FK_ORGANISATIONS_ID,
    FK_USERS_ID,
    ONDELETE_CASCADE,
    ONDELETE_SET_NULL,
)
from models.organisation import Organisation


class MandatType(str, enum.Enum):
    VENTE = "vente"
    ACQUISITION = "acquisition"
    DISTRIBUTION = "distribution"


class MandatStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    SIGNED = "signed"
    EXPIRED = "expired"
    CLOSED = "closed"


class Mandat(BaseModel):
    __tablename__ = "mandats"

    organisation_id = Column(Integer, ForeignKey(FK_ORGANISATIONS_ID, ondelete=ONDELETE_CASCADE), nullable=False, index=True)
    number = Column(String(100), unique=True, nullable=True, index=True)
    type = Column(Enum(MandatType, name="mandattype"), nullable=False, default=MandatType.VENTE, index=True)
    status = Column(Enum(MandatStatus, name=ENUM_MANDAT_STATUS), nullable=False, default=MandatStatus.DRAFT, index=True)

    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    amount = Column(Numeric(15, 2), nullable=True)

    description = Column(Text, nullable=True)
    conditions = Column(Text, nullable=True)

    owner_id = Column(Integer, ForeignKey(FK_USERS_ID, ondelete=ONDELETE_SET_NULL), nullable=True, index=True)

    organisation = relationship("Organisation", back_populates="legacy_mandats")
    owner = relationship("User", back_populates="legacy_mandats")

    def __repr__(self) -> str:
        return f"<Mandat(id={self.id}, number={self.number}, status={self.status})>"

    def is_active(self) -> bool:
        """Helper pour les exports/tests."""
        return self.status in {MandatStatus.ACTIVE, MandatStatus.SIGNED}
