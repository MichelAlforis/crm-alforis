from services.base import BaseService
# # from services.investor import InvestorService  # ❌ LEGACY
# # from services.interaction import InteractionService  # ❌ LEGACY
# # from services.kpi import KPIService  # ❌ LEGACY
from services.email_service import (
    EmailTemplateService,
    EmailCampaignService,
    EmailDeliveryService,
    EmailAnalyticsService,
    EmailEventIngestionService,
)

__all__ = [
    "BaseService",
    # # "InvestorService",  # ❌ LEGACY
    # # "InteractionService",  # ❌ LEGACY
    # # "KPIService",  # ❌ LEGACY
    "EmailTemplateService",
    "EmailCampaignService",
    "EmailDeliveryService",
    "EmailAnalyticsService",
    "EmailEventIngestionService",
]
