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
from models.webhook import Webhook
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
from models.organisation_activity import (
    OrganisationActivity,
    OrganisationActivityType,
)
from models.workflow import (
    Workflow,
    WorkflowExecution,
    WorkflowTriggerType,
    WorkflowActionType,
    WorkflowStatus,
    WorkflowExecutionStatus,
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
    "OrganisationActivity",
    "OrganisationActivityType",

    # People
    "Person",
    "PersonOrganizationLink",
    "OrganizationType",

    # Tasks
    "Task",
    "TaskPriority",
    "TaskStatus",
    "TaskCategory",

    # Webhooks
    "Webhook",

    # Workflows
    "Workflow",
    "WorkflowExecution",
    "WorkflowTriggerType",
    "WorkflowActionType",
    "WorkflowStatus",
    "WorkflowExecutionStatus",
]

# ---------- Imports API ----------
# Ce module centralise tous les modèles pour un import unique :
# Exemple : from models import Investor, Fournisseur, Base
