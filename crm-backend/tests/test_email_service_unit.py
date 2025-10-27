import pytest

from models.email import (
    EmailCampaign,
    EmailCampaignStatus,
    EmailProvider,
    EmailScheduleType,
    EmailTemplate,
    EmailTemplateCategory,
)
from schemas.email import EmailCampaignUpdate
from services.email_service import EmailCampaignService


@pytest.mark.asyncio
async def test_update_campaign_creates_default_step_when_missing(test_db):
    """Vérifie que la mise à jour crée un step si aucun n'existe."""
    template = EmailTemplate(
        name="Default template",
        subject="Hello {{name}}",
        html_content="<p>Hi {{name}}</p>",
        category=EmailTemplateCategory.CUSTOM,
    )
    test_db.add(template)
    test_db.flush()

    campaign = EmailCampaign(
        name="Welcome Campaign",
        status=EmailCampaignStatus.DRAFT,
        provider=EmailProvider.RESEND,
        schedule_type=EmailScheduleType.MANUAL,
        from_name="ALFORIS",
        from_email="marketing@alforis.com",
        default_template_id=template.id,
    )
    test_db.add(campaign)
    test_db.commit()
    test_db.refresh(campaign)

    service = EmailCampaignService(test_db)
    payload = EmailCampaignUpdate(default_template_id=template.id)

    updated_campaign = await service.update(campaign.id, payload)

    assert len(updated_campaign.steps) == 1
    step = updated_campaign.steps[0]
    assert step.template_id == template.id
    assert step.order_index == 1
