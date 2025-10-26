from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


class CampaignStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

class EmailStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    BOUNCED = "bounced"
    OPENED = "opened"
    CLICKED = "clicked"

class TargetType(str, Enum):
    ORGANISATIONS = "organisations"
    CONTACTS = "contacts"

# Email Templates

class EmailTemplateCreate(BaseModel):
    name: str = Field(..., max_length=200)
    subject: str = Field(..., max_length=500)
    body_html: str
    body_text: Optional[str] = None
    variables: List[str] = Field(default_factory=list)

class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    subject: Optional[str] = Field(None, max_length=500)
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    variables: Optional[List[str]] = None

class EmailTemplate(BaseModel):
    id: int
    name: str
    subject: str
    body_html: str
    body_text: Optional[str]
    variables: List[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Recipient Filters

class RecipientFilters(BaseModel):
    target_type: TargetType
    languages: Optional[List[str]] = Field(default_factory=list)
    countries: Optional[List[str]] = Field(default_factory=list)
    organisation_categories: Optional[List[str]] = Field(default_factory=list)
    specific_ids: Optional[List[int]] = Field(default_factory=list)
    exclude_ids: Optional[List[int]] = Field(default_factory=list)

# Email Campaigns

class EmailCampaignCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    template_id: int
    recipient_filters: RecipientFilters
    batch_size: int = Field(default=600, ge=1, le=1000)
    delay_between_batches: int = Field(default=60, ge=0)
    scheduled_at: Optional[datetime] = None

class EmailCampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    template_id: Optional[int] = None
    recipient_filters: Optional[RecipientFilters] = None
    batch_size: Optional[int] = Field(None, ge=1, le=1000)
    delay_between_batches: Optional[int] = Field(None, ge=0)
    scheduled_at: Optional[datetime] = None
    status: Optional[CampaignStatus] = None

class EmailCampaign(BaseModel):
    id: int
    name: str
    description: Optional[str]
    template_id: int
    recipient_filters: Dict[str, Any]
    total_recipients: int
    emails_sent: int
    emails_failed: int
    emails_opened: int
    emails_clicked: int
    batch_size: int
    delay_between_batches: int
    status: CampaignStatus
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class EmailCampaignWithTemplate(EmailCampaign):
    template: EmailTemplate

# Preview

class EmailPreviewRecipient(BaseModel):
    id: int
    type: str  # "organisation" ou "contact"
    name: str
    email: str
    personalization_data: Dict[str, Any]

class EmailPreview(BaseModel):
    recipient: EmailPreviewRecipient
    subject: str
    body_html: str
    body_text: Optional[str]

class EmailPreviewList(BaseModel):
    total: int
    previews: List[EmailPreview]
    page: int
    page_size: int
    total_pages: int

# Campaign Email

class CampaignEmail(BaseModel):
    id: int
    campaign_id: int
    recipient_type: str
    recipient_id: int
    recipient_email: str
    recipient_name: Optional[str]
    subject: str
    status: EmailStatus
    sent_at: Optional[datetime]
    opened_at: Optional[datetime]
    clicked_at: Optional[datetime]
    error_message: Optional[str]
    batch_number: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

# Statistics

class CampaignStatistics(BaseModel):
    total_recipients: int
    emails_sent: int
    emails_failed: int
    emails_opened: int
    emails_clicked: int
    open_rate: float
    click_rate: float
    failure_rate: float
