"""
Team model - lightweight grouping of users for RBAC filtering.
"""

from sqlalchemy import Boolean, Column, String, Text
from sqlalchemy.orm import relationship

from models.base import BaseModel


class Team(BaseModel):
    __tablename__ = "teams"

    name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    members = relationship("User", back_populates="team", cascade="all, delete-orphan")
    email_threads = relationship("EmailThread", back_populates="team", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Team(id={self.id}, name='{self.name}')>"
