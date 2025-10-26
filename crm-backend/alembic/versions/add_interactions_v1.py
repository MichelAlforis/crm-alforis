"""Add interactions table v1

Revision ID: add_interactions_v1
Revises: add_help_analytics_events
Create Date: 2025-10-24

Interactions v1 : Communication et activités liées aux organisations/personnes
- Type: call, email, meeting, note, other
- Contrainte: au moins org_id OU person_id
- Pas de champs inbox (status, assignee, next_action_at) en v1
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "add_interactions_v1"
down_revision = "add_help_analytics_events"
branch_labels = None
depends_on = None


def upgrade():
    # Enum type pour les types d'interaction
    interaction_type_enum = postgresql.ENUM(
        'call", "email", "meeting", "note', "other", name="interaction_type"
    )
    interaction_type_enum.create(op.get_bind())

    # Table crm_interactions (nouveau nom pour éviter conflit avec interactions legacy)
    op.create_table(
        "crm_interactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=True),
        sa.Column("person_id", sa.Integer(), nullable=True),
        sa.Column("type", interaction_type_enum, nullable=False, server_default="note"),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "attachments",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        # Primary key
        sa.PrimaryKeyConstraint("id"),
        # Foreign keys
        sa.ForeignKeyConstraint(["org_id"], ["organisations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        # Contrainte CHECK: au moins org_id OU person_id
        sa.CheckConstraint(
            "(org_id IS NOT NULL) OR (person_id IS NOT NULL)", name="chk_interaction_org_or_person"
        ),
    )

    # Index pour performances
    op.create_index(
        "idx_crm_interactions_org_created_at",
        "crm_interactions",
        ['org_id", "created_at'],
    )
    op.create_index(
        "idx_crm_interactions_person_created_at",
        "crm_interactions",
        ["person_id", "created_at"],
    )
    op.create_index(
        "idx_crm_interactions_created_at",
        "crm_interactions",
        ["created_at"],
    )
    op.create_index(
        "idx_crm_interactions_created_by",
        "crm_interactions",
        ["created_by"],
    )


def downgrade():
    # Drop table
    op.drop_index("idx_crm_interactions_created_by", table_name="crm_interactions")
    op.drop_index("idx_crm_interactions_created_at", table_name="crm_interactions")
    op.drop_index("idx_crm_interactions_person_created_at", table_name="crm_interactions")
    op.drop_index("idx_crm_interactions_org_created_at", table_name="crm_interactions")
    op.drop_table("crm_interactions")

    # Drop enum type
    interaction_type_enum = postgresql.ENUM(
        'call", "email", "meeting", "note", "other', name="interaction_type"
    )
    interaction_type_enum.drop(op.get_bind())
