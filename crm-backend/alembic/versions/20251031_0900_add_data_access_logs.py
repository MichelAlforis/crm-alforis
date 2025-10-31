"""Add data_access_logs table for RGPD compliance

Revision ID: add_data_access_logs
Revises: add_email_threads
Create Date: 2025-10-31

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "add_data_access_logs"
down_revision = "add_email_threads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create data_access_logs table for RGPD/CNIL compliance.
    Tracks all access to personal data (read, export, delete, anonymize).
    """
    op.create_table(
        "data_access_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("access_type", sa.String(length=20), nullable=False),
        sa.Column("endpoint", sa.String(length=200), nullable=True),
        sa.Column("purpose", sa.String(length=200), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("extra_data", sa.Text(), nullable=True),
        sa.Column("accessed_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Single column indexes
    op.create_index(op.f("ix_data_access_logs_id"), "data_access_logs", ["id"])
    op.create_index(op.f("ix_data_access_logs_entity_type"), "data_access_logs", ["entity_type"])
    op.create_index(op.f("ix_data_access_logs_entity_id"), "data_access_logs", ["entity_id"])
    op.create_index(op.f("ix_data_access_logs_access_type"), "data_access_logs", ["access_type"])
    op.create_index(op.f("ix_data_access_logs_user_id"), "data_access_logs", ["user_id"])
    op.create_index(op.f("ix_data_access_logs_accessed_at"), "data_access_logs", ["accessed_at"])

    # Composite indexes for CNIL compliance queries
    op.create_index(
        "idx_data_access_entity", "data_access_logs", ["entity_type", "entity_id", "accessed_at"]
    )
    op.create_index("idx_data_access_user_date", "data_access_logs", ["user_id", "accessed_at"])
    op.create_index(
        "idx_data_access_type_date", "data_access_logs", ["access_type", "accessed_at"]
    )


def downgrade() -> None:
    """Remove data_access_logs table"""
    # Drop composite indexes
    op.drop_index("idx_data_access_type_date", table_name="data_access_logs")
    op.drop_index("idx_data_access_user_date", table_name="data_access_logs")
    op.drop_index("idx_data_access_entity", table_name="data_access_logs")

    # Drop single column indexes
    op.drop_index(op.f("ix_data_access_logs_accessed_at"), table_name="data_access_logs")
    op.drop_index(op.f("ix_data_access_logs_user_id"), table_name="data_access_logs")
    op.drop_index(op.f("ix_data_access_logs_access_type"), table_name="data_access_logs")
    op.drop_index(op.f("ix_data_access_logs_entity_id"), table_name="data_access_logs")
    op.drop_index(op.f("ix_data_access_logs_entity_type"), table_name="data_access_logs")
    op.drop_index(op.f("ix_data_access_logs_id"), table_name="data_access_logs")

    # Drop table
    op.drop_table("data_access_logs")
