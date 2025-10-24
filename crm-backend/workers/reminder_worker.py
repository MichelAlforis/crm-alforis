"""
Worker de rappels pour Interactions V2

Job périodique (5 minutes):
- Sélectionne interactions WHERE status IN ('todo','in_progress') AND next_action_at <= now() AND notified_at IS NULL
- Envoie notification (app + email simple)
- Marque notified_at pour éviter re-notification

Usage:
    python -m workers.reminder_worker

Déploiement:
    Ajouter cron job ou supervisord task
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
import time
import logging

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.interaction import Interaction
from models.user import User
from core.notifications import create_notification  # Assume exists

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://crm_user:crm_password@localhost:5432/crm_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def send_notification(interaction: Interaction, user: User, db):
    """
    Envoie une notification à l'assignee.

    Channels:
    - In-app notification (table notifications)
    - Email simple (optionnel)
    """
    title = f"Rappel: {interaction.title}"
    message = f"Action prévue le {interaction.next_action_at.strftime('%d/%m/%Y à %H:%M')}"

    try:
        # Create in-app notification
        create_notification(
            db=db,
            user_id=user.id,
            title=title,
            message=message,
            type="reminder",
            priority="high",
            link=f"/interactions/{interaction.id}"
        )

        # TODO: Send email via Resend (optional)
        # send_email(
        #     to=user.email,
        #     subject=title,
        #     body=message,
        # )

        logger.info(f"Notification sent to user {user.id} for interaction {interaction.id}")
    except Exception as e:
        logger.error(f"Failed to send notification: {e}")


def process_reminders():
    """
    Process overdue reminders.

    1. Find interactions with next_action_at <= now()
    2. Filter: status IN ('todo', 'in_progress')
    3. Filter: notified_at IS NULL (not already notified)
    4. Send notification
    5. Mark notified_at
    """
    db = SessionLocal()
    now = datetime.utcnow()

    try:
        # Query overdue interactions
        interactions = (
            db.query(Interaction)
            .filter(
                Interaction.status.in_(['todo', 'in_progress']),
                Interaction.next_action_at <= now,
                Interaction.notified_at.is_(None),
                Interaction.assignee_id.isnot(None),  # Must have assignee
            )
            .all()
        )

        logger.info(f"Found {len(interactions)} interactions needing reminders")

        for interaction in interactions:
            # Get assignee
            user = db.query(User).filter(User.id == interaction.assignee_id).first()
            if not user:
                logger.warning(f"Assignee {interaction.assignee_id} not found for interaction {interaction.id}")
                continue

            # Send notification
            send_notification(interaction, user, db)

            # Mark as notified
            interaction.notified_at = now
            db.commit()

    except Exception as e:
        logger.error(f"Error processing reminders: {e}")
        db.rollback()
    finally:
        db.close()


def run_worker(interval_seconds=300):
    """
    Run worker in loop.

    interval_seconds: Sleep duration between runs (default: 300s = 5min)
    """
    logger.info(f"Starting reminder worker (interval: {interval_seconds}s)")

    while True:
        try:
            process_reminders()
        except Exception as e:
            logger.error(f"Worker error: {e}")

        time.sleep(interval_seconds)


if __name__ == "__main__":
    # Run once (for testing) or loop (for production)
    if "--once" in sys.argv:
        logger.info("Running once (test mode)")
        process_reminders()
    else:
        logger.info("Running in loop mode")
        run_worker()
