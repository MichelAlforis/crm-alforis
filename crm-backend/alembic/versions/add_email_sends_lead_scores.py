"""add email_sends and lead_scores tables for marketing tracking

Revision ID: email_marketing_lite
Revises: interactions_v2
Create Date: 2025-10-24 20:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "email_marketing_lite"
down_revision = "interactions_v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create email_status ENUM type
    op.execute(
        """
        DO $
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_status") THEN
                CREATE TYPE email_status AS ENUM ('sent", "opened", "clicked", "bounced");
            END IF;
        END$;
    """
    )

    # Create email_event_tracking table (V2 - renamed to avoid collision with email_sends from campaigns)
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS email_event_tracking (
            id SERIAL PRIMARY KEY,
            organisation_id INTEGER NULL
                REFERENCES organisations(id) ON DELETE CASCADE,
            person_id INTEGER NULL
                REFERENCES people(id) ON DELETE CASCADE,
            provider VARCHAR(50) NOT NULL,
            external_id VARCHAR(255) NOT NULL,
            subject VARCHAR(500) NULL,
            status email_status NOT NULL DEFAULT 'sent',
            sent_at TIMESTAMPTZ NULL,
            open_count INTEGER NOT NULL DEFAULT 0,
            click_count INTEGER NOT NULL DEFAULT 0,
            last_open_at TIMESTAMPTZ NULL,
            last_click_at TIMESTAMPTZ NULL,
            interaction_id INTEGER NULL
                REFERENCES crm_interactions(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_provider_external_id UNIQUE (provider, external_id),
            CONSTRAINT chk_email_entity CHECK (
                (organisation_id IS NOT NULL) OR (person_id IS NOT NULL)
            )
        );
    """
    )

    # Indexes for email_event_tracking
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_email_event_tracking_person_sent
        ON email_event_tracking(person_id, sent_at DESC NULLS LAST)
        WHERE person_id IS NOT NULL;
    """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_email_event_tracking_org
        ON email_event_tracking(organisation_id)
        WHERE organisation_id IS NOT NULL;
    """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_email_event_tracking_status
        ON email_event_tracking(status);
    """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_email_event_tracking_provider_ext
        ON email_event_tracking(provider, external_id);
    """
    )

    # Create lead_scores table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS lead_scores (
            person_id INTEGER PRIMARY KEY
                REFERENCES people(id) ON DELETE CASCADE,
            score INTEGER NOT NULL DEFAULT 0,
            last_event_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """
    )

    # Index for lead_scores (hot leads query)
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_lead_scores_score
        ON lead_scores(score DESC)
        WHERE score > 0;
    """
    )


def downgrade() -> None:
    # Drop tables
    op.execute("DROP TABLE IF EXISTS lead_scores CASCADE;")
    op.execute("DROP TABLE IF EXISTS email_event_tracking CASCADE;")

    # Drop ENUM type
    op.execute("DROP TYPE IF EXISTS email_status;")
