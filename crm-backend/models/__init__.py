from models.base import Base, BaseModel

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
from models.kpi import DashboardKPI
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
from models.ai_agent import (
    AISuggestion,
    AIExecution,
    AIConfiguration,
    AICache,
    AISuggestionType,
    AISuggestionStatus,
    AIExecutionStatus,
    AITaskType,
    AIProvider,
)

__all__ = [
    # Base
    "Base",
    "BaseModel",

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
    "DashboardKPI",

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

    # AI Agent
    "AISuggestion",
    "AIExecution",
    "AIConfiguration",
    "AICache",
    "AISuggestionType",
    "AISuggestionStatus",
    "AIExecutionStatus",
    "AITaskType",
    "AIProvider",
]

# Backwards compatibility aliases (legacy spelling)