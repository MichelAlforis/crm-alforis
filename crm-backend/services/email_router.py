"""
Email Router Service
Execute routing rules based on detected email intent
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from models import (
    Interaction,
    Task,
    TaskPriority,
    TaskStatus,
    User,
    Notification,
    NotificationType,
    NotificationPriority
)
from models.routing_rule import RoutingRule, RoutingActionType

logger = logging.getLogger(__name__)


class EmailRouter:
    """
    Execute routing rules based on email intent

    Workflow:
    1. Check if interaction has detected intent
    2. Find matching routing rules (intent + confidence threshold)
    3. Execute actions defined in rules (create task, notify, escalate, etc.)
    4. Log execution
    """

    def __init__(self, db: Session):
        self.db = db

    def route_interaction(
        self,
        interaction_id: int,
        team_id: int
    ) -> Dict:
        """
        Route an interaction based on its detected intent

        Args:
            interaction_id: Interaction ID to route
            team_id: Team ID for multi-tenant filtering

        Returns:
            Dict with executed actions and results
        """
        # Get interaction
        interaction = self.db.query(Interaction).filter(
            Interaction.id == interaction_id,
            Interaction.team_id == team_id
        ).first()

        if not interaction:
            return {"success": False, "error": "Interaction not found"}

        if not interaction.intent:
            return {"success": False, "error": "No intent detected for this interaction"}

        # Find matching rules
        rules = self._find_matching_rules(
            intent=interaction.intent,
            confidence=interaction.intent_confidence or 0.0,
            team_id=team_id
        )

        if not rules:
            return {
                "success": True,
                "matched_rules": 0,
                "message": f"No active routing rules for intent '{interaction.intent}'"
            }

        # Execute rules
        results = []
        for rule in rules:
            try:
                result = self._execute_rule(rule, interaction)
                results.append({
                    "rule_id": rule.id,
                    "rule_name": rule.name,
                    "success": True,
                    "actions_executed": result
                })

                # Update rule stats
                rule.execution_count += 1
                rule.last_executed_at = datetime.now(timezone.utc)

            except Exception as e:
                logger.error(f"❌ Error executing rule {rule.id}: {e}", exc_info=True)
                results.append({
                    "rule_id": rule.id,
                    "rule_name": rule.name,
                    "success": False,
                    "error": str(e)
                })

        self.db.commit()

        return {
            "success": True,
            "matched_rules": len(rules),
            "intent": interaction.intent,
            "confidence": interaction.intent_confidence,
            "results": results
        }

    def _find_matching_rules(
        self,
        intent: str,
        confidence: float,
        team_id: int
    ) -> List[RoutingRule]:
        """Find active routing rules that match intent and confidence threshold"""

        rules = self.db.query(RoutingRule).filter(
            RoutingRule.team_id == team_id,
            RoutingRule.is_active == True,
            RoutingRule.intent_trigger == intent,
            RoutingRule.min_confidence <= (confidence * 100)
        ).order_by(RoutingRule.priority.desc()).all()

        return rules

    def _execute_rule(self, rule: RoutingRule, interaction: Interaction) -> List[Dict]:
        """Execute all actions defined in a routing rule"""

        actions = rule.actions or []
        results = []

        for action in actions:
            action_type = action.get("type")
            params = action.get("params", {})

            try:
                if action_type == RoutingActionType.CREATE_TASK.value:
                    result = self._create_task(rule, interaction, params)
                elif action_type == RoutingActionType.SEND_NOTIFICATION.value:
                    result = self._send_notification(rule, interaction, params)
                elif action_type == RoutingActionType.SET_PRIORITY.value:
                    result = self._set_priority(interaction, params)
                elif action_type == RoutingActionType.TAG_INTERACTION.value:
                    result = self._tag_interaction(interaction, params)
                elif action_type == RoutingActionType.ESCALATE.value:
                    result = self._escalate(rule, interaction, params)
                else:
                    result = {"skipped": True, "reason": f"Action type '{action_type}' not implemented"}

                results.append({
                    "action_type": action_type,
                    **result
                })

            except Exception as e:
                logger.error(f"❌ Error executing action {action_type}: {e}")
                results.append({
                    "action_type": action_type,
                    "success": False,
                    "error": str(e)
                })

        return results

    def _create_task(self, rule: RoutingRule, interaction: Interaction, params: Dict) -> Dict:
        """Create a task for follow-up"""

        # Replace placeholders in title
        title = params.get("title", "Follow up on email")
        title = self._replace_placeholders(title, interaction)

        # Calculate due date
        due_days = params.get("due_days", 3)
        due_date = datetime.now(timezone.utc) + timedelta(days=due_days)

        # Get assigned user
        assigned_to = params.get("assigned_to")  # user_id

        # Map priority
        priority_map = {
            "low": TaskPriority.LOW,
            "medium": TaskPriority.MEDIUM,
            "high": TaskPriority.HIGH,
            "urgent": TaskPriority.URGENT
        }
        priority = priority_map.get(params.get("priority", "medium"), TaskPriority.MEDIUM)

        task = Task(
            team_id=interaction.team_id,
            title=title,
            description=f"Auto-generated task from routing rule: {rule.name}\n\nInteraction ID: {interaction.id}",
            priority=priority,
            status=TaskStatus.TODO,
            due_date=due_date,
            assigned_to_id=assigned_to,
            related_interaction_id=interaction.id,
            created_at=datetime.now(timezone.utc),
            created_by=f"routing_rule_{rule.id}"
        )

        self.db.add(task)
        self.db.flush()

        logger.info(f"✅ Created task {task.id} from rule {rule.id}")

        return {"success": True, "task_id": task.id, "title": title}

    def _send_notification(self, rule: RoutingRule, interaction: Interaction, params: Dict) -> Dict:
        """Send notification to user(s)"""

        message = params.get("message", "New email routed by automation")
        message = self._replace_placeholders(message, interaction)

        user_ids = params.get("user_ids", [])

        # If no specific users, notify team admins
        if not user_ids:
            admins = self.db.query(User).filter(
                User.team_id == interaction.team_id,
                User.is_admin == True
            ).all()
            user_ids = [u.id for u in admins]

        notifications_created = []

        for user_id in user_ids:
            notification = Notification(
                user_id=user_id,
                type=NotificationType.SYSTEM,
                priority=NotificationPriority.MEDIUM,
                title=f"Email routé: {interaction.intent}",
                message=message,
                metadata={
                    "interaction_id": interaction.id,
                    "routing_rule_id": rule.id,
                    "intent": interaction.intent
                },
                created_at=datetime.now(timezone.utc)
            )
            self.db.add(notification)
            notifications_created.append(user_id)

        self.db.flush()

        logger.info(f"✅ Sent {len(notifications_created)} notifications from rule {rule.id}")

        return {"success": True, "notifications_sent": len(notifications_created)}

    def _set_priority(self, interaction: Interaction, params: Dict) -> Dict:
        """Set interaction priority"""

        priority = params.get("priority", "medium")
        # Note: Interaction model doesn't have priority field yet
        # This would need to be added to the model

        logger.info(f"ℹ️  Priority setting not implemented (would set to {priority})")

        return {"success": True, "priority": priority, "note": "Priority field not implemented"}

    def _tag_interaction(self, interaction: Interaction, params: Dict) -> Dict:
        """Add tags to interaction"""

        tags = params.get("tags", [])

        # Note: Interaction model doesn't have tags field yet
        # This would need to be added to the model or use a separate tags table

        logger.info(f"ℹ️  Tagging not implemented (would add tags: {tags})")

        return {"success": True, "tags": tags, "note": "Tags field not implemented"}

    def _escalate(self, rule: RoutingRule, interaction: Interaction, params: Dict) -> Dict:
        """Escalate to manager or support team"""

        escalate_to = params.get("to", "support_team")

        # Create high-priority task for escalation team
        task = Task(
            team_id=interaction.team_id,
            title=f"⚠️ ESCALADE: {interaction.intent} - Interaction #{interaction.id}",
            description=f"Escalated from routing rule: {rule.name}\n\nRequires attention from {escalate_to}",
            priority=TaskPriority.URGENT,
            status=TaskStatus.TODO,
            due_date=datetime.now(timezone.utc) + timedelta(hours=4),  # 4 hours
            related_interaction_id=interaction.id,
            created_at=datetime.now(timezone.utc),
            created_by=f"routing_rule_{rule.id}_escalation"
        )

        self.db.add(task)
        self.db.flush()

        logger.info(f"⚠️  Escalated interaction {interaction.id} to {escalate_to}")

        return {"success": True, "escalated_to": escalate_to, "task_id": task.id}

    def _replace_placeholders(self, text: str, interaction: Interaction) -> str:
        """Replace placeholders in text with interaction data"""

        replacements = {
            "{sender}": "Unknown",  # Would come from interaction metadata
            "{company}": "Unknown",
            "{subject}": "Unknown",
            "{interaction_id}": str(interaction.id),
            "{intent}": interaction.intent or "unknown"
        }

        for placeholder, value in replacements.items():
            text = text.replace(placeholder, value)

        return text


def route_interaction_by_id(
    db: Session,
    interaction_id: int,
    team_id: int
) -> Dict:
    """
    Convenience function to route an interaction

    Usage:
        result = route_interaction_by_id(db, interaction_id=123, team_id=1)
        print(result['matched_rules'])
    """
    router = EmailRouter(db)
    return router.route_interaction(interaction_id, team_id)
