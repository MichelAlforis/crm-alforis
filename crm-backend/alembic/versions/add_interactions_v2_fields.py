"""add interactions v2 fields (status, assignee, next_action_at)

Revision ID: interactions_v2
Revises: add_interaction_participants
Create Date: 2025-10-24 20:00:00.000000

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "interactions_v2"
down_revision = "add_interaction_participants"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create interaction_status ENUM type
    op.execute(
        """
        DO $
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interaction_status") THEN
                CREATE TYPE interaction_status AS ENUM ('todo", "in_progress", "done");
            END IF;
        END$;
    """
    )

    # Add status column with default 'todo' NOT NULL
    op.execute(
        """
        ALTER TABLE crm_interactions
        ADD COLUMN IF NOT EXISTS status interaction_status NOT NULL DEFAULT 'todo';
    """
    )

    # Add assignee column (FK to users table, nullable)
    op.execute(
        """
        ALTER TABLE crm_interactions
        ADD COLUMN IF NOT EXISTS assignee_id INTEGER NULL
        REFERENCES users(id) ON DELETE SET NULL;
    """
    )

    # Add next_action_at column (nullable timestamptz)
    op.execute(
        """
        ALTER TABLE crm_interactions
        ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ NULL;
    """
    )

    # Optional: linked_task_id and linked_event_id for future use
    op.execute(
        """
        ALTER TABLE crm_interactions
        ADD COLUMN IF NOT EXISTS linked_task_id INTEGER NULL;
    """
    )

    op.execute(
        """
        ALTER TABLE crm_interactions
        ADD COLUMN IF NOT EXISTS linked_event_id INTEGER NULL;
    """
    )

    # Add notified_at for reminder worker (avoid re-notification)
    op.execute(
        """
        ALTER TABLE crm_interactions
        ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ NULL;
    """
    )

    # Create indexes for performance
    # Index for inbox queries (status, assignee)
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_interactions_status_assignee
        ON crm_interactions(status, assignee_id);
    """
    )

    # Index for next_action_at queries (overdue reminders)
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_interactions_next_action
        ON crm_interactions(next_action_at)
        WHERE next_action_at IS NOT NULL;
    """
    )

    # Index for assignee-based queries
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_interactions_assignee
        ON crm_interactions(assignee_id)
        WHERE assignee_id IS NOT NULL;
    """
    )


def downgrade() -> None:
    # Drop indexes
    op.execute("DROP INDEX IF EXISTS idx_interactions_assignee;")
    op.execute("DROP INDEX IF EXISTS idx_interactions_next_action;")
    op.execute("DROP INDEX IF EXISTS idx_interactions_status_assignee;")

    # Drop columns
    op.execute("ALTER TABLE crm_interactions DROP COLUMN IF EXISTS notified_at;")
    op.execute("ALTER TABLE crm_interactions DROP COLUMN IF EXISTS linked_event_id;")
    op.execute("ALTER TABLE crm_interactions DROP COLUMN IF EXISTS linked_task_id;")
    op.execute("ALTER TABLE crm_interactions DROP COLUMN IF EXISTS next_action_at;")
    op.execute("ALTER TABLE crm_interactions DROP COLUMN IF EXISTS assignee_id;")
    op.execute("ALTER TABLE crm_interactions DROP COLUMN IF EXISTS status;")

    # Drop ENUM type
    op.execute("DROP TYPE IF EXISTS interaction_status;")
