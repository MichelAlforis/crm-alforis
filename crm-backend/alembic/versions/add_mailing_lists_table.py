"""Add mailing lists table

Revision ID: add_mailing_lists
Revises: add_email_campaigns
Create Date: 2025-01-23

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "add_mailing_lists"
down_revision = "add_email_campaigns"
branch_labels = None
depends_on = None


def upgrade():
    # Mailing Lists
    op.create_table(
        "mailing_lists",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("target_type", sa.String(length=50), nullable=False, server_default="contacts"),
        sa.Column(
            "filters", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default="{}"
        ),
        sa.Column("recipient_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Indexes
    op.create_index("ix_mailing_lists_name", "mailing_lists", ["name"])
    op.create_index('ix_mailing_lists_created_by", "mailing_lists', ["created_by"])
    op.create_index("ix_mailing_lists_is_active", "mailing_lists", ["is_active"])


def downgrade():
    op.drop_index("ix_mailing_lists_is_active", table_name="mailing_lists")
    op.drop_index("ix_mailing_lists_created_by", table_name="mailing_lists")
    op.drop_index("ix_mailing_lists_name", table_name="mailing_lists")
    op.drop_table("mailing_lists")
