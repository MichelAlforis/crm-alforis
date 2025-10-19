from services.base import BaseService
from services.email_service import (
    EmailTemplateService,
    EmailCampaignService,
    EmailDeliveryService,
    EmailAnalyticsService,
    EmailEventIngestionService,
)

__all__ = [
    "BaseService",
    "EmailTemplateService",
    "EmailCampaignService",
    "EmailDeliveryService",
    "EmailAnalyticsService",
    "EmailEventIngestionService",
]
