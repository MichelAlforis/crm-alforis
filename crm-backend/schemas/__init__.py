from schemas.base import (
    BaseSchema,
    TimestampedSchema,
    PaginationParams,
    PaginatedResponse,
    HealthCheckResponse,
)

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
