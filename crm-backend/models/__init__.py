from models.base import Base, BaseModel
from models.investor import (
    Investor,
    Contact,
    Interaction,
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

__all__ = [
    # Base
    "Base",
    "BaseModel",

    # Investor
    "Investor",
    "Contact",
    "Interaction",
    "KPI",
    "PipelineStage",
    "ClientType",
    "InteractionType",

    # Fournisseur
    "Fournisseur",
    "FournisseurContact",
    "FournisseurInteraction",
    "FournisseurKPI",
    "StageFournisseur",
    "TypeFournisseur",

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
