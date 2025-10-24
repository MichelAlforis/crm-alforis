"""
Schémas Pydantic pour Email Marketing & Lead Scoring

EmailIngest: Webhook pour tracking emails (Resend, etc.)
LeadScore: Score d'engagement calculé
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime

# Types littéraux
EmailEventType = Literal['sent', 'opened', 'clicked', 'bounced']
EmailStatus = Literal['sent', 'opened', 'clicked', 'bounced']


class EmailIngestPayload(BaseModel):
    """
    Payload reçu du webhook provider (Resend, Sendgrid, etc.)

    Permet de créer/update EmailEventTracking + calculer LeadScore
    """
    provider: str = Field(..., min_length=1, max_length=50, description="Provider name (resend, sendgrid, etc.)")
    external_id: str = Field(..., min_length=1, max_length=255, description="Provider message ID (unique)")
    event: EmailEventType = Field(..., description="Event type")
    occurred_at: datetime = Field(..., description="When the event occurred")

    # Entity (at least one required)
    person_id: Optional[int] = Field(None, gt=0, description="CRM Person ID")
    organisation_id: Optional[int] = Field(None, gt=0, description="CRM Organisation ID")

    # Optional metadata
    subject: Optional[str] = Field(None, max_length=500, description="Email subject")

    def model_post_init(self, __context):
        """Validation: au moins person_id OU organisation_id"""
        if not self.person_id and not self.organisation_id:
            raise ValueError("Au moins person_id ou organisation_id est requis")

    class Config:
        json_schema_extra = {
            "example": {
                "provider": "resend",
                "external_id": "msg_abc123xyz",
                "event": "opened",
                "occurred_at": "2025-10-24T15:30:00Z",
                "person_id": 42,
                "subject": "Nouvelle offre produit"
            }
        }


class EmailSendOut(BaseModel):
    """Réponse d'un EmailEventTracking"""
    id: int
    organisation_id: Optional[int]
    person_id: Optional[int]
    provider: str
    external_id: str
    subject: Optional[str]
    status: EmailStatus
    sent_at: Optional[datetime]
    open_count: int
    click_count: int
    last_open_at: Optional[datetime]
    last_click_at: Optional[datetime]
    interaction_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class LeadScoreOut(BaseModel):
    """Réponse d'un LeadScore"""
    person_id: int
    score: int
    last_event_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    # Optional: inclure Person data (via join)
    person_name: Optional[str] = None
    person_email: Optional[str] = None

    class Config:
        from_attributes = True


class HotLeadsResponse(BaseModel):
    """Réponse de l'endpoint /marketing/leads-hot"""
    items: List[LeadScoreOut]
    threshold: int = Field(15, description="Score threshold pour Hot Lead")
    total: int

    class Config:
        json_schema_extra = {
            "example": {
                "items": [
                    {
                        "person_id": 42,
                        "score": 23,
                        "last_event_at": "2025-10-24T15:30:00Z",
                        "person_name": "Jean Dupont",
                        "person_email": "jean@example.com"
                    }
                ],
                "threshold": 15,
                "total": 8
            }
        }
