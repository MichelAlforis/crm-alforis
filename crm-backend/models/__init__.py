from models.base import Base, BaseModel
from models.investor import (
    Investor,
    Contact,
    Interaction as InvestorInteraction,
    KPI,
    PipelineStage,
    ClientType,
    InteractionType,
)
from models.fournisseur import (
    Fournisseur,
    FournisseurContact,
    FournisseurInteraction,
    FournisseurKPI,
    StageFournisseur,
    TypeFournisseur,
)
from models.person import (
    Person,
    PersonOrganizationLink,
    OrganizationType,
)
from models.task import (
    Task,
    TaskPriority,
    TaskStatus,
    TaskCategory,
)
from models.organisation import (
    Organisation,
    OrganisationContact,
    OrganisationCategory,
    MandatDistribution,
    MandatStatus,
    Produit,
    ProduitStatus,
    ProduitType,
    MandatProduit,
    OrganisationInteraction,
    InteractionPipeline,
    InteractionStatus,
)

__all__ = [
    # Base
    "Base",
    "BaseModel",

    # Investor
    "Investor",
    "Contact",
    "InvestorInteraction",
    "KPI",
    "PipelineStage",
    "ClientType",
    "InteractionType",

    # Fournisseur (legacy - sera progressivement remplacé par Organisation)
    "Fournisseur",
    "FournisseurContact",
    "FournisseurInteraction",
    "FournisseurKPI",
    "StageFournisseur",
    "TypeFournisseur",

    # Organisation (nouveau modèle)
    "Organisation",
    "OrganisationContact",
    "OrganisationCategory",
    "MandatDistribution",
    "MandatStatus",
    "Produit",
    "ProduitStatus",
    "ProduitType",
    "MandatProduit",
    "OrganisationInteraction",
    "InteractionPipeline",
    "InteractionStatus",

    # People
    "Person",
    "PersonOrganizationLink",
    "OrganizationType",

    # Tasks
    "Task",
    "TaskPriority",
    "TaskStatus",
    "TaskCategory",
]

# ---------- Imports API ----------
# Ce module centralise tous les modèles pour un import unique :
# Exemple : from models import Investor, Fournisseur, Base
