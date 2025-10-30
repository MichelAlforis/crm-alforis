"""
Email Routing Rule Model
Configurable rules for routing emails based on detected intent
"""
from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from models.base import Base


class RoutingActionType(str, enum.Enum):
    """Types of actions that can be triggered by routing rules"""
    CREATE_TASK = "create_task"  # Create a task for a user
    ASSIGN_TO_USER = "assign_to_user"  # Assign interaction to specific user
    SEND_NOTIFICATION = "send_notification"  # Send notification to user/team
    CREATE_CALENDAR_EVENT = "create_calendar_event"  # Create calendar event
    ADD_TO_PIPELINE = "add_to_pipeline"  # Add to sales pipeline stage
    SET_PRIORITY = "set_priority"  # Set interaction priority
    TAG_INTERACTION = "tag_interaction"  # Add tags to interaction
    ESCALATE = "escalate"  # Escalate to manager/support
    AUTO_REPLY = "auto_reply"  # Send automated reply


class RoutingRule(Base):
    """
    Email routing rules based on intent detection

    Example rules:
    - Intent: meeting_request → Create task for commercial, Send notification
    - Intent: quotation_request → Assign to sales team, Add to pipeline
    - Intent: complaint → Escalate to support, Set high priority
    - Intent: follow_up → Add to existing thread, Update pipeline stage
    """
    __tablename__ = "routing_rules"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)

    # Rule metadata
    name = Column(String(100), nullable=False, comment="Rule name (e.g., 'Meeting Request → Create Task')")
    description = Column(String(500), nullable=True, comment="Optional description")
    is_active = Column(Boolean, default=True, nullable=False, comment="Enable/disable rule")
    priority = Column(Integer, default=0, nullable=False, comment="Higher priority rules execute first")

    # Trigger conditions
    intent_trigger = Column(String(50), nullable=False, index=True, comment="Intent that triggers this rule")
    min_confidence = Column(Integer, default=70, nullable=False, comment="Minimum confidence (0-100) to trigger")

    # Optional additional conditions (JSON)
    conditions = Column(JSON, nullable=True, comment="Additional filters: sender, keywords, time, etc.")
    # Example:
    # {
    #   "sender_domain": ["gmail.com", "outlook.com"],
    #   "keywords": ["urgent", "asap"],
    #   "business_hours_only": true
    # }

    # Actions to execute (JSON array)
    actions = Column(JSON, nullable=False, comment="List of actions to execute")
    # Example:
    # [
    #   {
    #     "type": "create_task",
    #     "params": {
    #       "assigned_to": 5,  # user_id
    #       "title": "Follow up on meeting request from {sender}",
    #       "priority": "high",
    #       "due_days": 1
    #     }
    #   },
    #   {
    #     "type": "send_notification",
    #     "params": {
    #       "user_ids": [5, 7],
    #       "message": "New meeting request from {sender}"
    #     }
    #   }
    # ]

    # Execution stats
    execution_count = Column(Integer, default=0, nullable=False, comment="Number of times rule was triggered")
    last_executed_at = Column(DateTime(timezone=True), nullable=True, comment="Last execution timestamp")

    # Audit
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_by = Column(String(100), nullable=True)

    # Relationships
    team = relationship("Team", foreign_keys=[team_id])

    def __repr__(self):
        return f"<RoutingRule(id={self.id}, intent={self.intent_trigger}, actions={len(self.actions or [])})>"


# Default routing rules template
DEFAULT_ROUTING_RULES = [
    {
        "name": "Meeting Request → Create Task",
        "intent_trigger": "meeting_request",
        "min_confidence": 75,
        "actions": [
            {
                "type": "create_task",
                "params": {
                    "title": "Répondre à la demande de rendez-vous de {sender}",
                    "priority": "high",
                    "due_days": 1
                }
            },
            {
                "type": "send_notification",
                "params": {
                    "message": "Nouvelle demande de rendez-vous de {sender}"
                }
            }
        ]
    },
    {
        "name": "Quotation Request → Assign to Sales",
        "intent_trigger": "quotation_request",
        "min_confidence": 70,
        "actions": [
            {
                "type": "create_task",
                "params": {
                    "title": "Préparer devis pour {company}",
                    "priority": "high",
                    "due_days": 2
                }
            },
            {
                "type": "add_to_pipeline",
                "params": {
                    "stage": "quotation"
                }
            }
        ]
    },
    {
        "name": "Complaint → Escalate to Support",
        "intent_trigger": "complaint",
        "min_confidence": 80,
        "actions": [
            {
                "type": "escalate",
                "params": {
                    "to": "support_team"
                }
            },
            {
                "type": "set_priority",
                "params": {
                    "priority": "urgent"
                }
            },
            {
                "type": "send_notification",
                "params": {
                    "message": "⚠️ Réclamation détectée de {sender}"
                }
            }
        ]
    },
    {
        "name": "Follow Up → Add to Thread",
        "intent_trigger": "follow_up",
        "min_confidence": 70,
        "actions": [
            {
                "type": "tag_interaction",
                "params": {
                    "tags": ["follow-up"]
                }
            }
        ]
    },
    {
        "name": "Unsubscribe → Auto Process",
        "intent_trigger": "unsubscribe",
        "min_confidence": 85,
        "actions": [
            {
                "type": "tag_interaction",
                "params": {
                    "tags": ["unsubscribe"]
                }
            },
            {
                "type": "auto_reply",
                "params": {
                    "template": "unsubscribe_confirmation"
                }
            }
        ]
    }
]
