from sqlalchemy import Column, String, Integer, Boolean, Text, Enum, ForeignKey, Float
from sqlalchemy.orm import relationship
from models.base import BaseModel
import enum

class PipelineStage(str, enum.Enum):
    """Étapes du pipeline commercial"""
    PROSPECT_FROID = "prospect_froid"
    PROSPECT_TIEDE = "prospect_tiede"
    PROSPECT_CHAUD = "prospect_chaud"
    EN_NEGOCIATION = "en_negociation"
    CLIENT = "client"
    INACTIF = "inactif"

class ClientType(str, enum.Enum):
    """Type de client acheteur"""
    CGPI = "cgpi"
    WHOLESALE = "wholesale"
    INSTITUTIONNEL = "institutionnel"
    AUTRE = "autre"

class Investor(BaseModel):
    """
    Modèle pour les investisseurs/fournisseurs
    
    Attributs:
        - Infos générales (name, email, phone)
        - Pipeline (status: prospect_froid → client)
        - Type client (CGPI, Wholesale, Institutionnel)
        - Relations (contacts, interactions, KPIs)
        - Notes et historique
    """
    __tablename__ = "investors"
    
    # Infos générales
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, index=True)
    main_phone = Column("phone", String(20))  # Colonne DB = "phone", attribut Python = "main_phone"
    website = Column(String(255))
    
    # Pipeline commercial
    pipeline_stage = Column(Enum(PipelineStage), default=PipelineStage.PROSPECT_FROID, index=True)
    
    # Type client (si client acheteur)
    client_type = Column(Enum(ClientType), nullable=True)
    
    # Métadonnées
    company = Column(String(255))
    industry = Column(String(255))
    notes = Column(Text)
    is_active = Column(Boolean, default=True, index=True)
    
    # Relations
    contacts = relationship("Contact", back_populates="investor", cascade="all, delete-orphan")
    interactions = relationship("Interaction", back_populates="investor", cascade="all, delete-orphan")
    kpis = relationship("KPI", back_populates="investor", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Investor(id={self.id}, name='{self.name}', stage={self.pipeline_stage})>"

class Contact(BaseModel):
    """Contact lié à un investisseur"""
    __tablename__ = "contacts"
    
    investor_id = Column(Integer, ForeignKey("investors.id"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(20))
    title = Column(String(255))  # ex: "Directeur Commercial"
    notes = Column(Text)
    
    # Relation
    investor = relationship("Investor", back_populates="contacts")
    
    def __repr__(self):
        return f"<Contact(id={self.id}, name='{self.name}', investor_id={self.investor_id})>"

class InteractionType(str, enum.Enum):
    """Types d'interactions possibles"""
    APPEL = "appel"
    EMAIL = "email"
    REUNION = "reunion"
    WEBINAIRE = "webinaire"
    AUTRE = "autre"

class Interaction(BaseModel):
    """Historique des interactions avec un investisseur"""
    __tablename__ = "interactions"
    
    investor_id = Column(Integer, ForeignKey("investors.id"), nullable=False, index=True)
    
    type = Column(Enum(InteractionType), nullable=False)
    date = Column(String(10), nullable=False, index=True)  # Format YYYY-MM-DD
    duration_minutes = Column(Integer)  # Durée en minutes
    subject = Column(String(255))
    notes = Column(Text)
    
    # Relation
    investor = relationship("Investor", back_populates="interactions")
    
    def __repr__(self):
        return f"<Interaction(id={self.id}, type={self.type}, investor_id={self.investor_id})>"

class KPI(BaseModel):
    """KPIs mensuels par investisseur"""
    __tablename__ = "kpis"
    
    investor_id = Column(Integer, ForeignKey("investors.id"), nullable=False, index=True)
    
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    
    # Métriques
    rdv_count = Column(Integer, default=0)
    pitchs = Column(Integer, default=0)
    due_diligences = Column(Integer, default=0)
    closings = Column(Integer, default=0)
    
    # Données financières optionnelles
    revenue = Column(Float, default=0)
    commission_rate = Column(Float, default=0)  # En %
    
    notes = Column(Text)
    
    # Relation
    investor = relationship("Investor", back_populates="kpis")
    
    def __repr__(self):
        return f"<KPI(id={self.id}, investor_id={self.investor_id}, month={self.year}-{self.month:02d})>"
