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
]

# ---------- Imports API ----------
# Ce module centralise tous les modèles pour un import unique :
# Exemple : from models import Investor, Fournisseur, Base
