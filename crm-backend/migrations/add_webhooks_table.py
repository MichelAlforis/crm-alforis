"""
Migration Alembic - Création de la table webhooks

Cette migration ajoute la table `webhooks` pour gérer les webhooks sortants.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "add_webhooks_table"
down_revision = "add_notifications_table"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    events_array_type = (
        postgresql.ARRAY(sa.String(length=100))
        if dialect == "postgresql"
        else sa.Text
    )

    op.create_table(
        "webhooks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("events", events_array_type, nullable=False),
        sa.Column("secret", sa.String(length=128), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("TRUE"),
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_index("ix_webhooks_url", "webhooks", ["url"])
    op.create_index("ix_webhooks_is_active", "webhooks", ["is_active"])

    if dialect == "postgresql":
        op.create_index(
            "ix_webhooks_events",
            "webhooks",
            ["events"],
            postgresql_using="gin",
        )


def downgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.drop_index("ix_webhooks_events", table_name="webhooks")

    op.drop_index("ix_webhooks_is_active", table_name="webhooks")
    op.drop_index("ix_webhooks_url", table_name="webhooks")
    op.drop_table("webhooks")
