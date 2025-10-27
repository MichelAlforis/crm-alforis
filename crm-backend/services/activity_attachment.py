"""Service pour gérer les pièces jointes d'activités."""

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from sqlalchemy.orm import Session

from core.exceptions import ResourceNotFound, ValidationError
from models.activity_attachment import ActivityAttachment
from schemas.activity_attachment import ActivityAttachmentCreate, ActivityAttachmentUpdate
from services.base import BaseService


class ActivityAttachmentService(
    BaseService[ActivityAttachment, ActivityAttachmentCreate, ActivityAttachmentUpdate]
):
    """Service pour gérer les pièces jointes des activités."""

    def __init__(self, db: Session):
        super().__init__(ActivityAttachment, db)

    async def get_by_activity(self, activity_id: int) -> List[ActivityAttachment]:
        """Récupère toutes les pièces jointes d'une activité."""
        return (
            self.db.query(ActivityAttachment)
            .filter(ActivityAttachment.activity_id == activity_id)
            .all()
        )

    async def save_file(
        self,
        activity_id: int,
        file_content: bytes,
        filename: str,
        mime_type: str,
        title: Optional[str] = None,
        notes: Optional[str] = None,
        upload_dir: str = "uploads/attachments",
    ) -> ActivityAttachment:
        """
        Sauvegarde un fichier sur disque et crée l'entrée en base.

        Args:
            activity_id: ID de l'activité
            file_content: Contenu binaire du fichier
            filename: Nom du fichier
            mime_type: Type MIME
            title: Titre/libellé du document (ex: "Contrat signé")
            notes: Notes/description détaillée
            upload_dir: Répertoire de destination

        Returns:
            ActivityAttachment créé
        """
        # Créer le répertoire si nécessaire
        upload_path = Path(upload_dir)
        upload_path.mkdir(parents=True, exist_ok=True)

        # Générer un nom de fichier unique
        file_ext = Path(filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = upload_path / unique_filename

        # Écrire le fichier
        try:
            with open(file_path, "wb") as f:
                f.write(file_content)
        except Exception as e:
            raise ValidationError(f"Failed to save file: {str(e)}")

        # Créer l'entrée en base
        file_size = len(file_content)
        attachment_data = ActivityAttachmentCreate(
            activity_id=activity_id,
            filename=filename,
            file_path=str(file_path),
            file_size=file_size,
            mime_type=mime_type,
            title=title,
            notes=notes,
        )

        return await self.create(attachment_data)

    async def delete_with_file(self, attachment_id: int) -> bool:
        """
        Supprime une pièce jointe et son fichier associé.

        Args:
            attachment_id: ID de la pièce jointe

        Returns:
            True si supprimé avec succès
        """
        attachment = await self.get(attachment_id)
        if not attachment:
            raise ResourceNotFound(f"Attachment {attachment_id} not found")

        # Supprimer le fichier physique
        try:
            file_path = Path(attachment.file_path)
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            # Log l'erreur mais continue la suppression en base
            print(f"Warning: Failed to delete file {attachment.file_path}: {e}")

        # Supprimer l'entrée en base
        await self.delete(attachment_id)
        return True

    async def get_total_size_for_activity(self, activity_id: int) -> int:
        """Retourne la taille totale des fichiers d'une activité en bytes."""
        attachments = await self.get_by_activity(activity_id)
        return sum(a.file_size or 0 for a in attachments)
