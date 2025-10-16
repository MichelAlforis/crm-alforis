from schemas.base import (
    BaseSchema,
    TimestampedSchema,
    PaginationParams,
    PaginatedResponse,
    HealthCheckResponse,
)

from schemas.investor import (
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    InvestorCreate,
    InvestorUpdate,
    InvestorResponse,
    InvestorDetailResponse,
    InvestorStatsResponse,
    InvestorFilterParams,
)

from schemas.interaction import (
    InteractionCreate,
    InteractionUpdate,
    InteractionResponse,
    InteractionSummary,
    InteractionFilterParams,
)

from schemas.kpi import (
    KPICreate,
    KPIUpdate,
    KPIResponse,
    KPISummary,
    KPIFilterParams,
)

from schemas.fournisseur import (
    FournisseurContactCreate,
    FournisseurContactUpdate,
    FournisseurContactResponse,
    FournisseurInteractionCreate,
    FournisseurInteractionUpdate,
    FournisseurInteractionResponse,
    FournisseurKPICreate,
    FournisseurKPIUpdate,
    FournisseurKPIResponse,
    FournisseurCreate,
    FournisseurUpdate,
    FournisseurResponse,
    FournisseurDetailResponse,
    FournisseurStatsResponse,
    FournisseurFilterParams,
)

__all__ = [
    # ---------- Base ----------
    "BaseSchema",
    "TimestampedSchema",
    "PaginationParams",
    "PaginatedResponse",
    "HealthCheckResponse",

    # ---------- Investor ----------
    "ContactCreate",
    "ContactUpdate",
    "ContactResponse",
    "InvestorCreate",
    "InvestorUpdate",
    "InvestorResponse",
    "InvestorDetailResponse",
    "InvestorStatsResponse",
    "InvestorFilterParams",

    # ---------- Interaction ----------
    "InteractionCreate",
    "InteractionUpdate",
    "InteractionResponse",
    "InteractionSummary",
    "InteractionFilterParams",

    # ---------- KPI ----------
    "KPICreate",
    "KPIUpdate",
    "KPIResponse",
    "KPISummary",
    "KPIFilterParams",

    # ---------- Fournisseur ----------
    "FournisseurContactCreate",
    "FournisseurContactUpdate",
    "FournisseurContactResponse",
    "FournisseurInteractionCreate",
    "FournisseurInteractionUpdate",
    "FournisseurInteractionResponse",
    "FournisseurKPICreate",
    "FournisseurKPIUpdate",
    "FournisseurKPIResponse",
    "FournisseurCreate",
    "FournisseurUpdate",
    "FournisseurResponse",
    "FournisseurDetailResponse",
    "FournisseurStatsResponse",
    "FournisseurFilterParams",
]
