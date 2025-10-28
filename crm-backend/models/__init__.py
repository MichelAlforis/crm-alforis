from models.ai_agent import (
    AICache,
    AIConfiguration,
    AIExecution,
    AIExecutionStatus,
    AIProvider,
    AISuggestion,
    AISuggestionStatus,
    AISuggestionType,
    AITaskType,
)
from models.base import Base, BaseModel
from models.email import (
    CampaignSubscription,
    EmailCampaign,
    EmailCampaignStatus,
    EmailCampaignStep,
    EmailEvent,
    EmailEventType,
    EmailProvider,
    EmailScheduleType,
    EmailSend,
    EmailSendStatus,
    EmailTemplate,
    EmailTemplateCategory,
    EmailVariant,
)
from models.email_marketing import LeadScore
from models.help_analytics import HelpAnalyticsEvent
from models.interaction import (
    Interaction,
    InteractionParticipant,
    InteractionStatus,
    InteractionType,
)
from models.known_company import KnownCompany
from models.autofill_decision_log import AutofillDecisionLog
from models.kpi import DashboardKPI
from models.mailing_list import MailingList
from models.mandat import Mandat, MandatStatus, MandatType
from models.notification import Notification, NotificationPriority, NotificationType
from models.organisation import (
    InteractionPipeline,
    InteractionStatus,
    MandatDistribution,
    MandatProduit,
    MandatStatus,
    Organisation,
    OrganisationCategory,
    OrganisationContact,
    OrganisationInteraction,
    OrganisationType,
    PipelineStage,
    Produit,
    ProduitStatus,
    ProduitType,
)
from models.organisation_activity import OrganisationActivity, OrganisationActivityType
from models.permission import Permission, PermissionAction, PermissionResource
from models.person import Person, PersonOrganizationLink, PersonRole
from models.role import Role, UserRole
from models.task import Task, TaskPriority, TaskStatus
from models.team import Team
from models.user import User
from models.webhook import Webhook
from models.workflow import (
    Workflow,
    WorkflowActionType,
    WorkflowExecution,
    WorkflowExecutionStatus,
    WorkflowStatus,
    WorkflowTriggerType,
)

__all__ = [
    # Base
    "Base",
    "BaseModel",
    # Permissions & Roles
    "Permission",
    "PermissionAction",
    "PermissionResource",
    "Role",
    "UserRole",
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
    "CampaignSubscription",
    "MailingList",
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
    # Help Analytics
    "HelpAnalyticsEvent",
    # Interactions V2
    "Interaction",
    "InteractionParticipant",
    "InteractionType",
    "InteractionStatus",
    # Lead Scoring
    "LeadScore",
    # Known Companies (Autofill)
    "KnownCompany",
    # Autofill logs
    "AutofillLog",
]

# Backwards compatibility aliases (legacy spelling)
