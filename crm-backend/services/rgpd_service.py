"""
RGPD Service - Data Export & Anonymization

Handles:
- Export of all user personal data (RGPD Article 20)
- Deletion/Anonymization of user data (RGPD Article 17)
- Access logs tracking (CNIL compliance)
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, or_, update
from sqlalchemy.orm import Session

from models.data_access_log import DataAccessLog
from models.email_attachment import EmailAttachment
from models.email_message import EmailMessage
from models.interaction import Interaction, InteractionParticipant
from models.organisation import Organisation
from models.person import Person
from models.task import Task
from models.user import User

logger = logging.getLogger(__name__)


class RGPDService:
    """
    Service for RGPD compliance operations.
    """

    def __init__(self, db: Session):
        self.db = db

    def export_user_data(
        self, user_id: int, include_access_logs: bool = False
    ) -> Dict[str, Any]:
        """
        Export all personal data for a user (RGPD Article 20).

        Args:
            user_id: User ID to export
            include_access_logs: Include access logs in export

        Returns:
            Dictionary with all user data in JSON-serializable format
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")

        export_data = {
            "export_date": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "user": self._export_user_profile(user),
            "people": self._export_people(user_id),
            "organisations": self._export_organisations(user_id),
            "interactions": self._export_interactions(user_id),
            "tasks": self._export_tasks(user_id),
            "email_messages": self._export_email_messages(user_id),
        }

        if include_access_logs:
            export_data["access_logs"] = self._export_access_logs(user_id)

        logger.info(f"Exported data for user {user_id}")
        return export_data

    def anonymize_user_data(self, user_id: int, reason: str = "User request") -> Dict[str, int]:
        """
        Anonymize all personal data for a user (RGPD Article 17).

        This performs a soft deletion by replacing personal data with
        anonymized values, preserving statistical/aggregation data.

        Args:
            user_id: User ID to anonymize
            reason: Reason for anonymization

        Returns:
            Dictionary with counts of anonymized records
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")

        counts = {
            "user": 0,
            "people": 0,
            "organisations": 0,
            "interactions": 0,
            "tasks": 0,
            "email_messages": 0,
            "email_attachments": 0,
        }

        # Log the anonymization request
        self._log_anonymization(user_id, reason)

        # Anonymize user profile
        counts["user"] = self._anonymize_user_profile(user)

        # Anonymize related people
        counts["people"] = self._anonymize_people(user_id)

        # Anonymize organisations created by user
        counts["organisations"] = self._anonymize_organisations(user_id)

        # Anonymize interactions
        counts["interactions"] = self._anonymize_interactions(user_id)

        # Anonymize tasks
        counts["tasks"] = self._anonymize_tasks(user_id)

        # Anonymize email messages
        counts["email_messages"] = self._anonymize_email_messages(user_id)
        counts["email_attachments"] = self._anonymize_email_attachments(user_id)

        self.db.commit()
        logger.info(
            f"Anonymized user {user_id} data. Counts: {counts}. Reason: {reason}"
        )

        return counts

    def get_access_logs(
        self,
        user_id: Optional[int] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        access_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve access logs for compliance audits.

        Args:
            user_id: Filter by user ID
            entity_type: Filter by entity type
            entity_id: Filter by entity ID
            access_type: Filter by access type
            limit: Maximum number of logs to return

        Returns:
            List of access log dictionaries
        """
        query = self.db.query(DataAccessLog)

        if user_id is not None:
            query = query.filter(DataAccessLog.user_id == user_id)
        if entity_type:
            query = query.filter(DataAccessLog.entity_type == entity_type)
        if entity_id is not None:
            query = query.filter(DataAccessLog.entity_id == entity_id)
        if access_type:
            query = query.filter(DataAccessLog.access_type == access_type)

        query = query.order_by(DataAccessLog.accessed_at.desc()).limit(limit)
        logs = query.all()

        return [self._serialize_access_log(log) for log in logs]

    # =========================================================================
    # Export helpers
    # =========================================================================

    def _export_user_profile(self, user: User) -> Dict[str, Any]:
        """Export user profile data"""
        return {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
        }

    def _export_people(self, user_id: int) -> List[Dict[str, Any]]:
        """Export people created by user"""
        people = (
            self.db.query(Person)
            .filter(or_(Person.created_by_id == user_id, Person.assigned_to_id == user_id))
            .all()
        )

        return [
            {
                "id": p.id,
                "first_name": p.first_name,
                "last_name": p.last_name,
                "email": p.email,
                "phone": p.phone,
                "job_title": p.job_title,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in people
        ]

    def _export_organisations(self, user_id: int) -> List[Dict[str, Any]]:
        """Export organisations created by user"""
        orgs = (
            self.db.query(Organisation)
            .filter(or_(Organisation.created_by_id == user_id, Organisation.owner_id == user_id))
            .all()
        )

        return [
            {
                "id": o.id,
                "name": o.name,
                "email": o.email,
                "phone": o.phone,
                "website": o.website,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in orgs
        ]

    def _export_interactions(self, user_id: int) -> List[Dict[str, Any]]:
        """Export interactions involving user"""
        interactions = self.db.query(Interaction).filter(Interaction.owner_id == user_id).all()

        return [
            {
                "id": i.id,
                "type": i.interaction_type.value if i.interaction_type else None,
                "subject": i.subject,
                "notes": i.notes,
                "date": i.date.isoformat() if i.date else None,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in interactions
        ]

    def _export_tasks(self, user_id: int) -> List[Dict[str, Any]]:
        """Export tasks assigned to or created by user"""
        tasks = (
            self.db.query(Task)
            .filter(or_(Task.assigned_to_id == user_id, Task.created_by_id == user_id))
            .all()
        )

        return [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "status": t.status.value if t.status else None,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in tasks
        ]

    def _export_email_messages(self, user_id: int) -> List[Dict[str, Any]]:
        """Export email messages for user"""
        messages = (
            self.db.query(EmailMessage).filter(EmailMessage.user_email_account_id == user_id).all()
        )

        return [
            {
                "id": m.id,
                "subject": m.subject,
                "from_address": m.from_address,
                "to_addresses": m.to_addresses,
                "received_at": m.received_at.isoformat() if m.received_at else None,
                "body_preview": m.body_preview[:200] if m.body_preview else None,
            }
            for m in messages[:100]  # Limit to 100 most recent
        ]

    def _export_access_logs(self, user_id: int) -> List[Dict[str, Any]]:
        """Export access logs for user"""
        return self.get_access_logs(user_id=user_id, limit=1000)

    # =========================================================================
    # Anonymization helpers
    # =========================================================================

    def _anonymize_user_profile(self, user: User) -> int:
        """Anonymize user profile"""
        anon_id = f"anonymized_{user.id}_{int(datetime.utcnow().timestamp())}"

        user.email = f"{anon_id}@anonymized.local"
        user.first_name = "Anonymized"
        user.last_name = "User"
        user.phone = None
        user.password_hash = "ANONYMIZED"
        user.is_active = False

        self.db.add(user)
        return 1

    def _anonymize_people(self, user_id: int) -> int:
        """Anonymize people created by user"""
        result = self.db.execute(
            update(Person)
            .where(or_(Person.created_by_id == user_id, Person.assigned_to_id == user_id))
            .values(
                first_name="Anonymized",
                last_name="Person",
                email=None,
                personal_email=None,
                phone=None,
                personal_phone=None,
                mobile=None,
                notes=None,
                linkedin_url=None,
            )
        )
        return result.rowcount

    def _anonymize_organisations(self, user_id: int) -> int:
        """Anonymize organisations created by user"""
        result = self.db.execute(
            update(Organisation)
            .where(or_(Organisation.created_by_id == user_id, Organisation.owner_id == user_id))
            .values(
                name="Anonymized Organisation",
                email=None,
                phone=None,
                website=None,
                address=None,
                notes=None,
            )
        )
        return result.rowcount

    def _anonymize_interactions(self, user_id: int) -> int:
        """Anonymize interactions"""
        result = self.db.execute(
            update(Interaction).where(Interaction.owner_id == user_id).values(notes="[Anonymized]")
        )
        return result.rowcount

    def _anonymize_tasks(self, user_id: int) -> int:
        """Anonymize tasks"""
        result = self.db.execute(
            update(Task)
            .where(or_(Task.assigned_to_id == user_id, Task.created_by_id == user_id))
            .values(title="Anonymized Task", description="[Anonymized]")
        )
        return result.rowcount

    def _anonymize_email_messages(self, user_id: int) -> int:
        """Anonymize email messages"""
        result = self.db.execute(
            update(EmailMessage)
            .where(EmailMessage.user_email_account_id == user_id)
            .values(
                subject="[Anonymized]",
                body_text="[Anonymized]",
                body_html="[Anonymized]",
                from_address="anonymized@local",
                to_addresses=[],
                cc_addresses=[],
                bcc_addresses=[],
            )
        )
        return result.rowcount

    def _anonymize_email_attachments(self, user_id: int) -> int:
        """Anonymize email attachments"""
        # Find attachments for user's email messages
        message_ids = (
            self.db.query(EmailMessage.id)
            .filter(EmailMessage.user_email_account_id == user_id)
            .subquery()
        )

        result = self.db.execute(
            update(EmailAttachment)
            .where(EmailAttachment.email_message_id.in_(message_ids))
            .values(filename="anonymized.bin", content_type="application/octet-stream")
        )
        return result.rowcount

    def _log_anonymization(self, user_id: int, reason: str) -> None:
        """Log the anonymization action"""
        log_entry = DataAccessLog(
            entity_type="user",
            entity_id=user_id,
            access_type="anonymize",
            endpoint="/api/v1/rgpd/delete",
            purpose=f"Anonymization: {reason}",
            user_id=user_id,
            extra_data=json.dumps({"reason": reason}),
            accessed_at=datetime.utcnow(),
        )
        self.db.add(log_entry)

    def _serialize_access_log(self, log: DataAccessLog) -> Dict[str, Any]:
        """Serialize access log to dictionary"""
        return {
            "id": log.id,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "access_type": log.access_type,
            "endpoint": log.endpoint,
            "purpose": log.purpose,
            "user_id": log.user_id,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "extra_data": json.loads(log.extra_data) if log.extra_data else None,
            "accessed_at": log.accessed_at.isoformat() if log.accessed_at else None,
        }
