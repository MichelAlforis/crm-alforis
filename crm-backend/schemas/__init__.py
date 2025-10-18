from schemas.base import (
    BaseSchema,
    TimestampedSchema,
    PaginationParams,
    PaginatedResponse,
    HealthCheckResponse,
)

# from schemas.investor import (
#     ContactCreate,
#     ContactUpdate,
#     ContactResponse,
#     InvestorCreate,
#     InvestorUpdate,
#     InvestorResponse,
#     InvestorDetailResponse,
#     InvestorStatsResponse,
#     InvestorFilterParams,
# )

# from schemas.interaction import (
#     InteractionCreate,
#     InteractionUpdate,
#     InteractionResponse,
#     InteractionSummary,
#     InteractionFilterParams,
# )

# from schemas.kpi import (
#     KPICreate,
#     KPIUpdate,
#     KPIResponse,
#     KPISummary,
#     KPIFilterParams,
# )

# from schemas.fournisseur import (
#     FournisseurContactCreate,
#     FournisseurContactUpdate,
#     FournisseurContactResponse,
#     FournisseurInteractionCreate,
#     FournisseurInteractionUpdate,
#     FournisseurInteractionResponse,
#     FournisseurKPICreate,
#     FournisseurKPIUpdate,
#     FournisseurKPIResponse,
#     FournisseurCreate,
#     FournisseurUpdate,
#     FournisseurResponse,
#     FournisseurDetailResponse,
#     FournisseurStatsResponse,
#     FournisseurFilterParams,
# )
from schemas.person import (
    PersonCreate,
    PersonUpdate,
    PersonResponse,
    PersonDetailResponse,
    PersonOrganizationLinkCreate,
    PersonOrganizationLinkUpdate,
    PersonOrganizationLinkResponse,
)
from schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskWithRelations,
    TaskSnoozeRequest,
    TaskStatsResponse,
    TaskFilterParams,
    TaskQuickActionRequest,
)
from schemas.webhook import (
    WebhookCreate,
    WebhookUpdate,
    WebhookResponse,
    WebhookRotateSecretRequest,
)
from schemas.organisation_activity import (
    OrganisationActivityCreate,
    OrganisationActivityUpdate,
    OrganisationActivityResponse,
)
from schemas.email import (
    EmailTemplateCreate,
    EmailTemplateUpdate,
    EmailTemplateResponse,
    EmailCampaignCreate,
    EmailCampaignUpdate,
    EmailCampaignResponse,
    EmailCampaignScheduleRequest,
    EmailCampaignStatsResponse,
    EmailCampaignStepResponse,
    EmailSendResponse,
    EmailEventResponse,
    EmailSendFilterParams,
)

__all__ = [
    # ---------- Base ----------
    "BaseSchema",
    "TimestampedSchema",
    "PaginationParams",
    "PaginatedResponse",
    "HealthCheckResponse",

    # ---------- Investor (LEGACY - commenté) ----------
    # "ContactCreate",
    # "ContactUpdate",
    # "ContactResponse",
    # "InvestorCreate",
    # "InvestorUpdate",
    # "InvestorResponse",
    # "InvestorDetailResponse",
    # "InvestorStatsResponse",
    # "InvestorFilterParams",

    # ---------- Interaction (LEGACY - commenté) ----------
    # "InteractionCreate",
    # "InteractionUpdate",
    # "InteractionResponse",
    # "InteractionSummary",
    # "InteractionFilterParams",

    # ---------- KPI (LEGACY - commenté) ----------
    # "KPICreate",
    # "KPIUpdate",
    # "KPIResponse",
    # "KPISummary",
    # "KPIFilterParams",

    # ---------- Fournisseur (LEGACY - commenté) ----------
    # "FournisseurContactCreate",
    # "FournisseurContactUpdate",
    # "FournisseurContactResponse",
    # "FournisseurInteractionCreate",
    # "FournisseurInteractionUpdate",
    # "FournisseurInteractionResponse",
    # "FournisseurKPICreate",
    # "FournisseurKPIUpdate",
    # "FournisseurKPIResponse",
    # "FournisseurCreate",
    # "FournisseurUpdate",
    # "FournisseurResponse",
    # "FournisseurDetailResponse",
    # "FournisseurStatsResponse",
    # "FournisseurFilterParams",

    # ---------- Person ----------
    "PersonCreate",
    "PersonUpdate",
    "PersonResponse",
    "PersonDetailResponse",
    "PersonOrganizationLinkCreate",
    "PersonOrganizationLinkUpdate",
    "PersonOrganizationLinkResponse",

    # ---------- Task ----------
    "TaskCreate",
    "TaskUpdate",
    "TaskResponse",
    "TaskWithRelations",
    "TaskSnoozeRequest",
    "TaskStatsResponse",
    "TaskFilterParams",
    "TaskQuickActionRequest",

    # ---------- Webhook ----------
    "WebhookCreate",
    "WebhookUpdate",
    "WebhookResponse",
    "WebhookRotateSecretRequest",

    # ---------- Organisation Activity ----------
    "OrganisationActivityCreate",
    "OrganisationActivityUpdate",
    "OrganisationActivityResponse",

    # ---------- Email ----------
    "EmailTemplateCreate",
    "EmailTemplateUpdate",
    "EmailTemplateResponse",
    "EmailCampaignCreate",
    "EmailCampaignUpdate",
    "EmailCampaignResponse",
    "EmailCampaignScheduleRequest",
    "EmailCampaignStatsResponse",
    "EmailCampaignStepResponse",
    "EmailSendResponse",
    "EmailEventResponse",
    "EmailSendFilterParams",
]
