"""Schemas Pydantic pour les pièces jointes d'activités."""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ActivityAttachmentBase(BaseModel):
    """Base schema pour les pièces jointes."""
    filename: str = Field(..., min_length=1, max_length=255)
    file_path: str = Field(..., min_length=1, max_length=500)
    file_size: Optional[int] = Field(None, ge=0)
    mime_type: Optional[str] = Field(None, max_length=100)
    title: Optional[str] = Field(None, max_length=255, description="Titre/libellé du document")
    notes: Optional[str] = Field(None, description="Notes/description détaillée")


class ActivityAttachmentCreate(ActivityAttachmentBase):
    """Schema pour créer une pièce jointe."""
    activity_id: int = Field(..., gt=0)


class ActivityAttachmentUpdate(BaseModel):
    """Schema pour mettre à jour une pièce jointe."""
    filename: Optional[str] = Field(None, min_length=1, max_length=255)
    title: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None)


class ActivityAttachmentResponse(ActivityAttachmentBase):
    """Schema de réponse pour une pièce jointe."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    activity_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    @property
    def file_size_mb(self) -> float:
        """Retourne la taille du fichier en Mo."""
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return 0.0


class ActivityAttachmentUploadResponse(BaseModel):
    """Schema de réponse après upload d'un fichier."""
    attachment_id: int
    filename: str
    file_path: str
    file_size: int
    mime_type: str
    message: str = "File uploaded successfully"
