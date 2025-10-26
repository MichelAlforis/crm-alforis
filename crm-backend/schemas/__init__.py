from schemas.base import (
    BaseSchema,
    HealthCheckResponse,
    PaginatedResponse,
    PaginationParams,
    TimestampedSchema,
)
from schemas.email import (
    EmailCampaignCreate,
    EmailCampaignResponse,
    EmailCampaignScheduleRequest,
    EmailCampaignStatsResponse,
    EmailCampaignStepResponse,
    EmailCampaignUpdate,
    EmailEventResponse,
    EmailSendFilterParams,
    EmailSendResponse,
    EmailTemplateCreate,
    EmailTemplateResponse,
    EmailTemplateUpdate,
)
from schemas.organisation_activity import (
    OrganisationActivityCreate,
    OrganisationActivityResponse,
    OrganisationActivityUpdate,
)
from schemas.person import (
    PersonCreate,
    PersonDetailResponse,
    PersonOrganizationLinkCreate,
    PersonOrganizationLinkResponse,
    PersonOrganizationLinkUpdate,
    PersonResponse,
    PersonUpdate,
)
from schemas.task import (
    TaskCreate,
    TaskFilterParams,
    TaskQuickActionRequest,
    TaskResponse,
    TaskSnoozeRequest,
    TaskStatsResponse,
    TaskUpdate,
    TaskWithRelations,
)

__all__ = [
    # ---------- Base ----------
    "BaseSchema",
    "TimestampedSchema",
    "PaginationParams",
    "PaginatedResponse",
    "HealthCheckResponse",

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
