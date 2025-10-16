from sqlalchemy import Column, Integer, DateTime, String, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime

class Base(DeclarativeBase):
    """Base class pour tous les modèles SQLAlchemy"""
    pass

class BaseModel(Base):
    """
    Modèle de base avec timestamps et id
    Tous les modèles hériteront de celui-ci
    
    Usage:
        class Investor(BaseModel):
            __tablename__ = "investors"
            name = Column(String)
    """
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=False, server_default=func.now())
    
    def __repr__(self):
        return f"<{self.__class__.__name__}(id={self.id})>"
    
    def to_dict(self):
        """Convertir le modèle en dictionnaire"""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }