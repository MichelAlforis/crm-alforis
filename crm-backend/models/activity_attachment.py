"""Modèle ActivityAttachment - Pièces jointes pour les activités.

Ce modèle permet d'attacher plusieurs fichiers (documents, images, PDF, etc.)
à une activité d'organisation (notes, réunions, appels, etc.).
"""

from __future__ import annotations

from sqlalchemy import BigInteger, Column, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from models.base import BaseModel
from models.constants import ONDELETE_CASCADE


class ActivityAttachment(BaseModel):
    """
    Pièce jointe associée à une activité d'organisation.

    Permet de stocker des documents, images, PDF, etc.
    Les fichiers sont stockés sur disque/S3 et référencés ici par leur path.
    """

    __tablename__ = "activity_attachments"
    __table_args__ = (
        Index("idx_activity_attachments_activity", "activity_id"),
        Index("idx_activity_attachments_created", "created_at"),
    )

    activity_id = Column(
        Integer,
        ForeignKey("organisation_activities.id", ondelete=ONDELETE_CASCADE),
        nullable=False,
        index=True,
    )

    # Informations du fichier
    filename = Column(String(255), nullable=False)  # Nom original du fichier
    file_path = Column(String(500), nullable=False)  # Chemin de stockage (relatif ou S3 URL)
    file_size = Column(BigInteger, nullable=True)  # Taille en bytes
    mime_type = Column(String(100), nullable=True)  # Type MIME (application/pdf, image/png, etc.)

    # Métadonnées pour identification
    title = Column(
        String(255), nullable=True
    )  # Titre/libellé du document (ex: "Contrat signé", "CR réunion")
    notes = Column(Text, nullable=True)  # Notes/description détaillée du document

    # Relations
    activity = relationship(
        "OrganisationActivity", back_populates="attachments", foreign_keys=[activity_id]
    )

    def __repr__(self) -> str:
        return (
            f"<ActivityAttachment(id={self.id}, activity_id={self.activity_id}, "
            f"filename={self.filename})>"
        )

    @property
    def file_size_mb(self) -> float:
        """Retourne la taille du fichier en Mo."""
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return 0.0
