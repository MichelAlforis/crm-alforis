from sqlalchemy import Column, String, Integer, Float, Date, Text, Enum, ForeignKey, Boolean, ARRAY, Index
from sqlalchemy.orm import relationship
from models.base import BaseModel
import enum
from models.organisation_activity import OrganisationActivity

# =======================
# Enums
# =======================

class OrganisationCategory(str, enum.Enum):
    """Catégories d'organisations"""
    INSTITUTION = "Institution"
    WHOLESALE = "Wholesale"
    SDG = "SDG"
    CGPI = "CGPI"
    AUTRES = "Autres"


class MandatStatus(str, enum.Enum):
    """Statut du mandat de distribution"""
    PROPOSE = "proposé"
    SIGNE = "signé"
    ACTIF = "actif"
    TERMINE = "terminé"


class ProduitStatus(str, enum.Enum):
    """Statut du produit"""
    ACTIF = "actif"
    INACTIF = "inactif"
    EN_ATTENTE = "en_attente"


class ProduitType(str, enum.Enum):
    """Type de produit financier"""
    OPCVM = "OPCVM"
    FCP = "FCP"
    SICAV = "SICAV"
    ETF = "ETF"
    FONDS_ALTERNATIF = "Fonds Alternatif"
    AUTRE = "Autre"


class InteractionType(str, enum.Enum):
    """Types d'interactions possibles"""
    APPEL = "appel"
    EMAIL = "email"
    REUNION = "reunion"
    WEBINAIRE = "webinaire"
    AUTRE = "autre"


class InteractionPipeline(str, enum.Enum):
    """Pipeline de l'interaction"""
    FOURNISSEUR = "fournisseur"
    VENTE = "vente"


class InteractionStatus(str, enum.Enum):
    """Statut de l'interaction dans le pipeline fournisseur (FSS)"""
    PROSPECT_FROID = "prospect_froid"
    PROSPECT_CHAUD = "prospect_chaud"
    REFUS = "refus"
    EN_DISCUSSION = "en_discussion"
    VALIDE = "validé"


# =======================
# Modèles
# =======================

class Organisation(BaseModel):
    """
    Modèle pour les organisations (anciennement Fournisseur)

    Une organisation peut être un fournisseur (asset manager), un investisseur,
    un distributeur, etc. Les produits ne sont associés à une organisation
    que via un mandat de distribution actif/signé.

    Attributs:
        - Infos générales (name, category, aum, strategies, website, language)
        - Métadonnées (domicile, pays, notes)
        - Relations (mandats, interactions, contacts)
    """
    __tablename__ = "organisations"
    __table_args__ = (
        Index("idx_org_category_active", "category", "is_active"),
    )

    # Infos générales
    name = Column(String(255), nullable=False, index=True)
    category = Column(Enum(OrganisationCategory), nullable=False, index=True)

    # Infos financières (pour asset managers principalement)
    aum = Column(Float, nullable=True)  # Assets Under Management
    aum_date = Column(Date, nullable=True)  # Date de l'AUM
    strategies = Column(ARRAY(Text), nullable=True)  # Liste de stratégies d'investissement

    # Contact & localisation
    website = Column(String(255), nullable=True)
    country_code = Column(String(2), nullable=True, index=True)
    domicile = Column(String(255), nullable=True)  # Domiciliation juridique
    language = Column(String(5), nullable=False, default='FR', index=True)  # Langue principale de l'organisation

    # Métadonnées
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, index=True)

    # Relations
    mandats = relationship(
        "MandatDistribution",
        back_populates="organisation",
        cascade="all, delete-orphan"
    )

    contacts = relationship(
        "OrganisationContact",
        back_populates="organisation",
        cascade="all, delete-orphan"
    )

    interactions = relationship(
        "OrganisationInteraction",
        back_populates="organisation",
        cascade="all, delete-orphan"
    )

    activities = relationship(
        "OrganisationActivity",
        back_populates="organisation",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Organisation(id={self.id}, name='{self.name}', category={self.category})>"


class OrganisationContact(BaseModel):
    """
    Contact lié à une organisation
    Note: Cette table sera progressivement remplacée par PersonOrganizationLink
    """
    __tablename__ = "organisation_contacts"

    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(20))
    title = Column(String(255))
    notes = Column(Text)

    # Relation
    organisation = relationship("Organisation", back_populates="contacts")

    def __repr__(self):
        return f"<OrganisationContact(id={self.id}, name='{self.name}', organisation_id={self.organisation_id})>"


class MandatDistribution(BaseModel):
    """
    Mandat de distribution entre ALFORIS et une organisation (fournisseur)

    Un mandat doit être signé ou actif pour permettre l'association de produits.
    C'est le mandat qui active la relation commerciale et permet de distribuer
    les produits de l'organisation.

    Attributs:
        - organisation_id: Organisation concernée
        - status: État du mandat (proposé, signé, actif, terminé)
        - date_signature: Date de signature du mandat
        - date_debut: Date de début d'activité
        - date_fin: Date de fin (si applicable)
        - notes: Conditions particulières, commentaires
    """
    __tablename__ = "mandats_distribution"

    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False, index=True)

    status = Column(Enum(MandatStatus), nullable=False, default=MandatStatus.PROPOSE, index=True)
    date_signature = Column(Date, nullable=True)
    date_debut = Column(Date, nullable=True)
    date_fin = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    # Relations
    organisation = relationship("Organisation", back_populates="mandats")
    produits = relationship(
        "MandatProduit",
        back_populates="mandat",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<MandatDistribution(id={self.id}, organisation_id={self.organisation_id}, status={self.status})>"

    @property
    def is_actif(self) -> bool:
        """Vérifie si le mandat est actif (signé ou actif)"""
        return self.status in (MandatStatus.SIGNE, MandatStatus.ACTIF)


class Produit(BaseModel):
    """
    Produit financier (fonds, OPCVM, etc.)

    Un produit ne peut être associé qu'à un mandat de distribution actif.
    Il représente un instrument financier que ALFORIS peut distribuer.

    Attributs:
        - name: Nom commercial du produit
        - isin: Code ISIN unique
        - type: Type de produit (OPCVM, FCP, SICAV, etc.)
        - status: État du produit (actif, inactif, en_attente)
        - notes: Description, caractéristiques
    """
    __tablename__ = "produits"

    name = Column(String(255), nullable=False, index=True)
    isin = Column(String(12), unique=True, nullable=True, index=True)  # Code ISIN unique
    type = Column(Enum(ProduitType), nullable=False, index=True)
    status = Column(Enum(ProduitStatus), nullable=False, default=ProduitStatus.EN_ATTENTE, index=True)
    notes = Column(Text, nullable=True)

    # Relations
    mandats = relationship(
        "MandatProduit",
        back_populates="produit",
        cascade="all, delete-orphan"
    )

    interactions = relationship(
        "OrganisationInteraction",
        back_populates="produit"
    )

    def __repr__(self):
        return f"<Produit(id={self.id}, name='{self.name}', isin='{self.isin}', type={self.type})>"


class MandatProduit(BaseModel):
    """
    Table de jointure entre Mandat et Produit

    Associe un produit à un mandat de distribution.
    Cette association n'est valide que si le mandat est actif (signé ou actif).

    Attributs:
        - mandat_id: Référence au mandat
        - produit_id: Référence au produit
        - date_ajout: Date d'ajout du produit au mandat
        - notes: Conditions spécifiques pour ce produit dans ce mandat
    """
    __tablename__ = "mandat_produits"

    mandat_id = Column(Integer, ForeignKey("mandats_distribution.id"), nullable=False, index=True)
    produit_id = Column(Integer, ForeignKey("produits.id"), nullable=False, index=True)

    date_ajout = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    # Relations
    mandat = relationship("MandatDistribution", back_populates="produits")
    produit = relationship("Produit", back_populates="mandats")

    def __repr__(self):
        return f"<MandatProduit(id={self.id}, mandat_id={self.mandat_id}, produit_id={self.produit_id})>"


class OrganisationInteraction(BaseModel):
    """
    Historique des interactions avec des personnes et organisations

    Une interaction peut être liée à:
    - Une organisation (obligatoire)
    - Une personne (optionnel)
    - Un produit (optionnel, uniquement si un mandat actif existe)

    Le pipeline 'fournisseur' gère le cycle FSS (prospect_froid → validé).
    Le pipeline 'vente' gère les interactions commerciales avec les CGPI/investisseurs.

    Attributs:
        - organisation_id: Organisation concernée
        - personne_id: Personne concernée (optionnel)
        - produit_id: Produit concerné (optionnel, nécessite mandat actif)
        - date: Date de l'interaction
        - type: Type d'interaction (appel, email, réunion, etc.)
        - pipeline: Pipeline (fournisseur ou vente)
        - status: Statut dans le pipeline fournisseur (si applicable)
        - notes: Détails de l'interaction
    """
    __tablename__ = "organisation_interactions"
    
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False, index=True)
    personne_id = Column(Integer, ForeignKey("people.id"), nullable=True, index=True)
    produit_id = Column(Integer, ForeignKey("produits.id"), nullable=True, index=True)

    date = Column(Date, nullable=False, index=True)
    type = Column(Enum(InteractionType), nullable=False, index=True)
    pipeline = Column(Enum(InteractionPipeline), nullable=False, index=True)
    status = Column(Enum(InteractionStatus), nullable=True, index=True)  # Utilisé pour pipeline fournisseur

    duration_minutes = Column(Integer, nullable=True)
    subject = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    # Relations
    organisation = relationship("Organisation", back_populates="interactions")
    personne = relationship("Person")
    produit = relationship("Produit", back_populates="interactions")

    def __repr__(self):
        return (
            f"<OrganisationInteraction(id={self.id}, organisation_id={self.organisation_id}, "
            f"type={self.type}, pipeline={self.pipeline})>"
        )
