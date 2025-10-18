from models.base import Base, BaseModel

# ❌ LEGACY - Models archivés dans legacy/models/
# # from models.investor import (
#     Investor,
#     Contact,
#     Interaction as InvestorInteraction,
#     KPI,
#     PipelineStage,
#     ClientType,
#     InteractionType,
# )
# # from models.fournisseur import (
#     Fournisseur,
#     FournisseurContact,
#     FournisseurInteraction,
#     FournisseurKPI,
#     StageFournisseur,
#     TypeFournisseur,
# )

from models.person import (
    Person,
    PersonOrganizationLink,
    PersonRole,
)
from models.user import User
from models.team import Team
from models.task import (
    Task,
    TaskPriority,
    TaskStatus,
)
from models.webhook import Webhook
from models.organisation import (
    Organisation,
    OrganisationContact,
    OrganisationCategory,
    OrganisationType,
    PipelineStage,
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
from models.notification import (
    Notification,
    NotificationType,
    NotificationPriority,
)
from models.mandat import (
    Mandat,
    MandatType,
    MandatStatus,
)
from models.workflow import (
    Workflow,
    WorkflowExecution,
    WorkflowTriggerType,
    WorkflowActionType,
    WorkflowStatus,
    WorkflowExecutionStatus,
)
from models.email import (
    EmailTemplate,
    EmailCampaign,
    EmailCampaignStep,
    EmailSend,
    EmailEvent,
    EmailTemplateCategory,
    EmailProvider,
    EmailCampaignStatus,
    EmailScheduleType,
    EmailVariant,
    EmailSendStatus,
    EmailEventType,
)

__all__ = [
    # Base
    "Base",
    "BaseModel",

    # ❌ LEGACY - Investor (archivé)
    # # "Investor",
    # # "Contact",
    # # "InvestorInteraction",
    # # "KPI",
    # "PipelineStage",
    # # "ClientType",
    # # "InteractionType",

    # ❌ LEGACY - Fournisseur (archivé)
    # # "Fournisseur",
    # # "FournisseurContact",
    # # "FournisseurInteraction",
    # # "FournisseurKPI",
    # # "StageFournisseur",
    # # "TypeFournisseur",

    # Organisation (nouveau modèle unif ié)
    "Organisation",
    "OrganisationContact",
    "OrganisationCategory",
    "OrganisationType",
    "PipelineStage",
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
    "PersonRole",
    "User",
    "Team",

    # Tasks
    "Task",
    "TaskPriority",
    "TaskStatus",

    # Notifications
    "Notification",
    "NotificationType",
    "NotificationPriority",

    # Mandats (legacy compatibility)
    "Mandat",
    "MandatType",
    "MandatStatus",

    # Webhooks
    "Webhook",

    # Workflows
    "Workflow",
    "WorkflowExecution",
    "WorkflowTriggerType",
    "WorkflowActionType",
    "WorkflowStatus",
    "WorkflowExecutionStatus",

    # Email Automation
    "EmailTemplate",
    "EmailCampaign",
    "EmailCampaignStep",
    "EmailSend",
    "EmailEvent",
    "EmailTemplateCategory",
    "EmailProvider",
    "EmailCampaignStatus",
    "EmailScheduleType",
    "EmailVariant",
    "EmailSendStatus",
    "EmailEventType",
]

# ---------- Imports API ----------
# Ce module centralise tous les modèles pour un import unique :
# Exemple : from models import Investor, Fournisseur, Base
