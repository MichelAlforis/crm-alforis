from sqlalchemy import Column, String, Integer, Boolean, Text, Enum, ForeignKey, Float
from sqlalchemy.orm import relationship
from models.base import BaseModel
import enum

# =======================
# Enums
# =======================

class StageFournisseur(str, enum.Enum):
    """Étapes du cycle fournisseur"""
    PROSPECT_FROID = "prospect_froid"
    PROSPECT_TIEDE = "prospect_tiede"
    PROSPECT_CHAUD = "prospect_chaud"
    EN_NEGOCIATION = "en_negociation"
    FOURNISSEUR = "client"        # cohérence avec l'existant: stade final équiv. "client"
    INACTIF = "inactif"


class TypeFournisseur(str, enum.Enum):
    """Type de fournisseur / partenaire"""
    ASSET_MANAGER = "asset_manager"
    PRESTATAIRE = "prestataire"
    DISTRIBUTEUR = "distributeur"
    ASSURANCE = "assurance"
    AUTRE = "autre"


class InteractionType(str, enum.Enum):
    """Types d'interactions possibles"""
    APPEL = "appel"
    EMAIL = "email"
    REUNION = "reunion"
    WEBINAIRE = "webinaire"
    AUTRE = "autre"


# =======================
# Modèles
# =======================

class Fournisseur(BaseModel):
    """
    Modèle pour les fournisseurs / partenaires

    Attributs:
        - Infos générales (name, email, phone, website, company, activity)
        - Pipeline (stage: prospect_froid → fournisseur)
        - Typologie (type_fournisseur: asset_manager, prestataire, ...)
        - Relations (contacts, interactions, KPIs)
        - Notes et statut
    """
    __tablename__ = "fournisseurs"

    # Infos générales
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(20))
    website = Column(String(255))
    company = Column(String(255))
    activity = Column(String(255))  # ex: "Asset Management", "Legal", "Marketing", ...

    # Pipeline & typologie
    stage = Column(Enum(StageFournisseur), default=StageFournisseur.PROSPECT_FROID, index=True)
    type_fournisseur = Column(Enum(TypeFournisseur), nullable=True)

    # Métadonnées
    notes = Column(Text)
    is_active = Column(Boolean, default=True, index=True)

    # Relations
    contacts = relationship(
        "FournisseurContact",
        back_populates="fournisseur",
        cascade="all, delete-orphan"
    )
    interactions = relationship(
        "FournisseurInteraction",
        back_populates="fournisseur",
        cascade="all, delete-orphan"
    )
    kpis = relationship(
        "FournisseurKPI",
        back_populates="fournisseur",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Fournisseur(id={self.id}, name='{self.name}', stage={self.stage})>"


class FournisseurContact(BaseModel):
    """Contact lié à un fournisseur"""
    __tablename__ = "fournisseur_contacts"

    fournisseur_id = Column(Integer, ForeignKey("fournisseurs.id"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(20))
    title = Column(String(255))  # ex: "Directeur Partenariats"
    notes = Column(Text)

    # Relation
    fournisseur = relationship("Fournisseur", back_populates="contacts")

    def __repr__(self):
        return f"<FournisseurContact(id={self.id}, name='{self.name}', fournisseur_id={self.fournisseur_id})>"


class FournisseurInteraction(BaseModel):
    """Historique des interactions avec un fournisseur"""
    __tablename__ = "fournisseur_interactions"

    fournisseur_id = Column(Integer, ForeignKey("fournisseurs.id"), nullable=False, index=True)

    type = Column(Enum(InteractionType), nullable=False)
    date = Column(String(10), nullable=False, index=True)  # Format YYYY-MM-DD
    duration_minutes = Column(Integer)  # Durée en minutes
    subject = Column(String(255))
    notes = Column(Text)

    # Relation
    fournisseur = relationship("Fournisseur", back_populates="interactions")

    def __repr__(self):
        return f"<FournisseurInteraction(id={self.id}, type={self.type}, fournisseur_id={self.fournisseur_id})>"


class FournisseurKPI(BaseModel):
    """KPIs mensuels par fournisseur"""
    __tablename__ = "fournisseur_kpis"

    fournisseur_id = Column(Integer, ForeignKey("fournisseurs.id"), nullable=False, index=True)

    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12

    # Métriques (garde la même trame que KPI investor pour homogénéité)
    rdv_count = Column(Integer, default=0)
    pitchs = Column(Integer, default=0)
    due_diligences = Column(Integer, default=0)
    closings = Column(Integer, default=0)

    # Données financières optionnelles (ex: volume, fees partagés, etc.)
    revenue = Column(Float, default=0)
    commission_rate = Column(Float, default=0)  # En %

    notes = Column(Text)

    # Relation
    fournisseur = relationship("Fournisseur", back_populates="kpis")

    def __repr__(self):
        return f"<FournisseurKPI(id={self.id}, fournisseur_id={self.fournisseur_id}, month={self.year}-{self.month:02d})>"
